from collections.abc import Sequence
from datetime import timedelta
from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert

from polar.kit.repository import RepositoryBase
from polar.kit.utils import utc_now
from polar.models import CartItem


class CartRepository(RepositoryBase[CartItem]):
    model = CartItem

    async def get_by_user(
        self,
        user_id: UUID,
    ) -> Sequence[CartItem]:
        """Get all non-expired cart items for a user."""
        expiration_threshold = utc_now() - timedelta(days=7)
        statement = select(CartItem).where(
            CartItem.user_id == user_id,
            CartItem.modified_at >= expiration_threshold,
        )
        return await self.get_all(statement)

    async def get_by_session(
        self,
        session_token: str,
    ) -> Sequence[CartItem]:
        """Get all non-expired cart items for a guest session."""
        expiration_threshold = utc_now() - timedelta(days=7)
        statement = select(CartItem).where(
            CartItem.session_token == session_token,
            CartItem.modified_at >= expiration_threshold,
        )
        return await self.get_all(statement)

    async def get_by_id_and_owner(
        self,
        item_id: UUID,
        user_id: UUID | None,
        session_token: str | None,
    ) -> CartItem | None:
        """Get a cart item by ID, verifying ownership."""
        statement = select(CartItem).where(CartItem.id == item_id)

        if user_id is not None:
            statement = statement.where(CartItem.user_id == user_id)
        elif session_token is not None:
            statement = statement.where(CartItem.session_token == session_token)
        else:
            return None

        return await self.get_one_or_none(statement)

    async def upsert_item(
        self,
        user_id: UUID | None,
        session_token: str | None,
        product_id: UUID,
        quantity: int,
        *,
        flush: bool = False,
    ) -> CartItem:
        """Insert or update a cart item, incrementing quantity if exists."""
        now = utc_now()

        insert_stmt = insert(CartItem).values(
            user_id=user_id,
            session_token=session_token,
            product_id=product_id,
            quantity=quantity,
            created_at=now,
            modified_at=now,
        )

        if user_id is not None:
            conflict_target = [CartItem.user_id, CartItem.product_id]
        else:
            conflict_target = [CartItem.session_token, CartItem.product_id]

        upsert_stmt = insert_stmt.on_conflict_do_update(
            index_elements=conflict_target,
            set_={
                "quantity": CartItem.quantity + quantity,
                "modified_at": now,
            },
        ).returning(CartItem)

        result = await self.session.execute(upsert_stmt)
        cart_item = result.scalar_one()

        if flush:
            await self.session.flush()

        return cart_item

    async def delete_expired(
        self,
        days: int = 7,
    ) -> int:
        """Delete cart items older than specified days."""
        expiration_threshold = utc_now() - timedelta(days=days)
        statement = delete(CartItem).where(CartItem.modified_at < expiration_threshold)
        result = await self.session.execute(statement)
        return result.rowcount or 0

    async def migrate_session_to_user(
        self,
        session_token: str,
        user_id: UUID,
        *,
        flush: bool = False,
    ) -> int:
        """Migrate guest cart items to user account, merging duplicates."""
        guest_items_stmt = select(CartItem).where(
            CartItem.session_token == session_token
        )
        guest_items = await self.get_all(guest_items_stmt)

        if not guest_items:
            return 0

        migrated_count = 0
        now = utc_now()

        for guest_item in guest_items:
            user_item_stmt = select(CartItem).where(
                CartItem.user_id == user_id,
                CartItem.product_id == guest_item.product_id,
            )
            existing_user_item = await self.get_one_or_none(user_item_stmt)

            if existing_user_item:
                new_quantity = existing_user_item.quantity + guest_item.quantity
                new_quantity = min(new_quantity, 100)

                update_stmt = (
                    update(CartItem)
                    .where(CartItem.id == existing_user_item.id)
                    .values(quantity=new_quantity, modified_at=now)
                )
                await self.session.execute(update_stmt)
            else:
                update_stmt = (
                    update(CartItem)
                    .where(CartItem.id == guest_item.id)
                    .values(
                        user_id=user_id,
                        session_token=None,
                        modified_at=now,
                    )
                )
                await self.session.execute(update_stmt)

            migrated_count += 1

        delete_stmt = delete(CartItem).where(CartItem.session_token == session_token)
        await self.session.execute(delete_stmt)

        if flush:
            await self.session.flush()

        return migrated_count

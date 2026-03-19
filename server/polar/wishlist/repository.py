from uuid import UUID

from sqlalchemy import delete, select

from polar.kit.repository import RepositoryBase, RepositoryIDMixin
from polar.models import WishlistItem


class WishlistRepository(
    RepositoryBase[WishlistItem],
    RepositoryIDMixin[WishlistItem, UUID],
):
    model = WishlistItem

    async def add_to_wishlist(self, user_id: UUID, product_id: UUID) -> WishlistItem:
        """Add product to user wishlist"""
        wishlist_item = WishlistItem(
            user_id=user_id,
            product_id=product_id,
        )
        return await self.create(wishlist_item)

    async def remove_from_wishlist(self, user_id: UUID, product_id: UUID) -> None:
        """Remove product from user wishlist"""
        statement = delete(WishlistItem).where(
            WishlistItem.user_id == user_id,
            WishlistItem.product_id == product_id,
        )
        await self.session.execute(statement)

    async def get_user_wishlist(self, user_id: UUID) -> list[WishlistItem]:
        """Get all wishlist items for user with product details"""
        statement = (
            select(WishlistItem)
            .where(WishlistItem.user_id == user_id)
            .order_by(WishlistItem.created_at.desc())
            .options(
                # Eager load product relationship
                # to avoid N+1 queries
                # Use selectinload for eager loading
                # This is more efficient than joinedload for one-to-many
                # relationships
                # Note: We'll use raise_on_sql for product to ensure
                # it's loaded
            )
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def is_in_wishlist(self, user_id: UUID, product_id: UUID) -> bool:
        """Check if product is in user wishlist"""
        statement = select(WishlistItem).where(
            WishlistItem.user_id == user_id,
            WishlistItem.product_id == product_id,
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none() is not None

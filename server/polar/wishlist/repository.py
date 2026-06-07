from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import joinedload, selectinload

from polar.kit.repository import RepositoryBase, RepositoryIDMixin
from polar.models import WishlistItem
from polar.models.product import Product
from polar.models.product_benefit import ProductBenefit


class WishlistRepository(
    RepositoryBase[WishlistItem],
    RepositoryIDMixin[WishlistItem, UUID],
):
    model = WishlistItem

    async def add_to_wishlist(self, user_id: UUID, product_id: UUID) -> WishlistItem:
        """Add product to user wishlist."""
        wishlist_item = WishlistItem(
            user_id=user_id,
            product_id=product_id,
        )
        return await self.create(wishlist_item)

    async def remove_from_wishlist(self, user_id: UUID, product_id: UUID) -> None:
        """Remove product from user wishlist."""
        statement = delete(WishlistItem).where(
            WishlistItem.user_id == user_id,
            WishlistItem.product_id == product_id,
        )
        await self.session.execute(statement)

    async def get_user_wishlist(self, user_id: UUID) -> list[WishlistItem]:
        """Get all wishlist items for a user with full product details
        eager-loaded.

        WishlistItem.product is `lazy='raise'` — without explicit eager
        loading the response serialiser raises trying to access it, the
        request 500s, and the wishlist page shows empty (frontend
        catches the error silently and renders the empty state).
        """
        statement = (
            select(WishlistItem)
            .where(WishlistItem.user_id == user_id)
            .order_by(WishlistItem.created_at.desc())
            .options(
                # Pull the full product graph the wishlist UI needs:
                # organization (for "by Creator" label), prices (for
                # the badge), medias (for the cover image), benefits
                # (for the tooltip), all in one round-trip.
                joinedload(WishlistItem.product).joinedload(Product.organization),
                joinedload(WishlistItem.product).selectinload(Product.all_prices),
                joinedload(WishlistItem.product).selectinload(Product.product_medias),
                joinedload(WishlistItem.product).selectinload(
                    Product.product_benefits
                ).joinedload(ProductBenefit.benefit),
                joinedload(WishlistItem.product).selectinload(
                    Product.attached_custom_fields
                ),
            )
        )
        result = await self.session.execute(statement)
        return list(result.scalars().unique().all())

    async def is_in_wishlist(self, user_id: UUID, product_id: UUID) -> bool:
        """Check if product is in user wishlist."""
        statement = select(WishlistItem).where(
            WishlistItem.user_id == user_id,
            WishlistItem.product_id == product_id,
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none() is not None

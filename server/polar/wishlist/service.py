from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from polar.exceptions import PolarError
from polar.models import Product, WishlistItem
from polar.postgres import AsyncSession

from .repository import WishlistRepository

log = structlog.get_logger()


class WishlistError(PolarError): ...


class ProductNotFoundError(WishlistError):
    def __init__(self, product_id: UUID):
        self.product_id = product_id
        message = f"Product {product_id} not found"
        super().__init__(message, 404)


class ProductArchivedError(WishlistError):
    def __init__(self, product_id: UUID):
        self.product_id = product_id
        message = f"Product {product_id} is archived and cannot be added to wishlist"
        super().__init__(message, 422)


class WishlistItemAlreadyExistsError(WishlistError):
    def __init__(self, user_id: UUID, product_id: UUID):
        self.user_id = user_id
        self.product_id = product_id
        message = f"Product {product_id} is already in wishlist"
        super().__init__(message, 409)


class WishlistService:
    async def add_to_wishlist(
        self,
        session: AsyncSession,
        user_id: UUID,
        product_id: UUID,
    ) -> WishlistItem:
        """Add product to user wishlist with validation"""
        statement = select(Product).where(Product.id == product_id)
        result = await session.execute(statement)
        product = result.scalar_one_or_none()

        if product is None:
            raise ProductNotFoundError(product_id)

        if product.is_archived:
            raise ProductArchivedError(product_id)

        repository = WishlistRepository.from_session(session)

        try:
            wishlist_item = await repository.add_to_wishlist(user_id, product_id)
        except IntegrityError:
            raise WishlistItemAlreadyExistsError(user_id, product_id)

        log.info(
            "wishlist.item_added",
            user_id=user_id,
            product_id=product_id,
            wishlist_item_id=wishlist_item.id,
        )

        return wishlist_item

    async def remove_from_wishlist(
        self,
        session: AsyncSession,
        user_id: UUID,
        product_id: UUID,
    ) -> None:
        """Remove product from user wishlist"""
        repository = WishlistRepository.from_session(session)
        await repository.remove_from_wishlist(user_id, product_id)

        log.info(
            "wishlist.item_removed",
            user_id=user_id,
            product_id=product_id,
        )

    async def get_user_wishlist(
        self,
        session: AsyncSession,
        user_id: UUID,
    ) -> list[WishlistItem]:
        """Get all products in user wishlist with product details"""
        repository = WishlistRepository.from_session(session)
        return await repository.get_user_wishlist(user_id)

    async def is_in_wishlist(
        self,
        session: AsyncSession,
        user_id: UUID,
        product_id: UUID,
    ) -> bool:
        """Check if product is in user wishlist"""
        repository = WishlistRepository.from_session(session)
        return await repository.is_in_wishlist(user_id, product_id)


wishlist_service = WishlistService()

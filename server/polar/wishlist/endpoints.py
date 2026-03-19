from typing import Annotated
from uuid import UUID

import structlog
from fastapi import Depends, Path

from polar.auth.dependencies import WebUserRead
from polar.openapi import APITag
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter

from .schemas import WishlistItemPublic
from .service import (
    ProductArchivedError,
    ProductNotFoundError,
    WishlistItemAlreadyExistsError,
    wishlist_service,
)

log = structlog.get_logger()

router = APIRouter(prefix="/wishlist", tags=["wishlist", APITag.public])


@router.post(
    "/",
    response_model=WishlistItemPublic,
    status_code=201,
    summary="Add to Wishlist",
    responses={
        201: {"description": "Product added to wishlist successfully."},
        404: {"description": "Product not found."},
        409: {"description": "Product already in wishlist."},
        422: {"description": "Product is archived."},
    },
)
async def add_to_wishlist(
    product_id: UUID,
    auth_subject: WebUserRead,
    session: AsyncSession = Depends(get_db_session),
) -> WishlistItemPublic:
    """Add product to wishlist. Requires authentication."""
    try:
        wishlist_item = await wishlist_service.add_to_wishlist(
            session,
            auth_subject.subject.id,
            product_id,
        )

        return WishlistItemPublic.model_validate(wishlist_item)

    except (
        ProductNotFoundError,
        ProductArchivedError,
        WishlistItemAlreadyExistsError,
    ):
        raise


@router.delete(
    "/{product_id}",
    status_code=204,
    summary="Remove from Wishlist",
    responses={
        204: {"description": "Product removed from wishlist successfully."},
    },
)
async def remove_from_wishlist(
    product_id: Annotated[UUID, Path(description="The product ID.")],
    auth_subject: WebUserRead,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Remove product from wishlist. Requires authentication."""
    await wishlist_service.remove_from_wishlist(
        session,
        auth_subject.subject.id,
        product_id,
    )


@router.get(
    "/",
    response_model=list[WishlistItemPublic],
    summary="Get User Wishlist",
    responses={
        200: {"description": "List of wishlist items."},
    },
)
async def get_user_wishlist(
    auth_subject: WebUserRead,
    session: AsyncSession = Depends(get_db_session),
) -> list[WishlistItemPublic]:
    """Get user wishlist. Requires authentication."""
    wishlist_items = await wishlist_service.get_user_wishlist(
        session,
        auth_subject.subject.id,
    )

    return [WishlistItemPublic.model_validate(item) for item in wishlist_items]


@router.get(
    "/check/{product_id}",
    response_model=dict,
    summary="Check if in Wishlist",
    responses={
        200: {"description": "Wishlist status for product."},
    },
)
async def check_if_in_wishlist(
    product_id: Annotated[UUID, Path(description="The product ID.")],
    auth_subject: WebUserRead,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    """Check if product is in user wishlist. Requires authentication."""
    is_in_wishlist = await wishlist_service.is_in_wishlist(
        session,
        auth_subject.subject.id,
        product_id,
    )

    return {"is_in_wishlist": is_in_wishlist}

from typing import Annotated
from uuid import UUID

import structlog
from fastapi import Depends, Path

from polar.auth.dependencies import WebUserRead
from polar.openapi import APITag
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter

from .schemas import (
    OrganizationReviewPublic,
    ProductRatingSummary,
    ReviewCreate,
    ReviewPublic,
    ReviewUpdate,
)
from .service import (
    InvalidRatingError,
    NotVerifiedPurchaseError,
    OrderNotFoundError,
    ProductNotFoundError,
    ReviewAlreadyExistsError,
    ReviewNotFoundError,
    ReviewTextTooLongError,
    UnauthorizedReviewAccessError,
    review_service,
)

log = structlog.get_logger()

router = APIRouter(prefix="/reviews", tags=["reviews", APITag.public])


@router.post(
    "/",
    response_model=ReviewPublic,
    status_code=201,
    summary="Create Review",
    responses={
        201: {"description": "Review created successfully."},
        403: {"description": "Not a verified purchase."},
        404: {"description": "Product or order not found."},
        409: {"description": "Review already exists."},
        422: {"description": "Invalid rating or review text."},
    },
)
async def create_review(
    review_create: ReviewCreate,
    auth_subject: WebUserRead,
    session: AsyncSession = Depends(get_db_session),
) -> ReviewPublic:
    """Create product review. Requires authentication and verified purchase."""
    try:
        review = await review_service.create_review(
            session,
            auth_subject.subject.id,
            review_create.product_id,
            review_create.order_id,
            review_create.rating,
            review_create.review_text,
        )

        await session.flush()

        user = auth_subject.subject

        return ReviewPublic(
            id=review.id,
            product_id=review.product_id,
            user_id=review.user_id,
            user_name=user.username or user.email,
            user_avatar=user.avatar_url,
            rating=review.rating,
            review_text=review.review_text,
            is_verified_purchase=review.is_verified_purchase,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )

    except (
        ProductNotFoundError,
        OrderNotFoundError,
        NotVerifiedPurchaseError,
        ReviewAlreadyExistsError,
        InvalidRatingError,
        ReviewTextTooLongError,
    ):
        raise


@router.put(
    "/{id}",
    response_model=ReviewPublic,
    summary="Update Review",
    responses={
        200: {"description": "Review updated successfully."},
        403: {"description": "Not authorized to update this review."},
        404: {"description": "Review not found."},
        422: {"description": "Invalid rating or review text."},
    },
)
async def update_review(
    id: Annotated[UUID, Path(description="The review ID.")],
    review_update: ReviewUpdate,
    auth_subject: WebUserRead,
    session: AsyncSession = Depends(get_db_session),
) -> ReviewPublic:
    """Update existing review. Requires authentication and ownership."""
    try:
        review = await review_service.update_review(
            session,
            id,
            auth_subject.subject.id,
            review_update.rating,
            review_update.review_text,
        )

        await session.flush()

        user = auth_subject.subject

        return ReviewPublic(
            id=review.id,
            product_id=review.product_id,
            user_id=review.user_id,
            user_name=user.username or user.email,
            user_avatar=user.avatar_url,
            rating=review.rating,
            review_text=review.review_text,
            is_verified_purchase=review.is_verified_purchase,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )

    except (
        ReviewNotFoundError,
        UnauthorizedReviewAccessError,
        InvalidRatingError,
        ReviewTextTooLongError,
    ):
        raise


@router.delete(
    "/{id}",
    status_code=204,
    summary="Delete Review",
    responses={
        204: {"description": "Review deleted successfully."},
        403: {"description": "Not authorized to delete this review."},
        404: {"description": "Review not found."},
    },
)
async def delete_review(
    id: Annotated[UUID, Path(description="The review ID.")],
    auth_subject: WebUserRead,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Delete review. Requires authentication and ownership."""
    try:
        await review_service.delete_review(
            session,
            id,
            auth_subject.subject.id,
        )

    except (
        ReviewNotFoundError,
        UnauthorizedReviewAccessError,
    ):
        raise


@router.get(
    "/product/{product_id}",
    response_model=list[ReviewPublic],
    summary="Get Product Reviews",
    responses={
        200: {"description": "List of product reviews."},
    },
)
async def get_product_reviews(
    product_id: Annotated[UUID, Path(description="The product ID.")],
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db_session),
) -> list[ReviewPublic]:
    """Get reviews for product with pagination. No authentication required."""
    reviews = await review_service.get_product_reviews(
        session,
        product_id,
        limit,
        offset,
    )

    return [
        ReviewPublic(
            id=review.id,
            product_id=review.product_id,
            user_id=review.user_id,
            user_name=review.user.username or review.user.email,
            user_avatar=review.user.avatar_url,
            rating=review.rating,
            review_text=review.review_text,
            is_verified_purchase=review.is_verified_purchase,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )
        for review in reviews
    ]


@router.get(
    "/product/{product_id}/summary",
    response_model=ProductRatingSummary,
    summary="Get Product Rating Summary",
    responses={
        200: {"description": "Product rating summary."},
    },
)
async def get_product_rating_summary(
    product_id: Annotated[UUID, Path(description="The product ID.")],
    session: AsyncSession = Depends(get_db_session),
) -> ProductRatingSummary:
    """Get average rating and distribution for product. No authentication required."""
    summary = await review_service.get_product_rating_summary(
        session,
        product_id,
    )

    return ProductRatingSummary(
        average_rating=summary["average_rating"],
        total_reviews=summary["total_reviews"],
        rating_distribution=summary["rating_distribution"],
    )


@router.get(
    "/organization/{organization_id}/summary",
    response_model=ProductRatingSummary,
    summary="Get Organization Rating Summary",
    responses={
        200: {"description": "Aggregated rating summary across the organization."},
    },
)
async def get_organization_rating_summary(
    organization_id: Annotated[UUID, Path(description="The organization ID.")],
    session: AsyncSession = Depends(get_db_session),
) -> ProductRatingSummary:
    """Aggregate rating summary across every product in the organization.

    Returns the average rating, total review count, and 1-5 star distribution
    for every review left on a product owned by the organization. No
    authentication required — surfaced on the public creator storefront.
    """
    summary = await review_service.get_organization_rating_summary(
        session,
        organization_id,
    )

    return ProductRatingSummary(
        average_rating=summary["average_rating"],
        total_reviews=summary["total_reviews"],
        rating_distribution=summary["rating_distribution"],
    )


@router.get(
    "/organization/{organization_id}",
    response_model=list[OrganizationReviewPublic],
    summary="Get Organization Reviews",
    responses={
        200: {"description": "Recent reviews across the organization."},
    },
)
async def get_organization_reviews(
    organization_id: Annotated[UUID, Path(description="The organization ID.")],
    limit: int = 12,
    offset: int = 0,
    session: AsyncSession = Depends(get_db_session),
) -> list[OrganizationReviewPublic]:
    """Recent reviews across every product in the organization.

    Each entry includes the reviewed product's id and name so the storefront
    can link the review back to the product detail page. No authentication
    required.
    """
    reviews = await review_service.get_organization_recent_reviews(
        session,
        organization_id,
        limit,
        offset,
    )

    return [
        OrganizationReviewPublic(
            id=review.id,
            product_id=review.product_id,
            product_name=review.product.name,
            user_id=review.user_id,
            user_name=review.user.username or review.user.email,
            user_avatar=review.user.avatar_url,
            rating=review.rating,
            review_text=review.review_text,
            is_verified_purchase=review.is_verified_purchase,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )
        for review in reviews
    ]

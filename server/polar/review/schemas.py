from datetime import datetime
from uuid import UUID

from pydantic import Field

from polar.kit.schemas import Schema


class ReviewCreate(Schema):
    product_id: UUID
    order_id: UUID
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    review_text: str | None = Field(
        None, max_length=1000, description="Review text (max 1000 characters)"
    )


class ReviewUpdate(Schema):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    review_text: str | None = Field(
        None, max_length=1000, description="Review text (max 1000 characters)"
    )


class ReviewPublic(Schema):
    id: UUID
    product_id: UUID
    user_id: UUID
    user_name: str
    user_avatar: str | None
    rating: int
    review_text: str | None
    is_verified_purchase: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductRatingSummary(Schema):
    average_rating: float
    total_reviews: int
    rating_distribution: dict[int, int] = Field(
        description="Distribution of ratings (1-5 stars)"
    )

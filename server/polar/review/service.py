from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from polar.exceptions import PolarError
from polar.models import Order, Product, ProductReview
from polar.models.order import OrderStatus
from polar.postgres import AsyncSession

from .repository import ReviewRepository

log = structlog.get_logger()


class ReviewError(PolarError): ...


class ProductNotFoundError(ReviewError):
    def __init__(self, product_id: UUID):
        self.product_id = product_id
        message = f"Product {product_id} not found"
        super().__init__(message, 404)


class OrderNotFoundError(ReviewError):
    def __init__(self, order_id: UUID):
        self.order_id = order_id
        message = f"Order {order_id} not found"
        super().__init__(message, 404)


class ReviewNotFoundError(ReviewError):
    def __init__(self, review_id: UUID):
        self.review_id = review_id
        message = f"Review {review_id} not found"
        super().__init__(message, 404)


class NotVerifiedPurchaseError(ReviewError):
    def __init__(self, user_id: UUID, product_id: UUID):
        self.user_id = user_id
        self.product_id = product_id
        message = "You must purchase this product before leaving a review"
        super().__init__(message, 403)


class ReviewAlreadyExistsError(ReviewError):
    def __init__(self, user_id: UUID, product_id: UUID):
        self.user_id = user_id
        self.product_id = product_id
        message = "You have already reviewed this product"
        super().__init__(message, 409)


class UnauthorizedReviewAccessError(ReviewError):
    def __init__(self, review_id: UUID):
        self.review_id = review_id
        message = "You are not authorized to modify this review"
        super().__init__(message, 403)


class InvalidRatingError(ReviewError):
    def __init__(self, rating: int):
        self.rating = rating
        message = f"Rating must be between 1 and 5, got {rating}"
        super().__init__(message, 422)


class ReviewTextTooLongError(ReviewError):
    def __init__(self, length: int):
        self.length = length
        message = f"Review text must be 1000 characters or less, got {length}"
        super().__init__(message, 422)


class ReviewService:
    async def has_purchased_product(
        self,
        session: AsyncSession,
        user_id: UUID,
        product_id: UUID,
    ) -> bool:
        """Check if user has purchased product"""
        statement = select(Order).where(
            Order.customer_id.in_(
                select(Order.customer_id).where(Order.customer_id.is_not(None))
            ),
            Order.product_id == product_id,
            Order.status == OrderStatus.paid,
        )
        result = await session.execute(statement)
        order = result.scalar_one_or_none()
        return order is not None

    async def create_review(
        self,
        session: AsyncSession,
        user_id: UUID,
        product_id: UUID,
        order_id: UUID,
        rating: int,
        review_text: str | None = None,
    ) -> ProductReview:
        """Create product review with verified purchase validation"""
        if rating < 1 or rating > 5:
            raise InvalidRatingError(rating)

        if review_text and len(review_text) > 1000:
            raise ReviewTextTooLongError(len(review_text))

        statement = select(Product).where(Product.id == product_id)
        result = await session.execute(statement)
        product = result.scalar_one_or_none()

        if product is None:
            raise ProductNotFoundError(product_id)

        statement = select(Order).where(
            Order.id == order_id,
            Order.product_id == product_id,
            Order.status == OrderStatus.paid,
        )
        result = await session.execute(statement)
        order = result.scalar_one_or_none()

        if order is None:
            raise OrderNotFoundError(order_id)

        has_purchased = await self.has_purchased_product(session, user_id, product_id)

        if not has_purchased:
            raise NotVerifiedPurchaseError(user_id, product_id)

        repository = ReviewRepository.from_session(session)

        try:
            review = ProductReview(
                product_id=product_id,
                user_id=user_id,
                order_id=order_id,
                rating=rating,
                review_text=review_text,
                is_verified_purchase=True,
            )
            review = await repository.create(review)
        except IntegrityError:
            raise ReviewAlreadyExistsError(user_id, product_id)

        log.info(
            "review.created",
            user_id=user_id,
            product_id=product_id,
            review_id=review.id,
            rating=rating,
        )

        return review

    async def update_review(
        self,
        session: AsyncSession,
        review_id: UUID,
        user_id: UUID,
        rating: int,
        review_text: str | None = None,
    ) -> ProductReview:
        """Update existing review with authorization check"""
        if rating < 1 or rating > 5:
            raise InvalidRatingError(rating)

        if review_text and len(review_text) > 1000:
            raise ReviewTextTooLongError(len(review_text))

        repository = ReviewRepository.from_session(session)

        review = await repository.get_by_id(review_id)

        if review is None:
            raise ReviewNotFoundError(review_id)

        if review.user_id != user_id:
            raise UnauthorizedReviewAccessError(review_id)

        review = await repository.update(
            review,
            update_dict={
                "rating": rating,
                "review_text": review_text,
            },
        )

        log.info(
            "review.updated",
            user_id=user_id,
            review_id=review_id,
            rating=rating,
        )

        return review

    async def delete_review(
        self,
        session: AsyncSession,
        review_id: UUID,
        user_id: UUID,
    ) -> None:
        """Delete review with authorization check"""
        repository = ReviewRepository.from_session(session)

        review = await repository.get_by_id(review_id)

        if review is None:
            raise ReviewNotFoundError(review_id)

        if review.user_id != user_id:
            raise UnauthorizedReviewAccessError(review_id)

        await repository.delete_review(review_id)

        log.info(
            "review.deleted",
            user_id=user_id,
            review_id=review_id,
        )

    async def get_product_reviews(
        self,
        session: AsyncSession,
        product_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ProductReview]:
        """Get reviews for product with pagination"""
        repository = ReviewRepository.from_session(session)
        return await repository.get_product_reviews(product_id, limit, offset)

    async def get_product_rating_summary(
        self,
        session: AsyncSession,
        product_id: UUID,
    ) -> dict:
        """Get average rating, count, and distribution for product"""
        repository = ReviewRepository.from_session(session)

        summary = await repository.get_product_rating_summary(product_id)
        distribution = await repository.get_rating_distribution(product_id)

        return {
            "average_rating": summary["average_rating"],
            "total_reviews": summary["total_reviews"],
            "rating_distribution": distribution,
        }


review_service = ReviewService()

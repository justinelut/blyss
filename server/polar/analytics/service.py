from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select

from polar.models import (
    Donation,
    NewsletterSubscription,
    Product,
    ProductCartEvent,
    ProductReview,
    ProductView,
)
from polar.postgres import AsyncReadSession


class AnalyticsService:
    async def get_product_view_counts(
        self,
        session: AsyncReadSession,
        organization_id: UUID,
        days: int = 30,
    ) -> list[dict]:
        """Get product view counts for the last N days"""
        since = datetime.utcnow() - timedelta(days=days)

        statement = (
            select(
                Product.id,
                Product.name,
                func.count(ProductView.id).label("view_count"),
            )
            .join(ProductView, ProductView.product_id == Product.id)
            .where(
                Product.organization_id == organization_id,
                Product.is_deleted.is_(False),
                ProductView.created_at >= since,
            )
            .group_by(Product.id, Product.name)
            .order_by(func.count(ProductView.id).desc())
        )

        result = await session.execute(statement)
        rows = result.all()

        return [
            {
                "product_id": str(row.id),
                "product_name": row.name,
                "view_count": row.view_count,
            }
            for row in rows
        ]

    async def get_add_to_cart_counts(
        self,
        session: AsyncReadSession,
        organization_id: UUID,
        days: int = 30,
    ) -> list[dict]:
        """Get Add to Cart click counts for the last N days"""
        since = datetime.utcnow() - timedelta(days=days)

        statement = (
            select(
                Product.id,
                Product.name,
                func.count(ProductCartEvent.id).label("cart_count"),
            )
            .join(ProductCartEvent, ProductCartEvent.product_id == Product.id)
            .where(
                Product.organization_id == organization_id,
                Product.is_deleted.is_(False),
                ProductCartEvent.created_at >= since,
            )
            .group_by(Product.id, Product.name)
            .order_by(func.count(ProductCartEvent.id).desc())
        )

        result = await session.execute(statement)
        rows = result.all()

        return [
            {
                "product_id": str(row.id),
                "product_name": row.name,
                "cart_count": row.cart_count,
            }
            for row in rows
        ]

    async def get_total_donations(
        self,
        session: AsyncReadSession,
        organization_id: UUID,
        days: int = 30,
    ) -> dict:
        """Get total donations received for the last N days"""
        since = datetime.utcnow() - timedelta(days=days)

        statement = select(
            func.count(Donation.id).label("donation_count"),
            func.sum(Donation.amount).label("total_amount"),
        ).where(
            Donation.organization_id == organization_id,
            Donation.payment_status == "success",
            Donation.created_at >= since,
        )

        result = await session.execute(statement)
        row = result.one()

        return {
            "donation_count": row.donation_count or 0,
            "total_amount": row.total_amount or 0,
        }

    async def get_newsletter_subscriber_growth(
        self,
        session: AsyncReadSession,
        organization_id: UUID,
        days: int = 30,
    ) -> list[dict]:
        """Get newsletter subscriber growth over the last N days"""
        since = datetime.utcnow() - timedelta(days=days)

        statement = (
            select(
                func.date(NewsletterSubscription.created_at).label("date"),
                func.count(NewsletterSubscription.id).label("new_subscribers"),
            )
            .where(
                NewsletterSubscription.organization_id == organization_id,
                NewsletterSubscription.created_at >= since,
            )
            .group_by(func.date(NewsletterSubscription.created_at))
            .order_by(func.date(NewsletterSubscription.created_at))
        )

        result = await session.execute(statement)
        rows = result.all()

        return [
            {
                "date": str(row.date),
                "new_subscribers": row.new_subscribers,
            }
            for row in rows
        ]

    async def get_average_rating_trends(
        self,
        session: AsyncReadSession,
        organization_id: UUID,
        days: int = 30,
    ) -> list[dict]:
        """Get average rating trends for products over the last N days"""
        since = datetime.utcnow() - timedelta(days=days)

        statement = (
            select(
                Product.id,
                Product.name,
                func.avg(ProductReview.rating).label("average_rating"),
                func.count(ProductReview.id).label("review_count"),
            )
            .join(ProductReview, ProductReview.product_id == Product.id)
            .where(
                Product.organization_id == organization_id,
                Product.is_deleted.is_(False),
                ProductReview.created_at >= since,
            )
            .group_by(Product.id, Product.name)
            .order_by(func.avg(ProductReview.rating).desc())
        )

        result = await session.execute(statement)
        rows = result.all()

        return [
            {
                "product_id": str(row.id),
                "product_name": row.name,
                "average_rating": float(row.average_rating)
                if row.average_rating
                else 0,
                "review_count": row.review_count,
            }
            for row in rows
        ]


analytics_service = AnalyticsService()

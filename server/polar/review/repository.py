from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.orm import joinedload

from polar.kit.repository import RepositoryBase, RepositoryIDMixin
from polar.models import Product, ProductReview


class ReviewRepository(
    RepositoryBase[ProductReview],
    RepositoryIDMixin[ProductReview, UUID],
):
    model = ProductReview

    async def get_product_reviews(
        self,
        product_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ProductReview]:
        """Get reviews for product with pagination"""
        statement = (
            select(ProductReview)
            .where(ProductReview.product_id == product_id)
            .order_by(ProductReview.created_at.desc())
            .limit(limit)
            .offset(offset)
            .options(joinedload(ProductReview.user))
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def get_product_rating_summary(
        self,
        product_id: UUID,
    ) -> dict:
        """Get average rating and count for product"""
        statement = select(
            func.avg(ProductReview.rating).label("average_rating"),
            func.count(ProductReview.id).label("total_reviews"),
        ).where(ProductReview.product_id == product_id)

        result = await self.session.execute(statement)
        row = result.one()

        return {
            "average_rating": float(row.average_rating) if row.average_rating else 0.0,
            "total_reviews": row.total_reviews,
        }

    async def get_rating_summaries_for_products(
        self,
        product_ids: list[UUID],
    ) -> dict[UUID, dict]:
        """Batch: average rating + count for many products in ONE query.

        Returns {product_id: {"average_rating": float, "total_reviews": int}}
        for products that HAVE reviews. Callers default missing ids to 0/0.
        Avoids the N+1 that per-card rating lookups would otherwise cause.
        """
        if not product_ids:
            return {}

        statement = (
            select(
                ProductReview.product_id,
                func.avg(ProductReview.rating).label("average_rating"),
                func.count(ProductReview.id).label("total_reviews"),
            )
            .where(ProductReview.product_id.in_(product_ids))
            .group_by(ProductReview.product_id)
        )
        result = await self.session.execute(statement)
        return {
            row.product_id: {
                "average_rating": float(row.average_rating)
                if row.average_rating
                else 0.0,
                "total_reviews": row.total_reviews,
            }
            for row in result.all()
        }

    async def get_rating_distribution(
        self,
        product_id: UUID,
    ) -> dict[int, int]:
        """Get rating distribution (1-5 stars) for product"""
        statement = (
            select(
                ProductReview.rating,
                func.count(ProductReview.id).label("count"),
            )
            .where(ProductReview.product_id == product_id)
            .group_by(ProductReview.rating)
        )

        result = await self.session.execute(statement)
        rows = result.all()

        distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for row in rows:
            distribution[row.rating] = row.count

        return distribution

    async def calculate_average_rating(
        self,
        product_id: UUID,
    ) -> float:
        """Calculate average rating for product"""
        statement = select(func.avg(ProductReview.rating)).where(
            ProductReview.product_id == product_id
        )

        result = await self.session.execute(statement)
        average = result.scalar()

        return float(average) if average else 0.0

    async def get_by_user_and_product(
        self,
        user_id: UUID,
        product_id: UUID,
    ) -> ProductReview | None:
        """Get review by user and product"""
        statement = select(ProductReview).where(
            ProductReview.user_id == user_id,
            ProductReview.product_id == product_id,
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def delete_review(
        self,
        review_id: UUID,
    ) -> None:
        """Delete review"""
        statement = delete(ProductReview).where(ProductReview.id == review_id)
        await self.session.execute(statement)

    # ---- Organization-level aggregates --------------------------------------

    async def get_organization_rating_summary(
        self,
        organization_id: UUID,
    ) -> dict:
        """Aggregate average rating and total review count across every
        product owned by the organization. Joins through products.
        """
        statement = (
            select(
                func.avg(ProductReview.rating).label("average_rating"),
                func.count(ProductReview.id).label("total_reviews"),
            )
            .join(Product, Product.id == ProductReview.product_id)
            .where(Product.organization_id == organization_id)
        )

        result = await self.session.execute(statement)
        row = result.one()

        return {
            "average_rating": float(row.average_rating) if row.average_rating else 0.0,
            "total_reviews": row.total_reviews,
        }

    async def get_organization_rating_distribution(
        self,
        organization_id: UUID,
    ) -> dict[int, int]:
        """Rating distribution (1-5) across all products in the organization."""
        statement = (
            select(
                ProductReview.rating,
                func.count(ProductReview.id).label("count"),
            )
            .join(Product, Product.id == ProductReview.product_id)
            .where(Product.organization_id == organization_id)
            .group_by(ProductReview.rating)
        )

        result = await self.session.execute(statement)
        rows = result.all()

        distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for row in rows:
            distribution[row.rating] = row.count

        return distribution

    async def get_organization_recent_reviews(
        self,
        organization_id: UUID,
        limit: int = 12,
        offset: int = 0,
    ) -> list[ProductReview]:
        """Most recent reviews across every product in the organization."""
        statement = (
            select(ProductReview)
            .join(Product, Product.id == ProductReview.product_id)
            .where(Product.organization_id == organization_id)
            .order_by(ProductReview.created_at.desc())
            .limit(limit)
            .offset(offset)
            .options(
                joinedload(ProductReview.user),
                joinedload(ProductReview.product),
            )
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

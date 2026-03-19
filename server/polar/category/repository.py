from uuid import UUID

from sqlalchemy import func, select

from polar.kit.pagination import PaginationParams
from polar.kit.repository import RepositoryBase, RepositoryIDMixin
from polar.models import Product, ProductCategory, ProductCategoryAssignment


class CategoryRepository(
    RepositoryBase[ProductCategory],
    RepositoryIDMixin[ProductCategory, UUID],
):
    model = ProductCategory

    async def get_by_slug(self, slug: str) -> ProductCategory | None:
        statement = select(ProductCategory).where(ProductCategory.slug == slug)
        return await self.get_one_or_none(statement)

    async def get_products_by_category(
        self,
        category_id: UUID,
        pagination: PaginationParams,
    ) -> tuple[list[Product], int]:
        statement = (
            select(Product)
            .join(
                ProductCategoryAssignment,
                ProductCategoryAssignment.product_id == Product.id,
            )
            .where(ProductCategoryAssignment.category_id == category_id)
            .where(Product.is_archived.is_(False))
            .order_by(Product.created_at.desc())
        )

        return await self.paginate(
            statement, limit=pagination.limit, page=pagination.page
        )

    async def get_product_count(self, category_id: UUID) -> int:
        statement = (
            select(func.count(ProductCategoryAssignment.id))
            .join(
                Product,
                Product.id == ProductCategoryAssignment.product_id,
            )
            .where(ProductCategoryAssignment.category_id == category_id)
            .where(Product.is_archived.is_(False))
        )

        result = await self.session.execute(statement)
        return result.scalar_one()

    async def get_all_active(self) -> list[ProductCategory]:
        statement = (
            select(ProductCategory)
            .where(ProductCategory.is_active.is_(True))
            .order_by(ProductCategory.display_order.asc(), ProductCategory.name.asc())
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

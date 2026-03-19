from uuid import UUID

import structlog

from polar.exceptions import PolarError
from polar.kit.pagination import PaginationParams
from polar.models import Product, ProductCategory, ProductCategoryAssignment
from polar.postgres import AsyncSession

from .repository import CategoryRepository

log = structlog.get_logger()


class CategoryError(PolarError): ...


class CategorySlugAlreadyExistsError(CategoryError):
    def __init__(self, slug: str):
        self.slug = slug
        message = f"Category with slug '{slug}' already exists"
        super().__init__(message, 409)


class CategoryNotFoundError(CategoryError):
    def __init__(self, category_id: UUID | str):
        self.category_id = category_id
        message = f"Category {category_id} not found"
        super().__init__(message, 404)


class ProductNotFoundError(CategoryError):
    def __init__(self, product_id: UUID):
        self.product_id = product_id
        message = f"Product {product_id} not found"
        super().__init__(message, 404)


class ProductCategoryAssignmentAlreadyExistsError(CategoryError):
    def __init__(self, product_id: UUID, category_id: UUID):
        self.product_id = product_id
        self.category_id = category_id
        message = f"Product {product_id} is already assigned to category {category_id}"
        super().__init__(message, 409)


class CategoryService:
    async def create_category(
        self,
        session: AsyncSession,
        name: str,
        slug: str,
        description: str | None = None,
        display_order: int = 0,
    ) -> ProductCategory:
        """Create new product category"""
        repository = CategoryRepository.from_session(session)

        existing = await repository.get_by_slug(slug)
        if existing is not None:
            raise CategorySlugAlreadyExistsError(slug)

        category = ProductCategory(
            name=name,
            slug=slug,
            description=description,
            display_order=display_order,
            is_active=True,
        )

        category = await repository.create(category)

        log.info(
            "category.created",
            category_id=category.id,
            slug=slug,
            name=name,
        )

        return category

    async def update_category(
        self,
        session: AsyncSession,
        category_id: UUID,
        name: str | None = None,
        description: str | None = None,
        display_order: int | None = None,
        is_active: bool | None = None,
    ) -> ProductCategory:
        """Update existing category"""
        repository = CategoryRepository.from_session(session)

        category = await repository.get_by_id(category_id)
        if category is None:
            raise CategoryNotFoundError(category_id)

        update_dict = {}
        if name is not None:
            update_dict["name"] = name
        if description is not None:
            update_dict["description"] = description
        if display_order is not None:
            update_dict["display_order"] = display_order
        if is_active is not None:
            update_dict["is_active"] = is_active

        if update_dict:
            category = await repository.update(category, update_dict=update_dict)

        log.info(
            "category.updated",
            category_id=category.id,
            updates=update_dict,
        )

        return category

    async def delete_category(
        self,
        session: AsyncSession,
        category_id: UUID,
    ) -> None:
        """Delete category"""
        repository = CategoryRepository.from_session(session)

        category = await repository.get_by_id(category_id)
        if category is None:
            raise CategoryNotFoundError(category_id)

        await repository.delete(category)

        log.info(
            "category.deleted",
            category_id=category_id,
        )

    async def assign_product_to_category(
        self,
        session: AsyncSession,
        product_id: UUID,
        category_id: UUID,
    ) -> ProductCategoryAssignment:
        """Assign product to category"""
        from polar.product.repository import ProductRepository

        product_repository = ProductRepository.from_session(session)
        category_repository = CategoryRepository.from_session(session)

        product = await product_repository.get_by_id(product_id)
        if product is None:
            raise ProductNotFoundError(product_id)

        category = await category_repository.get_by_id(category_id)
        if category is None:
            raise CategoryNotFoundError(category_id)

        assignment = ProductCategoryAssignment(
            product_id=product_id,
            category_id=category_id,
        )

        session.add(assignment)

        log.info(
            "category.product_assigned",
            product_id=product_id,
            category_id=category_id,
        )

        return assignment

    async def unassign_product_from_category(
        self,
        session: AsyncSession,
        product_id: UUID,
        category_id: UUID,
    ) -> None:
        """Unassign product from category"""
        from sqlalchemy import delete

        statement = delete(ProductCategoryAssignment).where(
            ProductCategoryAssignment.product_id == product_id,
            ProductCategoryAssignment.category_id == category_id,
        )

        await session.execute(statement)

        log.info(
            "category.product_unassigned",
            product_id=product_id,
            category_id=category_id,
        )

    async def get_products_by_category(
        self,
        session: AsyncSession,
        category_slug: str,
        pagination: PaginationParams,
    ) -> tuple[list[Product], int]:
        """Get products in category"""
        repository = CategoryRepository.from_session(session)

        category = await repository.get_by_slug(category_slug)
        if category is None:
            raise CategoryNotFoundError(category_slug)

        return await repository.get_products_by_category(category.id, pagination)

    async def get_all_categories_with_counts(
        self,
        session: AsyncSession,
    ) -> list[tuple[ProductCategory, int]]:
        """Get all active categories with product counts"""
        repository = CategoryRepository.from_session(session)

        categories = await repository.get_all_active()

        categories_with_counts = []
        for category in categories:
            count = await repository.get_product_count(category.id)
            categories_with_counts.append((category, count))

        return categories_with_counts


category_service = CategoryService()

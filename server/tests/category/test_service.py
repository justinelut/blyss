import pytest

from polar.category.service import (
    CategoryNotFoundError,
    CategorySlugAlreadyExistsError,
    ProductNotFoundError,
    category_service,
)
from polar.models import Product, ProductCategory, ProductCategoryAssignment
from polar.postgres import AsyncSession
from tests.fixtures.database import SaveFixture


@pytest.mark.asyncio
class TestCreateCategory:
    async def test_new_category(
        self,
        session: AsyncSession,
    ) -> None:
        name = "Electronics"
        slug = "electronics"
        description = "Electronic products"

        category = await category_service.create_category(
            session, name, slug, description
        )

        assert category.name == name
        assert category.slug == slug
        assert category.description == description
        assert category.is_active is True
        assert category.display_order == 0

    async def test_duplicate_slug(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
    ) -> None:
        slug = "electronics"

        existing = ProductCategory(
            name="Electronics",
            slug=slug,
            description="Existing category",
            display_order=0,
            is_active=True,
        )
        await save_fixture(existing)

        with pytest.raises(CategorySlugAlreadyExistsError):
            await category_service.create_category(
                session, "New Electronics", slug, "New description"
            )


@pytest.mark.asyncio
class TestUpdateCategory:
    async def test_update_name_and_description(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
    ) -> None:
        category = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Old description",
            display_order=0,
            is_active=True,
        )
        await save_fixture(category)

        updated = await category_service.update_category(
            session,
            category.id,
            name="Updated Electronics",
            description="New description",
        )

        assert updated.id == category.id
        assert updated.name == "Updated Electronics"
        assert updated.description == "New description"

    async def test_update_display_order(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
    ) -> None:
        category = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Description",
            display_order=0,
            is_active=True,
        )
        await save_fixture(category)

        updated = await category_service.update_category(
            session,
            category.id,
            display_order=5,
        )

        assert updated.display_order == 5

    async def test_category_not_found(
        self,
        session: AsyncSession,
    ) -> None:
        from uuid import uuid4

        with pytest.raises(CategoryNotFoundError):
            await category_service.update_category(
                session,
                uuid4(),
                name="Updated Name",
            )


@pytest.mark.asyncio
class TestDeleteCategory:
    async def test_delete_existing_category(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
    ) -> None:
        category = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Description",
            display_order=0,
            is_active=True,
        )
        await save_fixture(category)

        await category_service.delete_category(session, category.id)

        from polar.category.repository import CategoryRepository

        repository = CategoryRepository.from_session(session)
        deleted = await repository.get_by_id(category.id)

        assert deleted is None

    async def test_category_not_found(
        self,
        session: AsyncSession,
    ) -> None:
        from uuid import uuid4

        with pytest.raises(CategoryNotFoundError):
            await category_service.delete_category(session, uuid4())


@pytest.mark.asyncio
class TestAssignProductToCategory:
    async def test_assign_product(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        product: Product,
    ) -> None:
        category = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Description",
            display_order=0,
            is_active=True,
        )
        await save_fixture(category)

        assignment = await category_service.assign_product_to_category(
            session,
            product.id,
            category.id,
        )

        assert assignment.product_id == product.id
        assert assignment.category_id == category.id

    async def test_product_not_found(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
    ) -> None:
        from uuid import uuid4

        category = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Description",
            display_order=0,
            is_active=True,
        )
        await save_fixture(category)

        with pytest.raises(ProductNotFoundError):
            await category_service.assign_product_to_category(
                session,
                uuid4(),
                category.id,
            )

    async def test_category_not_found(
        self,
        session: AsyncSession,
        product: Product,
    ) -> None:
        from uuid import uuid4

        with pytest.raises(CategoryNotFoundError):
            await category_service.assign_product_to_category(
                session,
                product.id,
                uuid4(),
            )


@pytest.mark.asyncio
class TestUnassignProductFromCategory:
    async def test_unassign_product(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        product: Product,
    ) -> None:
        category = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Description",
            display_order=0,
            is_active=True,
        )
        await save_fixture(category)

        assignment = ProductCategoryAssignment(
            product_id=product.id,
            category_id=category.id,
        )
        await save_fixture(assignment)

        await category_service.unassign_product_from_category(
            session,
            product.id,
            category.id,
        )

        from sqlalchemy import select

        statement = select(ProductCategoryAssignment).where(
            ProductCategoryAssignment.product_id == product.id,
            ProductCategoryAssignment.category_id == category.id,
        )
        result = await session.execute(statement)
        deleted = result.scalar_one_or_none()

        assert deleted is None


@pytest.mark.asyncio
class TestGetProductsByCategory:
    async def test_get_products(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        product: Product,
    ) -> None:
        category = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Description",
            display_order=0,
            is_active=True,
        )
        await save_fixture(category)

        assignment = ProductCategoryAssignment(
            product_id=product.id,
            category_id=category.id,
        )
        await save_fixture(assignment)

        from polar.kit.pagination import PaginationParams

        products, count = await category_service.get_products_by_category(
            session,
            "electronics",
            PaginationParams(limit=10, page=1),
        )

        assert count == 1
        assert len(products) == 1
        assert products[0].id == product.id

    async def test_category_not_found(
        self,
        session: AsyncSession,
    ) -> None:
        from polar.kit.pagination import PaginationParams

        with pytest.raises(CategoryNotFoundError):
            await category_service.get_products_by_category(
                session,
                "nonexistent",
                PaginationParams(limit=10, page=1),
            )


@pytest.mark.asyncio
class TestGetAllCategoriesWithCounts:
    async def test_get_categories_with_counts(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        product: Product,
    ) -> None:
        category1 = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Description",
            display_order=0,
            is_active=True,
        )
        category2 = ProductCategory(
            name="Books",
            slug="books",
            description="Description",
            display_order=1,
            is_active=True,
        )
        await save_fixture(category1)
        await save_fixture(category2)

        assignment = ProductCategoryAssignment(
            product_id=product.id,
            category_id=category1.id,
        )
        await save_fixture(assignment)

        categories_with_counts = await category_service.get_all_categories_with_counts(
            session
        )

        assert len(categories_with_counts) == 2

        category_dict = {cat.id: count for cat, count in categories_with_counts}
        assert category_dict[category1.id] == 1
        assert category_dict[category2.id] == 0

    async def test_display_order(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
    ) -> None:
        category1 = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Description",
            display_order=2,
            is_active=True,
        )
        category2 = ProductCategory(
            name="Books",
            slug="books",
            description="Description",
            display_order=1,
            is_active=True,
        )
        await save_fixture(category1)
        await save_fixture(category2)

        categories_with_counts = await category_service.get_all_categories_with_counts(
            session
        )

        assert categories_with_counts[0][0].slug == "books"
        assert categories_with_counts[1][0].slug == "electronics"

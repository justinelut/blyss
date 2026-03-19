import pytest
from httpx import AsyncClient

from polar.models import Product, ProductCategory, ProductCategoryAssignment, User
from tests.fixtures.database import SaveFixture


@pytest.mark.asyncio
class TestCreateCategory:
    async def test_authenticated_user(
        self,
        client: AsyncClient,
        user: User,
    ) -> None:
        response = await client.post(
            "/v1/categories/",
            json={
                "name": "Electronics",
                "slug": "electronics",
                "description": "Electronic products",
                "display_order": 0,
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Electronics"
        assert data["slug"] == "electronics"
        assert data["description"] == "Electronic products"
        assert data["is_active"] is True

    async def test_duplicate_slug(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        user: User,
    ) -> None:
        existing = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Existing category",
            display_order=0,
            is_active=True,
        )
        await save_fixture(existing)

        response = await client.post(
            "/v1/categories/",
            json={
                "name": "New Electronics",
                "slug": "electronics",
                "description": "New description",
                "display_order": 0,
            },
        )

        assert response.status_code == 409

    async def test_unauthenticated_user(
        self,
        client: AsyncClient,
    ) -> None:
        response = await client.post(
            "/v1/categories/",
            json={
                "name": "Electronics",
                "slug": "electronics",
                "description": "Electronic products",
                "display_order": 0,
            },
        )

        assert response.status_code == 401


@pytest.mark.asyncio
class TestListCategories:
    async def test_list_active_categories(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
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
        inactive_category = ProductCategory(
            name="Inactive",
            slug="inactive",
            description="Description",
            display_order=2,
            is_active=False,
        )
        await save_fixture(category1)
        await save_fixture(category2)
        await save_fixture(inactive_category)

        assignment = ProductCategoryAssignment(
            product_id=product.id,
            category_id=category1.id,
        )
        await save_fixture(assignment)

        response = await client.get("/v1/categories/")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 2
        assert data["items"][0]["slug"] == "electronics"
        assert data["items"][0]["product_count"] == 1
        assert data["items"][1]["slug"] == "books"
        assert data["items"][1]["product_count"] == 0


@pytest.mark.asyncio
class TestGetCategory:
    async def test_existing_category(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        product: Product,
    ) -> None:
        category = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Electronic products",
            display_order=0,
            is_active=True,
        )
        await save_fixture(category)

        assignment = ProductCategoryAssignment(
            product_id=product.id,
            category_id=category.id,
        )
        await save_fixture(assignment)

        response = await client.get("/v1/categories/electronics")

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Electronics"
        assert data["slug"] == "electronics"
        assert data["product_count"] == 1

    async def test_nonexistent_category(
        self,
        client: AsyncClient,
    ) -> None:
        response = await client.get("/v1/categories/nonexistent")

        assert response.status_code == 404


@pytest.mark.asyncio
class TestGetCategoryProducts:
    async def test_get_products(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
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

        response = await client.get("/v1/categories/electronics/products")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 1
        assert data["items"][0]["id"] == str(product.id)

    async def test_category_not_found(
        self,
        client: AsyncClient,
    ) -> None:
        response = await client.get("/v1/categories/nonexistent/products")

        assert response.status_code == 404


@pytest.mark.asyncio
class TestUpdateCategory:
    async def test_authenticated_user(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        user: User,
    ) -> None:
        category = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Old description",
            display_order=0,
            is_active=True,
        )
        await save_fixture(category)

        response = await client.put(
            f"/v1/categories/{category.id}",
            json={
                "name": "Updated Electronics",
                "description": "New description",
                "display_order": 5,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Electronics"
        assert data["description"] == "New description"
        assert data["display_order"] == 5

    async def test_category_not_found(
        self,
        client: AsyncClient,
        user: User,
    ) -> None:
        from uuid import uuid4

        response = await client.put(
            f"/v1/categories/{uuid4()}",
            json={
                "name": "Updated Name",
            },
        )

        assert response.status_code == 404

    async def test_unauthenticated_user(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
    ) -> None:
        category = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Description",
            display_order=0,
            is_active=True,
        )
        await save_fixture(category)

        response = await client.put(
            f"/v1/categories/{category.id}",
            json={
                "name": "Updated Name",
            },
        )

        assert response.status_code == 401


@pytest.mark.asyncio
class TestDeleteCategory:
    async def test_authenticated_user(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        user: User,
    ) -> None:
        category = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Description",
            display_order=0,
            is_active=True,
        )
        await save_fixture(category)

        response = await client.delete(f"/v1/categories/{category.id}")

        assert response.status_code == 204

    async def test_category_not_found(
        self,
        client: AsyncClient,
        user: User,
    ) -> None:
        from uuid import uuid4

        response = await client.delete(f"/v1/categories/{uuid4()}")

        assert response.status_code == 404

    async def test_unauthenticated_user(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
    ) -> None:
        category = ProductCategory(
            name="Electronics",
            slug="electronics",
            description="Description",
            display_order=0,
            is_active=True,
        )
        await save_fixture(category)

        response = await client.delete(f"/v1/categories/{category.id}")

        assert response.status_code == 401


@pytest.mark.asyncio
class TestAssignProductToCategory:
    async def test_authenticated_user(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        user: User,
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

        response = await client.post(
            "/v1/categories/assignments",
            json={
                "product_id": str(product.id),
                "category_id": str(category.id),
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert "message" in data

    async def test_product_not_found(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        user: User,
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

        response = await client.post(
            "/v1/categories/assignments",
            json={
                "product_id": str(uuid4()),
                "category_id": str(category.id),
            },
        )

        assert response.status_code == 404

    async def test_category_not_found(
        self,
        client: AsyncClient,
        user: User,
        product: Product,
    ) -> None:
        from uuid import uuid4

        response = await client.post(
            "/v1/categories/assignments",
            json={
                "product_id": str(product.id),
                "category_id": str(uuid4()),
            },
        )

        assert response.status_code == 404

    async def test_unauthenticated_user(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
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

        response = await client.post(
            "/v1/categories/assignments",
            json={
                "product_id": str(product.id),
                "category_id": str(category.id),
            },
        )

        assert response.status_code == 401


@pytest.mark.asyncio
class TestUnassignProductFromCategory:
    async def test_authenticated_user(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        user: User,
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

        response = await client.delete(
            f"/v1/categories/assignments/{product.id}/{category.id}"
        )

        assert response.status_code == 204

    async def test_unauthenticated_user(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
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

        response = await client.delete(
            f"/v1/categories/assignments/{product.id}/{category.id}"
        )

        assert response.status_code == 401

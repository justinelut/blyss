import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import func

from polar.models import Organization, Product, ProductView, User
from polar.postgres import AsyncSession
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import create_product


@pytest.mark.asyncio
class TestGetProductBySlug:
    async def test_anonymous_user_can_access(
        self, client: AsyncClient, product: Product
    ) -> None:
        """Test that anonymous users can access product detail by slug"""
        response = await client.get(f"/v1/products/slug/{product.name}")

        assert response.status_code == 200
        json = response.json()
        assert json["id"] == str(product.id)
        assert json["name"] == product.name

    async def test_authenticated_user_can_access(
        self, client: AsyncClient, product: Product, user: User
    ) -> None:
        """Test that authenticated users can access product detail by slug"""
        response = await client.get(f"/v1/products/slug/{product.name}")

        assert response.status_code == 200
        json = response.json()
        assert json["id"] == str(product.id)

    async def test_nonexistent_slug(self, client: AsyncClient) -> None:
        """Test that requesting a nonexistent slug returns 404"""
        response = await client.get("/v1/products/slug/nonexistent-product-slug")

        assert response.status_code == 404

    async def test_archived_product_not_accessible(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        product: Product,
    ) -> None:
        """Test that archived products are not accessible by slug"""
        product.is_archived = True
        await save_fixture(product)

        response = await client.get(f"/v1/products/slug/{product.name}")

        assert response.status_code == 404

    async def test_deleted_product_not_accessible(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        product: Product,
    ) -> None:
        """Test that deleted products are not accessible by slug"""
        product.is_deleted = True
        await save_fixture(product)

        response = await client.get(f"/v1/products/slug/{product.name}")

        assert response.status_code == 404

    async def test_returns_product_with_organization(
        self,
        client: AsyncClient,
        product: Product,
        organization: Organization,
    ) -> None:
        """Test that product detail includes organization information"""
        response = await client.get(f"/v1/products/slug/{product.name}")

        assert response.status_code == 200
        json = response.json()
        assert json["organization"]["id"] == str(organization.id)
        assert json["organization"]["name"] == organization.name

    async def test_returns_product_with_prices(
        self,
        client: AsyncClient,
        product: Product,
    ) -> None:
        """Test that product detail includes price information"""
        response = await client.get(f"/v1/products/slug/{product.name}")

        assert response.status_code == 200
        json = response.json()
        assert "prices" in json
        assert len(json["prices"]) > 0


@pytest.mark.asyncio
class TestGetRelatedProducts:
    async def test_anonymous_user_can_access(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that anonymous users can access related products"""
        related_product = await create_product(
            save_fixture,
            organization=organization,
        )

        response = await client.get(f"/v1/products/{product.id}/related")

        assert response.status_code == 200
        json = response.json()
        assert "items" in json
        assert len(json["items"]) == 1
        assert json["items"][0]["id"] == str(related_product.id)

    async def test_returns_products_from_same_organization(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that related products are from the same organization"""
        related_1 = await create_product(
            save_fixture,
            organization=organization,
        )
        related_2 = await create_product(
            save_fixture,
            organization=organization,
        )

        response = await client.get(f"/v1/products/{product.id}/related")

        assert response.status_code == 200
        json = response.json()
        assert len(json["items"]) == 2
        product_ids = {item["id"] for item in json["items"]}
        assert str(related_1.id) in product_ids
        assert str(related_2.id) in product_ids

    async def test_excludes_current_product(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that the current product is excluded from related products"""
        await create_product(
            save_fixture,
            organization=organization,
        )

        response = await client.get(f"/v1/products/{product.id}/related")

        assert response.status_code == 200
        json = response.json()
        product_ids = {item["id"] for item in json["items"]}
        assert str(product.id) not in product_ids

    async def test_excludes_archived_products(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that archived products are excluded from related products"""
        active_product = await create_product(
            save_fixture,
            organization=organization,
        )
        archived_product = await create_product(
            save_fixture,
            organization=organization,
        )
        archived_product.is_archived = True
        await save_fixture(archived_product)

        response = await client.get(f"/v1/products/{product.id}/related")

        assert response.status_code == 200
        json = response.json()
        assert len(json["items"]) == 1
        assert json["items"][0]["id"] == str(active_product.id)

    async def test_excludes_deleted_products(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that deleted products are excluded from related products"""
        active_product = await create_product(
            save_fixture,
            organization=organization,
        )
        deleted_product = await create_product(
            save_fixture,
            organization=organization,
        )
        deleted_product.is_deleted = True
        await save_fixture(deleted_product)

        response = await client.get(f"/v1/products/{product.id}/related")

        assert response.status_code == 200
        json = response.json()
        assert len(json["items"]) == 1
        assert json["items"][0]["id"] == str(active_product.id)

    async def test_excludes_products_from_other_organizations(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        organization: Organization,
        organization_second: Organization,
        product: Product,
    ) -> None:
        """Test that products from other organizations are excluded"""
        same_org_product = await create_product(
            save_fixture,
            organization=organization,
        )
        other_org_product = await create_product(
            save_fixture,
            organization=organization_second,
        )

        response = await client.get(f"/v1/products/{product.id}/related")

        assert response.status_code == 200
        json = response.json()
        assert len(json["items"]) == 1
        assert json["items"][0]["id"] == str(same_org_product.id)
        product_ids = {item["id"] for item in json["items"]}
        assert str(other_org_product.id) not in product_ids

    async def test_respects_limit_parameter(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that the limit parameter controls the number of results"""
        for _ in range(10):
            await create_product(
                save_fixture,
                organization=organization,
            )

        response = await client.get(
            f"/v1/products/{product.id}/related",
            params={"limit": 3},
        )

        assert response.status_code == 200
        json = response.json()
        assert len(json["items"]) == 3

    async def test_default_limit_is_four(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that the default limit is 4 products"""
        for _ in range(10):
            await create_product(
                save_fixture,
                organization=organization,
            )

        response = await client.get(f"/v1/products/{product.id}/related")

        assert response.status_code == 200
        json = response.json()
        assert len(json["items"]) == 4

    async def test_limit_validation_minimum(
        self,
        client: AsyncClient,
        product: Product,
    ) -> None:
        """Test that limit parameter has a minimum value of 1"""
        response = await client.get(
            f"/v1/products/{product.id}/related",
            params={"limit": 0},
        )

        assert response.status_code == 422

    async def test_limit_validation_maximum(
        self,
        client: AsyncClient,
        product: Product,
    ) -> None:
        """Test that limit parameter has a maximum value of 12"""
        response = await client.get(
            f"/v1/products/{product.id}/related",
            params={"limit": 13},
        )

        assert response.status_code == 422

    async def test_nonexistent_product_id(
        self,
        client: AsyncClient,
    ) -> None:
        """Test that requesting related products for nonexistent product returns 404"""
        nonexistent_id = uuid.uuid4()
        response = await client.get(f"/v1/products/{nonexistent_id}/related")

        assert response.status_code == 404

    async def test_returns_empty_list_when_no_related_products(
        self,
        client: AsyncClient,
        product: Product,
    ) -> None:
        """Test that empty list is returned when no related products exist"""
        response = await client.get(f"/v1/products/{product.id}/related")

        assert response.status_code == 200
        json = response.json()
        assert len(json["items"]) == 0


@pytest.mark.asyncio
class TestProductViewTracking:
    async def test_view_tracking_creates_record(
        self,
        session: AsyncSession,
        client: AsyncClient,
        product: Product,
    ) -> None:
        """Test that accessing product detail creates a ProductView record"""
        from sqlalchemy import select

        initial_count = await session.scalar(
            select(func.count(ProductView.id)).where(
                ProductView.product_id == product.id
            )
        )

        await client.get(f"/v1/products/slug/{product.name}")

        await session.refresh(product)
        final_count = await session.scalar(
            select(func.count(ProductView.id)).where(
                ProductView.product_id == product.id
            )
        )

        assert final_count == (initial_count or 0) + 1

    async def test_view_tracking_stores_product_id(
        self,
        session: AsyncSession,
        client: AsyncClient,
        product: Product,
    ) -> None:
        """Test that ProductView record contains correct product_id"""
        from sqlalchemy import select

        await client.get(f"/v1/products/slug/{product.name}")

        view = await session.scalar(
            select(ProductView)
            .where(ProductView.product_id == product.id)
            .order_by(ProductView.created_at.desc())
            .limit(1)
        )

        assert view is not None
        assert view.product_id == product.id

    async def test_multiple_views_create_multiple_records(
        self,
        session: AsyncSession,
        client: AsyncClient,
        product: Product,
    ) -> None:
        """Test that multiple views create multiple ProductView records"""
        from sqlalchemy import select

        initial_count = await session.scalar(
            select(func.count(ProductView.id)).where(
                ProductView.product_id == product.id
            )
        )

        await client.get(f"/v1/products/slug/{product.name}")
        await client.get(f"/v1/products/slug/{product.name}")
        await client.get(f"/v1/products/slug/{product.name}")

        final_count = await session.scalar(
            select(func.count(ProductView.id)).where(
                ProductView.product_id == product.id
            )
        )

        assert final_count == (initial_count or 0) + 3

    async def test_view_tracking_for_different_products(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        client: AsyncClient,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that views are tracked separately for different products"""
        from sqlalchemy import select

        product_2 = await create_product(
            save_fixture,
            organization=organization,
        )

        await client.get(f"/v1/products/slug/{product.name}")
        await client.get(f"/v1/products/slug/{product_2.name}")

        count_1 = await session.scalar(
            select(func.count(ProductView.id)).where(
                ProductView.product_id == product.id
            )
        )
        count_2 = await session.scalar(
            select(func.count(ProductView.id)).where(
                ProductView.product_id == product_2.id
            )
        )

        assert count_1 == 1
        assert count_2 == 1


@pytest.mark.asyncio
class TestAnonymousUserAccess:
    async def test_anonymous_can_view_product_detail(
        self,
        client: AsyncClient,
        product: Product,
    ) -> None:
        """Test that anonymous users can view product details"""
        response = await client.get(f"/v1/products/slug/{product.name}")

        assert response.status_code == 200
        json = response.json()
        assert json["id"] == str(product.id)

    async def test_anonymous_can_view_related_products(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        organization: Organization,
        product: Product,
    ) -> None:
        """Test that anonymous users can view related products"""
        await create_product(
            save_fixture,
            organization=organization,
        )

        response = await client.get(f"/v1/products/{product.id}/related")

        assert response.status_code == 200
        json = response.json()
        assert "items" in json

    async def test_anonymous_views_are_tracked(
        self,
        session: AsyncSession,
        client: AsyncClient,
        product: Product,
    ) -> None:
        """Test that anonymous user views are tracked"""
        from sqlalchemy import select

        await client.get(f"/v1/products/slug/{product.name}")

        view_count = await session.scalar(
            select(func.count(ProductView.id)).where(
                ProductView.product_id == product.id
            )
        )

        assert view_count >= 1

    async def test_anonymous_can_access_public_products_only(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        product: Product,
    ) -> None:
        """Test that anonymous users can only access public products"""
        from polar.models.product import ProductVisibility

        product.visibility = ProductVisibility.private
        await save_fixture(product)

        response = await client.get(f"/v1/products/slug/{product.name}")

        assert response.status_code == 404

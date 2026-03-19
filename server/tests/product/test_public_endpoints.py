"""Unit tests for public products endpoint."""

import pytest
from httpx import AsyncClient

from polar.models import Organization
from polar.postgres import AsyncSession
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import create_product


@pytest.mark.asyncio
class TestListPublicProducts:
    """Test suite for GET /v1/products/public endpoint."""

    async def test_returns_products_without_authentication(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that endpoint works without authentication."""
        # Create a public product
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Test Product",
        )

        response = await client.get("/v1/products/public")

        assert response.status_code == 200
        json = response.json()
        assert json["pagination"]["total_count"] >= 1

        # Find our product in the results
        product_ids = [item["id"] for item in json["items"]]
        assert str(product.id) in product_ids

    async def test_applies_search_filter_correctly(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that search filter works correctly."""
        # Create products with different names
        product1 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Unique Widget",
        )
        product2 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Another Product",
        )

        # Search for "Widget"
        response = await client.get("/v1/products/public", params={"search": "Widget"})

        assert response.status_code == 200
        json = response.json()

        product_ids = [item["id"] for item in json["items"]]
        assert str(product1.id) in product_ids
        assert str(product2.id) not in product_ids

    async def test_search_is_case_insensitive(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that search is case-insensitive."""
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="CamelCase Product",
        )

        # Search with lowercase
        response = await client.get(
            "/v1/products/public", params={"search": "camelcase"}
        )

        assert response.status_code == 200
        json = response.json()

        product_ids = [item["id"] for item in json["items"]]
        assert str(product.id) in product_ids

    async def test_applies_category_filter_correctly(
        self,
        session: AsyncSession,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that category filter works correctly."""
        # Create products with different categories
        product1 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Electronics Product",
        )
        product1.metadata = {"category": "electronics"}
        await save_fixture(product1)

        product2 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Books Product",
        )
        product2.metadata = {"category": "books"}
        await save_fixture(product2)

        # Filter by electronics category
        response = await client.get(
            "/v1/products/public", params={"category": "electronics"}
        )

        assert response.status_code == 200
        json = response.json()

        product_ids = [item["id"] for item in json["items"]]
        assert str(product1.id) in product_ids
        assert str(product2.id) not in product_ids

    async def test_applies_price_range_filter_correctly(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that price range filter works correctly."""
        # Create products with different prices
        product_cheap = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Cheap Product",
            prices=[(500, "usd")],  # $5.00
        )
        product_mid = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Mid Product",
            prices=[(1500, "usd")],  # $15.00
        )
        product_expensive = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Expensive Product",
            prices=[(5000, "usd")],  # $50.00
        )

        # Filter by price range: $10 - $30
        response = await client.get(
            "/v1/products/public",
            params={"min_price": 1000, "max_price": 3000},
        )

        assert response.status_code == 200
        json = response.json()

        product_ids = [item["id"] for item in json["items"]]
        assert str(product_cheap.id) not in product_ids
        assert str(product_mid.id) in product_ids
        assert str(product_expensive.id) not in product_ids

    async def test_applies_minimum_price_filter(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that minimum price filter works correctly."""
        product_cheap = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Cheap Product",
            prices=[(500, "usd")],
        )
        product_expensive = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Expensive Product",
            prices=[(2000, "usd")],
        )

        # Filter by minimum price only
        response = await client.get(
            "/v1/products/public",
            params={"min_price": 1000},
        )

        assert response.status_code == 200
        json = response.json()

        product_ids = [item["id"] for item in json["items"]]
        assert str(product_cheap.id) not in product_ids
        assert str(product_expensive.id) in product_ids

    async def test_applies_maximum_price_filter(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that maximum price filter works correctly."""
        product_cheap = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Cheap Product",
            prices=[(500, "usd")],
        )
        product_expensive = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Expensive Product",
            prices=[(2000, "usd")],
        )

        # Filter by maximum price only
        response = await client.get(
            "/v1/products/public",
            params={"max_price": 1000},
        )

        assert response.status_code == 200
        json = response.json()

        product_ids = [item["id"] for item in json["items"]]
        assert str(product_cheap.id) in product_ids
        assert str(product_expensive.id) not in product_ids

    async def test_sorts_products_by_newest(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that newest sort order works correctly."""
        # Create products in sequence
        product1 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="First Product",
        )
        product2 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Second Product",
        )
        product3 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Third Product",
        )

        # Sort by newest (default)
        response = await client.get("/v1/products/public", params={"sort": "newest"})

        assert response.status_code == 200
        json = response.json()

        # Newest should be first
        items = json["items"]
        if len(items) >= 3:
            # Find positions of our products
            product_positions = {}
            for idx, item in enumerate(items):
                if item["id"] == str(product1.id):
                    product_positions[1] = idx
                elif item["id"] == str(product2.id):
                    product_positions[2] = idx
                elif item["id"] == str(product3.id):
                    product_positions[3] = idx

            # Product 3 should come before product 2, which should come before product 1
            if (
                1 in product_positions
                and 2 in product_positions
                and 3 in product_positions
            ):
                assert (
                    product_positions[3] < product_positions[2] < product_positions[1]
                )

    async def test_sorts_products_by_price_ascending(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that price ascending sort order works correctly."""
        product_expensive = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Expensive Product",
            prices=[(5000, "usd")],
        )
        product_cheap = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Cheap Product",
            prices=[(500, "usd")],
        )
        product_mid = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Mid Product",
            prices=[(1500, "usd")],
        )

        # Sort by price ascending
        response = await client.get("/v1/products/public", params={"sort": "price_asc"})

        assert response.status_code == 200
        json = response.json()

        items = json["items"]
        # Find positions of our products
        product_positions = {}
        for idx, item in enumerate(items):
            if item["id"] == str(product_cheap.id):
                product_positions["cheap"] = idx
            elif item["id"] == str(product_mid.id):
                product_positions["mid"] = idx
            elif item["id"] == str(product_expensive.id):
                product_positions["expensive"] = idx

        # Cheap should come before mid, which should come before expensive
        if all(k in product_positions for k in ["cheap", "mid", "expensive"]):
            assert (
                product_positions["cheap"]
                < product_positions["mid"]
                < product_positions["expensive"]
            )

    async def test_sorts_products_by_price_descending(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that price descending sort order works correctly."""
        product_expensive = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Expensive Product",
            prices=[(5000, "usd")],
        )
        product_cheap = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Cheap Product",
            prices=[(500, "usd")],
        )
        product_mid = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Mid Product",
            prices=[(1500, "usd")],
        )

        # Sort by price descending
        response = await client.get(
            "/v1/products/public", params={"sort": "price_desc"}
        )

        assert response.status_code == 200
        json = response.json()

        items = json["items"]
        # Find positions of our products
        product_positions = {}
        for idx, item in enumerate(items):
            if item["id"] == str(product_cheap.id):
                product_positions["cheap"] = idx
            elif item["id"] == str(product_mid.id):
                product_positions["mid"] = idx
            elif item["id"] == str(product_expensive.id):
                product_positions["expensive"] = idx

        # Expensive should come before mid, which should come before cheap
        if all(k in product_positions for k in ["cheap", "mid", "expensive"]):
            assert (
                product_positions["expensive"]
                < product_positions["mid"]
                < product_positions["cheap"]
            )

    async def test_paginates_results_correctly(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that pagination works correctly."""
        # Create multiple products
        products = []
        for i in range(5):
            product = await create_product(
                save_fixture,
                organization=organization,
                recurring_interval=None,
                name=f"Product {i}",
            )
            products.append(product)

        # Get first page with limit of 2
        response = await client.get(
            "/v1/products/public",
            params={"limit": 2, "page": 1},
        )

        assert response.status_code == 200
        json = response.json()

        assert len(json["items"]) <= 2
        assert json["pagination"]["limit"] == 2
        assert json["pagination"]["page"] == 1

    async def test_filters_featured_products(
        self,
        session: AsyncSession,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that featured products filter works correctly."""
        # Create featured product
        product_featured = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Featured Product",
        )
        product_featured.metadata = {"is_featured": "true"}
        await save_fixture(product_featured)

        # Create non-featured product
        product_normal = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Normal Product",
        )

        # Filter by featured
        response = await client.get(
            "/v1/products/public",
            params={"is_featured": True},
        )

        assert response.status_code == 200
        json = response.json()

        product_ids = [item["id"] for item in json["items"]]
        assert str(product_featured.id) in product_ids
        assert str(product_normal.id) not in product_ids

    async def test_returns_422_for_invalid_min_price(
        self,
        client: AsyncClient,
    ) -> None:
        """Test that invalid min_price returns 422 error."""
        response = await client.get(
            "/v1/products/public",
            params={"min_price": -100},
        )

        assert response.status_code == 422

    async def test_returns_422_for_invalid_max_price(
        self,
        client: AsyncClient,
    ) -> None:
        """Test that invalid max_price returns 422 error."""
        response = await client.get(
            "/v1/products/public",
            params={"max_price": -100},
        )

        assert response.status_code == 422

    async def test_returns_422_when_min_price_greater_than_max_price(
        self,
        client: AsyncClient,
    ) -> None:
        """Test that min_price > max_price returns 422 error."""
        response = await client.get(
            "/v1/products/public",
            params={"min_price": 2000, "max_price": 1000},
        )

        assert response.status_code == 422
        json = response.json()
        assert "min_price" in str(json).lower()

    async def test_combines_search_and_category_filters(
        self,
        session: AsyncSession,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that search and category filters work together."""
        # Create products with different combinations
        product1 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Widget Electronics",
        )
        product1.metadata = {"category": "electronics"}
        await save_fixture(product1)

        product2 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Widget Books",
        )
        product2.metadata = {"category": "books"}
        await save_fixture(product2)

        product3 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Gadget Electronics",
        )
        product3.metadata = {"category": "electronics"}
        await save_fixture(product3)

        # Search for "Widget" in "electronics" category
        response = await client.get(
            "/v1/products/public",
            params={"search": "Widget", "category": "electronics"},
        )

        assert response.status_code == 200
        json = response.json()

        product_ids = [item["id"] for item in json["items"]]
        assert str(product1.id) in product_ids
        assert str(product2.id) not in product_ids
        assert str(product3.id) not in product_ids

    async def test_combines_all_filters(
        self,
        session: AsyncSession,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that all filters work together."""
        # Create products with various attributes
        product_match = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Premium Widget",
            prices=[(1500, "usd")],
        )
        product_match.metadata = {"category": "electronics"}
        await save_fixture(product_match)

        product_wrong_price = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Premium Widget",
            prices=[(500, "usd")],
        )
        product_wrong_price.metadata = {"category": "electronics"}
        await save_fixture(product_wrong_price)

        product_wrong_category = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Premium Widget",
            prices=[(1500, "usd")],
        )
        product_wrong_category.metadata = {"category": "books"}
        await save_fixture(product_wrong_category)

        # Apply all filters
        response = await client.get(
            "/v1/products/public",
            params={
                "search": "Widget",
                "category": "electronics",
                "min_price": 1000,
                "max_price": 2000,
            },
        )

        assert response.status_code == 200
        json = response.json()

        product_ids = [item["id"] for item in json["items"]]
        assert str(product_match.id) in product_ids
        assert str(product_wrong_price.id) not in product_ids
        assert str(product_wrong_category.id) not in product_ids

    async def test_excludes_archived_products(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Test that archived products are not returned."""
        product_active = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Active Product",
            is_archived=False,
        )
        product_archived = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Archived Product",
            is_archived=True,
        )

        response = await client.get("/v1/products/public")

        assert response.status_code == 200
        json = response.json()

        product_ids = [item["id"] for item in json["items"]]
        assert str(product_active.id) in product_ids
        assert str(product_archived.id) not in product_ids

    async def test_returns_empty_list_when_no_products_match(
        self,
        client: AsyncClient,
    ) -> None:
        """Test that empty list is returned when no products match filters."""
        response = await client.get(
            "/v1/products/public",
            params={"search": "NonexistentProductXYZ123"},
        )

        assert response.status_code == 200
        json = response.json()

        assert json["items"] == []
        assert json["pagination"]["total_count"] == 0

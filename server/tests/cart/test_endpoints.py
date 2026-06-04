"""
E2E tests for cart endpoints.

Tests the complete HTTP API for cart operations including authentication,
request/response handling, and error cases.
"""

from types import SimpleNamespace
from uuid import uuid4

import pytest
from httpx import AsyncClient
from pytest_mock import MockerFixture

from polar.models import Organization
from polar.postgres import AsyncSession
from polar.auth.scope import Scope
from tests.fixtures.auth import AuthSubjectFixture
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import create_product


@pytest.mark.asyncio
class TestAddCartItem:
    """E2E tests for POST /v1/cart/items endpoint."""

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
    )
    async def test_authenticated_user_creates_cart_item(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Test that authenticated user can add a product to cart.

        Validates: Requirements 5.1, 5.6
        """
        # Arrange
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        # Act
        response = await client.post(
            "/v1/cart/items",
            json={
                "product_id": str(product.id),
                "quantity": 1,
            },
        )

        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["product_id"] == str(product.id)
        assert data["quantity"] == 1
        assert data["subtotal"] == 1000  # Default price from create_product

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
    )
    async def test_authenticated_user_duplicate_add_stays_at_quantity_1(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Adding the same digital product twice must NOT multiply the price.
        Blyss only sells digital goods — buying two copies of the same
        digital download is meaningless. The cart upsert is idempotent:
        the row stays at quantity 1 no matter how many times Buy Now is
        clicked.

        Validates: Digital marketplace quantity rule
        """
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        # First add — explicitly request quantity 2.
        first_response = await client.post(
            "/v1/cart/items",
            json={
                "product_id": str(product.id),
                "quantity": 2,
            },
        )
        assert first_response.status_code == 201
        first_item_id = first_response.json()["id"]
        # Even with quantity=2 in the request, server enforces quantity=1.
        assert first_response.json()["quantity"] == 1

        # Second add — same row, quantity stays at 1 (no multiplication).
        second_response = await client.post(
            "/v1/cart/items",
            json={
                "product_id": str(product.id),
                "quantity": 3,
            },
        )
        assert second_response.status_code == 201
        second_data = second_response.json()
        assert second_data["id"] == first_item_id  # Same cart item
        assert second_data["quantity"] == 1

    @pytest.mark.auth(
        AuthSubjectFixture(subject="anonymous", scopes={Scope.web_read, Scope.web_write, Scope.cart_read, Scope.cart_write}, session_token="test-guest-session-token"),
    )
    async def test_guest_session_token_handling(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Test that guest users can add items using session token.

        Validates: Requirements 5.5
        """
        # Arrange
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        # Act
        response = await client.post(
            "/v1/cart/items",
            json={
                "product_id": str(product.id),
                "quantity": 1,
            },
        )

        # Assert
        import sys; print("\nRESP:", response.status_code, response.text[:200], file=sys.stderr)
        assert response.status_code == 201
        data = response.json()
        assert data["product_id"] == str(product.id)
        assert data["quantity"] == 1

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
    )
    async def test_recurring_product_returns_422(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Test that adding a recurring product returns 422 error.

        Validates: Requirements 3.1, 5.7
        """
        # Arrange
        from polar.enums import SubscriptionRecurringInterval

        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=SubscriptionRecurringInterval.month,
        )

        # Act
        response = await client.post(
            "/v1/cart/items",
            json={
                "product_id": str(product.id),
                "quantity": 1,
            },
        )

        # Assert
        assert response.status_code == 422
        data = response.json()
        assert (
            "recurring" in data["detail"].lower()
            or "subscription" in data["detail"].lower()
        )

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
    )
    async def test_non_existent_product_returns_404(
        self,
        client: AsyncClient,
    ) -> None:
        """
        Test that adding a non-existent product returns 404 error.

        Validates: Requirements 10.2, 5.7
        """
        # Arrange
        non_existent_product_id = uuid4()

        # Act
        response = await client.post(
            "/v1/cart/items",
            json={
                "product_id": str(non_existent_product_id),
                "quantity": 1,
            },
        )

        # Assert
        assert response.status_code == 404

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
    )
    async def test_invalid_quantity_returns_422(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Test that invalid quantity values return 422 error.

        Validates: Requirements 2.6, 5.7
        """
        # Arrange
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        # Act - Test quantity too low
        response_low = await client.post(
            "/v1/cart/items",
            json={
                "product_id": str(product.id),
                "quantity": 0,
            },
        )

        # Act - Test quantity too high
        response_high = await client.post(
            "/v1/cart/items",
            json={
                "product_id": str(product.id),
                "quantity": 101,
            },
        )

        # Assert
        assert response_low.status_code == 422
        assert response_high.status_code == 422


@pytest.mark.asyncio
class TestCheckoutCart:
    """E2E tests for POST /v1/cart/checkout endpoint."""

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
    )
    async def test_returns_hosted_checkout_url(
        self,
        client: AsyncClient,
        mocker: MockerFixture,
    ) -> None:
        create_checkout_mock = mocker.patch(
            "polar.cart.endpoints.cart.create_checkout_from_cart",
            mocker.AsyncMock(
                return_value=SimpleNamespace(client_secret="polar_cs_test")
            ),
        )

        response = await client.post("/v1/cart/checkout")

        assert response.status_code == 201
        assert response.json() == {
            "client_secret": "polar_cs_test",
            "url": "/checkout/polar_cs_test",
        }
        create_checkout_mock.assert_awaited_once()


@pytest.mark.asyncio
class TestRemoveCartItem:
    """E2E tests for DELETE /v1/cart/items/{item_id} endpoint."""

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
    )
    async def test_authenticated_user_removes_item(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Test that authenticated user can remove a cart item.

        Validates: Requirements 5.2, 5.6
        """
        # Arrange - Add item first
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        add_response = await client.post(
            "/v1/cart/items",
            json={
                "product_id": str(product.id),
                "quantity": 1,
            },
        )
        assert add_response.status_code == 201
        item_id = add_response.json()["id"]

        # Act
        response = await client.delete(f"/v1/cart/items/{item_id}")

        # Assert
        assert response.status_code == 204

        # Verify item is gone
        cart_response = await client.get("/v1/cart")
        assert cart_response.status_code == 200
        cart_data = cart_response.json()
        assert len(cart_data["items"]) == 0

    @pytest.mark.auth(
        AuthSubjectFixture(subject="anonymous", scopes={Scope.web_read, Scope.web_write, Scope.cart_read, Scope.cart_write}, session_token="test-guest-session-token"),
    )
    async def test_guest_removes_item(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Test that guest users can remove their cart items.

        Validates: Requirements 5.2, 5.5
        """
        # Arrange - Add item first
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        add_response = await client.post(
            "/v1/cart/items",
            json={
                "product_id": str(product.id),
                "quantity": 1,
            },
        )
        assert add_response.status_code == 201
        item_id = add_response.json()["id"]

        # Act
        response = await client.delete(f"/v1/cart/items/{item_id}")

        # Assert
        assert response.status_code == 204

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
    )
    async def test_non_existent_item_returns_404(
        self,
        client: AsyncClient,
    ) -> None:
        """
        Test that removing a non-existent cart item returns 404 error.

        Validates: Requirements 10.4, 5.7
        """
        # Arrange
        non_existent_item_id = uuid4()

        # Act
        response = await client.delete(f"/v1/cart/items/{non_existent_item_id}")

        # Assert
        assert response.status_code == 404


@pytest.mark.asyncio
class TestGetCart:
    """E2E tests for GET /v1/cart endpoint."""

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
    )
    async def test_authenticated_user_gets_cart_with_items(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Test that authenticated user can retrieve cart with all items and totals.

        Validates: Requirements 5.3, 5.6
        """
        # Arrange - Add multiple items
        product1 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            prices=[(1000, "usd")],
        )
        product2 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            prices=[(2000, "usd")],
        )

        await client.post(
            "/v1/cart/items",
            json={"product_id": str(product1.id), "quantity": 2},
        )
        await client.post(
            "/v1/cart/items",
            json={"product_id": str(product2.id), "quantity": 1},
        )

        # Act
        response = await client.get("/v1/cart")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["item_count"] == 2
        assert data["subtotal"] == 3000  # 1000 + 2000 (qty always 1 for digital)
        assert "tax" in data
        assert "total" in data

        # Verify item details
        items = {item["product_id"]: item for item in data["items"]}
        assert str(product1.id) in items
        assert str(product2.id) in items
        assert items[str(product1.id)]["quantity"] == 1
        assert items[str(product1.id)]["subtotal"] == 1000
        assert items[str(product2.id)]["quantity"] == 1
        assert items[str(product2.id)]["subtotal"] == 2000

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
    )
    async def test_empty_cart_returns_empty_items(
        self,
        client: AsyncClient,
    ) -> None:
        """
        Test that empty cart returns empty items array.

        Validates: Requirements 5.3
        """
        # Act
        response = await client.get("/v1/cart")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 0
        assert data["item_count"] == 0
        assert data["subtotal"] == 0
        assert data["tax"] == 0
        assert data["total"] == 0

    @pytest.mark.auth(
        AuthSubjectFixture(subject="anonymous", scopes={Scope.web_read, Scope.web_write, Scope.cart_read, Scope.cart_write}, session_token="test-guest-session-token"),
    )
    async def test_guest_gets_cart(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Test that guest users can retrieve their cart.

        Validates: Requirements 5.3, 5.5
        """
        # Arrange - Add item
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        await client.post(
            "/v1/cart/items",
            json={"product_id": str(product.id), "quantity": 1},
        )

        # Act
        response = await client.get("/v1/cart")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["product_id"] == str(product.id)


@pytest.mark.asyncio
class TestClearCart:
    """E2E tests for DELETE /v1/cart endpoint."""

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
    )
    async def test_authenticated_user_clears_cart(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Test that authenticated user can clear all cart items.

        Validates: Requirements 5.4, 5.6
        """
        # Arrange - Add multiple items
        for _ in range(3):
            product = await create_product(
                save_fixture,
                organization=organization,
                recurring_interval=None,
            )
            await client.post(
                "/v1/cart/items",
                json={"product_id": str(product.id), "quantity": 1},
            )

        # Verify items were added
        cart_before = await client.get("/v1/cart")
        assert len(cart_before.json()["items"]) == 3

        # Act
        response = await client.delete("/v1/cart")

        # Assert
        assert response.status_code == 204

        # Verify cart is empty
        cart_after = await client.get("/v1/cart")
        assert cart_after.status_code == 200
        assert len(cart_after.json()["items"]) == 0

    @pytest.mark.auth(
        AuthSubjectFixture(subject="anonymous", scopes={Scope.web_read, Scope.web_write, Scope.cart_read, Scope.cart_write}, session_token="test-guest-session-token"),
    )
    async def test_guest_clears_cart(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Test that guest users can clear their cart.

        Validates: Requirements 5.4, 5.5
        """
        # Arrange - Add items
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )
        await client.post(
            "/v1/cart/items",
            json={"product_id": str(product.id), "quantity": 1},
        )

        # Act
        response = await client.delete("/v1/cart")

        # Assert
        assert response.status_code == 204

        # Verify cart is empty
        cart_after = await client.get("/v1/cart")
        assert len(cart_after.json()["items"]) == 0

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user"),
    )
    async def test_clearing_empty_cart_succeeds(
        self,
        client: AsyncClient,
    ) -> None:
        """
        Test that clearing an already empty cart succeeds.

        Validates: Requirements 5.4
        """
        # Act
        response = await client.delete("/v1/cart")

        # Assert
        assert response.status_code == 204

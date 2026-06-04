"""Tests locking the digital-marketplace quantity rule.

Blyss only sells digital goods, so a cart can never hold more than one
copy of the same product. Repeated "Buy Now" clicks are idempotent: the
cart row stays at quantity 1, the subtotal stays at one product price,
no multiplication. These tests guard that invariant against future
refactors.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from polar.auth.scope import Scope
from polar.cart.repository import CartRepository
from polar.models import Organization
from tests.fixtures.auth import AuthSubjectFixture
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import create_product


GUEST_AUTH = AuthSubjectFixture(
    subject="anonymous",
    scopes={Scope.web_read, Scope.web_write, Scope.cart_read, Scope.cart_write},
    session_token="digital-rule-guest",
)


class TestDigitalQuantityRuleEndpoints:
    """End-to-end Buy Now → cart-row stays at 1."""

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_user_buy_now_three_times_keeps_quantity_at_1(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            prices=[(5000, "kes")],
        )

        ids = []
        for _ in range(3):
            resp = await client.post(
                "/v1/cart/items",
                json={"product_id": str(product.id), "quantity": 1},
            )
            assert resp.status_code == 201
            ids.append(resp.json()["id"])
            assert resp.json()["quantity"] == 1

        # Same row reused every time.
        assert ids[0] == ids[1] == ids[2]

        cart = await client.get("/v1/cart")
        assert cart.status_code == 200
        body = cart.json()
        assert len(body["items"]) == 1
        assert body["items"][0]["quantity"] == 1
        assert body["items"][0]["subtotal"] == 5000
        assert body["subtotal"] == 5000  # not 15_000

    @pytest.mark.asyncio
    @pytest.mark.auth(GUEST_AUTH)
    async def test_guest_quantity_capped_even_when_request_says_higher(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            prices=[(5000, "kes")],
        )

        # Even if the client tries quantity=10, server enforces digital rule.
        resp = await client.post(
            "/v1/cart/items",
            json={"product_id": str(product.id), "quantity": 10},
        )
        assert resp.status_code == 201
        assert resp.json()["quantity"] == 1


class TestDigitalQuantityRuleRepository:
    """Repository-level upsert is idempotent."""

    @pytest.mark.asyncio
    async def test_upsert_repeated_keeps_quantity_at_1(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        from uuid import uuid4

        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )
        repo = CartRepository(session)
        token = f"upsert-test-{uuid4().hex[:8]}"

        for _ in range(5):
            item = await repo.upsert_item(
                user_id=None,
                session_token=token,
                product_id=product.id,
                quantity=7,  # try to push it up; server caps at 1
                flush=True,
            )
            assert item.quantity == 1

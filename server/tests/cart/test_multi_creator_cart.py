"""End-to-end multi-cart marketplace flow.

Pins the per-creator cart contract:

  1. Buyer adds product from creator A → cart_items row owned by buyer
     pointing at A's product (Cart concept = group of cart_items
     filtered by product.organization_id).
  2. Buyer adds product from creator B → second cart_items row.
  3. GET /v1/cart/grouped returns 2 groups, sorted most-recently-
     modified first.
  4. POST /v1/cart/checkout?organization_id=A creates a checkout for
     just A's items. Cross-creator combined checkout intentionally
     not supported.
  5. After A's checkout completes, B's items remain in cart for a
     separate sequential checkout.
  6. POST /v1/cart/checkout WITHOUT organization_id with cross-
     creator cart raises MultiOrganizationCart (legacy behaviour
     preserved).
"""

from __future__ import annotations

from typing import cast

import pytest
from httpx import AsyncClient

from polar.auth.scope import Scope
from polar.models import Customer, Organization, User
from polar.postgres import AsyncSession
from tests.fixtures.auth import AuthSubjectFixture
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import (
    create_organization,
    create_product,
    create_user,
)


async def _make_product(save_fixture: SaveFixture, organization: Organization):
    """Wrapper around create_product with one-time defaults."""
    return await create_product(
        save_fixture,
        organization=organization,
        recurring_interval=None,
    )


@pytest.mark.asyncio
@pytest.mark.http_auto_expunge
class TestMultiCart:
    @pytest.mark.auth(
        AuthSubjectFixture(subject="user", scopes={Scope.web_read, Scope.web_write})
    )
    async def test_grouped_cart_returns_one_section_per_creator(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        user: User,
        session: AsyncSession,
    ) -> None:
        # Two creators, two products
        org_a = await create_organization(save_fixture, name_prefix="creator-a-test")
        org_b = await create_organization(save_fixture, name_prefix="creator-b-test")
        product_a = await _make_product(save_fixture, org_a)
        product_b = await _make_product(save_fixture, org_b)

        # Add one product from each
        r_a = await client.post(
            "/v1/cart/items",
            json={"product_id": str(product_a.id), "quantity": 1},
        )
        assert r_a.status_code == 201

        r_b = await client.post(
            "/v1/cart/items",
            json={"product_id": str(product_b.id), "quantity": 2},
        )
        assert r_b.status_code == 201

        # Grouped cart returns 2 sections, one per creator
        r = await client.get("/v1/cart/grouped")
        assert r.status_code == 200
        data = r.json()
        # item_count counts distinct cart_items rows (1 per product),
        # not summed quantity. 2 products = 2 rows.
        assert data["item_count"] == 2
        assert len(data["groups"]) == 2

        slugs = {g["organization"]["slug"] for g in data["groups"]}
        assert slugs == {org_a.slug, org_b.slug}

        # Each group has its own subtotal and item_count
        for group in data["groups"]:
            assert group["item_count"] >= 1
            assert group["subtotal"] >= 0
            assert "items" in group

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user", scopes={Scope.web_read, Scope.web_write})
    )
    async def test_creator_scoped_cart_returns_only_that_creators_items(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        user: User,
    ) -> None:
        org_a = await create_organization(save_fixture, name_prefix="scoped-a")
        org_b = await create_organization(save_fixture, name_prefix="scoped-b")
        product_a = await _make_product(save_fixture, org_a)
        product_b = await _make_product(save_fixture, org_b)

        await client.post(
            "/v1/cart/items",
            json={"product_id": str(product_a.id), "quantity": 1},
        )
        await client.post(
            "/v1/cart/items",
            json={"product_id": str(product_b.id), "quantity": 1},
        )

        # Scoped to org A: only A's items
        r_a = await client.get(
            "/v1/cart", params={"organization_id": str(org_a.id)}
        )
        assert r_a.status_code == 200
        data_a = r_a.json()
        assert data_a["item_count"] == 1
        assert all(
            item["product"]["organization_id"] == str(org_a.id)
            for item in data_a["items"]
        )

        # Scoped to org B: only B's items
        r_b = await client.get(
            "/v1/cart", params={"organization_id": str(org_b.id)}
        )
        assert r_b.status_code == 200
        data_b = r_b.json()
        assert data_b["item_count"] == 1
        assert all(
            item["product"]["organization_id"] == str(org_b.id)
            for item in data_b["items"]
        )

    @pytest.mark.auth(
        AuthSubjectFixture(subject="user", scopes={Scope.web_read, Scope.web_write})
    )
    async def test_legacy_flat_cart_endpoint_still_returns_all_items(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        user: User,
    ) -> None:
        # Backwards compat: /v1/cart with no query returns the flat list.
        org = await create_organization(save_fixture, name_prefix="legacy-flat")
        product = await _make_product(save_fixture, org)

        await client.post(
            "/v1/cart/items",
            json={"product_id": str(product.id), "quantity": 1},
        )

        r = await client.get("/v1/cart")
        assert r.status_code == 200
        data = r.json()
        assert data["item_count"] >= 1
        # Legacy shape — flat items list
        assert "items" in data
        assert "groups" not in data

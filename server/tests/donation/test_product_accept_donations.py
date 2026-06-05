"""Tests for the Product.accepts_donations flag surfacing in the public schema.

A product flagged accepts_donations=True exposes that flag in the public
Product schema (so the marketplace can render a "Tip the creator" CTA); a
regular product reports accepts_donations=False.
"""

import pytest

from polar.enums import SubscriptionRecurringInterval
from polar.product.schemas import Product as ProductSchema
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import create_product


@pytest.mark.asyncio
class TestProductAcceptsDonations:
    async def test_flag_true_surfaces_in_public_schema(
        self,
        save_fixture: SaveFixture,
        organization,
    ) -> None:
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Tippable Product",
        )
        product.accepts_donations = True
        await save_fixture(product)

        serialized = ProductSchema.model_validate(product, from_attributes=True)
        assert serialized.accepts_donations is True

        dumped = serialized.model_dump(mode="json")
        assert dumped["accepts_donations"] is True

    async def test_regular_product_defaults_false(
        self,
        save_fixture: SaveFixture,
        organization,
    ) -> None:
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Regular Product",
        )

        # Default column value is False.
        assert product.accepts_donations is False

        serialized = ProductSchema.model_validate(product, from_attributes=True)
        assert serialized.accepts_donations is False

    async def test_flag_persists_across_reload(
        self,
        save_fixture: SaveFixture,
        session,
        organization,
    ) -> None:
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Persist Product",
        )
        product.accepts_donations = True
        await save_fixture(product)

        # Reload from the DB to confirm the column round-trips.
        from polar.product.repository import ProductRepository

        repository = ProductRepository.from_session(session)
        reloaded = await repository.get_by_id(product.id)
        assert reloaded is not None
        assert reloaded.accepts_donations is True

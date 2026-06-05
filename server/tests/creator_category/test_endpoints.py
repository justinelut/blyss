"""Tests for creator categories — public listing + creator assignment."""

import pytest
from httpx import AsyncClient

from polar.models import CreatorCategory, Organization
from tests.fixtures.database import SaveFixture


async def _seed_categories(save_fixture: SaveFixture) -> list[CreatorCategory]:
    cats = [
        CreatorCategory(slug="designers", name="Designers", display_order=0),
        CreatorCategory(slug="writers", name="Writers", display_order=1),
        CreatorCategory(
            slug="hidden", name="Hidden", display_order=2, is_active=False
        ),
    ]
    for c in cats:
        await save_fixture(c)
    return cats


@pytest.mark.asyncio
class TestListCreatorCategories:
    async def test_lists_only_active_ordered(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
    ) -> None:
        await _seed_categories(save_fixture)

        response = await client.get("/v1/creator-categories/")
        assert response.status_code == 200
        data = response.json()

        slugs = [c["slug"] for c in data]
        # Active only, in display order; "hidden" excluded.
        assert "designers" in slugs
        assert "writers" in slugs
        assert "hidden" not in slugs
        # Ordered by display_order.
        assert slugs.index("designers") < slugs.index("writers")

    async def test_each_category_exposes_public_fields(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
    ) -> None:
        await _seed_categories(save_fixture)
        response = await client.get("/v1/creator-categories/")
        data = response.json()
        sample = next(c for c in data if c["slug"] == "designers")
        assert set(sample.keys()) >= {"id", "slug", "name", "display_order"}
        assert sample["name"] == "Designers"


@pytest.mark.asyncio
class TestOrganizationCategoryExposure:
    async def test_org_creator_category_slug_property(
        self,
        save_fixture: SaveFixture,
        session,
    ) -> None:
        category = CreatorCategory(
            slug="musicians", name="Musicians", display_order=0
        )
        await save_fixture(category)

        organization = Organization(
            name="Beat Maker",
            slug="beat-maker",
            customer_invoice_prefix="BEAT",
            creator_category_id=category.id,
        )
        await save_fixture(organization)

        # The model property resolves the slug.
        assert organization.creator_category_slug == "musicians"

    async def test_org_without_category_is_none(
        self,
        save_fixture: SaveFixture,
    ) -> None:
        organization = Organization(
            name="No Category",
            slug="no-category",
            customer_invoice_prefix="NOCAT",
        )
        await save_fixture(organization)
        assert organization.creator_category_slug is None

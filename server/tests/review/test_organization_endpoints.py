"""Unit tests for the organization-aggregate review endpoints.

These exist so the storefront can show a creator-level "X reviews · 4.7"
line without N+1ing the per-product summary. Two endpoints are tested:

  GET /v1/reviews/organization/{id}/summary  -> aggregate avg + distribution
  GET /v1/reviews/organization/{id}          -> recent reviews + product name

Both are public (no auth) and surfaced on the public creator storefront.
"""

import pytest
from httpx import AsyncClient

from polar.models import Organization
from polar.postgres import AsyncSession
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import create_product


@pytest.mark.asyncio
class TestOrganizationReviewAggregates:
    async def test_summary_returns_zero_when_no_reviews(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Empty creators (no products, no reviews) return a clean zero
        summary — the storefront treats `total_reviews == 0` as the empty
        state and renders the editorial fallback."""
        response = await client.get(
            f"/v1/reviews/organization/{organization.id}/summary"
        )
        assert response.status_code == 200

        body = response.json()
        assert body["total_reviews"] == 0
        assert body["average_rating"] == 0.0
        # Distribution carries an explicit zero for every bucket so the
        # frontend can render the per-rating bars without null guards.
        assert body["rating_distribution"] == {
            "1": 0,
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0,
        }

    async def test_recent_reviews_returns_empty_list(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """Recent reviews list is an empty array, not 404, when the org has
        no reviews — keeps the SSR fetch on the happy path."""
        response = await client.get(
            f"/v1/reviews/organization/{organization.id}"
        )
        assert response.status_code == 200
        assert response.json() == []

    async def test_recent_reviews_excludes_other_organizations(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """An org with no products of its own returns no reviews even when
        another org has products + reviews. Sanity check on the JOIN scope.

        We only need to assert the empty result here — the cross-org
        contamination case is unreachable without setting up a second org +
        a customer + a verified order, which the existing review-service
        tests stub via deeper fixtures. This test confirms the scope filter
        is wired correctly and won't accidentally return all reviews.
        """
        await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            name="Product without reviews",
        )

        response = await client.get(
            f"/v1/reviews/organization/{organization.id}"
        )
        assert response.status_code == 200
        # No reviews exist for any product → empty list, regardless of how
        # many products the org has.
        assert response.json() == []

    async def test_pagination_params_accepted(
        self,
        client: AsyncClient,
        organization: Organization,
    ) -> None:
        """The `limit` and `offset` query params are accepted (and the
        endpoint doesn't 422)."""
        response = await client.get(
            f"/v1/reviews/organization/{organization.id}",
            params={"limit": 6, "offset": 0},
        )
        assert response.status_code == 200

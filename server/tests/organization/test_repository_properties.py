"""
Property tests for organization repository functionality.

Feature: creator-storefronts
"""

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from polar.organization.repository import OrganizationRepository
from polar.postgres import AsyncSession
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import create_product


class TestCreatorsWithProductsFilter:
    """Property tests for creators with products filter."""

    @given(
        product_counts=st.lists(
            st.integers(min_value=0, max_value=10),
            min_size=5,
            max_size=20,
        )
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_property_1_creators_with_products_filter(
        self,
        product_counts: list[int],
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Feature: creator-storefronts, Property 1: Creators with Products Filter

        For any set of organizations in the database, the creators directory API
        should return only those organizations that have at least one product,
        excluding organizations with zero products.

        Validates: Requirements 1.1, 6.1, 6.7
        """
        # Arrange - Create organizations with varying product counts
        from polar.models import Organization

        organizations = []
        for i, product_count in enumerate(product_counts):
            # Create organization
            org = Organization(
                name=f"TestOrg{i}",
                slug=f"test-org-{i}",
            )
            org = await save_fixture(org)
            organizations.append(org)

            # Create products for this organization
            for _ in range(product_count):
                await create_product(
                    save_fixture,
                    organization=org,
                )

        await session.flush()

        # Calculate expected organizations (those with at least one product)
        expected_orgs = [
            org for org, count in zip(organizations, product_counts) if count > 0
        ]

        # Act - Get creators with products
        repository = OrganizationRepository(session)
        creators = await repository.get_creators_with_products(
            limit=100,
            offset=0,
        )

        # Assert - Verify only organizations with products are returned
        assert len(creators) == len(expected_orgs), (
            f"Expected {len(expected_orgs)} creators with products, "
            f"but got {len(creators)}"
        )

        # Verify all returned organizations have at least one product
        creator_ids = {creator.id for creator in creators}
        expected_ids = {org.id for org in expected_orgs}

        assert creator_ids == expected_ids, (
            f"Returned creator IDs {creator_ids} do not match expected IDs {expected_ids}"
        )

        # Verify no organizations with zero products are included
        orgs_without_products = [
            org for org, count in zip(organizations, product_counts) if count == 0
        ]
        for org in orgs_without_products:
            assert org.id not in creator_ids, (
                f"Organization {org.id} with 0 products should not be in results"
            )


class TestSocialLinksRoundTrip:
    """Property tests for social links serialization round trip."""

    @given(
        social_links=st.one_of(
            st.none(),
            st.fixed_dictionaries(
                {
                    "twitter": st.one_of(
                        st.none(),
                        st.from_regex(r"https://(twitter|x)\.com/\w+", fullmatch=True),
                    ),
                    "instagram": st.one_of(
                        st.none(),
                        st.from_regex(r"https://instagram\.com/\w+", fullmatch=True),
                    ),
                    "website": st.one_of(
                        st.none(),
                        st.from_regex(
                            r"https://[\w\-\.]+\.\w+(/[\w\-\.]*)*", fullmatch=True
                        ),
                    ),
                }
            ),
        )
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_property_8_social_links_round_trip(
        self,
        social_links: dict | None,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Feature: creator-storefronts, Property 8: Social Links Serialization Round Trip

        For any valid social links object (with twitter, instagram, and/or website URLs),
        saving it to the database and then retrieving it should return an equivalent
        object with all URLs preserved.

        Validates: Requirements 4.3, 5.4
        """
        # Arrange - Create organization with social links
        from polar.models import Organization

        org = Organization(
            name="TestOrg",
            slug="test-org-social-links",
            social_links=social_links,
        )
        org = await save_fixture(org)
        await session.flush()

        # Act - Retrieve organization using repository
        repository = OrganizationRepository(session)
        retrieved = await repository.get_by_id(org.id)

        # Assert - Verify social links are preserved exactly
        assert retrieved is not None, "Organization should be retrievable"
        assert retrieved.social_links == social_links, (
            f"Social links not preserved. Expected {social_links}, "
            f"but got {retrieved.social_links}"
        )

        # Additional verification: Test update_profile method
        if social_links is not None:
            # Create new social links for update
            updated_links = {
                "twitter": "https://twitter.com/updated",
                "instagram": None,
                "website": "https://example-updated.com",
            }

            # Act - Update profile with new social links
            updated_org = await repository.update_profile(
                retrieved,
                social_links=updated_links,
                flush=True,
            )

            # Assert - Verify updated social links are preserved
            assert updated_org.social_links == updated_links, (
                f"Updated social links not preserved. Expected {updated_links}, "
                f"but got {updated_org.social_links}"
            )

            # Retrieve again to verify persistence
            final_retrieved = await repository.get_by_id(org.id)
            assert final_retrieved is not None
            assert final_retrieved.social_links == updated_links, (
                f"Social links not persisted after update. Expected {updated_links}, "
                f"but got {final_retrieved.social_links}"
            )

"""Unit tests for creator storefront service layer.

Tests Requirements 2.2, 5.3, 5.6:
- Search filtering by creator name
- Authorization checks for profile updates
- Error handling for invalid data
"""

from uuid import UUID

import pytest

from polar.auth.models import AuthSubject
from polar.exceptions import NotPermitted
from polar.models import Organization, Product, User
from polar.organization.service import organization as organization_service
from polar.postgres import AsyncSession
from tests.fixtures.database import SaveFixture


@pytest.mark.asyncio
class TestGetCreatorsDirectory:
    """Test search filtering logic for creators directory.

    Validates Requirement 2.2: Search should filter creators by name.
    """

    async def test_search_filters_by_name_case_insensitive(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ) -> None:
        """Test that search filters creators by name (case-insensitive)."""
        # Create organizations with products
        org1 = Organization(name="Polar Software", slug="polar-software")
        await save_fixture(org1)
        product1 = Product(
            name="Product 1",
            organization_id=org1.id,
            prices=[],
        )
        await save_fixture(product1)

        org2 = Organization(name="Arctic Development", slug="arctic-dev")
        await save_fixture(org2)
        product2 = Product(
            name="Product 2",
            organization_id=org2.id,
            prices=[],
        )
        await save_fixture(product2)

        org3 = Organization(name="Tropical Designs", slug="tropical-designs")
        await save_fixture(org3)
        product3 = Product(
            name="Product 3",
            organization_id=org3.id,
            prices=[],
        )
        await save_fixture(product3)

        # Search for "polar" (case-insensitive)
        results = await organization_service.get_creators_directory(
            session, search="polar"
        )

        assert len(results) == 1
        assert results[0].name == "Polar Software"

    async def test_search_returns_all_matching_creators(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ) -> None:
        """Test that search returns all creators matching the search term."""
        # Create multiple organizations with "dev" in name
        org1 = Organization(name="Dev Studio", slug="dev-studio")
        await save_fixture(org1)
        product1 = Product(
            name="Product 1",
            organization_id=org1.id,
            prices=[],
        )
        await save_fixture(product1)

        org2 = Organization(name="Developer Tools", slug="developer-tools")
        await save_fixture(org2)
        product2 = Product(
            name="Product 2",
            organization_id=org2.id,
            prices=[],
        )
        await save_fixture(product2)

        org3 = Organization(name="Design Agency", slug="design-agency")
        await save_fixture(org3)
        product3 = Product(
            name="Product 3",
            organization_id=org3.id,
            prices=[],
        )
        await save_fixture(product3)

        # Search for "dev"
        results = await organization_service.get_creators_directory(
            session, search="dev"
        )

        assert len(results) == 2
        result_names = {org.name for org in results}
        assert "Dev Studio" in result_names
        assert "Developer Tools" in result_names
        assert "Design Agency" not in result_names

    async def test_search_returns_empty_when_no_matches(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ) -> None:
        """Test that search returns empty list when no creators match."""
        org = Organization(name="Test Organization", slug="test-org")
        await save_fixture(org)
        product = Product(
            name="Product",
            organization_id=org.id,
            prices=[],
        )
        await save_fixture(product)

        # Search for non-existent term
        results = await organization_service.get_creators_directory(
            session, search="nonexistent"
        )

        assert len(results) == 0

    async def test_no_search_returns_all_creators(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ) -> None:
        """Test that omitting search returns all creators with products."""
        org1 = Organization(name="Org One", slug="org-one")
        await save_fixture(org1)
        product1 = Product(
            name="Product 1",
            organization_id=org1.id,
            prices=[],
        )
        await save_fixture(product1)

        org2 = Organization(name="Org Two", slug="org-two")
        await save_fixture(org2)
        product2 = Product(
            name="Product 2",
            organization_id=org2.id,
            prices=[],
        )
        await save_fixture(product2)

        # No search parameter
        results = await organization_service.get_creators_directory(session)

        assert len(results) >= 2
        result_names = {org.name for org in results}
        assert "Org One" in result_names
        assert "Org Two" in result_names


@pytest.mark.asyncio
class TestUpdateCreatorProfile:
    """Test authorization checks for profile updates.

    Validates Requirement 5.3, 5.6: Profile updates should check authorization
    and validate data.
    """

    @pytest.mark.auth
    async def test_authorized_user_can_update_profile(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        auth_subject: AuthSubject[User],
        organization: Organization,
    ) -> None:
        """Test that authorized user can update organization profile."""
        # Update profile with valid data
        updated = await organization_service.update_creator_profile(
            session,
            auth_subject,
            organization.id,
            bio="This is a test bio",
            social_links={
                "twitter": "https://twitter.com/test",
                "instagram": "https://instagram.com/test",
            },
        )

        assert updated.bio == "This is a test bio"
        assert updated.social_links == {
            "twitter": "https://twitter.com/test",
            "instagram": "https://instagram.com/test",
        }

    @pytest.mark.auth
    async def test_unauthorized_user_cannot_update_profile(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user: User,
        organization: Organization,
    ) -> None:
        """Test that unauthorized user cannot update organization profile."""
        # Create a different user who is not a member of the organization
        other_user = User(
            username="otheruser",
            email="other@example.com",
            account_id=None,
        )
        await save_fixture(other_user)

        auth_subject = AuthSubject[User](
            subject=other_user,
            scopes=set(),
        )

        # Attempt to update profile should raise NotPermitted
        with pytest.raises(NotPermitted):
            await organization_service.update_creator_profile(
                session,
                auth_subject,
                organization.id,
                bio="Unauthorized update",
                social_links=None,
            )

    @pytest.mark.auth
    async def test_update_profile_with_null_values(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        auth_subject: AuthSubject[User],
        organization: Organization,
    ) -> None:
        """Test that profile can be updated with null values."""
        # First set some values
        organization.bio = "Original bio"
        organization.social_links = {"twitter": "https://twitter.com/test"}
        await save_fixture(organization)

        # Update with null values
        updated = await organization_service.update_creator_profile(
            session,
            auth_subject,
            organization.id,
            bio=None,
            social_links=None,
        )

        assert updated.bio is None
        assert updated.social_links is None

    @pytest.mark.auth
    async def test_update_profile_with_partial_social_links(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        auth_subject: AuthSubject[User],
        organization: Organization,
    ) -> None:
        """Test that profile can be updated with partial social links."""
        # Update with only twitter
        updated = await organization_service.update_creator_profile(
            session,
            auth_subject,
            organization.id,
            bio="Test bio",
            social_links={"twitter": "https://twitter.com/test"},
        )

        assert updated.social_links == {"twitter": "https://twitter.com/test"}

        # Update with only website
        updated = await organization_service.update_creator_profile(
            session,
            auth_subject,
            organization.id,
            bio="Test bio",
            social_links={"website": "https://example.com"},
        )

        assert updated.social_links == {"website": "https://example.com"}

    @pytest.mark.auth
    async def test_update_profile_nonexistent_organization(
        self,
        session: AsyncSession,
        auth_subject: AuthSubject[User],
    ) -> None:
        """Test that updating non-existent organization raises NotPermitted."""
        fake_id = UUID("00000000-0000-0000-0000-000000000000")

        with pytest.raises(NotPermitted):
            await organization_service.update_creator_profile(
                session,
                auth_subject,
                fake_id,
                bio="Test",
                social_links=None,
            )


@pytest.mark.asyncio
class TestGetCreatorStorefront:
    """Test creator storefront retrieval."""

    async def test_get_existing_creator_by_slug(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ) -> None:
        """Test that existing creator can be retrieved by slug."""
        org = Organization(
            name="Test Creator",
            slug="test-creator",
            bio="Test bio",
            social_links={"twitter": "https://twitter.com/test"},
        )
        await save_fixture(org)

        result = await organization_service.get_creator_storefront(
            session, "test-creator"
        )

        assert result is not None
        assert result.name == "Test Creator"
        assert result.bio == "Test bio"
        assert result.social_links == {"twitter": "https://twitter.com/test"}

    async def test_get_nonexistent_creator_returns_none(
        self,
        session: AsyncSession,
    ) -> None:
        """Test that non-existent creator returns None."""
        result = await organization_service.get_creator_storefront(
            session, "nonexistent-slug"
        )

        assert result is None

    async def test_get_creator_with_null_profile_fields(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ) -> None:
        """Test that creator with null bio and social_links can be retrieved."""
        org = Organization(
            name="Minimal Creator",
            slug="minimal-creator",
            bio=None,
            social_links=None,
        )
        await save_fixture(org)

        result = await organization_service.get_creator_storefront(
            session, "minimal-creator"
        )

        assert result is not None
        assert result.name == "Minimal Creator"
        assert result.bio is None
        assert result.social_links is None

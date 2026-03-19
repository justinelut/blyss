import pytest
from pydantic import ValidationError

from polar.organization.schemas import (
    CreatorStorefrontSchema,
    CreatorSummarySchema,
    ProfileUpdateSchema,
    SocialLinks,
)


class TestProfileUpdateSchema:
    """Test ProfileUpdateSchema validation."""

    def test_bio_max_length_valid(self) -> None:
        """Test that bio with exactly 500 characters is valid."""
        bio = "a" * 500
        schema = ProfileUpdateSchema(bio=bio)
        assert schema.bio == bio
        assert len(schema.bio) == 500

    def test_bio_max_length_under_limit(self) -> None:
        """Test that bio under 500 characters is valid."""
        bio = "a" * 499
        schema = ProfileUpdateSchema(bio=bio)
        assert schema.bio == bio
        assert len(schema.bio) == 499

    def test_bio_max_length_exceeds(self) -> None:
        """Test that bio exceeding 500 characters raises validation error."""
        bio = "a" * 501
        with pytest.raises(ValidationError) as exc_info:
            ProfileUpdateSchema(bio=bio)

        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["loc"] == ("bio",)
        assert "at most 500 characters" in errors[0]["msg"]

    def test_bio_empty_string(self) -> None:
        """Test that empty bio string is valid."""
        schema = ProfileUpdateSchema(bio="")
        assert schema.bio == ""

    def test_bio_none(self) -> None:
        """Test that None bio is valid."""
        schema = ProfileUpdateSchema(bio=None)
        assert schema.bio is None

    def test_bio_whitespace(self) -> None:
        """Test that bio with only whitespace is valid."""
        bio = "   \n\t  "
        schema = ProfileUpdateSchema(bio=bio)
        assert schema.bio == bio


class TestSocialLinks:
    """Test SocialLinks schema validation."""

    def test_all_fields_none(self) -> None:
        """Test that all fields can be None."""
        schema = SocialLinks()
        assert schema.twitter is None
        assert schema.instagram is None
        assert schema.website is None

    def test_all_fields_provided(self) -> None:
        """Test that all fields can be provided."""
        schema = SocialLinks(
            twitter="https://twitter.com/test",
            instagram="https://instagram.com/test",
            website="https://example.com",
        )
        assert schema.twitter == "https://twitter.com/test"
        assert schema.instagram == "https://instagram.com/test"
        assert schema.website == "https://example.com"

    def test_partial_fields(self) -> None:
        """Test that partial fields can be provided."""
        schema = SocialLinks(twitter="https://twitter.com/test")
        assert schema.twitter == "https://twitter.com/test"
        assert schema.instagram is None
        assert schema.website is None

    def test_empty_strings(self) -> None:
        """Test that empty strings are accepted."""
        schema = SocialLinks(
            twitter="",
            instagram="",
            website="",
        )
        assert schema.twitter == ""
        assert schema.instagram == ""
        assert schema.website == ""


class TestProfileUpdateSchemaWithSocialLinks:
    """Test ProfileUpdateSchema with social_links field."""

    def test_social_links_none(self) -> None:
        """Test that social_links can be None."""
        schema = ProfileUpdateSchema(social_links=None)
        assert schema.social_links is None

    def test_social_links_all_none(self) -> None:
        """Test that social_links with all None values is valid."""
        social_links = SocialLinks()
        schema = ProfileUpdateSchema(social_links=social_links)
        assert schema.social_links is not None
        assert schema.social_links.twitter is None
        assert schema.social_links.instagram is None
        assert schema.social_links.website is None

    def test_social_links_with_values(self) -> None:
        """Test that social_links with values is valid."""
        social_links = SocialLinks(
            twitter="https://twitter.com/test",
            instagram="https://instagram.com/test",
            website="https://example.com",
        )
        schema = ProfileUpdateSchema(social_links=social_links)
        assert schema.social_links is not None
        assert schema.social_links.twitter == "https://twitter.com/test"
        assert schema.social_links.instagram == "https://instagram.com/test"
        assert schema.social_links.website == "https://example.com"

    def test_bio_and_social_links(self) -> None:
        """Test that both bio and social_links can be provided."""
        bio = "Test bio"
        social_links = SocialLinks(twitter="https://twitter.com/test")
        schema = ProfileUpdateSchema(bio=bio, social_links=social_links)
        assert schema.bio == bio
        assert schema.social_links is not None
        assert schema.social_links.twitter == "https://twitter.com/test"


class TestCreatorSummarySchema:
    """Test CreatorSummarySchema serialization."""

    def test_serialization_with_all_fields(self) -> None:
        """Test serialization with all fields provided."""
        import uuid

        creator_id = uuid.uuid4()
        schema = CreatorSummarySchema(
            id=creator_id,
            name="Test Creator",
            slug="test-creator",
            avatar_url="https://example.com/avatar.jpg",
            product_count=5,
        )
        assert schema.id == creator_id
        assert schema.name == "Test Creator"
        assert schema.slug == "test-creator"
        assert schema.avatar_url == "https://example.com/avatar.jpg"
        assert schema.product_count == 5

    def test_serialization_with_null_avatar(self) -> None:
        """Test serialization with null avatar_url."""
        import uuid

        creator_id = uuid.uuid4()
        schema = CreatorSummarySchema(
            id=creator_id,
            name="Test Creator",
            slug="test-creator",
            avatar_url=None,
            product_count=3,
        )
        assert schema.id == creator_id
        assert schema.name == "Test Creator"
        assert schema.slug == "test-creator"
        assert schema.avatar_url is None
        assert schema.product_count == 3

    def test_serialization_zero_products(self) -> None:
        """Test serialization with zero product count."""
        import uuid

        creator_id = uuid.uuid4()
        schema = CreatorSummarySchema(
            id=creator_id,
            name="Test Creator",
            slug="test-creator",
            avatar_url=None,
            product_count=0,
        )
        assert schema.product_count == 0


class TestCreatorStorefrontSchema:
    """Test CreatorStorefrontSchema serialization."""

    def test_serialization_with_all_fields(self) -> None:
        """Test serialization with all fields provided."""
        import uuid

        creator_id = uuid.uuid4()
        social_links = SocialLinks(
            twitter="https://twitter.com/test",
            instagram="https://instagram.com/test",
            website="https://example.com",
        )
        schema = CreatorStorefrontSchema(
            id=creator_id,
            name="Test Creator",
            slug="test-creator",
            avatar_url="https://example.com/avatar.jpg",
            bio="This is a test bio",
            social_links=social_links,
            products=[],
        )
        assert schema.id == creator_id
        assert schema.name == "Test Creator"
        assert schema.slug == "test-creator"
        assert schema.avatar_url == "https://example.com/avatar.jpg"
        assert schema.bio == "This is a test bio"
        assert schema.social_links is not None
        assert schema.social_links.twitter == "https://twitter.com/test"
        assert schema.products == []

    def test_serialization_with_null_bio(self) -> None:
        """Test serialization with null bio."""
        import uuid

        creator_id = uuid.uuid4()
        schema = CreatorStorefrontSchema(
            id=creator_id,
            name="Test Creator",
            slug="test-creator",
            avatar_url="https://example.com/avatar.jpg",
            bio=None,
            social_links=None,
            products=[],
        )
        assert schema.bio is None

    def test_serialization_with_null_social_links(self) -> None:
        """Test serialization with null social_links."""
        import uuid

        creator_id = uuid.uuid4()
        schema = CreatorStorefrontSchema(
            id=creator_id,
            name="Test Creator",
            slug="test-creator",
            avatar_url=None,
            bio="Test bio",
            social_links=None,
            products=[],
        )
        assert schema.social_links is None

    def test_serialization_with_all_null_optional_fields(self) -> None:
        """Test serialization with all optional fields as null."""
        import uuid

        creator_id = uuid.uuid4()
        schema = CreatorStorefrontSchema(
            id=creator_id,
            name="Test Creator",
            slug="test-creator",
            avatar_url=None,
            bio=None,
            social_links=None,
            products=[],
        )
        assert schema.avatar_url is None
        assert schema.bio is None
        assert schema.social_links is None
        assert schema.products == []

    def test_serialization_with_empty_bio(self) -> None:
        """Test serialization with empty bio string."""
        import uuid

        creator_id = uuid.uuid4()
        schema = CreatorStorefrontSchema(
            id=creator_id,
            name="Test Creator",
            slug="test-creator",
            avatar_url=None,
            bio="",
            social_links=None,
            products=[],
        )
        assert schema.bio == ""

    def test_serialization_with_partial_social_links(self) -> None:
        """Test serialization with partial social links."""
        import uuid

        creator_id = uuid.uuid4()
        social_links = SocialLinks(twitter="https://twitter.com/test")
        schema = CreatorStorefrontSchema(
            id=creator_id,
            name="Test Creator",
            slug="test-creator",
            avatar_url=None,
            bio=None,
            social_links=social_links,
            products=[],
        )
        assert schema.social_links is not None
        assert schema.social_links.twitter == "https://twitter.com/test"
        assert schema.social_links.instagram is None
        assert schema.social_links.website is None

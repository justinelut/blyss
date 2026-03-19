import pytest
from httpx import AsyncClient

from polar.models import NewsletterSubscription, Organization, User
from tests.fixtures.database import SaveFixture


@pytest.mark.asyncio
class TestSubscribeToNewsletter:
    async def test_valid_email(
        self,
        client: AsyncClient,
        organization: Organization,
    ) -> None:
        response = await client.post(
            "/v1/newsletter/subscribe",
            json={
                "email": "test@example.com",
                "organization_id": str(organization.id),
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["organization_id"] == str(organization.id)
        assert data["is_active"] is True

    async def test_invalid_email(
        self,
        client: AsyncClient,
        organization: Organization,
    ) -> None:
        response = await client.post(
            "/v1/newsletter/subscribe",
            json={
                "email": "invalid-email",
                "organization_id": str(organization.id),
            },
        )

        assert response.status_code == 422

    async def test_duplicate_subscription(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        organization: Organization,
    ) -> None:
        email = "test@example.com"

        existing = NewsletterSubscription(
            email=email,
            organization_id=organization.id,
            is_active=True,
            unsubscribe_token="test_token",
        )
        await save_fixture(existing)

        response = await client.post(
            "/v1/newsletter/subscribe",
            json={
                "email": email,
                "organization_id": str(organization.id),
            },
        )

        assert response.status_code == 409


@pytest.mark.asyncio
class TestUnsubscribeFromNewsletter:
    async def test_valid_token(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        organization: Organization,
    ) -> None:
        token = "valid_token"

        subscription = NewsletterSubscription(
            email="test@example.com",
            organization_id=organization.id,
            is_active=True,
            unsubscribe_token=token,
        )
        await save_fixture(subscription)

        response = await client.post(f"/v1/newsletter/unsubscribe/{token}")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    async def test_invalid_token(
        self,
        client: AsyncClient,
    ) -> None:
        response = await client.post("/v1/newsletter/unsubscribe/invalid_token")

        assert response.status_code == 404


@pytest.mark.asyncio
class TestGetCreatorSubscribers:
    async def test_authenticated_user(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        user: User,
        organization: Organization,
    ) -> None:
        subscription = NewsletterSubscription(
            email="test@example.com",
            organization_id=organization.id,
            is_active=True,
            unsubscribe_token="token",
        )
        await save_fixture(subscription)

        response = await client.get(
            f"/v1/newsletter/creator/{organization.id}/subscribers"
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 1
        assert data["items"][0]["email"] == "test@example.com"

    async def test_unauthenticated_user(
        self,
        client: AsyncClient,
        organization: Organization,
    ) -> None:
        response = await client.get(
            f"/v1/newsletter/creator/{organization.id}/subscribers"
        )

        assert response.status_code == 401

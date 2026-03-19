import pytest

from polar.models import NewsletterSubscription, Organization
from polar.newsletter.service import (
    NewsletterAlreadySubscribedError,
    NewsletterSubscriptionNotFoundError,
    newsletter_service,
)
from polar.postgres import AsyncSession
from tests.fixtures.database import SaveFixture


@pytest.mark.asyncio
class TestSubscribe:
    async def test_new_subscription(
        self,
        session: AsyncSession,
        organization: Organization,
    ) -> None:
        email = "test@example.com"

        subscription = await newsletter_service.subscribe(
            session, email, organization.id
        )

        assert subscription.email == email
        assert subscription.organization_id == organization.id
        assert subscription.is_active is True
        assert subscription.unsubscribe_token is not None
        assert len(subscription.unsubscribe_token) > 0

    async def test_duplicate_active_subscription(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
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

        with pytest.raises(NewsletterAlreadySubscribedError):
            await newsletter_service.subscribe(session, email, organization.id)

    async def test_reactivate_inactive_subscription(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        organization: Organization,
    ) -> None:

        email = "test@example.com"

        existing = NewsletterSubscription(
            email=email,
            organization_id=organization.id,
            is_active=False,
            unsubscribe_token="test_token",
        )
        await save_fixture(existing)

        subscription = await newsletter_service.subscribe(
            session, email, organization.id
        )

        assert subscription.id == existing.id
        assert subscription.is_active is True


@pytest.mark.asyncio
class TestUnsubscribe:
    async def test_valid_token(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        organization: Organization,
    ) -> None:
        email = "test@example.com"
        token = "valid_token"

        subscription = NewsletterSubscription(
            email=email,
            organization_id=organization.id,
            is_active=True,
            unsubscribe_token=token,
        )
        await save_fixture(subscription)

        result = await newsletter_service.unsubscribe(session, token)

        assert result.id == subscription.id
        assert result.is_active is False

    async def test_invalid_token(
        self,
        session: AsyncSession,
    ) -> None:
        with pytest.raises(NewsletterSubscriptionNotFoundError):
            await newsletter_service.unsubscribe(session, "invalid_token")


@pytest.mark.asyncio
class TestSendNewsletter:
    async def test_send_to_active_subscribers(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        organization: Organization,
    ) -> None:
        active_sub1 = NewsletterSubscription(
            email="active1@example.com",
            organization_id=organization.id,
            is_active=True,
            unsubscribe_token="token1",
        )
        active_sub2 = NewsletterSubscription(
            email="active2@example.com",
            organization_id=organization.id,
            is_active=True,
            unsubscribe_token="token2",
        )
        inactive_sub = NewsletterSubscription(
            email="inactive@example.com",
            organization_id=organization.id,
            is_active=False,
            unsubscribe_token="token3",
        )
        await save_fixture(active_sub1)
        await save_fixture(active_sub2)
        await save_fixture(inactive_sub)

        count = await newsletter_service.send_newsletter(
            session,
            organization.id,
            "Test Subject",
            "<p>Test Content</p>",
        )

        assert count == 2


@pytest.mark.asyncio
class TestGetSubscribers:
    async def test_get_active_subscribers_only(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        organization: Organization,
    ) -> None:
        active_sub = NewsletterSubscription(
            email="active@example.com",
            organization_id=organization.id,
            is_active=True,
            unsubscribe_token="token1",
        )
        inactive_sub = NewsletterSubscription(
            email="inactive@example.com",
            organization_id=organization.id,
            is_active=False,
            unsubscribe_token="token2",
        )
        await save_fixture(active_sub)
        await save_fixture(inactive_sub)

        subscribers = await newsletter_service.get_subscribers(session, organization.id)

        assert len(subscribers) == 1
        assert subscribers[0].email == "active@example.com"

import secrets
from uuid import UUID

import structlog

from polar.exceptions import PolarError
from polar.models import NewsletterSubscription
from polar.postgres import AsyncSession

from .repository import NewsletterRepository

log = structlog.get_logger()


class NewsletterError(PolarError): ...


class NewsletterAlreadySubscribedError(NewsletterError):
    def __init__(self, email: str, organization_id: UUID):
        self.email = email
        self.organization_id = organization_id
        message = (
            f"Email {email} is already subscribed to organization {organization_id}"
        )
        super().__init__(message, 409)


class NewsletterSubscriptionNotFoundError(NewsletterError):
    def __init__(self, token: str):
        self.token = token
        message = f"Newsletter subscription with token {token} not found"
        super().__init__(message, 404)


class NewsletterService:
    async def subscribe(
        self,
        session: AsyncSession,
        email: str,
        organization_id: UUID,
    ) -> NewsletterSubscription:
        repository = NewsletterRepository.from_session(session)

        existing = await repository.get_by_email_and_org(email, organization_id)
        if existing is not None:
            if existing.is_active:
                raise NewsletterAlreadySubscribedError(email, organization_id)

            existing.is_active = True
            session.add(existing)
            return existing

        subscription = NewsletterSubscription(
            email=email,
            organization_id=organization_id,
            is_active=True,
            unsubscribe_token=secrets.token_urlsafe(32),
        )

        return await repository.create(subscription)

    async def unsubscribe(
        self,
        session: AsyncSession,
        token: str,
    ) -> NewsletterSubscription:
        repository = NewsletterRepository.from_session(session)

        subscription = await repository.get_by_token(token)
        if subscription is None:
            raise NewsletterSubscriptionNotFoundError(token)

        subscription.is_active = False
        session.add(subscription)
        return subscription

    async def send_newsletter(
        self,
        session: AsyncSession,
        organization_id: UUID,
        subject: str,
        content: str,
    ) -> int:
        repository = NewsletterRepository.from_session(session)

        subscribers = await repository.get_active_subscribers(organization_id)

        from .tasks import send_newsletter_to_subscriber

        for subscriber in subscribers:
            send_newsletter_to_subscriber.send(
                subscriber.email,
                subscriber.unsubscribe_token,
                organization_id,
                subject,
                content,
            )

        return len(subscribers)

    async def get_subscribers(
        self,
        session: AsyncSession,
        organization_id: UUID,
    ) -> list[NewsletterSubscription]:
        repository = NewsletterRepository.from_session(session)
        return await repository.get_active_subscribers(organization_id)


newsletter_service = NewsletterService()

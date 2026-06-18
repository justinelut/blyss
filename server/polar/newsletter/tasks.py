from uuid import UUID

import structlog

from polar.config import settings
from polar.email.sender import DEFAULT_FROM_EMAIL_ADDRESS
from polar.logging import Logger
from polar.worker import AsyncSessionMaker, TaskPriority, actor, enqueue_job

log: Logger = structlog.get_logger()


@actor(
    actor_name="newsletter.send_subscription_confirmation", priority=TaskPriority.LOW
)
async def send_subscription_confirmation(
    email: str,
    unsubscribe_token: str,
    organization_id: UUID,
) -> None:
    async with AsyncSessionMaker() as session:
        from polar.organization.repository import OrganizationRepository

        org_repository = OrganizationRepository.from_session(session)
        organization = await org_repository.get_by_id(organization_id)

        if organization is None:
            log.error(
                "Organization not found for newsletter confirmation",
                organization_id=organization_id,
            )
            return

        unsubscribe_url = (
            f"{settings.FRONTEND_BASE_URL}/newsletter/unsubscribe/{unsubscribe_token}"
        )

        subject = f"Welcome to {organization.name}'s Newsletter"
        html_content = f"""
        <html>
            <body>
                <h1>Welcome to {organization.name}'s Newsletter!</h1>
                <p>Thank you for subscribing to updates from {organization.name}.</p>
                <p>You'll receive notifications about new products, updates, and announcements.</p>
                <br>
                <p>If you wish to unsubscribe, <a href="{unsubscribe_url}">click here</a>.</p>
            </body>
        </html>
        """

        enqueue_job(
            "email.send",
            to_email_addr=email,
            subject=subject,
            html_content=html_content,
            from_name=organization.name,
            from_email_addr=DEFAULT_FROM_EMAIL_ADDRESS,
            email_headers=None,
            reply_to_name=None,
            reply_to_email_addr=None,
        )


@actor(actor_name="newsletter.send_to_subscriber", priority=TaskPriority.LOW)
async def send_newsletter_to_subscriber(
    email: str,
    unsubscribe_token: str,
    organization_id: UUID,
    subject: str,
    content: str,
) -> None:
    async with AsyncSessionMaker() as session:
        from polar.organization.repository import OrganizationRepository

        org_repository = OrganizationRepository.from_session(session)
        organization = await org_repository.get_by_id(organization_id)

        if organization is None:
            log.error(
                "Organization not found for newsletter sending",
                organization_id=organization_id,
            )
            return

        unsubscribe_url = (
            f"{settings.FRONTEND_BASE_URL}/newsletter/unsubscribe/{unsubscribe_token}"
        )

        html_content = f"""
        <html>
            <body>
                {content}
                <br><br>
                <hr>
                <p style="font-size: 12px; color: #666;">
                    You're receiving this email because you subscribed to {organization.name}'s newsletter.
                    <br>
                    <a href="{unsubscribe_url}">Unsubscribe</a>
                </p>
            </body>
        </html>
        """

        enqueue_job(
            "email.send",
            to_email_addr=email,
            subject=subject,
            html_content=html_content,
            from_name=organization.name,
            from_email_addr=DEFAULT_FROM_EMAIL_ADDRESS,
            email_headers=None,
            reply_to_name=None,
            reply_to_email_addr=None,
        )

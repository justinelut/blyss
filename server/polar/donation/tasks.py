from uuid import UUID

import structlog

from polar.config import settings
from polar.email.tasks import email_send
from polar.logging import Logger
from polar.worker import AsyncSessionMaker, TaskPriority, actor

log: Logger = structlog.get_logger()


@actor(actor_name="donation.send_confirmation", priority=TaskPriority.LOW)
async def send_donation_confirmation(
    donor_email: str,
    donor_name: str,
    amount: int,
    organization_id: UUID,
) -> None:
    async with AsyncSessionMaker() as session:
        from polar.organization.repository import OrganizationRepository

        org_repository = OrganizationRepository.from_session(session)
        organization = await org_repository.get_by_id(organization_id)

        if organization is None:
            log.error(
                "Organization not found for donation confirmation",
                organization_id=organization_id,
            )
            return

        amount_kes = amount / 100

        subject = f"Thank you for your donation to {organization.name}"
        html_content = f"""
        <html>
            <body>
                <h1>Thank you for your donation!</h1>
                <p>Dear {donor_name},</p>
                <p>Thank you for your generous donation of KES {amount_kes:.2f} to {organization.name}.</p>
                <p>Your support helps us continue our work and make a difference.</p>
                <br>
                <p>Best regards,</p>
                <p>{organization.name}</p>
            </body>
        </html>
        """

        email_send.send(
            to_email_addr=donor_email,
            subject=subject,
            html_content=html_content,
            from_name=organization.name,
            from_email_addr=settings.EMAIL_SENDER_FROM_EMAIL,
            email_headers=None,
            reply_to_name=None,
            reply_to_email_addr=None,
        )


@actor(actor_name="donation.send_receipt", priority=TaskPriority.LOW)
async def send_donation_receipt(
    donor_email: str,
    donor_name: str,
    amount: int,
    payment_reference: str,
    organization_id: UUID,
    donation_date: str,
) -> None:
    async with AsyncSessionMaker() as session:
        from polar.organization.repository import OrganizationRepository

        org_repository = OrganizationRepository.from_session(session)
        organization = await org_repository.get_by_id(organization_id)

        if organization is None:
            log.error(
                "Organization not found for donation receipt",
                organization_id=organization_id,
            )
            return

        amount_kes = amount / 100

        subject = f"Donation Receipt - {organization.name}"
        html_content = f"""
        <html>
            <body>
                <h1>Donation Receipt</h1>
                <p>Dear {donor_name},</p>
                <p>This is your official receipt for your donation to {organization.name}.</p>
                <br>
                <h2>Transaction Details</h2>
                <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Donor Name:</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">{donor_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">KES {amount_kes:.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date:</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">{donation_date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Transaction ID:</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">{payment_reference}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Recipient:</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">{organization.name}</td>
                    </tr>
                </table>
                <br>
                <p>Please keep this receipt for your records.</p>
                <br>
                <p>Thank you for your support!</p>
                <p>{organization.name}</p>
            </body>
        </html>
        """

        email_send.send(
            to_email_addr=donor_email,
            subject=subject,
            html_content=html_content,
            from_name=organization.name,
            from_email_addr=settings.EMAIL_SENDER_FROM_EMAIL,
            email_headers=None,
            reply_to_name=None,
            reply_to_email_addr=None,
        )

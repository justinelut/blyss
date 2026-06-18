from uuid import UUID

import structlog

from polar.email.sender import DEFAULT_FROM_EMAIL_ADDRESS
from polar.logging import Logger
from polar.worker import AsyncSessionMaker, TaskPriority, actor, enqueue_job

log: Logger = structlog.get_logger()


def _format_amount(amount: int, currency: str) -> str:
    major = (amount or 0) / 100
    cur = (currency or "KES").upper()
    if cur == "KES":
        return f"KSh {major:,.0f}"
    if cur == "USD":
        return f"US$ {major:,.2f}"
    return f"{cur} {major:,.2f}"


@actor(actor_name="donation.notify", priority=TaskPriority.LOW)
async def notify_donation(donation_id: UUID) -> None:
    """Send both emails for a completed tip:

      1. A warm 'showing love' thank-you receipt to the donor.
      2. A notification to the creator that they received a tip.

    Loads the Donation + Organization, then dispatches via the shared
    email_send pipeline. Best-effort — failures are logged, not raised,
    so a transient email issue never re-runs the whole webhook.
    """
    async with AsyncSessionMaker() as session:
        from polar.donation.repository import DonationRepository
        from polar.organization.repository import OrganizationRepository

        donation_repo = DonationRepository.from_session(session)
        donation = await donation_repo.get_by_id(donation_id)
        if donation is None:
            log.error("donation.notify.not_found", donation_id=str(donation_id))
            return

        org_repository = OrganizationRepository.from_session(session)
        organization = await org_repository.get_by_id(donation.organization_id)
        if organization is None:
            log.error(
                "donation.notify.org_not_found",
                donation_id=str(donation_id),
                organization_id=str(donation.organization_id),
            )
            return

        amount_label = _format_amount(donation.amount, donation.currency)
        donor_name = donation.donor_name or "a supporter"
        message_block = (
            f'<p style="margin:16px 0;padding:14px 16px;background:#F1EFE9;'
            f'border-radius:8px;color:#4A4842;font-style:italic;">'
            f"&ldquo;{donation.message}&rdquo;</p>"
            if donation.message
            else ""
        )

        # 1) Donor thank-you — warm, showing love.
        if donation.donor_email:
            donor_subject = f"You showed {organization.name} some love 🧡"
            donor_html = f"""
            <html>
              <body style="font-family:Inter,Arial,sans-serif;color:#1A1A17;background:#FAFAF7;padding:32px;">
                <div style="max-width:480px;margin:0 auto;">
                  <p style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#C2410C;font-weight:600;">Thank you</p>
                  <h1 style="font-size:26px;line-height:1.15;margin:8px 0 16px;">Your tip is on its way to {organization.name}.</h1>
                  <p style="font-size:15px;line-height:1.6;color:#4A4842;">
                    Hi {donor_name}, thank you for supporting {organization.name} with
                    a tip of <strong>{amount_label}</strong>. Creators feel this —
                    it&rsquo;s a real vote of confidence in their work.
                  </p>
                  {message_block}
                  <p style="font-size:13px;color:#88857C;margin-top:24px;">
                    Reference {donation.payment_reference}. This is your receipt —
                    keep it for your records.
                  </p>
                </div>
              </body>
            </html>
            """
            try:
                enqueue_job(
                    "email.send",
                    to_email_addr=donation.donor_email,
                    subject=donor_subject,
                    html_content=donor_html,
                    from_name=organization.name,
                    from_email_addr=DEFAULT_FROM_EMAIL_ADDRESS,
                    email_headers=None,
                    reply_to_name=None,
                    reply_to_email_addr=None,
                )
            except Exception as e:  # noqa: BLE001
                log.warning(
                    "donation.notify.donor_email_failed",
                    donation_id=str(donation_id),
                    error=str(e),
                )

        # 2) Creator notification — respect the org's new_order toggle as
        #    the closest existing notification preference.
        notif_enabled = True
        try:
            notif_enabled = organization.notification_settings.get(
                "new_order", True
            )
        except Exception:  # noqa: BLE001
            notif_enabled = True

        creator_email = organization.email
        if creator_email and notif_enabled:
            creator_subject = f"You received a {amount_label} tip 🎉"
            creator_html = f"""
            <html>
              <body style="font-family:Inter,Arial,sans-serif;color:#1A1A17;background:#FAFAF7;padding:32px;">
                <div style="max-width:480px;margin:0 auto;">
                  <p style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#C2410C;font-weight:600;">New tip</p>
                  <h1 style="font-size:26px;line-height:1.15;margin:8px 0 16px;">{donor_name} tipped you {amount_label}.</h1>
                  <p style="font-size:15px;line-height:1.6;color:#4A4842;">
                    Someone loved your work enough to send a tip. It settles to
                    your payout account on the next cycle, minus payment fees.
                  </p>
                  {message_block}
                  <p style="font-size:13px;color:#88857C;margin-top:24px;">
                    See all your tips in your Blyss dashboard under Tips.
                  </p>
                </div>
              </body>
            </html>
            """
            try:
                enqueue_job(
                    "email.send",
                    to_email_addr=creator_email,
                    subject=creator_subject,
                    html_content=creator_html,
                    from_name="Blyss",
                    from_email_addr=DEFAULT_FROM_EMAIL_ADDRESS,
                    email_headers=None,
                    reply_to_name=None,
                    reply_to_email_addr=None,
                )
            except Exception as e:  # noqa: BLE001
                log.warning(
                    "donation.notify.creator_email_failed",
                    donation_id=str(donation_id),
                    error=str(e),
                )


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

        enqueue_job(
            "email.send",
            to_email_addr=donor_email,
            subject=subject,
            html_content=html_content,
            from_name=organization.name,
            from_email_addr=DEFAULT_FROM_EMAIL_ADDRESS,
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

        enqueue_job(
            "email.send",
            to_email_addr=donor_email,
            subject=subject,
            html_content=html_content,
            from_name=organization.name,
            from_email_addr=DEFAULT_FROM_EMAIL_ADDRESS,
            email_headers=None,
            reply_to_name=None,
            reply_to_email_addr=None,
        )

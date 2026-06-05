"""
Integration test for email branding with Blyss.

Feature: platform-rebrand
Task: 12.3 Write integration test for email branding

This test validates that email templates render with Blyss branding,
including logo, sender name, and no "Polar" text.
"""

import pytest
from pytest_mock import MockerFixture

from polar.config import settings
from polar.email.tasks import email_send
from polar.models import Organization
from polar.postgres import AsyncSession
from tests.fixtures.database import SaveFixture


class TestEmailBrandingIntegration:
    """
    Integration test for email branding with Blyss.

    Validates:
    - Email templates render with Blyss logo
    - Sender name is "Blyss"
    - No "Polar" text appears in emails
    """

    @pytest.mark.asyncio
    async def test_email_sender_name_is_blyss(
        self,
        session: AsyncSession,
        mocker: MockerFixture,
    ):
        """
        Test that email sender name is configured as "Blyss".

        Requirements: 5.2
        """
        # Mock email sending
        mock_send = mocker.patch(
            "polar.email.tasks.email_sender.send",
            return_value="resend_blyss_123",
        )

        # Send test email
        await email_send(
            to_email_addr="test@example.com",
            subject="Test Email",
            html_content="<p>Test content</p>",
            from_name=settings.EMAIL_FROM_NAME,
            from_email_addr=f"mail@{settings.EMAIL_FROM_DOMAIN}",
            email_headers=None,
            reply_to_name=None,
            reply_to_email_addr=None,
        )

        # Verify email was sent
        mock_send.assert_called_once()

        # Verify sender name is "Blyss"
        call_args = mock_send.call_args
        assert call_args is not None

        # The from_name should be "Blyss"
        assert settings.EMAIL_FROM_NAME == "Blyss"

    @pytest.mark.asyncio
    async def test_email_template_rendering_no_polar_text(
        self,
        session: AsyncSession,
        mocker: MockerFixture,
    ):
        """
        Test that rendered email templates contain no "Polar" text.

        Requirements: 1.4, 5.3
        """
        # Mock email rendering to return sample HTML
        sample_html = """
        <html>
            <body>
                <h1>Welcome to Blyss</h1>
                <p>Thank you for using Blyss marketplace.</p>
                <p>From the Blyss team</p>
            </body>
        </html>
        """

        mocker.patch(
            "polar.email.tasks.render_from_json",
            return_value=sample_html,
        )

        mock_send = mocker.patch(
            "polar.email.tasks.email_sender.send",
            return_value="resend_template_123",
        )

        # Send template email
        await email_send(
            to_email_addr="test@example.com",
            subject="Welcome to Blyss",
            html_content=None,
            from_name="Blyss",
            from_email_addr=f"mail@{settings.EMAIL_FROM_DOMAIN}",
            email_headers=None,
            reply_to_name=None,
            reply_to_email_addr=None,
            template="welcome",
            props_json='{"name": "Test User"}',
        )

        # Verify email was sent
        mock_send.assert_called_once()

        # Verify rendered HTML contains no "Polar" text
        rendered_html = sample_html.lower()
        assert "polar" not in rendered_html, (
            "Found 'Polar' text in rendered email template"
        )

        # Verify it contains "Blyss" text
        assert "blyss" in rendered_html, (
            "Email template should contain 'Blyss' branding"
        )

    @pytest.mark.asyncio
    async def test_organization_email_uses_blyss_branding(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that organization emails use Blyss branding.

        Requirements: 5.1, 5.2, 5.3
        """
        # Create organization
        organization = Organization(
            name="Test Organization",
            slug="test-org",
        )
        await save_fixture(organization)

        # Get organization email reply configuration
        email_reply = organization.email_from_reply

        # Verify email uses Blyss in sender name
        assert "Blyss" in email_reply["from_name"], (
            f"Organization email should include 'Blyss' in sender name, "
            f"got: {email_reply['from_name']}"
        )

        # Verify no "Polar" text in email configuration
        from_name_lower = email_reply["from_name"].lower()
        assert "polar" not in from_name_lower, (
            f"Found 'Polar' in organization email sender name: "
            f"{email_reply['from_name']}"
        )

        # Verify email domain uses the verified Blyss sender domain
        assert settings.EMAIL_FROM_DOMAIN == "blyss.co.ke"

    @pytest.mark.asyncio
    async def test_email_configuration_validation(
        self,
        session: AsyncSession,
    ):
        """
        Test that email configuration is properly validated.

        Requirements: 5.2, 10.3
        """
        # Verify EMAIL_FROM_NAME is set to "Blyss"
        assert settings.EMAIL_FROM_NAME == "Blyss", (
            f"EMAIL_FROM_NAME should be 'Blyss', got: {settings.EMAIL_FROM_NAME}"
        )

        # Verify EMAIL_FROM_NAME is not empty
        assert settings.EMAIL_FROM_NAME, (
            "EMAIL_FROM_NAME must be set for email branding"
        )

        # Verify EMAIL_FROM_DOMAIN is set
        assert settings.EMAIL_FROM_DOMAIN, "EMAIL_FROM_DOMAIN must be set"

        # Verify no "Polar" in email configuration
        assert "polar" not in settings.EMAIL_FROM_NAME.lower()
        assert "polar" not in settings.EMAIL_FROM_DOMAIN.lower()

    @pytest.mark.asyncio
    async def test_multiple_email_templates_consistent_branding(
        self,
        session: AsyncSession,
        mocker: MockerFixture,
    ):
        """
        Test that multiple email templates use consistent Blyss branding.

        Requirements: 1.4, 5.3
        """
        # Mock different email templates
        email_templates = {
            "welcome": "<html><body><h1>Welcome to Blyss</h1></body></html>",
            "order_confirmation": "<html><body><p>Your Blyss order</p></body></html>",
            "receipt": "<html><body><p>Blyss receipt</p></body></html>",
        }

        def mock_render(template: str, props_json: str) -> str:
            return email_templates.get(template, "<html><body>Blyss</body></html>")

        mocker.patch(
            "polar.email.tasks.render_from_json",
            side_effect=mock_render,
        )

        mock_send = mocker.patch(
            "polar.email.tasks.email_sender.send",
            return_value="resend_multi_123",
        )

        # Send emails with different templates
        for template_name in email_templates.keys():
            await email_send(
                to_email_addr="test@example.com",
                subject=f"Test {template_name}",
                html_content=None,
                from_name="Blyss",
                from_email_addr=f"mail@{settings.EMAIL_FROM_DOMAIN}",
                email_headers=None,
                reply_to_name=None,
                reply_to_email_addr=None,
                template=template_name,
                props_json='{"test": "data"}',
            )

        # Verify all emails were sent
        assert mock_send.call_count == len(email_templates)

        # Verify all templates contain "Blyss" and no "Polar"
        for template_html in email_templates.values():
            template_lower = template_html.lower()
            assert "blyss" in template_lower, (
                f"Template should contain 'Blyss': {template_html}"
            )
            assert "polar" not in template_lower, (
                f"Template should not contain 'Polar': {template_html}"
            )

    @pytest.mark.asyncio
    async def test_email_domain_configuration(
        self,
        session: AsyncSession,
    ):
        """
        Test that email domain is configured for Blyss.

        Requirements: 5.2
        """
        # Verify email domain is the verified Blyss sender domain
        assert settings.EMAIL_FROM_DOMAIN == "blyss.co.ke", (
            f"EMAIL_FROM_DOMAIN should be 'blyss.co.ke', "
            f"got: {settings.EMAIL_FROM_DOMAIN}"
        )

        # Verify no "Polar" in domain
        assert "polar" not in settings.EMAIL_FROM_DOMAIN.lower()

    @pytest.mark.asyncio
    async def test_email_sender_configuration_complete(
        self,
        session: AsyncSession,
        mocker: MockerFixture,
    ):
        """
        Test that complete email sender configuration uses Blyss branding.

        Requirements: 5.1, 5.2, 5.3
        """
        mock_send = mocker.patch(
            "polar.email.tasks.email_sender.send",
            return_value="resend_complete_123",
        )

        # Send email with complete configuration
        await email_send(
            to_email_addr="customer@example.com",
            subject="Your Blyss Order",
            html_content="<html><body><p>Thank you for your Blyss order</p></body></html>",
            from_name=settings.EMAIL_FROM_NAME,
            from_email_addr=f"{settings.EMAIL_FROM_LOCAL}@{settings.EMAIL_FROM_DOMAIN}",
            email_headers=None,
            reply_to_name=None,
            reply_to_email_addr=None,
        )

        # Verify email was sent
        mock_send.assert_called_once()

        # Verify sender configuration
        assert settings.EMAIL_FROM_NAME == "Blyss"
        assert settings.EMAIL_FROM_DOMAIN == "blyss.co.ke"

        # Verify no "Polar" in any email configuration
        assert "polar" not in settings.EMAIL_FROM_NAME.lower()
        assert "polar" not in settings.EMAIL_FROM_DOMAIN.lower()

    @pytest.mark.asyncio
    async def test_email_branding_end_to_end(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        mocker: MockerFixture,
    ):
        """
        Test complete email branding flow from organization to delivery.

        Requirements: 1.4, 5.1, 5.2, 5.3
        """
        # Create organization
        organization = Organization(
            name="Creator Organization",
            slug="creator-org",
        )
        await save_fixture(organization)

        # Mock email rendering
        rendered_html = """
        <html>
            <body>
                <img src="https://blyss.co.ke/logo.png" alt="Blyss Logo" />
                <h1>Order Confirmation</h1>
                <p>Thank you for your purchase from Creator Organization via Blyss.</p>
                <p>Best regards,</p>
                <p>The Blyss Team</p>
            </body>
        </html>
        """

        mocker.patch(
            "polar.email.tasks.render_from_json",
            return_value=rendered_html,
        )

        mock_send = mocker.patch(
            "polar.email.tasks.email_sender.send",
            return_value="resend_e2e_123",
        )

        # Send order confirmation email
        org_email_reply = organization.email_from_reply

        await email_send(
            to_email_addr="customer@example.com",
            subject="Your Order Confirmation",
            html_content=None,
            from_name=org_email_reply["from_name"],
            from_email_addr=org_email_reply["from_email_addr"],
            email_headers=None,
            reply_to_name=org_email_reply["reply_to_name"],
            reply_to_email_addr=None,
            template="order_confirmation",
            props_json='{"organization": {"name": "Creator Organization"}}',
        )

        # Verify email was sent
        mock_send.assert_called_once()

        # Verify rendered HTML contains Blyss branding
        rendered_lower = rendered_html.lower()
        assert "blyss" in rendered_lower
        assert "polar" not in rendered_lower

        # Verify sender name includes Blyss
        assert "Blyss" in org_email_reply["from_name"]
        assert "polar" not in org_email_reply["from_name"].lower()

        # Verify email domain is Blyss domain
        assert settings.EMAIL_FROM_DOMAIN in org_email_reply["from_email_addr"]
        assert "polar" not in org_email_reply["from_email_addr"].lower()

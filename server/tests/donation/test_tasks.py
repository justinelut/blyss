"""Unit tests for donation background tasks.

This module contains unit tests for donation email tasks, focusing on
confirmation emails and receipt generation.
"""

from datetime import UTC, datetime
from unittest.mock import patch
from uuid import uuid4

import pytest

from polar.models import Organization
from tests.fixtures.database import SaveFixture


class TestSendDonationConfirmation:
    """Tests for send_donation_confirmation task."""

    @pytest.mark.asyncio
    async def test_send_confirmation_email(
        self,
        save_fixture: SaveFixture,
    ) -> None:
        """Test sending donation confirmation email."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
        )
        organization = await save_fixture(organization)

        from polar.donation.tasks import send_donation_confirmation

        with patch("polar.donation.tasks.email_send") as mock_email_send:
            await send_donation_confirmation(
                donor_email="john@example.com",
                donor_name="John Doe",
                amount=50000,
                organization_id=organization.id,
            )

            mock_email_send.send.assert_called_once()
            call_kwargs = mock_email_send.send.call_args[1]

            assert call_kwargs["to_email_addr"] == "john@example.com"
            assert "Thank you for your donation" in call_kwargs["subject"]
            assert "Test Creator" in call_kwargs["subject"]
            assert "John Doe" in call_kwargs["html_content"]
            assert "KES 500.00" in call_kwargs["html_content"]
            assert "Test Creator" in call_kwargs["html_content"]
            assert call_kwargs["from_name"] == "Test Creator"

    @pytest.mark.asyncio
    async def test_send_confirmation_email_organization_not_found(
        self,
    ) -> None:
        """Test sending confirmation email when organization doesn't exist."""
        from polar.donation.tasks import send_donation_confirmation

        nonexistent_org_id = uuid4()

        with patch("polar.donation.tasks.email_send") as mock_email_send:
            await send_donation_confirmation(
                donor_email="john@example.com",
                donor_name="John Doe",
                amount=50000,
                organization_id=nonexistent_org_id,
            )

            mock_email_send.send.assert_not_called()


class TestSendDonationReceipt:
    """Tests for send_donation_receipt task."""

    @pytest.mark.asyncio
    async def test_send_receipt_email(
        self,
        save_fixture: SaveFixture,
    ) -> None:
        """Test sending donation receipt email."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
        )
        organization = await save_fixture(organization)

        from polar.donation.tasks import send_donation_receipt

        donation_date = datetime.now(UTC).isoformat()

        with patch("polar.donation.tasks.email_send") as mock_email_send:
            await send_donation_receipt(
                donor_email="john@example.com",
                donor_name="John Doe",
                amount=50000,
                payment_reference="donation_test_ref_123",
                organization_id=organization.id,
                donation_date=donation_date,
            )

            mock_email_send.send.assert_called_once()
            call_kwargs = mock_email_send.send.call_args[1]

            assert call_kwargs["to_email_addr"] == "john@example.com"
            assert "Donation Receipt" in call_kwargs["subject"]
            assert "Test Creator" in call_kwargs["subject"]
            assert "John Doe" in call_kwargs["html_content"]
            assert "KES 500.00" in call_kwargs["html_content"]
            assert "donation_test_ref_123" in call_kwargs["html_content"]
            assert donation_date in call_kwargs["html_content"]
            assert "Test Creator" in call_kwargs["html_content"]
            assert call_kwargs["from_name"] == "Test Creator"

    @pytest.mark.asyncio
    async def test_send_receipt_email_with_all_fields(
        self,
        save_fixture: SaveFixture,
    ) -> None:
        """Test receipt email contains all required transaction details."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
        )
        organization = await save_fixture(organization)

        from polar.donation.tasks import send_donation_receipt

        donation_date = "2025-03-18T10:30:00Z"

        with patch("polar.donation.tasks.email_send") as mock_email_send:
            await send_donation_receipt(
                donor_email="jane@example.com",
                donor_name="Jane Smith",
                amount=100000,
                payment_reference="donation_ref_456",
                organization_id=organization.id,
                donation_date=donation_date,
            )

            mock_email_send.send.assert_called_once()
            call_kwargs = mock_email_send.send.call_args[1]
            html_content = call_kwargs["html_content"]

            assert "Jane Smith" in html_content
            assert "KES 1000.00" in html_content
            assert "2025-03-18T10:30:00Z" in html_content
            assert "donation_ref_456" in html_content
            assert "Test Creator" in html_content
            assert "Transaction Details" in html_content

    @pytest.mark.asyncio
    async def test_send_receipt_email_organization_not_found(
        self,
    ) -> None:
        """Test sending receipt email when organization doesn't exist."""
        from polar.donation.tasks import send_donation_receipt

        nonexistent_org_id = uuid4()
        donation_date = datetime.now(UTC).isoformat()

        with patch("polar.donation.tasks.email_send") as mock_email_send:
            await send_donation_receipt(
                donor_email="john@example.com",
                donor_name="John Doe",
                amount=50000,
                payment_reference="donation_test_ref_123",
                organization_id=nonexistent_org_id,
                donation_date=donation_date,
            )

            mock_email_send.send.assert_not_called()

    @pytest.mark.asyncio
    async def test_receipt_amount_formatting(
        self,
        save_fixture: SaveFixture,
    ) -> None:
        """Test that receipt formats amounts correctly (cents to KES)."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
        )
        organization = await save_fixture(organization)

        from polar.donation.tasks import send_donation_receipt

        test_cases = [
            (100, "KES 1.00"),
            (12345, "KES 123.45"),
            (1000000, "KES 10000.00"),
        ]

        for amount_cents, expected_display in test_cases:
            with patch("polar.donation.tasks.email_send") as mock_email_send:
                await send_donation_receipt(
                    donor_email="test@example.com",
                    donor_name="Test User",
                    amount=amount_cents,
                    payment_reference="test_ref",
                    organization_id=organization.id,
                    donation_date=datetime.now(UTC).isoformat(),
                )

                call_kwargs = mock_email_send.send.call_args[1]
                assert expected_display in call_kwargs["html_content"]

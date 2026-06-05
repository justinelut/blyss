"""Tests for the donation payment-status polling endpoint.

GET /v1/donation/payment-status/{reference} returns pending / success / failed
correctly, persists terminal transitions, and fires the donor emails exactly
once on the pending→success edge.
"""

from unittest.mock import patch

import pytest
from httpx import AsyncClient

from polar.models import Donation, Organization
from tests.fixtures.database import SaveFixture


async def _make_donation(
    save_fixture: SaveFixture,
    *,
    reference: str,
    status: str = "pending",
) -> Donation:
    organization = Organization(
        name="Poll Creator",
        slug=f"poll-{reference}",
        customer_invoice_prefix="POLL",
    )
    await save_fixture(organization)
    donation = Donation(
        amount=10000,
        currency="KES",
        donor_name="Poller",
        donor_email="poller@example.com",
        organization_id=organization.id,
        payment_reference=reference,
        payment_status=status,
    )
    await save_fixture(donation)
    return donation


@pytest.mark.asyncio
class TestDonationPolling:
    async def test_status_pending(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
    ) -> None:
        await _make_donation(save_fixture, reference="poll_pending")

        with (
            patch(
                "polar.donation.service.paystack_service.verify_transaction"
            ) as mock_verify,
            patch(
                "polar.donation.service.paystack_service.check_pending_charge"
            ) as mock_pending,
        ):
            mock_verify.return_value = {"status": "pending"}
            mock_pending.return_value = {"status": "pending"}

            response = await client.get(
                "/v1/donation/payment-status/poll_pending"
            )

        assert response.status_code == 200
        assert response.json()["status"] == "pending"

    async def test_status_success_fires_emails_once(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
    ) -> None:
        await _make_donation(save_fixture, reference="poll_success")

        with (
            patch(
                "polar.donation.service.paystack_service.verify_transaction"
            ) as mock_verify,
            patch(
                "polar.donation.tasks.send_donation_confirmation"
            ) as mock_confirm,
            patch("polar.donation.tasks.send_donation_receipt") as mock_receipt,
        ):
            mock_verify.return_value = {"status": "success"}

            # First poll: pending→success edge → emails fire once.
            r1 = await client.get("/v1/donation/payment-status/poll_success")
            assert r1.status_code == 200
            assert r1.json()["status"] == "success"

            # Second poll: already success → no duplicate emails.
            r2 = await client.get("/v1/donation/payment-status/poll_success")
            assert r2.json()["status"] == "success"

        mock_confirm.send.assert_called_once()
        mock_receipt.send.assert_called_once()

    async def test_status_failed(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
    ) -> None:
        await _make_donation(save_fixture, reference="poll_failed")

        with (
            patch(
                "polar.donation.service.paystack_service.verify_transaction"
            ) as mock_verify,
            patch(
                "polar.donation.tasks.send_donation_confirmation"
            ) as mock_confirm,
            patch("polar.donation.tasks.send_donation_receipt") as mock_receipt,
        ):
            mock_verify.return_value = {
                "status": "failed",
                "gateway_response": "Declined",
            }

            response = await client.get(
                "/v1/donation/payment-status/poll_failed"
            )

        assert response.status_code == 200
        assert response.json()["status"] == "failed"
        # No success emails on failure.
        mock_confirm.send.assert_not_called()
        mock_receipt.send.assert_not_called()

    async def test_status_requires_action(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
    ) -> None:
        await _make_donation(save_fixture, reference="poll_action")

        with (
            patch(
                "polar.donation.service.paystack_service.verify_transaction"
            ) as mock_verify,
            patch(
                "polar.donation.service.paystack_service.check_pending_charge"
            ) as mock_pending,
        ):
            mock_verify.return_value = {"status": "pending"}
            mock_pending.return_value = {
                "status": "send_otp",
                "display_text": "Enter the OTP sent to your phone",
            }

            response = await client.get(
                "/v1/donation/payment-status/poll_action"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "requires_action"
        assert data["next_action"]["action"] == "otp"

    async def test_status_unknown_reference_404(
        self,
        client: AsyncClient,
    ) -> None:
        response = await client.get("/v1/donation/payment-status/nope_ref")
        assert response.status_code == 404

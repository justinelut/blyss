"""Happy-path tests for inline creator-storefront tipping.

Covers POST /v1/donation/{slug}/ — the inline Paystack-native charge that the
DonationModal drives. Paystack's /charge is mocked; we assert the Donation row
is created with the right amount / message / donor name and that the response
carries a reference + status the frontend can poll.
"""

from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from polar.models import Donation, Organization
from tests.fixtures.database import SaveFixture


@pytest.mark.asyncio
class TestTipCreatorFlow:
    async def test_mobile_money_tip_creates_pending_donation(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        session,
    ) -> None:
        organization = Organization(
            name="Wanjiru Arts",
            slug="wanjiru-arts",
            customer_invoice_prefix="WANJIRU",
            subaccount_code="ACCT_creator123",
        )
        await save_fixture(organization)

        with patch(
            "polar.donation.service.paystack_service.charge"
        ) as mock_charge:
            mock_charge.return_value = {
                "reference": "donation_ref_abc",
                "status": "pending",
                "display_text": "Enter the PIN sent to your phone",
                "raw": {},
            }

            response = await client.post(
                "/v1/donation/wanjiru-arts/",
                json={
                    "amount": 10000,
                    "donor_name": "Otieno",
                    "donor_email": "otieno@example.com",
                    "message": "Love your work!",
                    "channel": "mobile_money",
                    "phone": "+254712345678",
                    "provider": "mpesa",
                },
            )

        assert response.status_code == 201
        data = response.json()
        # Response carries a reference + status the frontend polls on.
        assert data["reference"] == "donation_ref_abc"
        assert data["status"] == "pending"

        # A pending Donation row exists with the right details.
        result = await session.execute(
            select(Donation).where(
                Donation.payment_reference == "donation_ref_abc"
            )
        )
        donation = result.scalar_one()
        assert donation.amount == 10000
        assert donation.currency == "KES"
        assert donation.donor_name == "Otieno"
        assert donation.donor_email == "otieno@example.com"
        assert donation.message == "Love your work!"
        assert donation.organization_id == organization.id
        assert donation.payment_status == "pending"

        # The charge was split to the creator's subaccount.
        payload = mock_charge.call_args.args[0]
        assert payload["subaccount"] == "ACCT_creator123"
        assert payload["amount"] == 10000
        assert payload["mobile_money"]["phone"] == "+254712345678"

    async def test_tip_without_subaccount_falls_back_to_blyss_main(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        session,
    ) -> None:
        organization = Organization(
            name="No Payout Yet",
            slug="no-payout-yet",
            customer_invoice_prefix="NOPAYOUT",
            subaccount_code=None,
        )
        await save_fixture(organization)

        with patch(
            "polar.donation.service.paystack_service.charge"
        ) as mock_charge:
            mock_charge.return_value = {
                "reference": "donation_ref_main",
                "status": "pending",
                "display_text": "",
                "raw": {},
            }

            response = await client.post(
                "/v1/donation/no-payout-yet/",
                json={
                    "amount": 5000,
                    "donor_email": "fan@example.com",
                    "channel": "mobile_money",
                    "phone": "+254700000000",
                },
            )

        assert response.status_code == 201
        payload = mock_charge.call_args.args[0]
        # No subaccount → charge goes to the Blyss main account (no key set).
        assert "subaccount" not in payload

        # donor_name omitted → defaults to "Anonymous".
        result = await session.execute(
            select(Donation).where(
                Donation.payment_reference == "donation_ref_main"
            )
        )
        donation = result.scalar_one()
        assert donation.donor_name == "Anonymous"

    async def test_tip_unknown_creator_returns_404(
        self,
        client: AsyncClient,
    ) -> None:
        response = await client.post(
            "/v1/donation/does-not-exist/",
            json={
                "amount": 10000,
                "donor_email": "fan@example.com",
                "channel": "mobile_money",
                "phone": "+254700000000",
            },
        )
        assert response.status_code == 404

    async def test_tip_below_minimum_is_rejected(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
    ) -> None:
        organization = Organization(
            name="Min Test",
            slug="min-test",
            customer_invoice_prefix="MIN",
        )
        await save_fixture(organization)

        response = await client.post(
            "/v1/donation/min-test/",
            json={
                "amount": 100,  # below KES 50 minimum (5000 minor units)
                "donor_email": "fan@example.com",
                "channel": "mobile_money",
                "phone": "+254700000000",
            },
        )
        assert response.status_code == 422

    async def test_payment_channels_listed_for_creator(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
    ) -> None:
        organization = Organization(
            name="Channels Test",
            slug="channels-test",
            customer_invoice_prefix="CHAN",
        )
        await save_fixture(organization)

        response = await client.get("/v1/donation/channels-test/payment-channels")
        assert response.status_code == 200
        channels = response.json()
        assert isinstance(channels, list)
        assert len(channels) > 0
        ids = {c["id"] for c in channels}
        # KES set includes mobile money + card at minimum.
        assert "mobile_money" in ids
        assert "card" in ids

    async def test_payment_channels_unknown_creator_404(
        self,
        client: AsyncClient,
    ) -> None:
        response = await client.get("/v1/donation/nope/payment-channels")
        assert response.status_code == 404

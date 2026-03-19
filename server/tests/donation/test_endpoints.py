"""Unit tests for donation endpoints.

This module contains unit tests for donation API endpoints, focusing on
webhook signature verification, donation initiation, and creator donation retrieval.
"""

import hashlib
import hmac
import json
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from polar.config import settings
from polar.models import Donation, Organization, User
from tests.fixtures.database import SaveFixture


def create_paystack_signature(payload: bytes) -> str:
    """Create a valid Paystack webhook signature for testing."""
    return hmac.new(
        settings.PAYSTACK_WEBHOOK_SECRET.encode("utf-8"),
        payload,
        hashlib.sha512,
    ).hexdigest()


class TestInitiateDonation:
    """Tests for POST /donation/initiate endpoint."""

    @pytest.mark.asyncio
    async def test_successful_donation_initiation(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
    ) -> None:
        """Test successful donation initiation."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        organization = await save_fixture(organization)

        with patch(
            "polar.donation.service.paystack_service.initialize_transaction"
        ) as mock_paystack:
            mock_paystack.return_value = {
                "authorization_url": "https://checkout.paystack.com/test123",
                "access_code": "test_access_code",
                "reference": "donation_test_ref",
            }

            response = await client.post(
                "/v1/donation/initiate",
                json={
                    "organization_id": str(organization.id),
                    "amount": 50000,
                    "donor_name": "John Doe",
                    "donor_email": "john@example.com",
                    "message": "Keep up the great work!",
                },
            )

            assert response.status_code == 201
            data = response.json()
            assert data["payment_url"] == "https://checkout.paystack.com/test123"
            assert data["donation"]["amount"] == 50000
            assert data["donation"]["donor_name"] == "John Doe"
            assert data["donation"]["donor_email"] == "john@example.com"
            assert data["donation"]["payment_status"] == "pending"

    @pytest.mark.asyncio
    async def test_donation_initiation_invalid_amount_too_low(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
    ) -> None:
        """Test donation initiation with amount below minimum."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        organization = await save_fixture(organization)

        response = await client.post(
            "/v1/donation/initiate",
            json={
                "organization_id": str(organization.id),
                "amount": 99,
                "donor_name": "John Doe",
                "donor_email": "john@example.com",
            },
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_donation_initiation_invalid_amount_too_high(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
    ) -> None:
        """Test donation initiation with amount above maximum."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        organization = await save_fixture(organization)

        response = await client.post(
            "/v1/donation/initiate",
            json={
                "organization_id": str(organization.id),
                "amount": 1000001,
                "donor_name": "John Doe",
                "donor_email": "john@example.com",
            },
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_donation_initiation_invalid_email(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
    ) -> None:
        """Test donation initiation with invalid email format."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        organization = await save_fixture(organization)

        response = await client.post(
            "/v1/donation/initiate",
            json={
                "organization_id": str(organization.id),
                "amount": 50000,
                "donor_name": "John Doe",
                "donor_email": "invalid-email",
            },
        )

        assert response.status_code == 422


class TestPaystackWebhook:
    """Tests for POST /donation/webhook/paystack endpoint."""

    @pytest.mark.asyncio
    async def test_webhook_with_valid_signature(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
    ) -> None:
        """Test webhook processing with valid signature."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        organization = await save_fixture(organization)

        donation = Donation(
            amount=50000,
            currency="KES",
            donor_name="John Doe",
            donor_email="john@example.com",
            organization_id=organization.id,
            payment_reference="donation_test_ref_123",
            payment_status="pending",
        )
        donation = await save_fixture(donation)

        webhook_payload = {
            "event": "charge.success",
            "data": {
                "reference": "donation_test_ref_123",
                "amount": 50000,
                "status": "success",
            },
        }
        payload_bytes = json.dumps(webhook_payload).encode("utf-8")
        signature = create_paystack_signature(payload_bytes)

        with (
            patch(
                "polar.donation.service.paystack_service.verify_transaction"
            ) as mock_verify,
            patch(
                "polar.donation.endpoints.send_donation_confirmation"
            ) as mock_confirm,
            patch("polar.donation.endpoints.send_donation_receipt") as mock_receipt,
        ):
            mock_verify.return_value = {
                "status": "success",
                "reference": "donation_test_ref_123",
                "amount": 50000,
            }

            response = await client.post(
                "/v1/donation/webhook/paystack",
                content=payload_bytes,
                headers={"x-paystack-signature": signature},
            )

            assert response.status_code == 202
            assert response.json()["message"] == "Webhook received"

    @pytest.mark.asyncio
    async def test_webhook_with_invalid_signature(
        self,
        client: AsyncClient,
    ) -> None:
        """Test webhook rejection with invalid signature."""
        webhook_payload = {
            "event": "charge.success",
            "data": {
                "reference": "donation_test_ref_123",
                "amount": 50000,
                "status": "success",
            },
        }
        payload_bytes = json.dumps(webhook_payload).encode("utf-8")
        invalid_signature = "invalid_signature_12345"

        response = await client.post(
            "/v1/donation/webhook/paystack",
            content=payload_bytes,
            headers={"x-paystack-signature": invalid_signature},
        )

        assert response.status_code == 401
        assert "Invalid signature" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_webhook_without_signature(
        self,
        client: AsyncClient,
    ) -> None:
        """Test webhook rejection without signature header."""
        webhook_payload = {
            "event": "charge.success",
            "data": {
                "reference": "donation_test_ref_123",
                "amount": 50000,
                "status": "success",
            },
        }
        payload_bytes = json.dumps(webhook_payload).encode("utf-8")

        response = await client.post(
            "/v1/donation/webhook/paystack",
            content=payload_bytes,
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_webhook_with_malformed_json(
        self,
        client: AsyncClient,
    ) -> None:
        """Test webhook rejection with malformed JSON payload."""
        payload_bytes = b"not valid json"
        signature = create_paystack_signature(payload_bytes)

        response = await client.post(
            "/v1/donation/webhook/paystack",
            content=payload_bytes,
            headers={"x-paystack-signature": signature},
        )

        assert response.status_code == 400
        assert "Invalid JSON payload" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_webhook_signature_verification_function(self) -> None:
        """Test the verify_paystack_signature function directly."""
        from polar.donation.endpoints import verify_paystack_signature

        payload = b'{"event": "charge.success"}'
        valid_signature = create_paystack_signature(payload)

        assert verify_paystack_signature(payload, valid_signature) is True

        invalid_signature = "wrong_signature"
        assert verify_paystack_signature(payload, invalid_signature) is False

        assert verify_paystack_signature(payload, "") is False


class TestGetCreatorDonations:
    """Tests for GET /donation/creator/{organization_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_creator_donations_authenticated(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        user: User,
    ) -> None:
        """Test getting creator donations with authentication."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
        )
        organization = await save_fixture(organization)

        donation1 = Donation(
            amount=10000,
            currency="KES",
            donor_name="Donor 1",
            donor_email="donor1@example.com",
            organization_id=organization.id,
            payment_reference="ref_1",
            payment_status="success",
        )
        donation2 = Donation(
            amount=20000,
            currency="KES",
            donor_name="Donor 2",
            donor_email="donor2@example.com",
            organization_id=organization.id,
            payment_reference="ref_2",
            payment_status="success",
        )
        await save_fixture(donation1)
        await save_fixture(donation2)

        response = await client.get(
            f"/v1/donation/creator/{organization.id}",
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["pagination"]["total_count"] == 2

    @pytest.mark.asyncio
    async def test_get_creator_donations_empty(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        user: User,
    ) -> None:
        """Test getting creator donations with no donations."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
        )
        organization = await save_fixture(organization)

        response = await client.get(
            f"/v1/donation/creator/{organization.id}",
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 0
        assert data["pagination"]["total_count"] == 0

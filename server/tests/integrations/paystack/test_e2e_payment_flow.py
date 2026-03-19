"""End-to-end integration tests for Paystack payment flow."""

import uuid
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from polar.models import Organization
from tests.fixtures.database import SaveFixture


@pytest.mark.asyncio
class TestPaystackE2EPaymentFlow:
    """Test complete payment flow from checkout to order creation."""

    async def test_complete_payment_flow_success(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
        session,
    ):
        """Test successful payment flow from checkout initialization to order creation."""
        # Setup: Create organization with active subaccount
        organization.subaccount_code = "ACCT_test123"
        organization.subaccount_status = "active"
        await save_fixture(organization)

        # Step 1: Create checkout
        checkout_data = {
            "product_id": str(uuid.uuid4()),
            "amount": 10000,  # KES 100
            "currency": "KES",
            "customer_email": "customer@example.com",
        }

        with patch(
            "polar.integrations.paystack.service.PaystackService.initialize_transaction"
        ) as mock_init:
            mock_init.return_value = {
                "status": True,
                "data": {
                    "authorization_url": "https://checkout.paystack.com/test123",
                    "access_code": "test_access_code",
                    "reference": "test_ref_123",
                },
            }

            response = await client.post(
                "/api/v1/checkouts",
                json=checkout_data,
            )

        assert response.status_code == 201
        checkout = response.json()
        assert "authorization_url" in checkout
        assert checkout["status"] == "open"

        # Step 2: Simulate webhook for successful payment
        webhook_payload = {
            "event": "charge.success",
            "data": {
                "reference": "test_ref_123",
                "amount": 10000,
                "currency": "KES",
                "status": "success",
                "customer": {"email": "customer@example.com"},
            },
        }

        with patch(
            "polar.integrations.paystack.service.PaystackService.verify_transaction"
        ) as mock_verify:
            mock_verify.return_value = {
                "status": True,
                "data": {
                    "reference": "test_ref_123",
                    "amount": 10000,
                    "status": "success",
                },
            }

            response = await client.post(
                "/api/v1/integrations/paystack/webhook",
                json=webhook_payload,
                headers={"x-paystack-signature": "valid_signature"},
            )

        assert response.status_code == 202

        # Step 3: Verify order was created
        orders_response = await client.get("/api/v1/orders")
        assert orders_response.status_code == 200
        orders = orders_response.json()
        assert len(orders["items"]) > 0

        order = orders["items"][0]
        assert order["amount"] == 10000
        assert order["currency"] == "KES"
        assert order["platform_fee_amount"] == 2000  # 20% of 10000

    async def test_payment_flow_with_inactive_subaccount(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ):
        """Test that payment initialization fails with inactive subaccount."""
        # Setup: Organization with pending subaccount
        organization.subaccount_code = None
        organization.subaccount_status = "pending"
        await save_fixture(organization)

        checkout_data = {
            "product_id": str(uuid.uuid4()),
            "amount": 10000,
            "currency": "KES",
            "customer_email": "customer@example.com",
        }

        response = await client.post(
            "/api/v1/checkouts",
            json=checkout_data,
        )

        assert response.status_code == 422
        assert "subaccount" in response.json()["detail"].lower()

    async def test_payment_flow_with_failed_verification(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ):
        """Test payment flow when verification fails."""
        organization.subaccount_code = "ACCT_test123"
        organization.subaccount_status = "active"
        await save_fixture(organization)

        # Create checkout
        checkout_data = {
            "product_id": str(uuid.uuid4()),
            "amount": 10000,
            "currency": "KES",
            "customer_email": "customer@example.com",
        }

        with patch(
            "polar.integrations.paystack.service.PaystackService.initialize_transaction"
        ) as mock_init:
            mock_init.return_value = {
                "status": True,
                "data": {
                    "authorization_url": "https://checkout.paystack.com/test123",
                    "reference": "test_ref_123",
                },
            }

            response = await client.post(
                "/api/v1/checkouts",
                json=checkout_data,
            )

        assert response.status_code == 201

        # Simulate webhook with failed verification
        webhook_payload = {
            "event": "charge.success",
            "data": {
                "reference": "test_ref_123",
                "amount": 10000,
                "status": "success",
            },
        }

        with patch(
            "polar.integrations.paystack.service.PaystackService.verify_transaction"
        ) as mock_verify:
            mock_verify.return_value = {
                "status": False,
                "message": "Transaction verification failed",
            }

            response = await client.post(
                "/api/v1/integrations/paystack/webhook",
                json=webhook_payload,
                headers={"x-paystack-signature": "valid_signature"},
            )

        # Checkout should return to open status
        checkout_response = await client.get(
            f"/api/v1/checkouts/{response.json()['id']}"
        )
        checkout = checkout_response.json()
        assert checkout["status"] == "open"


@pytest.mark.asyncio
class TestPaystackE2ESubaccountManagement:
    """Test subaccount creation and management."""

    async def test_subaccount_creation_on_organization_creation(
        self,
        client: AsyncClient,
        session,
    ):
        """Test that subaccount is created when organization is created."""
        org_data = {
            "name": "Test Organization",
            "slug": "test-org",
        }

        with patch(
            "polar.integrations.paystack.service.PaystackService.create_subaccount"
        ) as mock_create:
            mock_create.return_value = {
                "status": True,
                "data": {
                    "subaccount_code": "ACCT_new123",
                    "business_name": "Test Organization",
                    "percentage_charge": 80.0,
                },
            }

            response = await client.post(
                "/api/v1/organizations",
                json=org_data,
            )

        assert response.status_code == 201
        org = response.json()
        assert org["subaccount_code"] == "ACCT_new123"
        assert org["subaccount_status"] == "active"

    async def test_subaccount_retry_after_failure(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ):
        """Test retry functionality for failed subaccount creation."""
        organization.subaccount_status = "failed"
        await save_fixture(organization)

        with patch(
            "polar.integrations.paystack.service.PaystackService.create_subaccount"
        ) as mock_create:
            mock_create.return_value = {
                "status": True,
                "data": {
                    "subaccount_code": "ACCT_retry123",
                    "percentage_charge": 80.0,
                },
            }

            response = await client.post(
                f"/api/v1/organizations/{organization.id}/subaccount/retry"
            )

        assert response.status_code == 200
        org = response.json()
        assert org["subaccount_code"] == "ACCT_retry123"
        assert org["subaccount_status"] == "active"


@pytest.mark.asyncio
class TestPaystackE2EMpesaConfiguration:
    """Test M-Pesa configuration and verification."""

    async def test_mpesa_configuration_flow(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
        organization: Organization,
    ):
        """Test complete M-Pesa configuration flow."""
        organization.subaccount_code = "ACCT_test123"
        organization.subaccount_status = "active"
        await save_fixture(organization)

        # Step 1: Submit M-Pesa number
        mpesa_data = {"mpesa_number": "+254712345678"}

        with patch(
            "polar.integrations.paystack.service.PaystackService.send_verification_transaction"
        ) as mock_verify:
            mock_verify.return_value = {
                "status": True,
                "data": {
                    "reference": "verify_ref_123",
                    "amount": 1000,
                },
            }

            response = await client.post(
                f"/api/v1/organizations/{organization.id}/mpesa",
                json=mpesa_data,
            )

        assert response.status_code == 200
        org = response.json()
        assert org["mpesa_number"] == "+254712345678"
        assert org["mpesa_verified"] is False

        # Step 2: Verify M-Pesa number
        with patch(
            "polar.integrations.paystack.service.PaystackService.verify_transaction"
        ) as mock_verify_tx:
            mock_verify_tx.return_value = {
                "status": True,
                "data": {"status": "success"},
            }

            with patch(
                "polar.integrations.paystack.service.PaystackService.update_subaccount"
            ) as mock_update:
                mock_update.return_value = {"status": True}

                response = await client.post(
                    f"/api/v1/organizations/{organization.id}/mpesa/verify"
                )

        assert response.status_code == 200
        org = response.json()
        assert org["mpesa_verified"] is True

    async def test_mpesa_invalid_format_rejection(
        self,
        client: AsyncClient,
        organization: Organization,
    ):
        """Test that invalid M-Pesa number format is rejected."""
        mpesa_data = {"mpesa_number": "0712345678"}  # Missing +254 prefix

        response = await client.post(
            f"/api/v1/organizations/{organization.id}/mpesa",
            json=mpesa_data,
        )

        assert response.status_code == 422
        assert "format" in response.json()["detail"].lower()


@pytest.mark.asyncio
class TestPaystackE2EWebhookProcessing:
    """Test webhook event processing."""

    async def test_webhook_signature_verification(
        self,
        client: AsyncClient,
    ):
        """Test webhook signature verification."""
        webhook_payload = {
            "event": "charge.success",
            "data": {"reference": "test_ref"},
        }

        # Test with invalid signature
        response = await client.post(
            "/api/v1/integrations/paystack/webhook",
            json=webhook_payload,
            headers={"x-paystack-signature": "invalid_signature"},
        )

        assert response.status_code == 401

    async def test_webhook_idempotency(
        self,
        client: AsyncClient,
    ):
        """Test that duplicate webhooks are handled idempotently."""
        webhook_payload = {
            "event": "charge.success",
            "data": {
                "id": "evt_unique_123",
                "reference": "test_ref_123",
                "amount": 10000,
                "status": "success",
            },
        }

        with patch(
            "polar.integrations.paystack.service.PaystackService.verify_transaction"
        ) as mock_verify:
            mock_verify.return_value = {
                "status": True,
                "data": {"status": "success", "amount": 10000},
            }

            # Send webhook twice
            response1 = await client.post(
                "/api/v1/integrations/paystack/webhook",
                json=webhook_payload,
                headers={"x-paystack-signature": "valid_signature"},
            )

            response2 = await client.post(
                "/api/v1/integrations/paystack/webhook",
                json=webhook_payload,
                headers={"x-paystack-signature": "valid_signature"},
            )

        assert response1.status_code == 202
        assert response2.status_code == 202

        # Verify only one order was created
        orders_response = await client.get("/api/v1/orders")
        orders = orders_response.json()
        order_count = len(
            [o for o in orders["items"] if o["reference"] == "test_ref_123"]
        )
        assert order_count == 1

    async def test_charge_failed_webhook(
        self,
        client: AsyncClient,
        save_fixture: SaveFixture,
    ):
        """Test charge.failed webhook processing."""
        webhook_payload = {
            "event": "charge.failed",
            "data": {
                "reference": "test_ref_failed",
                "amount": 10000,
                "status": "failed",
            },
        }

        response = await client.post(
            "/api/v1/integrations/paystack/webhook",
            json=webhook_payload,
            headers={"x-paystack-signature": "valid_signature"},
        )

        assert response.status_code == 202

        # Verify no order was created
        orders_response = await client.get("/api/v1/orders")
        orders = orders_response.json()
        failed_orders = [
            o for o in orders["items"] if o.get("reference") == "test_ref_failed"
        ]
        assert len(failed_orders) == 0


@pytest.mark.asyncio
class TestPaystackE2EErrorRecovery:
    """Test error scenarios and recovery."""

    async def test_network_error_retry(
        self,
        client: AsyncClient,
        organization: Organization,
    ):
        """Test retry logic for network errors."""
        checkout_data = {
            "product_id": str(uuid.uuid4()),
            "amount": 10000,
            "currency": "KES",
            "customer_email": "customer@example.com",
        }

        with patch(
            "polar.integrations.paystack.service.PaystackService.initialize_transaction"
        ) as mock_init:
            # Simulate network error then success
            mock_init.side_effect = [
                Exception("Network error"),
                {
                    "status": True,
                    "data": {
                        "authorization_url": "https://checkout.paystack.com/test123",
                        "reference": "test_ref_123",
                    },
                },
            ]

            # First attempt should fail
            response1 = await client.post("/api/v1/checkouts", json=checkout_data)
            assert response1.status_code == 503

            # Retry should succeed
            response2 = await client.post("/api/v1/checkouts", json=checkout_data)
            assert response2.status_code == 201

    async def test_api_validation_error_handling(
        self,
        client: AsyncClient,
        organization: Organization,
    ):
        """Test handling of Paystack API validation errors."""
        checkout_data = {
            "product_id": str(uuid.uuid4()),
            "amount": -100,  # Invalid amount
            "currency": "KES",
            "customer_email": "customer@example.com",
        }

        response = await client.post("/api/v1/checkouts", json=checkout_data)

        assert response.status_code == 422
        assert "amount" in response.json()["detail"].lower()

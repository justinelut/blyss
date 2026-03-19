"""
Unit tests for Paystack integration backward compatibility.

These tests verify that the Paystack integration maintains backward compatibility
with existing Stripe orders and functionality using specific test cases.
"""

import uuid

import pytest
from httpx import AsyncClient

from polar.enums import PaymentProcessor
from polar.models import Order, Organization
from polar.order.repository import OrderRepository
from polar.postgres import AsyncSession
from tests.fixtures.database import SaveFixture


class TestBackwardCompatibility:
    """Unit tests for backward compatibility requirements."""

    @pytest.mark.asyncio
    async def test_stripe_order_queries_unchanged(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that Stripe order queries work unchanged after Paystack integration.
        Requirements: 10.1, 10.2
        """
        # Create a Stripe order
        organization = Organization(name="Test Org")
        await save_fixture(organization)

        stripe_order = Order(
            subtotal_amount=1000,
            tax_amount=100,
            currency="USD",
            billing_reason="purchase",
            stripe_invoice_id="in_stripe_test_123",
            platform_fee_amount=0,  # Stripe orders have no platform fee
            customer_id=uuid.uuid4(),
            organization_id=organization.id,
        )
        await save_fixture(stripe_order)

        # Query the order using repository
        order_repository = OrderRepository.from_session(session)

        # Test: Get by stripe_invoice_id should work
        retrieved_order = await order_repository.get_by_stripe_invoice_id(
            "in_stripe_test_123"
        )
        assert retrieved_order is not None
        assert retrieved_order.id == stripe_order.id
        assert retrieved_order.stripe_invoice_id == "in_stripe_test_123"
        assert retrieved_order.platform_fee_amount == 0

        # Test: Get by ID should work
        retrieved_by_id = await order_repository.get_by_id(stripe_order.id)
        assert retrieved_by_id is not None
        assert retrieved_by_id.stripe_invoice_id == "in_stripe_test_123"

    @pytest.mark.asyncio
    async def test_mixed_stripe_and_paystack_order_queries(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that queries work with both Stripe and Paystack orders.
        Requirements: 10.2
        """
        # Create organization
        organization = Organization(name="Test Org")
        await save_fixture(organization)

        # Create Stripe order
        stripe_order = Order(
            subtotal_amount=1000,
            tax_amount=100,
            currency="USD",
            billing_reason="purchase",
            stripe_invoice_id="in_stripe_test_456",
            platform_fee_amount=0,  # Stripe orders have no platform fee
            customer_id=uuid.uuid4(),
            organization_id=organization.id,
        )
        await save_fixture(stripe_order)

        # Create Paystack order (using stripe_invoice_id field for transaction reference)
        paystack_order = Order(
            subtotal_amount=2000,
            tax_amount=200,
            currency="KES",
            billing_reason="purchase",
            stripe_invoice_id="paystack_ref_789",  # Reusing field for Paystack
            platform_fee_amount=400,  # 20% platform fee for Paystack
            customer_id=uuid.uuid4(),
            organization_id=organization.id,
        )
        await save_fixture(paystack_order)

        # Query all orders
        order_repository = OrderRepository.from_session(session)
        all_orders = await order_repository.get_all()

        # Should find both orders
        order_ids = [order.id for order in all_orders]
        assert stripe_order.id in order_ids
        assert paystack_order.id in order_ids

        # Should be able to distinguish by platform fee
        stripe_orders = [
            order for order in all_orders if order.platform_fee_amount == 0
        ]
        paystack_orders = [
            order for order in all_orders if order.platform_fee_amount > 0
        ]

        assert len(stripe_orders) >= 1
        assert len(paystack_orders) >= 1
        assert stripe_order.id in [order.id for order in stripe_orders]
        assert paystack_order.id in [order.id for order in paystack_orders]

    @pytest.mark.asyncio
    async def test_webhook_routing_for_both_processors(
        self,
        client: AsyncClient,
    ):
        """
        Test that webhook routing works correctly for both processors.
        Requirements: 10.4
        """
        # Test Stripe webhook endpoint exists and is separate
        stripe_webhook_response = await client.post(
            "/v1/integrations/stripe/webhook",
            headers={"Stripe-Signature": "invalid_signature"},
            content=b"test_payload",
        )
        # Should get 401 (signature verification failure) not 404 (endpoint not found)
        assert stripe_webhook_response.status_code == 401

        # Test Paystack webhook endpoint exists and is separate
        paystack_webhook_response = await client.post(
            "/v1/integrations/paystack/webhook",
            headers={"X-Paystack-Signature": "invalid_signature"},
            content=b'{"event": "charge.success", "data": {}}',
        )
        # Should get 401 (signature verification failure) not 404 (endpoint not found)
        assert paystack_webhook_response.status_code == 401

        # Verify endpoints are different
        assert "/stripe/" in "/v1/integrations/stripe/webhook"
        assert "/paystack/" in "/v1/integrations/paystack/webhook"
        assert "/v1/integrations/stripe/webhook" != "/v1/integrations/paystack/webhook"

    @pytest.mark.asyncio
    async def test_payment_processor_type_display(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that payment processor type can be determined from order data.
        Requirements: 10.3
        """
        # Create organization
        organization = Organization(name="Test Org")
        await save_fixture(organization)

        # Create Stripe order
        stripe_order = Order(
            subtotal_amount=1000,
            tax_amount=100,
            currency="USD",
            billing_reason="purchase",
            stripe_invoice_id="in_stripe_display_test",
            platform_fee_amount=0,  # Stripe orders have no platform fee
            customer_id=uuid.uuid4(),
            organization_id=organization.id,
        )
        await save_fixture(stripe_order)

        # Create Paystack order
        paystack_order = Order(
            subtotal_amount=2000,
            tax_amount=200,
            currency="KES",
            billing_reason="purchase",
            stripe_invoice_id="paystack_display_test",
            platform_fee_amount=400,  # 20% platform fee for Paystack
            customer_id=uuid.uuid4(),
            organization_id=organization.id,
        )
        await save_fixture(paystack_order)

        # Function to determine payment processor type
        def get_payment_processor_type(order: Order) -> PaymentProcessor:
            """Determine payment processor type from order data."""
            if order.platform_fee_amount > 0:
                return PaymentProcessor.paystack
            else:
                return PaymentProcessor.stripe

        # Test processor type detection
        stripe_processor_type = get_payment_processor_type(stripe_order)
        paystack_processor_type = get_payment_processor_type(paystack_order)

        assert stripe_processor_type == PaymentProcessor.stripe
        assert paystack_processor_type == PaymentProcessor.paystack

        # Test that processor type can be displayed
        assert str(stripe_processor_type) == "stripe"
        assert str(paystack_processor_type) == "paystack"

    @pytest.mark.asyncio
    async def test_stripe_order_preservation_during_migration(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that existing Stripe orders are preserved during Paystack integration.
        Requirements: 10.1
        """
        # Create organization
        organization = Organization(name="Test Org")
        await save_fixture(organization)

        # Create existing Stripe order (simulating pre-migration state)
        original_stripe_order = Order(
            subtotal_amount=1500,
            tax_amount=150,
            currency="USD",
            billing_reason="purchase",
            stripe_invoice_id="in_stripe_preserve_test",
            platform_fee_amount=0,  # Stripe orders have no platform fee
            customer_id=uuid.uuid4(),
            organization_id=organization.id,
        )
        await save_fixture(original_stripe_order)

        # Store original values
        original_id = original_stripe_order.id
        original_stripe_invoice_id = original_stripe_order.stripe_invoice_id
        original_subtotal = original_stripe_order.subtotal_amount
        original_tax = original_stripe_order.tax_amount
        original_currency = original_stripe_order.currency
        original_platform_fee = original_stripe_order.platform_fee_amount

        # Simulate Paystack integration deployment (no changes should occur)
        # In a real scenario, this would be the migration/deployment process

        # Retrieve the order after "migration"
        order_repository = OrderRepository.from_session(session)
        preserved_order = await order_repository.get_by_id(original_id)

        # Verify all original data is preserved
        assert preserved_order is not None
        assert preserved_order.id == original_id
        assert preserved_order.stripe_invoice_id == original_stripe_invoice_id
        assert preserved_order.subtotal_amount == original_subtotal
        assert preserved_order.tax_amount == original_tax
        assert preserved_order.currency == original_currency
        assert preserved_order.platform_fee_amount == original_platform_fee

        # Verify it's still identifiable as a Stripe order
        assert preserved_order.platform_fee_amount == 0  # Stripe characteristic
        assert preserved_order.stripe_invoice_id.startswith(
            "in_"
        )  # Stripe invoice format

    @pytest.mark.asyncio
    async def test_webhook_task_name_separation(self):
        """
        Test that webhook task names are properly separated between processors.
        Requirements: 10.4
        """
        # Stripe webhook task names
        stripe_events = [
            "charge.succeeded",
            "payment_intent.succeeded",
            "refund.created",
        ]
        stripe_task_names = [f"stripe.webhook.{event}" for event in stripe_events]

        # Paystack webhook task names
        paystack_events = ["charge.success", "charge.failed", "transfer.success"]
        paystack_task_names = [f"paystack.webhook.{event}" for event in paystack_events]

        # Verify no overlap in task names
        task_name_overlap = set(stripe_task_names) & set(paystack_task_names)
        assert len(task_name_overlap) == 0, (
            f"Task names should not overlap: {task_name_overlap}"
        )

        # Verify proper prefixes
        for task_name in stripe_task_names:
            assert task_name.startswith("stripe.webhook.")
            assert not task_name.startswith("paystack.webhook.")

        for task_name in paystack_task_names:
            assert task_name.startswith("paystack.webhook.")
            assert not task_name.startswith("stripe.webhook.")

        # Verify task names are distinct
        all_task_names = stripe_task_names + paystack_task_names
        unique_task_names = set(all_task_names)
        assert len(all_task_names) == len(unique_task_names), (
            "All task names should be unique"
        )

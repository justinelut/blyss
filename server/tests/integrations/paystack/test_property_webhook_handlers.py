"""Property-based tests for Paystack webhook event handlers.

This module contains property-based tests using hypothesis to verify
webhook event handling properties.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from polar.integrations.paystack.tasks import charge_failed, charge_success
from polar.models.checkout import CheckoutStatus


class TestWebhookHandlerProperties:
    """Property-based tests for webhook event handlers."""

    @settings(max_examples=100, deadline=None)
    @given(
        transaction_reference=st.text(
            min_size=10,
            max_size=50,
            alphabet=st.characters(
                min_codepoint=48,
                max_codepoint=122,
                blacklist_characters=" \"'\\",
            ),
        ),
        amount=st.integers(min_value=100, max_value=10000000),
        customer_email=st.emails(),
    )
    @pytest.mark.asyncio
    async def test_property_7_charge_success_creates_order(
        self,
        transaction_reference: str,
        amount: int,
        customer_email: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 7: Charge Success Creates Order

        For any charge.success webhook event with a valid transaction reference,
        the platform should create an order record and mark the associated checkout
        as confirmed.

        **Validates: Requirements 2.5, 6.5**
        """
        event_id = uuid.uuid4()
        checkout_id = uuid.uuid4()
        customer_id = uuid.uuid4()
        product_id = uuid.uuid4()
        organization_id = uuid.uuid4()

        # Create mock event data
        event_data = {
            "event": "charge.success",
            "data": {
                "reference": transaction_reference,
                "amount": amount,
                "currency": "KES",
                "status": "success",
                "customer": {"email": customer_email},
                "metadata": {"checkout_id": str(checkout_id)},
            },
        }

        # Create mock verified transaction response
        verified_transaction = {
            "status": "success",
            "reference": transaction_reference,
            "amount": amount,
            "currency": "KES",
            "metadata": {"checkout_id": str(checkout_id)},
        }

        # Create mock checkout
        mock_checkout = MagicMock()
        mock_checkout.id = checkout_id
        mock_checkout.status = CheckoutStatus.open
        mock_checkout.customer_id = customer_id
        mock_checkout.product_id = product_id
        mock_checkout.organization_id = organization_id
        mock_checkout.amount = amount
        mock_checkout.currency = "KES"
        mock_checkout.order = None
        mock_checkout.product = MagicMock()
        mock_checkout.product.is_recurring = False

        # Create mock order
        mock_order = MagicMock()
        mock_order.id = uuid.uuid4()
        mock_order.stripe_invoice_id = None

        # Create mock event
        mock_event = MagicMock()
        mock_event.id = event_id
        mock_event.paystack_data = event_data
        mock_event.is_handled = False

        # Mock session and services
        mock_session = AsyncMock()
        mock_session.flush = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.AsyncSessionMaker"
            ) as mock_session_maker,
            patch(
                "polar.integrations.paystack.tasks.external_event_service"
            ) as mock_external_event_service,
            patch("polar.integrations.paystack.tasks.paystack") as mock_paystack,
            patch(
                "polar.integrations.paystack.tasks.checkout_service"
            ) as mock_checkout_service,
            patch(
                "polar.integrations.paystack.tasks.order_service"
            ) as mock_order_service,
        ):
            # Setup mocks
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            mock_session_maker.return_value.__aexit__.return_value = None

            mock_external_event_service.handle_paystack.return_value.__aenter__.return_value = mock_event
            mock_external_event_service.handle_paystack.return_value.__aexit__.return_value = None

            mock_paystack.verify_transaction = AsyncMock(
                return_value=verified_transaction
            )
            mock_checkout_service.get = AsyncMock(return_value=mock_checkout)
            mock_checkout_service.update = AsyncMock(return_value=mock_checkout)
            mock_order_service.create_from_checkout_one_time = AsyncMock(
                return_value=mock_order
            )

            # Execute the task
            await charge_success(event_id)

            # Property assertion: Transaction must be verified with Paystack API
            mock_paystack.verify_transaction.assert_called_once_with(
                transaction_reference
            )

            # Property assertion: Checkout must be retrieved
            mock_checkout_service.get.assert_called_once_with(mock_session, checkout_id)

            # Property assertion: Checkout status must be updated to confirmed
            mock_checkout_service.update.assert_called_once()
            update_call_args = mock_checkout_service.update.call_args
            assert update_call_args[0][1] == mock_checkout
            assert (
                update_call_args[1]["update_dict"]["status"] == CheckoutStatus.confirmed
            )

            # Property assertion: Order must be created from checkout
            mock_order_service.create_from_checkout_one_time.assert_called_once_with(
                mock_session, mock_checkout, payment=None
            )

            # Property assertion: Transaction reference must be stored in order
            assert mock_order.stripe_invoice_id == transaction_reference

    @settings(max_examples=100, deadline=None)
    @given(
        transaction_reference=st.text(
            min_size=10,
            max_size=50,
            alphabet=st.characters(
                min_codepoint=48,
                max_codepoint=122,
                blacklist_characters=" \"'\\",
            ),
        ),
        amount=st.integers(min_value=100, max_value=10000000),
        customer_email=st.emails(),
    )
    @pytest.mark.asyncio
    async def test_property_27_payment_verification_before_order_creation(
        self,
        transaction_reference: str,
        amount: int,
        customer_email: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 27: Payment Verification Before Order Creation

        For any payment completion webhook, the platform should verify the transaction
        status with Paystack before creating an order record.

        **Validates: Requirements 6.4**
        """
        event_id = uuid.uuid4()
        checkout_id = uuid.uuid4()

        event_data = {
            "event": "charge.success",
            "data": {
                "reference": transaction_reference,
                "amount": amount,
                "currency": "KES",
                "status": "success",
                "customer": {"email": customer_email},
                "metadata": {"checkout_id": str(checkout_id)},
            },
        }

        verified_transaction = {
            "status": "success",
            "reference": transaction_reference,
            "amount": amount,
            "currency": "KES",
            "metadata": {"checkout_id": str(checkout_id)},
        }

        mock_checkout = MagicMock()
        mock_checkout.id = checkout_id
        mock_checkout.status = CheckoutStatus.open
        mock_checkout.order = None
        mock_checkout.product = MagicMock()
        mock_checkout.product.is_recurring = False

        mock_order = MagicMock()
        mock_order.id = uuid.uuid4()
        mock_order.stripe_invoice_id = None

        mock_event = MagicMock()
        mock_event.id = event_id
        mock_event.paystack_data = event_data
        mock_event.is_handled = False

        mock_session = AsyncMock()
        mock_session.flush = AsyncMock()

        # Track call order
        call_order = []

        def track_verify(*args, **kwargs):
            call_order.append("verify")
            return verified_transaction

        def track_create_order(*args, **kwargs):
            call_order.append("create_order")
            return mock_order

        with (
            patch(
                "polar.integrations.paystack.tasks.AsyncSessionMaker"
            ) as mock_session_maker,
            patch(
                "polar.integrations.paystack.tasks.external_event_service"
            ) as mock_external_event_service,
            patch("polar.integrations.paystack.tasks.paystack") as mock_paystack,
            patch(
                "polar.integrations.paystack.tasks.checkout_service"
            ) as mock_checkout_service,
            patch(
                "polar.integrations.paystack.tasks.order_service"
            ) as mock_order_service,
        ):
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            mock_session_maker.return_value.__aexit__.return_value = None

            mock_external_event_service.handle_paystack.return_value.__aenter__.return_value = mock_event
            mock_external_event_service.handle_paystack.return_value.__aexit__.return_value = None

            mock_paystack.verify_transaction = AsyncMock(side_effect=track_verify)
            mock_checkout_service.get = AsyncMock(return_value=mock_checkout)
            mock_checkout_service.update = AsyncMock(return_value=mock_checkout)
            mock_order_service.create_from_checkout_one_time = AsyncMock(
                side_effect=track_create_order
            )

            await charge_success(event_id)

            # Property assertion: Verification must happen before order creation
            assert len(call_order) == 2, "Both verify and create_order must be called"
            assert call_order[0] == "verify", (
                "Transaction verification must happen before order creation"
            )
            assert call_order[1] == "create_order", (
                "Order creation must happen after verification"
            )

    @settings(max_examples=100, deadline=None)
    @given(
        transaction_reference=st.text(
            min_size=10,
            max_size=50,
            alphabet=st.characters(
                min_codepoint=48,
                max_codepoint=122,
                blacklist_characters=" \"'\\",
            ),
        ),
        amount=st.integers(min_value=100, max_value=10000000),
    )
    @pytest.mark.asyncio
    async def test_property_28_transaction_reference_stored_in_order(
        self,
        transaction_reference: str,
        amount: int,
    ) -> None:
        """
        Feature: paystack-integration, Property 28: Transaction Reference Stored in Order

        For any order created from a Paystack payment, the order should contain
        the Paystack transaction reference for tracking and reconciliation.

        **Validates: Requirements 6.6**
        """
        event_id = uuid.uuid4()
        checkout_id = uuid.uuid4()

        event_data = {
            "event": "charge.success",
            "data": {
                "reference": transaction_reference,
                "amount": amount,
                "currency": "KES",
                "status": "success",
                "metadata": {"checkout_id": str(checkout_id)},
            },
        }

        verified_transaction = {
            "status": "success",
            "reference": transaction_reference,
            "amount": amount,
            "currency": "KES",
            "metadata": {"checkout_id": str(checkout_id)},
        }

        mock_checkout = MagicMock()
        mock_checkout.id = checkout_id
        mock_checkout.status = CheckoutStatus.open
        mock_checkout.order = None
        mock_checkout.product = MagicMock()
        mock_checkout.product.is_recurring = False

        mock_order = MagicMock()
        mock_order.id = uuid.uuid4()
        mock_order.stripe_invoice_id = None

        mock_event = MagicMock()
        mock_event.id = event_id
        mock_event.paystack_data = event_data

        mock_session = AsyncMock()
        mock_session.flush = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.AsyncSessionMaker"
            ) as mock_session_maker,
            patch(
                "polar.integrations.paystack.tasks.external_event_service"
            ) as mock_external_event_service,
            patch("polar.integrations.paystack.tasks.paystack") as mock_paystack,
            patch(
                "polar.integrations.paystack.tasks.checkout_service"
            ) as mock_checkout_service,
            patch(
                "polar.integrations.paystack.tasks.order_service"
            ) as mock_order_service,
        ):
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            mock_session_maker.return_value.__aexit__.return_value = None

            mock_external_event_service.handle_paystack.return_value.__aenter__.return_value = mock_event
            mock_external_event_service.handle_paystack.return_value.__aexit__.return_value = None

            mock_paystack.verify_transaction = AsyncMock(
                return_value=verified_transaction
            )
            mock_checkout_service.get = AsyncMock(return_value=mock_checkout)
            mock_checkout_service.update = AsyncMock(return_value=mock_checkout)
            mock_order_service.create_from_checkout_one_time = AsyncMock(
                return_value=mock_order
            )

            await charge_success(event_id)

            # Property assertion: Order must have transaction reference stored
            assert mock_order.stripe_invoice_id is not None, (
                "Order must have transaction reference stored"
            )
            assert mock_order.stripe_invoice_id == transaction_reference, (
                "Stored transaction reference must match the Paystack transaction reference"
            )

    @settings(max_examples=100, deadline=None)
    @given(
        transaction_reference=st.text(
            min_size=10,
            max_size=50,
            alphabet=st.characters(
                min_codepoint=48,
                max_codepoint=122,
                blacklist_characters=" \"'\\",
            ),
        ),
        amount=st.integers(min_value=100, max_value=10000000),
        customer_email=st.emails(),
    )
    @pytest.mark.asyncio
    async def test_property_8_charge_failed_updates_checkout(
        self,
        transaction_reference: str,
        amount: int,
        customer_email: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 8: Charge Failed Updates Checkout

        For any charge.failed webhook event, the platform should mark the associated
        checkout as failed without creating an order.

        **Validates: Requirements 2.6**
        """
        event_id = uuid.uuid4()
        checkout_id = uuid.uuid4()

        event_data = {
            "event": "charge.failed",
            "data": {
                "reference": transaction_reference,
                "amount": amount,
                "currency": "KES",
                "status": "failed",
                "customer": {"email": customer_email},
                "metadata": {"checkout_id": str(checkout_id)},
            },
        }

        mock_checkout = MagicMock()
        mock_checkout.id = checkout_id
        mock_checkout.status = CheckoutStatus.open

        mock_event = MagicMock()
        mock_event.id = event_id
        mock_event.paystack_data = event_data
        mock_event.is_handled = False

        mock_session = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.AsyncSessionMaker"
            ) as mock_session_maker,
            patch(
                "polar.integrations.paystack.tasks.external_event_service"
            ) as mock_external_event_service,
            patch(
                "polar.integrations.paystack.tasks.checkout_service"
            ) as mock_checkout_service,
            patch(
                "polar.integrations.paystack.tasks.order_service"
            ) as mock_order_service,
        ):
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            mock_session_maker.return_value.__aexit__.return_value = None

            mock_external_event_service.handle_paystack.return_value.__aenter__.return_value = mock_event
            mock_external_event_service.handle_paystack.return_value.__aexit__.return_value = None

            mock_checkout_service.get = AsyncMock(return_value=mock_checkout)
            mock_checkout_service.update = AsyncMock(return_value=mock_checkout)

            await charge_failed(event_id)

            # Property assertion: Checkout must be retrieved
            mock_checkout_service.get.assert_called_once_with(mock_session, checkout_id)

            # Property assertion: Checkout status must be updated to failed
            mock_checkout_service.update.assert_called_once()
            update_call_args = mock_checkout_service.update.call_args
            assert update_call_args[0][1] == mock_checkout
            assert update_call_args[1]["update_dict"]["status"] == CheckoutStatus.failed

            # Property assertion: Order creation must NOT be called
            mock_order_service.create_from_checkout_one_time.assert_not_called()
            mock_order_service.create_from_checkout_subscription.assert_not_called()

"""Property-based tests for Paystack inactive subaccount prevention.

This module contains property-based tests using hypothesis to verify
that payments are prevented when organization subaccount is not active.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from polar.auth.models import Anonymous, AuthSubject
from polar.checkout.schemas import CheckoutConfirm
from polar.checkout.service import CheckoutService, PaymentError
from polar.models.checkout import Checkout, CheckoutStatus, PaymentProcessor
from polar.models.organization import Organization


class TestInactiveSubaccountPreventionProperties:
    """Property-based tests for inactive subaccount prevention."""

    @settings(max_examples=100, deadline=None)
    @given(
        subaccount_code=st.text(
            min_size=10,
            max_size=30,
            alphabet=st.characters(
                min_codepoint=65,
                max_codepoint=90,
            ).filter(lambda c: c.isalnum() or c == "_"),
        ),
        subaccount_status=st.sampled_from(["pending", "failed"]),  # Non-active statuses
        organization_id=st.uuids(),
        checkout_id=st.uuids(),
        customer_email=st.emails(),
        amount=st.integers(min_value=100, max_value=10000000),
        currency=st.sampled_from(["KES"]),
        product_id=st.uuids(),
        product_price_id=st.uuids(),
    )
    @pytest.mark.asyncio
    async def test_property_20_inactive_subaccount_prevents_payment(
        self,
        subaccount_code: str,
        subaccount_status: str,
        organization_id: uuid.UUID,
        checkout_id: uuid.UUID,
        customer_email: str,
        amount: int,
        currency: str,
        product_id: uuid.UUID,
        product_price_id: uuid.UUID,
    ) -> None:
        """
        Feature: paystack-integration, Property 20: Inactive Subaccount Prevents Payment

        For any payment initialization attempt where the organization's subaccount_status
        is not "active", the platform should reject the payment initialization and return
        an error.

        **Validates: Requirements 4.7**
        """
        # Create mock organization with inactive subaccount
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.subaccount_code = subaccount_code
        mock_organization.subaccount_status = subaccount_status  # Not "active"
        mock_organization.checkout_require_3ds = False

        # Create mock checkout
        mock_checkout = MagicMock(spec=Checkout)
        mock_checkout.id = checkout_id
        mock_checkout.organization_id = organization_id
        mock_checkout.organization = mock_organization
        mock_checkout.status = CheckoutStatus.open
        mock_checkout.payment_processor = PaymentProcessor.paystack
        mock_checkout.customer_email = customer_email
        mock_checkout.total_amount = amount
        mock_checkout.currency = currency
        mock_checkout.product_id = product_id
        mock_checkout.product_price_id = product_price_id
        mock_checkout.is_payment_required = True
        mock_checkout.is_payment_form_required = False
        mock_checkout.payment_processor_metadata = {}
        mock_checkout.customer = None
        mock_checkout.discount = None
        mock_checkout.require_billing_address = False
        mock_checkout.is_business_customer = False
        mock_checkout.trial_end = None

        # Create mock customer
        mock_customer = MagicMock()
        mock_customer.id = uuid.uuid4()
        mock_customer.email = customer_email

        # Create mock checkout confirm
        checkout_confirm = CheckoutConfirm()

        with (
            patch("polar.checkout.service.paystack_service") as mock_paystack_service,
            patch("polar.checkout.service.organization_service") as mock_org_service,
            patch("polar.checkout.service.enqueue_job") as mock_enqueue,
        ):
            # Setup mocks
            mock_org_service.is_organization_ready_for_payment = AsyncMock(
                return_value=True
            )

            # Create checkout service
            checkout_service = CheckoutService()

            # Mock the _create_or_update_customer method to return the customer
            async def mock_create_or_update_customer(session, auth_subject, checkout):
                class MockCustomerContext:
                    def __init__(self, customer, generate_session):
                        self.customer = customer
                        self.generate_session = generate_session

                    async def __aenter__(self):
                        return self.customer, self.generate_session

                    async def __aexit__(self, exc_type, exc_val, exc_tb):
                        pass

                return MockCustomerContext(mock_customer, False)

            checkout_service._create_or_update_customer = mock_create_or_update_customer

            # Mock the _update_checkout_tax method
            checkout_service._update_checkout_tax = AsyncMock(
                return_value=mock_checkout
            )

            # Mock the _after_checkout_updated method
            checkout_service._after_checkout_updated = AsyncMock()

            # Mock session
            mock_session = MagicMock()

            # Property assertion: Payment initialization should raise PaymentError for inactive subaccount
            auth_subject = AuthSubject(subject=Anonymous(), scopes=set())

            with pytest.raises(PaymentError) as exc_info:
                await checkout_service._confirm_inner(
                    mock_session, auth_subject, mock_checkout, checkout_confirm
                )

            # Property assertion: Error must be related to inactive subaccount
            error = exc_info.value
            assert error.checkout == mock_checkout, (
                "PaymentError must reference the checkout that failed"
            )
            assert error.error_type == "inactive_subaccount", (
                f"PaymentError type must be 'inactive_subaccount', got '{error.error_type}'"
            )
            assert subaccount_status in error.error_message, (
                f"PaymentError message must mention the subaccount status '{subaccount_status}'"
            )

            # Property assertion: Paystack initialize_transaction should NOT be called
            mock_paystack_service.initialize_transaction.assert_not_called()

            # Property assertion: Checkout status should remain unchanged (not confirmed)
            assert mock_checkout.status == CheckoutStatus.open, (
                "Checkout status must remain open when payment initialization fails"
            )

    @settings(max_examples=100, deadline=None)
    @given(
        organization_id=st.uuids(),
        checkout_id=st.uuids(),
        customer_email=st.emails(),
        amount=st.integers(min_value=100, max_value=10000000),
        currency=st.sampled_from(["KES"]),
    )
    @pytest.mark.asyncio
    async def test_property_20_missing_subaccount_code_prevents_payment(
        self,
        organization_id: uuid.UUID,
        checkout_id: uuid.UUID,
        customer_email: str,
        amount: int,
        currency: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 20: Inactive Subaccount Prevents Payment

        Verify that payment is prevented when organization has no subaccount_code
        (None or empty), which indicates the subaccount was never created or failed.

        **Validates: Requirements 4.7**
        """
        # Create mock organization with missing subaccount_code
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.subaccount_code = None  # Missing subaccount
        mock_organization.subaccount_status = "pending"
        mock_organization.checkout_require_3ds = False

        # Create mock checkout
        mock_checkout = MagicMock(spec=Checkout)
        mock_checkout.id = checkout_id
        mock_checkout.organization_id = organization_id
        mock_checkout.organization = mock_organization
        mock_checkout.status = CheckoutStatus.open
        mock_checkout.payment_processor = PaymentProcessor.paystack
        mock_checkout.customer_email = customer_email
        mock_checkout.total_amount = amount
        mock_checkout.currency = currency
        mock_checkout.product_id = uuid.uuid4()
        mock_checkout.product_price_id = uuid.uuid4()
        mock_checkout.is_payment_required = True
        mock_checkout.is_payment_form_required = False
        mock_checkout.payment_processor_metadata = {}
        mock_checkout.customer = None
        mock_checkout.discount = None
        mock_checkout.require_billing_address = False
        mock_checkout.is_business_customer = False
        mock_checkout.trial_end = None

        # Create mock customer
        mock_customer = MagicMock()
        mock_customer.id = uuid.uuid4()
        mock_customer.email = customer_email

        # Create mock checkout confirm
        checkout_confirm = CheckoutConfirm()

        with (
            patch("polar.checkout.service.paystack_service") as mock_paystack_service,
            patch("polar.checkout.service.organization_service") as mock_org_service,
            patch("polar.checkout.service.enqueue_job") as mock_enqueue,
        ):
            # Setup mocks
            mock_org_service.is_organization_ready_for_payment = AsyncMock(
                return_value=True
            )

            # Create checkout service
            checkout_service = CheckoutService()

            # Mock the _create_or_update_customer method
            async def mock_create_or_update_customer(session, auth_subject, checkout):
                class MockCustomerContext:
                    def __init__(self, customer, generate_session):
                        self.customer = customer
                        self.generate_session = generate_session

                    async def __aenter__(self):
                        return self.customer, self.generate_session

                    async def __aexit__(self, exc_type, exc_val, exc_tb):
                        pass

                return MockCustomerContext(mock_customer, False)

            checkout_service._create_or_update_customer = mock_create_or_update_customer

            # Mock the _update_checkout_tax method
            checkout_service._update_checkout_tax = AsyncMock(
                return_value=mock_checkout
            )

            # Mock the _after_checkout_updated method
            checkout_service._after_checkout_updated = AsyncMock()

            # Mock session
            mock_session = MagicMock()

            # Property assertion: Payment initialization should raise PaymentError for missing subaccount
            auth_subject = AuthSubject(subject=Anonymous(), scopes=set())

            with pytest.raises(PaymentError) as exc_info:
                await checkout_service._confirm_inner(
                    mock_session, auth_subject, mock_checkout, checkout_confirm
                )

            # Property assertion: Error must be related to inactive subaccount
            error = exc_info.value
            assert error.checkout == mock_checkout, (
                "PaymentError must reference the checkout that failed"
            )
            assert error.error_type == "inactive_subaccount", (
                f"PaymentError type must be 'inactive_subaccount', got '{error.error_type}'"
            )

            # Property assertion: Paystack initialize_transaction should NOT be called
            mock_paystack_service.initialize_transaction.assert_not_called()

    @settings(max_examples=100, deadline=None)
    @given(
        subaccount_code=st.text(
            min_size=10,
            max_size=30,
            alphabet=st.characters(
                min_codepoint=65,
                max_codepoint=90,
            ).filter(lambda c: c.isalnum() or c == "_"),
        ),
        organization_id=st.uuids(),
        checkout_id=st.uuids(),
        customer_email=st.emails(),
        amount=st.integers(min_value=100, max_value=10000000),
        currency=st.sampled_from(["KES"]),
    )
    @pytest.mark.asyncio
    async def test_property_20_active_subaccount_allows_payment(
        self,
        subaccount_code: str,
        organization_id: uuid.UUID,
        checkout_id: uuid.UUID,
        customer_email: str,
        amount: int,
        currency: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 20: Inactive Subaccount Prevents Payment

        Verify that payment is allowed when organization has an active subaccount,
        demonstrating the contrast with inactive subaccounts.

        **Validates: Requirements 4.7**
        """
        # Create mock organization with active subaccount
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.subaccount_code = subaccount_code
        mock_organization.subaccount_status = "active"  # Active status
        mock_organization.checkout_require_3ds = False

        # Create mock checkout
        mock_checkout = MagicMock(spec=Checkout)
        mock_checkout.id = checkout_id
        mock_checkout.organization_id = organization_id
        mock_checkout.organization = mock_organization
        mock_checkout.status = CheckoutStatus.open
        mock_checkout.payment_processor = PaymentProcessor.paystack
        mock_checkout.customer_email = customer_email
        mock_checkout.total_amount = amount
        mock_checkout.currency = currency
        mock_checkout.product_id = uuid.uuid4()
        mock_checkout.product_price_id = uuid.uuid4()
        mock_checkout.is_payment_required = True
        mock_checkout.is_payment_form_required = False
        mock_checkout.payment_processor_metadata = {}
        mock_checkout.customer = None
        mock_checkout.discount = None
        mock_checkout.require_billing_address = False
        mock_checkout.is_business_customer = False
        mock_checkout.trial_end = None

        # Create mock customer
        mock_customer = MagicMock()
        mock_customer.id = uuid.uuid4()
        mock_customer.email = customer_email

        # Create mock checkout confirm
        checkout_confirm = CheckoutConfirm()

        # Create mock Paystack transaction response
        transaction_reference = f"checkout_{checkout_id}_test_ref"
        mock_transaction_response = {
            "status": True,
            "message": "Authorization URL created",
            "data": {
                "authorization_url": f"https://checkout.paystack.com/{transaction_reference}",
                "access_code": f"access_{transaction_reference}",
                "reference": transaction_reference,
            },
        }

        with (
            patch("polar.checkout.service.paystack_service") as mock_paystack_service,
            patch("polar.checkout.service.organization_service") as mock_org_service,
            patch("polar.checkout.service.enqueue_job") as mock_enqueue,
            patch("polar.checkout.service.generate_token") as mock_generate_token,
        ):
            # Setup mocks
            mock_org_service.is_organization_ready_for_payment = AsyncMock(
                return_value=True
            )
            mock_paystack_service.initialize_transaction = AsyncMock(
                return_value=mock_transaction_response["data"]
            )
            mock_generate_token.return_value = "test_token"

            # Create checkout service
            checkout_service = CheckoutService()

            # Mock the _create_or_update_customer method
            async def mock_create_or_update_customer(session, auth_subject, checkout):
                class MockCustomerContext:
                    def __init__(self, customer, generate_session):
                        self.customer = customer
                        self.generate_session = generate_session

                    async def __aenter__(self):
                        return self.customer, self.generate_session

                    async def __aexit__(self, exc_type, exc_val, exc_tb):
                        pass

                return MockCustomerContext(mock_customer, False)

            checkout_service._create_or_update_customer = mock_create_or_update_customer

            # Mock the _update_checkout_tax method
            checkout_service._update_checkout_tax = AsyncMock(
                return_value=mock_checkout
            )

            # Mock the _after_checkout_updated method
            checkout_service._after_checkout_updated = AsyncMock()

            # Mock session
            mock_session = MagicMock()

            # Property assertion: Payment initialization should succeed for active subaccount
            auth_subject = AuthSubject(subject=Anonymous(), scopes=set())

            # This should NOT raise an exception
            result_checkout = await checkout_service._confirm_inner(
                mock_session, auth_subject, mock_checkout, checkout_confirm
            )

            # Property assertion: Paystack initialize_transaction should be called
            mock_paystack_service.initialize_transaction.assert_called_once()

            # Property assertion: Checkout status should be confirmed
            assert result_checkout.status == CheckoutStatus.confirmed, (
                "Checkout status must be confirmed when subaccount is active"
            )

            # Property assertion: Transaction reference should be stored
            assert (
                "transaction_reference" in result_checkout.payment_processor_metadata
            ), "Transaction reference must be stored for active subaccount payments"

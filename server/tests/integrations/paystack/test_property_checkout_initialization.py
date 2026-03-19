"""Property-based tests for Paystack checkout initialization.

This module contains property-based tests using hypothesis to verify
that checkout initializes Paystack transactions correctly.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from polar.auth.models import Anonymous, AuthSubject
from polar.checkout.schemas import CheckoutConfirm
from polar.checkout.service import CheckoutService
from polar.models.checkout import Checkout, CheckoutStatus, PaymentProcessor
from polar.models.organization import Organization


class TestCheckoutInitializationProperties:
    """Property-based tests for checkout initialization."""

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
        product_id=st.uuids(),
        product_price_id=st.uuids(),
    )
    @pytest.mark.asyncio
    async def test_property_26_checkout_initializes_paystack_transaction(
        self,
        subaccount_code: str,
        organization_id: uuid.UUID,
        checkout_id: uuid.UUID,
        customer_email: str,
        amount: int,
        currency: str,
        product_id: uuid.UUID,
        product_price_id: uuid.UUID,
    ) -> None:
        """
        Feature: paystack-integration, Property 26: Checkout Initializes Paystack Transaction

        For any checkout creation, the platform should initialize a Paystack transaction
        and return the authorization URL to the customer.

        **Validates: Requirements 6.1, 6.2**
        """
        # Create mock organization with active subaccount
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.subaccount_code = subaccount_code
        mock_organization.subaccount_status = "active"
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

        # Create mock Paystack transaction response
        transaction_reference = f"checkout_{checkout_id}_test_ref"
        authorization_url = f"https://checkout.paystack.com/{transaction_reference}"
        access_code = f"access_{transaction_reference}"

        mock_transaction_response = {
            "status": True,
            "message": "Authorization URL created",
            "data": {
                "authorization_url": authorization_url,
                "access_code": access_code,
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

            # Call the confirm method
            auth_subject = AuthSubject(subject=Anonymous(), scopes=set())
            result_checkout = await checkout_service._confirm_inner(
                mock_session, auth_subject, mock_checkout, checkout_confirm
            )

            # Property assertion: Paystack initialize_transaction must be called
            mock_paystack_service.initialize_transaction.assert_called_once()
            call_args = mock_paystack_service.initialize_transaction.call_args

            # Property assertion: Transaction initialization must include correct parameters
            assert call_args.kwargs["email"] == customer_email, (
                "Transaction initialization must include customer email"
            )
            assert call_args.kwargs["amount"] == amount, (
                "Transaction initialization must include correct amount"
            )
            assert call_args.kwargs["currency"] == currency, (
                "Transaction initialization must include correct currency"
            )
            assert call_args.kwargs["subaccount"] == subaccount_code, (
                "Transaction initialization must include organization subaccount"
            )

            # Property assertion: Transaction reference must be generated and included
            assert "reference" in call_args.kwargs, (
                "Transaction initialization must include a reference"
            )
            transaction_ref = call_args.kwargs["reference"]
            assert transaction_ref is not None and len(transaction_ref) > 0, (
                "Transaction reference must not be empty"
            )
            assert str(checkout_id) in transaction_ref, (
                "Transaction reference must include checkout ID for tracking"
            )

            # Property assertion: Authorization URL must be stored in checkout metadata
            assert "authorization_url" in result_checkout.payment_processor_metadata, (
                "Checkout must store authorization URL for customer redirect"
            )
            stored_auth_url = result_checkout.payment_processor_metadata[
                "authorization_url"
            ]
            assert stored_auth_url == authorization_url, (
                f"Stored authorization URL must match Paystack response: "
                f"expected {authorization_url}, got {stored_auth_url}"
            )

            # Property assertion: Authorization URL must be a valid HTTPS URL
            assert stored_auth_url.startswith("https://"), (
                "Authorization URL must be a secure HTTPS URL"
            )
            assert "checkout.paystack.com" in stored_auth_url, (
                "Authorization URL must be from Paystack checkout domain"
            )

            # Property assertion: Transaction reference must be stored for tracking
            assert (
                "transaction_reference" in result_checkout.payment_processor_metadata
            ), "Checkout must store transaction reference for verification"
            stored_ref = result_checkout.payment_processor_metadata[
                "transaction_reference"
            ]
            assert stored_ref == transaction_reference, (
                f"Stored transaction reference must match Paystack response: "
                f"expected {transaction_reference}, got {stored_ref}"
            )

            # Property assertion: Access code must be stored if provided
            if "access_code" in mock_transaction_response["data"]:
                assert "access_code" in result_checkout.payment_processor_metadata, (
                    "Checkout must store access code when provided by Paystack"
                )
                stored_access_code = result_checkout.payment_processor_metadata[
                    "access_code"
                ]
                assert stored_access_code == access_code, (
                    f"Stored access code must match Paystack response: "
                    f"expected {access_code}, got {stored_access_code}"
                )

            # Property assertion: Checkout status must be confirmed after initialization
            assert result_checkout.status == CheckoutStatus.confirmed, (
                "Checkout status must be confirmed after successful transaction initialization"
            )

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
    async def test_property_26_checkout_initialization_with_free_amount(
        self,
        subaccount_code: str,
        organization_id: uuid.UUID,
        checkout_id: uuid.UUID,
        customer_email: str,
        amount: int,
        currency: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 26: Checkout Initializes Paystack Transaction

        Verify that checkout handles free (zero amount) transactions correctly
        by not initializing Paystack transactions for free checkouts.

        **Validates: Requirements 6.1, 6.2**
        """
        # Create mock organization with active subaccount
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.subaccount_code = subaccount_code
        mock_organization.subaccount_status = "active"
        mock_organization.checkout_require_3ds = False

        # Create mock checkout with zero amount (free)
        mock_checkout = MagicMock(spec=Checkout)
        mock_checkout.id = checkout_id
        mock_checkout.organization_id = organization_id
        mock_checkout.organization = mock_organization
        mock_checkout.status = CheckoutStatus.open
        mock_checkout.payment_processor = PaymentProcessor.paystack
        mock_checkout.customer_email = customer_email
        mock_checkout.total_amount = 0  # Free checkout
        mock_checkout.currency = currency
        mock_checkout.product_id = uuid.uuid4()
        mock_checkout.product_price_id = uuid.uuid4()
        mock_checkout.is_payment_required = False  # No payment required for free
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

            # Call the confirm method
            auth_subject = AuthSubject(subject=Anonymous(), scopes=set())
            result_checkout = await checkout_service._confirm_inner(
                mock_session, auth_subject, mock_checkout, checkout_confirm
            )

            # Property assertion: Paystack initialize_transaction should NOT be called for free checkouts
            mock_paystack_service.initialize_transaction.assert_not_called()

            # Property assertion: Free checkout should be handled by background job
            mock_enqueue.assert_called_once_with(
                "checkout.handle_free_success", checkout_id=checkout_id
            )

            # Property assertion: Checkout status must be confirmed even for free checkouts
            assert result_checkout.status == CheckoutStatus.confirmed, (
                "Free checkout status must be confirmed without payment initialization"
            )

            # Property assertion: No payment processor metadata should be set for free checkouts
            # (or at least no Paystack-specific metadata)
            paystack_metadata_keys = [
                "transaction_reference",
                "authorization_url",
                "access_code",
            ]
            for key in paystack_metadata_keys:
                assert key not in result_checkout.payment_processor_metadata, (
                    f"Free checkout should not have Paystack metadata key: {key}"
                )

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
        currency=st.sampled_from(["USD", "EUR", "GBP"]),  # Non-KES currencies
    )
    @pytest.mark.asyncio
    async def test_property_26_checkout_initialization_currency_handling(
        self,
        subaccount_code: str,
        organization_id: uuid.UUID,
        checkout_id: uuid.UUID,
        customer_email: str,
        amount: int,
        currency: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 26: Checkout Initializes Paystack Transaction

        Verify that checkout initialization correctly handles different currencies
        and passes them to Paystack transaction initialization.

        **Validates: Requirements 6.1, 6.2**
        """
        # Create mock organization with active subaccount
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.subaccount_code = subaccount_code
        mock_organization.subaccount_status = "active"
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

            # Call the confirm method
            auth_subject = AuthSubject(subject=Anonymous(), scopes=set())
            result_checkout = await checkout_service._confirm_inner(
                mock_session, auth_subject, mock_checkout, checkout_confirm
            )

            # Property assertion: Paystack initialize_transaction must be called
            mock_paystack_service.initialize_transaction.assert_called_once()
            call_args = mock_paystack_service.initialize_transaction.call_args

            # Property assertion: Currency must be passed correctly to Paystack
            assert call_args.kwargs["currency"] == currency, (
                f"Transaction initialization must include correct currency: "
                f"expected {currency}, got {call_args.kwargs.get('currency')}"
            )

            # Property assertion: Amount must be passed correctly regardless of currency
            assert call_args.kwargs["amount"] == amount, (
                f"Transaction initialization must include correct amount: "
                f"expected {amount}, got {call_args.kwargs.get('amount')}"
            )

            # Property assertion: Checkout must be confirmed regardless of currency
            assert result_checkout.status == CheckoutStatus.confirmed, (
                f"Checkout must be confirmed for any supported currency: {currency}"
            )

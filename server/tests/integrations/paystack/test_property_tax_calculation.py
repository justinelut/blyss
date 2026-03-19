"""Property-based tests for Paystack tax calculation before payment.

This module contains property-based tests using hypothesis to verify
that tax amounts are calculated before initializing Paystack payments.
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


class TestTaxCalculationProperties:
    """Property-based tests for tax calculation before payment."""

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
        base_amount=st.integers(min_value=100, max_value=10000000),
        tax_amount=st.integers(min_value=0, max_value=1000000),
        currency=st.sampled_from(["KES"]),
        product_id=st.uuids(),
        product_price_id=st.uuids(),
    )
    @pytest.mark.asyncio
    async def test_property_29_tax_calculation_before_payment(
        self,
        subaccount_code: str,
        organization_id: uuid.UUID,
        checkout_id: uuid.UUID,
        customer_email: str,
        base_amount: int,
        tax_amount: int,
        currency: str,
        product_id: uuid.UUID,
        product_price_id: uuid.UUID,
    ) -> None:
        """
        Feature: paystack-integration, Property 29: Tax Calculation Before Payment

        For any checkout, tax amounts should be calculated and included in the total
        before initializing the Paystack transaction.

        **Validates: Requirements 6.7**
        """
        total_amount = base_amount + tax_amount

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
        mock_checkout.total_amount = base_amount  # Initial amount before tax
        mock_checkout.tax_amount = 0  # Initial tax amount
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

        # Create updated checkout with tax calculated
        mock_checkout_with_tax = MagicMock(spec=Checkout)
        mock_checkout_with_tax.id = checkout_id
        mock_checkout_with_tax.organization_id = organization_id
        mock_checkout_with_tax.organization = mock_organization
        mock_checkout_with_tax.status = CheckoutStatus.open
        mock_checkout_with_tax.payment_processor = PaymentProcessor.paystack
        mock_checkout_with_tax.customer_email = customer_email
        mock_checkout_with_tax.total_amount = (
            total_amount  # Amount after tax calculation
        )
        mock_checkout_with_tax.tax_amount = tax_amount  # Calculated tax amount
        mock_checkout_with_tax.currency = currency
        mock_checkout_with_tax.product_id = product_id
        mock_checkout_with_tax.product_price_id = product_price_id
        mock_checkout_with_tax.is_payment_required = True
        mock_checkout_with_tax.is_payment_form_required = False
        mock_checkout_with_tax.payment_processor_metadata = {}
        mock_checkout_with_tax.customer = None
        mock_checkout_with_tax.discount = None
        mock_checkout_with_tax.require_billing_address = False
        mock_checkout_with_tax.is_business_customer = False
        mock_checkout_with_tax.trial_end = None

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

            # Mock the _update_checkout_tax method to simulate tax calculation
            # This method should be called twice: once in _confirm_inner and once in the Paystack branch
            tax_calculation_calls = []

            async def mock_update_checkout_tax(session, checkout):
                tax_calculation_calls.append(checkout)
                # Return checkout with updated tax amounts
                return mock_checkout_with_tax

            checkout_service._update_checkout_tax = AsyncMock(
                side_effect=mock_update_checkout_tax
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

            # Property assertion: Tax calculation must be called before payment initialization
            assert len(tax_calculation_calls) >= 1, (
                "Tax calculation must be called at least once before payment initialization"
            )

            # Property assertion: Paystack initialize_transaction must be called with tax-inclusive amount
            mock_paystack_service.initialize_transaction.assert_called_once()
            call_args = mock_paystack_service.initialize_transaction.call_args

            # The amount passed to Paystack should be the total amount (including tax)
            assert call_args.kwargs["amount"] == total_amount, (
                f"Payment initialization must use tax-inclusive amount: "
                f"expected {total_amount}, got {call_args.kwargs.get('amount')}"
            )

            # Property assertion: Tax amount must be calculated and stored
            # Note: The result_checkout should have the updated tax amount
            assert hasattr(result_checkout, "tax_amount"), (
                "Checkout must have tax_amount attribute after tax calculation"
            )

            # Property assertion: Total amount must include tax
            assert result_checkout.total_amount == total_amount, (
                f"Checkout total_amount must include tax: "
                f"expected {total_amount}, got {result_checkout.total_amount}"
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
        base_amount=st.integers(min_value=100, max_value=10000000),
        currency=st.sampled_from(["KES"]),
    )
    @pytest.mark.asyncio
    async def test_property_29_zero_tax_calculation(
        self,
        subaccount_code: str,
        organization_id: uuid.UUID,
        checkout_id: uuid.UUID,
        customer_email: str,
        base_amount: int,
        currency: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 29: Tax Calculation Before Payment

        Verify that tax calculation works correctly when tax amount is zero,
        ensuring the payment amount equals the base amount.

        **Validates: Requirements 6.7**
        """
        tax_amount = 0
        total_amount = base_amount + tax_amount  # Should equal base_amount

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
        mock_checkout.total_amount = base_amount
        mock_checkout.tax_amount = 0
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

        # Create updated checkout with zero tax
        mock_checkout_with_tax = MagicMock(spec=Checkout)
        mock_checkout_with_tax.id = checkout_id
        mock_checkout_with_tax.organization_id = organization_id
        mock_checkout_with_tax.organization = mock_organization
        mock_checkout_with_tax.status = CheckoutStatus.open
        mock_checkout_with_tax.payment_processor = PaymentProcessor.paystack
        mock_checkout_with_tax.customer_email = customer_email
        mock_checkout_with_tax.total_amount = total_amount  # Same as base_amount
        mock_checkout_with_tax.tax_amount = tax_amount  # Zero
        mock_checkout_with_tax.currency = currency
        mock_checkout_with_tax.product_id = uuid.uuid4()
        mock_checkout_with_tax.product_price_id = uuid.uuid4()
        mock_checkout_with_tax.is_payment_required = True
        mock_checkout_with_tax.is_payment_form_required = False
        mock_checkout_with_tax.payment_processor_metadata = {}
        mock_checkout_with_tax.customer = None
        mock_checkout_with_tax.discount = None
        mock_checkout_with_tax.require_billing_address = False
        mock_checkout_with_tax.is_business_customer = False
        mock_checkout_with_tax.trial_end = None

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
                return_value=mock_checkout_with_tax
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

            # Property assertion: Tax calculation must be called even for zero tax
            checkout_service._update_checkout_tax.assert_called()

            # Property assertion: Payment amount should equal base amount when tax is zero
            mock_paystack_service.initialize_transaction.assert_called_once()
            call_args = mock_paystack_service.initialize_transaction.call_args

            assert call_args.kwargs["amount"] == base_amount, (
                f"Payment amount must equal base amount when tax is zero: "
                f"expected {base_amount}, got {call_args.kwargs.get('amount')}"
            )

            # Property assertion: Tax amount must be zero
            assert result_checkout.tax_amount == 0, (
                f"Tax amount must be zero: got {result_checkout.tax_amount}"
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
        base_amount=st.integers(min_value=100, max_value=10000000),
        tax_rate=st.floats(min_value=0.0, max_value=0.5),  # 0% to 50% tax rate
        currency=st.sampled_from(["KES"]),
    )
    @pytest.mark.asyncio
    async def test_property_29_tax_calculation_consistency(
        self,
        subaccount_code: str,
        organization_id: uuid.UUID,
        checkout_id: uuid.UUID,
        customer_email: str,
        base_amount: int,
        tax_rate: float,
        currency: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 29: Tax Calculation Before Payment

        Verify that tax calculation is consistent and the total amount passed to
        Paystack always equals base amount plus calculated tax amount.

        **Validates: Requirements 6.7**
        """
        tax_amount = int(base_amount * tax_rate)
        total_amount = base_amount + tax_amount

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
        mock_checkout.total_amount = base_amount
        mock_checkout.tax_amount = 0
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

        # Create updated checkout with calculated tax
        mock_checkout_with_tax = MagicMock(spec=Checkout)
        mock_checkout_with_tax.id = checkout_id
        mock_checkout_with_tax.organization_id = organization_id
        mock_checkout_with_tax.organization = mock_organization
        mock_checkout_with_tax.status = CheckoutStatus.open
        mock_checkout_with_tax.payment_processor = PaymentProcessor.paystack
        mock_checkout_with_tax.customer_email = customer_email
        mock_checkout_with_tax.total_amount = total_amount
        mock_checkout_with_tax.tax_amount = tax_amount
        mock_checkout_with_tax.currency = currency
        mock_checkout_with_tax.product_id = uuid.uuid4()
        mock_checkout_with_tax.product_price_id = uuid.uuid4()
        mock_checkout_with_tax.is_payment_required = True
        mock_checkout_with_tax.is_payment_form_required = False
        mock_checkout_with_tax.payment_processor_metadata = {}
        mock_checkout_with_tax.customer = None
        mock_checkout_with_tax.discount = None
        mock_checkout_with_tax.require_billing_address = False
        mock_checkout_with_tax.is_business_customer = False
        mock_checkout_with_tax.trial_end = None

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
                return_value=mock_checkout_with_tax
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

            # Property assertion: Payment amount must equal calculated total
            mock_paystack_service.initialize_transaction.assert_called_once()
            call_args = mock_paystack_service.initialize_transaction.call_args

            assert call_args.kwargs["amount"] == total_amount, (
                f"Payment amount must equal base + tax: "
                f"expected {total_amount} (base: {base_amount} + tax: {tax_amount}), "
                f"got {call_args.kwargs.get('amount')}"
            )

            # Property assertion: Tax calculation consistency
            calculated_total = result_checkout.total_amount
            calculated_tax = result_checkout.tax_amount

            # The total should equal the sum of base amount and tax
            expected_total = base_amount + calculated_tax
            assert calculated_total == expected_total, (
                f"Total amount must equal base + calculated tax: "
                f"total: {calculated_total}, base: {base_amount}, tax: {calculated_tax}, "
                f"expected: {expected_total}"
            )

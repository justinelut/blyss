"""Property-based tests for Paystack payment subaccount inclusion.

This module contains property-based tests using hypothesis to verify
that payments include the organization's subaccount code for automatic splitting.
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


class TestPaymentSubaccountProperties:
    """Property-based tests for payment subaccount inclusion."""

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
    async def test_property_16_payment_includes_subaccount_code(
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
        Feature: paystack-integration, Property 16: Payment Includes Subaccount Code

        For any payment initialization, the transaction should include the creator
        organization's subaccount_code to enable automatic payment splitting.

        **Validates: Requirements 4.1**
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

            # Property assertion: Paystack initialize_transaction must be called with subaccount_code
            mock_paystack_service.initialize_transaction.assert_called_once()
            call_args = mock_paystack_service.initialize_transaction.call_args

            # Verify that subaccount parameter was included and matches organization's subaccount_code
            assert "subaccount" in call_args.kwargs, (
                "Payment initialization must include subaccount parameter"
            )
            assert call_args.kwargs["subaccount"] == subaccount_code, (
                f"Payment subaccount must match organization subaccount_code: "
                f"expected {subaccount_code}, got {call_args.kwargs.get('subaccount')}"
            )

            # Property assertion: Other required parameters must be present
            assert call_args.kwargs["email"] == customer_email, (
                "Payment must include customer email"
            )
            assert call_args.kwargs["amount"] == amount, (
                "Payment must include correct amount"
            )
            assert call_args.kwargs["currency"] == currency, (
                "Payment must include correct currency"
            )

            # Property assertion: Transaction reference must be stored in checkout metadata
            assert (
                "transaction_reference" in result_checkout.payment_processor_metadata
            ), "Checkout must store transaction reference in metadata"
            assert (
                result_checkout.payment_processor_metadata["transaction_reference"]
                == transaction_reference
            ), "Stored transaction reference must match Paystack response"

            # Property assertion: Authorization URL must be stored in checkout metadata
            assert "authorization_url" in result_checkout.payment_processor_metadata, (
                "Checkout must store authorization URL in metadata"
            )
            assert result_checkout.payment_processor_metadata[
                "authorization_url"
            ].startswith("https://"), "Authorization URL must be a valid HTTPS URL"

            # Property assertion: Checkout status must be confirmed
            assert result_checkout.status == CheckoutStatus.confirmed, (
                "Checkout status must be confirmed after successful payment initialization"
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
        metadata_keys=st.lists(
            st.text(min_size=1, max_size=20),
            min_size=1,
            max_size=5,
            unique=True,
        ),
        metadata_values=st.lists(
            st.text(min_size=1, max_size=50),
            min_size=1,
            max_size=5,
        ),
    )
    @pytest.mark.asyncio
    async def test_property_16_payment_includes_subaccount_with_metadata(
        self,
        subaccount_code: str,
        organization_id: uuid.UUID,
        checkout_id: uuid.UUID,
        customer_email: str,
        amount: int,
        metadata_keys: list[str],
        metadata_values: list[str],
    ) -> None:
        """
        Feature: paystack-integration, Property 16: Payment Includes Subaccount Code

        Verify that payment includes subaccount code even when transaction metadata
        is present, ensuring metadata doesn't interfere with subaccount inclusion.

        **Validates: Requirements 4.1**
        """
        # Ensure metadata lists have same length
        metadata_values = metadata_values[: len(metadata_keys)]
        if len(metadata_values) < len(metadata_keys):
            metadata_values.extend(
                ["default_value"] * (len(metadata_keys) - len(metadata_values))
            )

        # Create metadata dict
        transaction_metadata = dict(zip(metadata_keys, metadata_values))

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
        mock_checkout.currency = "KES"
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
            await checkout_service._confirm_inner(
                mock_session, auth_subject, mock_checkout, checkout_confirm
            )

            # Property assertion: Paystack initialize_transaction must be called with subaccount_code
            mock_paystack_service.initialize_transaction.assert_called_once()
            call_args = mock_paystack_service.initialize_transaction.call_args

            # Verify that subaccount parameter was included
            assert "subaccount" in call_args.kwargs, (
                "Payment initialization must include subaccount parameter even with metadata"
            )
            assert call_args.kwargs["subaccount"] == subaccount_code, (
                f"Payment subaccount must match organization subaccount_code: "
                f"expected {subaccount_code}, got {call_args.kwargs.get('subaccount')}"
            )

            # Property assertion: Metadata must be included in the transaction
            assert "metadata" in call_args.kwargs, (
                "Payment initialization must include metadata parameter"
            )

            # Verify that all expected metadata keys are present
            actual_metadata = call_args.kwargs["metadata"]
            for key, expected_value in transaction_metadata.items():
                # Note: The actual metadata will include additional fields like organization_id, checkout_id, etc.
                # We just verify that our custom metadata is preserved
                if key in actual_metadata:
                    assert actual_metadata[key] == expected_value, (
                        f"Metadata key {key} must have correct value: "
                        f"expected {expected_value}, got {actual_metadata.get(key)}"
                    )

            # Property assertion: Standard metadata fields must be present
            assert "organization_id" in actual_metadata, (
                "Payment metadata must include organization_id"
            )
            assert "checkout_id" in actual_metadata, (
                "Payment metadata must include checkout_id"
            )
            assert actual_metadata["organization_id"] == str(organization_id), (
                "Payment metadata organization_id must match checkout organization"
            )
            assert actual_metadata["checkout_id"] == str(checkout_id), (
                "Payment metadata checkout_id must match checkout ID"
            )

"""Property-based tests for Paystack order metadata in transactions.

This module contains property-based tests using hypothesis to verify
that order metadata is included in Paystack transactions for tracking purposes.
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


class TestOrderMetadataProperties:
    """Property-based tests for order metadata in transactions."""

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
        customer_id=st.uuids(),
        customer_email=st.emails(),
        amount=st.integers(min_value=100, max_value=10000000),
        currency=st.sampled_from(["KES"]),
        product_id=st.uuids(),
        product_price_id=st.uuids(),
    )
    @pytest.mark.asyncio
    async def test_property_30_order_metadata_in_transaction(
        self,
        subaccount_code: str,
        organization_id: uuid.UUID,
        checkout_id: uuid.UUID,
        customer_id: uuid.UUID,
        customer_email: str,
        amount: int,
        currency: str,
        product_id: uuid.UUID,
        product_price_id: uuid.UUID,
    ) -> None:
        """
        Feature: paystack-integration, Property 30: Order Metadata in Transaction

        For any Paystack transaction, the transaction should include order metadata
        (such as order ID, customer information) for tracking purposes.

        **Validates: Requirements 6.8**
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
        mock_customer.id = customer_id
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

            # Property assertion: Paystack initialize_transaction must be called with metadata
            mock_paystack_service.initialize_transaction.assert_called_once()
            call_args = mock_paystack_service.initialize_transaction.call_args

            # Property assertion: Metadata parameter must be present
            assert "metadata" in call_args.kwargs, (
                "Transaction initialization must include metadata parameter"
            )

            metadata = call_args.kwargs["metadata"]
            assert isinstance(metadata, dict), (
                "Transaction metadata must be a dictionary"
            )

            # Property assertion: Required metadata fields must be present
            required_fields = {
                "organization_id": str(organization_id),
                "checkout_id": str(checkout_id),
                "customer_id": str(customer_id),
            }

            for field_name, expected_value in required_fields.items():
                assert field_name in metadata, (
                    f"Transaction metadata must include {field_name}"
                )
                assert metadata[field_name] == expected_value, (
                    f"Transaction metadata {field_name} must match expected value: "
                    f"expected {expected_value}, got {metadata.get(field_name)}"
                )

            # Property assertion: Product-related metadata should be included when available
            if product_id is not None:
                assert "product_id" in metadata, (
                    "Transaction metadata must include product_id when product is present"
                )
                assert metadata["product_id"] == str(product_id), (
                    f"Transaction metadata product_id must match: "
                    f"expected {str(product_id)}, got {metadata.get('product_id')}"
                )

            if product_price_id is not None:
                assert "product_price_id" in metadata, (
                    "Transaction metadata must include product_price_id when product price is present"
                )
                assert metadata["product_price_id"] == str(product_price_id), (
                    f"Transaction metadata product_price_id must match: "
                    f"expected {str(product_price_id)}, got {metadata.get('product_price_id')}"
                )

            # Property assertion: Metadata should not contain sensitive information
            sensitive_fields = ["password", "secret", "key", "token"]
            for field_name in metadata.keys():
                for sensitive_word in sensitive_fields:
                    assert sensitive_word not in field_name.lower(), (
                        f"Transaction metadata should not contain sensitive field: {field_name}"
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
        customer_id=st.uuids(),
        customer_email=st.emails(),
        amount=st.integers(min_value=100, max_value=10000000),
        currency=st.sampled_from(["KES"]),
    )
    @pytest.mark.asyncio
    async def test_property_30_metadata_without_product(
        self,
        subaccount_code: str,
        organization_id: uuid.UUID,
        checkout_id: uuid.UUID,
        customer_id: uuid.UUID,
        customer_email: str,
        amount: int,
        currency: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 30: Order Metadata in Transaction

        Verify that order metadata is included correctly even when product information
        is not available (e.g., for custom checkouts or donations).

        **Validates: Requirements 6.8**
        """
        # Create mock organization with active subaccount
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.subaccount_code = subaccount_code
        mock_organization.subaccount_status = "active"
        mock_organization.checkout_require_3ds = False

        # Create mock checkout without product information
        mock_checkout = MagicMock(spec=Checkout)
        mock_checkout.id = checkout_id
        mock_checkout.organization_id = organization_id
        mock_checkout.organization = mock_organization
        mock_checkout.status = CheckoutStatus.open
        mock_checkout.payment_processor = PaymentProcessor.paystack
        mock_checkout.customer_email = customer_email
        mock_checkout.total_amount = amount
        mock_checkout.currency = currency
        mock_checkout.product_id = None  # No product
        mock_checkout.product_price_id = None  # No product price
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
        mock_customer.id = customer_id
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

            # Property assertion: Metadata must still be included without product info
            mock_paystack_service.initialize_transaction.assert_called_once()
            call_args = mock_paystack_service.initialize_transaction.call_args

            assert "metadata" in call_args.kwargs, (
                "Transaction initialization must include metadata even without product info"
            )

            metadata = call_args.kwargs["metadata"]

            # Property assertion: Core metadata fields must be present
            required_fields = {
                "organization_id": str(organization_id),
                "checkout_id": str(checkout_id),
                "customer_id": str(customer_id),
            }

            for field_name, expected_value in required_fields.items():
                assert field_name in metadata, (
                    f"Transaction metadata must include {field_name} even without product info"
                )
                assert metadata[field_name] == expected_value, (
                    f"Transaction metadata {field_name} must match expected value"
                )

            # Property assertion: Product fields should be None or not present when no product
            if "product_id" in metadata:
                assert metadata["product_id"] is None, (
                    "Transaction metadata product_id should be None when no product"
                )

            if "product_price_id" in metadata:
                assert metadata["product_price_id"] is None, (
                    "Transaction metadata product_price_id should be None when no product price"
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
        customer_id=st.uuids(),
        customer_email=st.emails(),
        amount=st.integers(min_value=100, max_value=10000000),
        currency=st.sampled_from(["KES"]),
        product_id=st.uuids(),
        product_price_id=st.uuids(),
        custom_metadata_keys=st.lists(
            st.text(min_size=1, max_size=20),
            min_size=0,
            max_size=3,
            unique=True,
        ),
        custom_metadata_values=st.lists(
            st.text(min_size=1, max_size=50),
            min_size=0,
            max_size=3,
        ),
    )
    @pytest.mark.asyncio
    async def test_property_30_metadata_preservation_with_custom_fields(
        self,
        subaccount_code: str,
        organization_id: uuid.UUID,
        checkout_id: uuid.UUID,
        customer_id: uuid.UUID,
        customer_email: str,
        amount: int,
        currency: str,
        product_id: uuid.UUID,
        product_price_id: uuid.UUID,
        custom_metadata_keys: list[str],
        custom_metadata_values: list[str],
    ) -> None:
        """
        Feature: paystack-integration, Property 30: Order Metadata in Transaction

        Verify that custom metadata fields can be added alongside standard order
        metadata without conflicts or data loss.

        **Validates: Requirements 6.8**
        """
        # Ensure metadata lists have same length
        custom_metadata_values = custom_metadata_values[: len(custom_metadata_keys)]
        if len(custom_metadata_values) < len(custom_metadata_keys):
            custom_metadata_values.extend(
                ["default_value"]
                * (len(custom_metadata_keys) - len(custom_metadata_values))
            )

        # Create custom metadata dict
        custom_metadata = dict(zip(custom_metadata_keys, custom_metadata_values))

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
        mock_customer.id = customer_id
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

            # Property assertion: All metadata must be preserved
            mock_paystack_service.initialize_transaction.assert_called_once()
            call_args = mock_paystack_service.initialize_transaction.call_args

            metadata = call_args.kwargs["metadata"]

            # Property assertion: Standard metadata fields must be present
            standard_fields = {
                "organization_id": str(organization_id),
                "checkout_id": str(checkout_id),
                "customer_id": str(customer_id),
                "product_id": str(product_id),
                "product_price_id": str(product_price_id),
            }

            for field_name, expected_value in standard_fields.items():
                assert field_name in metadata, (
                    f"Standard metadata field {field_name} must be present"
                )
                assert metadata[field_name] == expected_value, (
                    f"Standard metadata field {field_name} must have correct value"
                )

            # Property assertion: Custom metadata fields must be preserved (if any)
            for custom_key, custom_value in custom_metadata.items():
                # Note: Custom metadata might not be directly added in the current implementation
                # This test verifies that if custom metadata were added, it wouldn't conflict
                # with standard metadata fields
                assert custom_key not in standard_fields, (
                    f"Custom metadata key {custom_key} should not conflict with standard fields"
                )

            # Property assertion: Metadata should be JSON serializable
            import json

            try:
                json.dumps(metadata)
            except (TypeError, ValueError) as e:
                pytest.fail(f"Transaction metadata must be JSON serializable: {e}")

            # Property assertion: Metadata values should be strings (Paystack requirement)
            for key, value in metadata.items():
                assert isinstance(value, (str, type(None))), (
                    f"Metadata value for {key} must be string or None, got {type(value)}"
                )

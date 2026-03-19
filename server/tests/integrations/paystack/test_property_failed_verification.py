"""Property-based tests for Paystack failed verification handling.

This module contains property-based tests using hypothesis to verify
that failed payment verification returns checkout to open status.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from polar.integrations.paystack.tasks import _handle_verification_failure
from polar.models.checkout import Checkout, CheckoutStatus


class TestFailedVerificationProperties:
    """Property-based tests for failed verification handling."""

    @settings(max_examples=100, deadline=None)
    @given(
        checkout_id=st.uuids(),
        event_id=st.uuids(),
        transaction_token=st.text(
            min_size=10,
            max_size=30,
            alphabet=st.characters(
                min_codepoint=48,  # '0'
                max_codepoint=122,  # 'z'
            ).filter(lambda c: c.isalnum()),
        ),
        transaction_status=st.sampled_from(
            [
                "failed",
                "abandoned",
                "cancelled",
                "verification_failed",
                "timeout",
                None,
            ]
        ),
        initial_checkout_status=st.sampled_from(
            [
                CheckoutStatus.confirmed,
                CheckoutStatus.open,
            ]
        ),
    )
    @pytest.mark.asyncio
    async def test_property_31_failed_verification_returns_checkout_to_open(
        self,
        checkout_id: uuid.UUID,
        event_id: uuid.UUID,
        transaction_token: str,
        transaction_status: str | None,
        initial_checkout_status: CheckoutStatus,
    ) -> None:
        """
        Feature: paystack-integration, Property 31: Failed Verification Returns Checkout to Open

        For any payment verification that fails, the associated checkout should be
        returned to open status, allowing the customer to retry payment.

        **Validates: Requirements 6.9**
        """
        # Create transaction reference in the expected format
        transaction_reference = f"checkout_{checkout_id}_{transaction_token}"

        # Create mock checkout with initial status
        mock_checkout = MagicMock(spec=Checkout)
        mock_checkout.id = checkout_id
        mock_checkout.status = initial_checkout_status
        mock_checkout.payment_processor_metadata = {
            "transaction_reference": transaction_reference,
            "authorization_url": "https://checkout.paystack.com/test123",
            "access_code": "test_access_code",
            "intent_status": "requires_payment_method",
            "intent_client_secret": "pi_test_secret",
        }

        # Create mock session
        mock_session = MagicMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.checkout_service"
            ) as mock_checkout_service,
        ):
            # Setup checkout service mock
            mock_checkout_service.get = AsyncMock(return_value=mock_checkout)

            # Mock handle_failure to simulate returning checkout to open status
            async def mock_handle_failure(session, checkout, payment=None):
                # Simulate the actual handle_failure behavior
                if checkout.status not in {
                    CheckoutStatus.expired,
                    CheckoutStatus.succeeded,
                    CheckoutStatus.failed,
                }:
                    checkout.status = CheckoutStatus.open
                    # Remove payment processor metadata that should be cleared
                    checkout.payment_processor_metadata = {
                        k: v
                        for k, v in checkout.payment_processor_metadata.items()
                        if k not in {"intent_status", "intent_client_secret"}
                    }
                return checkout

            mock_checkout_service.handle_failure = AsyncMock(
                side_effect=mock_handle_failure
            )

            # Call the verification failure handler
            await _handle_verification_failure(
                mock_session,
                event_id,
                transaction_reference,
                transaction_status,
            )

            # Property assertion: checkout service get must be called with correct checkout ID
            mock_checkout_service.get.assert_called_once_with(mock_session, checkout_id)

            # Property assertion: handle_failure must be called to return checkout to open status
            mock_checkout_service.handle_failure.assert_called_once_with(
                mock_session, mock_checkout, payment=None
            )

            # Property assertion: checkout status must be set to open (unless in unrecoverable state)
            if initial_checkout_status not in {
                CheckoutStatus.expired,
                CheckoutStatus.succeeded,
                CheckoutStatus.failed,
            }:
                assert mock_checkout.status == CheckoutStatus.open, (
                    f"Checkout status must be returned to open after verification failure, "
                    f"but was {mock_checkout.status}"
                )

                # Property assertion: payment processor metadata should be cleaned up
                assert (
                    "intent_status" not in mock_checkout.payment_processor_metadata
                ), (
                    "Payment processor metadata 'intent_status' should be removed on failure"
                )
                assert (
                    "intent_client_secret"
                    not in mock_checkout.payment_processor_metadata
                ), (
                    "Payment processor metadata 'intent_client_secret' should be removed on failure"
                )

                # Property assertion: essential metadata should be preserved
                assert (
                    "transaction_reference" in mock_checkout.payment_processor_metadata
                ), "Transaction reference should be preserved for tracking"
                assert (
                    "authorization_url" in mock_checkout.payment_processor_metadata
                ), "Authorization URL should be preserved for potential retry"
            else:
                # Property assertion: unrecoverable checkouts should not be modified
                assert mock_checkout.status == initial_checkout_status, (
                    f"Checkout in unrecoverable state {initial_checkout_status} should not be modified"
                )

    @settings(max_examples=100, deadline=None)
    @given(
        checkout_id=st.uuids(),
        event_id=st.uuids(),
        transaction_token=st.text(
            min_size=10,
            max_size=30,
            alphabet=st.characters(
                min_codepoint=48,  # '0'
                max_codepoint=122,  # 'z'
            ).filter(lambda c: c.isalnum()),
        ),
        invalid_reference_format=st.sampled_from(
            [
                "invalid_reference",
                "checkout_",
                "checkout_invalid_uuid_format",
                "stripe_pi_test123",
                "",
                "checkout_12345",  # Not a valid UUID
            ]
        ),
    )
    @pytest.mark.asyncio
    async def test_property_31_invalid_reference_format_handling(
        self,
        checkout_id: uuid.UUID,
        event_id: uuid.UUID,
        transaction_token: str,
        invalid_reference_format: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 31: Failed Verification Returns Checkout to Open

        For any payment verification failure with invalid transaction reference format,
        the system should handle the error gracefully without crashing.

        **Validates: Requirements 6.9**
        """
        # Create mock session
        mock_session = MagicMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.checkout_service"
            ) as mock_checkout_service,
            patch("polar.integrations.paystack.tasks.log") as mock_log,
        ):
            # Call the verification failure handler with invalid reference
            await _handle_verification_failure(
                mock_session,
                event_id,
                invalid_reference_format,
                "verification_failed",
            )

            # Property assertion: checkout service should not be called for invalid references
            mock_checkout_service.get.assert_not_called()
            mock_checkout_service.handle_failure.assert_not_called()

            # Property assertion: error should be logged for invalid reference formats
            error_logged = any(
                call
                for call in mock_log.error.call_args_list
                if "reference" in str(call) and str(event_id) in str(call)
            )
            assert error_logged, (
                "Error should be logged when transaction reference format is invalid"
            )

    @settings(max_examples=100, deadline=None)
    @given(
        checkout_id=st.uuids(),
        event_id=st.uuids(),
        transaction_token=st.text(
            min_size=10,
            max_size=30,
            alphabet=st.characters(
                min_codepoint=48,  # '0'
                max_codepoint=122,  # 'z'
            ).filter(lambda c: c.isalnum()),
        ),
    )
    @pytest.mark.asyncio
    async def test_property_31_checkout_not_found_handling(
        self,
        checkout_id: uuid.UUID,
        event_id: uuid.UUID,
        transaction_token: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 31: Failed Verification Returns Checkout to Open

        For any payment verification failure where the checkout is not found,
        the system should handle the error gracefully and log appropriately.

        **Validates: Requirements 6.9**
        """
        # Create transaction reference in the expected format
        transaction_reference = f"checkout_{checkout_id}_{transaction_token}"

        # Create mock session
        mock_session = MagicMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.checkout_service"
            ) as mock_checkout_service,
            patch("polar.integrations.paystack.tasks.log") as mock_log,
        ):
            # Setup checkout service to return None (checkout not found)
            mock_checkout_service.get = AsyncMock(return_value=None)

            # Call the verification failure handler
            await _handle_verification_failure(
                mock_session,
                event_id,
                transaction_reference,
                "verification_failed",
            )

            # Property assertion: checkout service get must be called with correct checkout ID
            mock_checkout_service.get.assert_called_once_with(mock_session, checkout_id)

            # Property assertion: handle_failure should not be called if checkout not found
            mock_checkout_service.handle_failure.assert_not_called()

            # Property assertion: error should be logged when checkout is not found
            error_logged = any(
                call
                for call in mock_log.error.call_args_list
                if "checkout_not_found" in str(call) and str(checkout_id) in str(call)
            )
            assert error_logged, (
                "Error should be logged when checkout is not found during verification failure"
            )

    @settings(max_examples=100, deadline=None)
    @given(
        checkout_id=st.uuids(),
        event_id=st.uuids(),
        transaction_token=st.text(
            min_size=10,
            max_size=30,
            alphabet=st.characters(
                min_codepoint=48,  # '0'
                max_codepoint=122,  # 'z'
            ).filter(lambda c: c.isalnum()),
        ),
        exception_message=st.text(min_size=5, max_size=100),
    )
    @pytest.mark.asyncio
    async def test_property_31_exception_handling_during_verification_failure(
        self,
        checkout_id: uuid.UUID,
        event_id: uuid.UUID,
        transaction_token: str,
        exception_message: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 31: Failed Verification Returns Checkout to Open

        For any payment verification failure where an exception occurs during processing,
        the system should handle the exception gracefully and log the error.

        **Validates: Requirements 6.9**
        """
        # Create transaction reference in the expected format
        transaction_reference = f"checkout_{checkout_id}_{transaction_token}"

        # Create mock session
        mock_session = MagicMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.checkout_service"
            ) as mock_checkout_service,
            patch("polar.integrations.paystack.tasks.log") as mock_log,
        ):
            # Setup checkout service to raise an exception
            mock_checkout_service.get = AsyncMock(
                side_effect=Exception(exception_message)
            )

            # Call the verification failure handler
            await _handle_verification_failure(
                mock_session,
                event_id,
                transaction_reference,
                "verification_failed",
            )

            # Property assertion: checkout service get must be called
            mock_checkout_service.get.assert_called_once_with(mock_session, checkout_id)

            # Property assertion: handle_failure should not be called if exception occurs
            mock_checkout_service.handle_failure.assert_not_called()

            # Property assertion: exception should be logged with context
            error_logged = any(
                call
                for call in mock_log.error.call_args_list
                if "verification_failure.error" in str(call)
                and str(event_id) in str(call)
                and exception_message in str(call)
            )
            assert error_logged, (
                "Exception should be logged with context during verification failure handling"
            )

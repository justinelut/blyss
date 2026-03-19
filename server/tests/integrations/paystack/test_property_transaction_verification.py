"""Property-based tests for PaystackService transaction verification.

This module contains property-based tests using hypothesis to verify
that transaction verification returns valid status.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from polar.integrations.paystack.service import PaystackService


class TestTransactionVerificationProperties:
    """Property-based tests for transaction verification."""

    @settings(max_examples=100, deadline=None)
    @given(
        reference=st.text(
            min_size=10,
            max_size=50,
            alphabet=st.characters(
                min_codepoint=48,
                max_codepoint=122,
                blacklist_characters=" \"'\\",
            ),
        ),
        transaction_status=st.sampled_from(["success", "failed", "abandoned"]),
        amount=st.integers(min_value=100, max_value=10000000),
        currency=st.just("KES"),
        customer_email=st.emails(),
    )
    @pytest.mark.asyncio
    async def test_property_2_transaction_verification_returns_valid_status(
        self,
        reference: str,
        transaction_status: str,
        amount: int,
        currency: str,
        customer_email: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 2: Transaction Verification Returns Valid Status

        For any transaction reference, verifying the transaction with Paystack should return
        a valid status response containing transaction details.

        **Validates: Requirements 1.2**
        """
        # Create mock response data with transaction details
        mock_response_data = {
            "status": True,
            "message": "Verification successful",
            "data": {
                "id": 123456789,
                "domain": "test",
                "status": transaction_status,
                "reference": reference,
                "amount": amount,
                "currency": currency,
                "paid_at": "2024-01-15T10:30:00.000Z",
                "created_at": "2024-01-15T10:25:00.000Z",
                "channel": "card",
                "customer": {
                    "id": 987654321,
                    "email": customer_email,
                },
            },
        }

        # Create mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data

        # Patch settings and HTTP client
        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_property_test"

            # Initialize service
            service = PaystackService()

            # Mock the HTTP client's get method
            service._client.get = AsyncMock(return_value=mock_response)

            # Call verify_transaction with generated reference
            result = await service.verify_transaction(reference=reference)

            # Property assertion: Result must contain status field
            assert "status" in result, (
                "Transaction verification must return a status field"
            )

            # Property assertion: Status must be a valid value
            assert result["status"] in ["success", "failed", "abandoned"], (
                f"Transaction status must be valid, got: {result['status']}"
            )

            # Property assertion: Result must contain reference field
            assert "reference" in result, (
                "Transaction verification must return a reference field"
            )

            # Property assertion: Reference must match the requested reference
            assert result["reference"] == reference, (
                "Returned reference must match the requested reference"
            )

            # Property assertion: Result must contain amount field
            assert "amount" in result, (
                "Transaction verification must return an amount field"
            )

            # Property assertion: Amount must be a positive integer
            assert isinstance(result["amount"], int), (
                "Transaction amount must be an integer"
            )
            assert result["amount"] > 0, "Transaction amount must be positive"

            # Property assertion: Result must contain currency field
            assert "currency" in result, (
                "Transaction verification must return a currency field"
            )

            # Property assertion: Result must contain customer information
            assert "customer" in result, (
                "Transaction verification must return customer information"
            )
            assert "email" in result["customer"], (
                "Customer information must include email"
            )

            # Verify the HTTP client was called with correct parameters
            service._client.get.assert_called_once()
            call_args = service._client.get.call_args

            # Verify endpoint includes the reference
            assert call_args[0][0] == f"/transaction/verify/{reference}"

    @settings(max_examples=100, deadline=None)
    @given(
        reference=st.text(
            min_size=10,
            max_size=50,
            alphabet=st.characters(
                min_codepoint=48,
                max_codepoint=122,
                blacklist_characters=" \"'\\",
            ),
        ),
    )
    @pytest.mark.asyncio
    async def test_property_2_verification_with_minimal_response(
        self,
        reference: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 2: Transaction Verification Returns Valid Status

        Verify that transaction verification works with minimal response data and still
        returns required fields.

        **Validates: Requirements 1.2**
        """
        # Create mock response with minimal required fields
        mock_response_data = {
            "status": True,
            "message": "Verification successful",
            "data": {
                "status": "success",
                "reference": reference,
                "amount": 1000,
                "currency": "KES",
                "customer": {
                    "email": "test@example.com",
                },
            },
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_property_test"

            service = PaystackService()
            service._client.get = AsyncMock(return_value=mock_response)

            # Call verify_transaction
            result = await service.verify_transaction(reference=reference)

            # Property assertion: Minimal required fields must be present
            assert "status" in result
            assert "reference" in result
            assert "amount" in result
            assert "currency" in result
            assert result["reference"] == reference
            assert result["status"] in ["success", "failed", "abandoned"]

    @settings(max_examples=100, deadline=None)
    @given(
        reference=st.text(
            min_size=10,
            max_size=50,
            alphabet=st.characters(
                min_codepoint=48,
                max_codepoint=122,
                blacklist_characters=" \"'\\",
            ),
        ),
    )
    @pytest.mark.asyncio
    async def test_property_2_verification_preserves_reference(
        self,
        reference: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 2: Transaction Verification Returns Valid Status

        Verify that the reference returned in the verification response always matches
        the reference that was requested.

        **Validates: Requirements 1.2**
        """
        # Create mock response
        mock_response_data = {
            "status": True,
            "message": "Verification successful",
            "data": {
                "status": "success",
                "reference": reference,
                "amount": 5000,
                "currency": "KES",
                "customer": {
                    "email": "customer@example.com",
                },
            },
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_property_test"

            service = PaystackService()
            service._client.get = AsyncMock(return_value=mock_response)

            # Call verify_transaction
            result = await service.verify_transaction(reference=reference)

            # Property assertion: Reference must be preserved exactly
            assert result["reference"] == reference, (
                f"Expected reference '{reference}', got '{result['reference']}'"
            )

            # Verify the correct endpoint was called
            service._client.get.assert_called_once_with(
                f"/transaction/verify/{reference}"
            )

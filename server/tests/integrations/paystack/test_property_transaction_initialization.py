"""Property-based tests for PaystackService transaction initialization.

This module contains property-based tests using hypothesis to verify
that transaction initialization returns required fields.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from polar.integrations.paystack.service import PaystackService


class TestTransactionInitializationProperties:
    """Property-based tests for transaction initialization."""

    @settings(max_examples=100, deadline=None)
    @given(
        email=st.emails(),
        amount=st.integers(min_value=100, max_value=10000000),
        reference=st.text(
            min_size=10,
            max_size=50,
            alphabet=st.characters(
                min_codepoint=48,
                max_codepoint=122,
                blacklist_characters=" \"'\\",
            ),
        ),
        subaccount=st.text(
            min_size=10,
            max_size=30,
            alphabet=st.characters(
                min_codepoint=65,
                max_codepoint=90,
            ).filter(lambda c: c.isalnum() or c == "_"),
        ),
        metadata_key=st.text(min_size=1, max_size=20),
        metadata_value=st.text(min_size=1, max_size=50),
    )
    @pytest.mark.asyncio
    async def test_property_1_transaction_initialization_returns_required_fields(
        self,
        email: str,
        amount: int,
        reference: str,
        subaccount: str,
        metadata_key: str,
        metadata_value: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 1: Transaction Initialization Returns Required Fields

        For any valid transaction parameters (email, amount, currency, reference, subaccount),
        initializing a Paystack transaction should return both a payment reference and an
        authorization URL.

        **Validates: Requirements 1.1, 1.3**
        """
        # Create mock response data with required fields
        mock_response_data = {
            "status": True,
            "message": "Authorization URL created",
            "data": {
                "authorization_url": f"https://checkout.paystack.com/{reference}",
                "access_code": f"access_{reference}",
                "reference": reference,
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

            # Mock the HTTP client's post method
            service._client.post = AsyncMock(return_value=mock_response)

            # Call initialize_transaction with generated parameters
            result = await service.initialize_transaction(
                email=email,
                amount=amount,
                currency="KES",
                reference=reference,
                subaccount=subaccount,
                metadata={metadata_key: metadata_value},
            )

            # Property assertion: Result must contain both required fields
            assert "reference" in result, (
                "Transaction initialization must return a reference"
            )
            assert "authorization_url" in result, (
                "Transaction initialization must return an authorization_url"
            )

            # Property assertion: Fields must not be None or empty
            assert result["reference"] is not None, (
                "Transaction reference must not be None"
            )
            assert result["reference"] != "", "Transaction reference must not be empty"
            assert result["authorization_url"] is not None, (
                "Authorization URL must not be None"
            )
            assert result["authorization_url"] != "", (
                "Authorization URL must not be empty"
            )

            # Property assertion: Authorization URL must be a valid HTTPS URL
            assert result["authorization_url"].startswith("https://"), (
                "Authorization URL must be a valid HTTPS URL"
            )

            # Verify the HTTP client was called with correct parameters
            service._client.post.assert_called_once()
            call_args = service._client.post.call_args

            # Verify endpoint
            assert call_args[0][0] == "/transaction/initialize"

            # Verify payload structure
            payload = call_args[1]["json"]
            assert payload["email"] == email
            assert payload["amount"] == amount
            assert payload["currency"] == "KES"
            assert payload["reference"] == reference
            assert payload["subaccount"] == subaccount
            assert metadata_key in payload["metadata"]
            assert payload["metadata"][metadata_key] == metadata_value

    @settings(max_examples=100, deadline=None)
    @given(
        email=st.emails(),
        amount=st.integers(min_value=100, max_value=10000000),
        reference=st.text(
            min_size=10,
            max_size=50,
            alphabet=st.characters(
                min_codepoint=48,
                max_codepoint=122,
                blacklist_characters=" \"'\\",
            ),
        ),
        subaccount=st.text(
            min_size=10,
            max_size=30,
            alphabet=st.characters(
                min_codepoint=65,
                max_codepoint=90,
            ).filter(lambda c: c.isalnum() or c == "_"),
        ),
    )
    @pytest.mark.asyncio
    async def test_property_1_without_metadata(
        self,
        email: str,
        amount: int,
        reference: str,
        subaccount: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 1: Transaction Initialization Returns Required Fields

        Verify that transaction initialization works without metadata and still returns
        required fields.

        **Validates: Requirements 1.1, 1.3**
        """
        # Create mock response data
        mock_response_data = {
            "status": True,
            "message": "Authorization URL created",
            "data": {
                "authorization_url": f"https://checkout.paystack.com/{reference}",
                "access_code": f"access_{reference}",
                "reference": reference,
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
            service._client.post = AsyncMock(return_value=mock_response)

            # Call without metadata
            result = await service.initialize_transaction(
                email=email,
                amount=amount,
                currency="KES",
                reference=reference,
                subaccount=subaccount,
            )

            # Property assertion: Required fields must be present
            assert "reference" in result
            assert "authorization_url" in result
            assert result["reference"] is not None
            assert result["authorization_url"] is not None
            assert result["authorization_url"].startswith("https://")

            # Verify metadata was not included in the request
            call_args = service._client.post.call_args
            payload = call_args[1]["json"]
            assert "metadata" not in payload

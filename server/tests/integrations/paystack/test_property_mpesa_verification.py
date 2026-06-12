"""Property-based tests for PaystackService M-Pesa verification.

This module contains property-based tests using hypothesis to verify
that M-Pesa verification transactions work correctly.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from polar.integrations.paystack.service import PaystackService


class TestMPesaVerificationProperties:
    """Property-based tests for M-Pesa verification transactions."""

    @settings(max_examples=100, deadline=None)
    @given(
        mpesa_number=st.from_regex(r"\+254[0-9]{9}", fullmatch=True),
        amount=st.integers(min_value=1000, max_value=1000),
    )
    @pytest.mark.asyncio
    async def test_property_22_mpesa_verification_transaction(
        self,
        mpesa_number: str,
        amount: int,
    ) -> None:
        """
        Feature: paystack-integration, Property 22: M-Pesa Verification Transaction

        For any valid M-Pesa number submission, the platform should send a KES 10
        verification transaction and store the M-Pesa number with verified status
        set to false.

        **Validates: Requirements 5.3, 5.4**
        """
        # Create mock response data
        mock_response_data = {
            "status": True,
            "message": "Transfer has been queued",
            "data": {
                "reference": "mpesa_verify_test123",
                "transfer_code": "TRF_test123",
                "status": "pending",
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

            # Call send_verification_transaction
            result = await service.send_verification_transaction(
                mpesa_number=mpesa_number,
                amount=amount,
            )

            # Property assertion: Result must contain reference and status
            assert "reference" in result, (
                "Verification transaction must return a reference"
            )
            assert "status" in result, "Verification transaction must return a status"

            # Property assertion: Fields must not be None or empty
            assert result["reference"] is not None, (
                "Transaction reference must not be None"
            )
            assert result["reference"] != "", "Transaction reference must not be empty"
            assert result["status"] is not None, "Transaction status must not be None"

            # Property assertion: Reference should contain verification prefix
            # The service generates blyss_verify_<hex16> (see
            # paystack/service.py::send_verification_transaction). The
            # "mpesa_verify_" prefix in the mocked response is ignored —
            # the service returns its own server-generated reference.
            assert "blyss_verify_" in result["reference"], (
                "Verification reference should contain 'blyss_verify_' prefix"
            )

            # Verify the HTTP client was called with correct parameters
            service._client.post.assert_called_once()
            call_args = service._client.post.call_args

            # Verify endpoint
            assert call_args[0][0] == "/transfer"

            # Verify payload structure
            payload = call_args[1]["json"]
            assert payload["recipient"] == mpesa_number
            assert payload["amount"] == amount
            assert payload["source"] == "balance"
            assert "reference" in payload
            assert "blyss_verify_" in payload["reference"]

    @settings(max_examples=100, deadline=None)
    @given(
        mpesa_number=st.from_regex(r"\+254[0-9]{9}", fullmatch=True),
    )
    @pytest.mark.asyncio
    async def test_property_22_default_amount(
        self,
        mpesa_number: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 22: M-Pesa Verification Transaction

        Verify that the default amount of KES 10 (1000 kobo) is used when no amount
        is specified.

        **Validates: Requirements 5.3, 5.4**
        """
        mock_response_data = {
            "status": True,
            "message": "Transfer has been queued",
            "data": {
                "reference": "mpesa_verify_test123",
                "transfer_code": "TRF_test123",
                "status": "pending",
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

            # Call without specifying amount (should default to 1000)
            result = await service.send_verification_transaction(
                mpesa_number=mpesa_number,
            )

            # Property assertion: Required fields must be present
            assert "reference" in result
            assert "status" in result

            # Verify default amount was used
            call_args = service._client.post.call_args
            payload = call_args[1]["json"]
            assert payload["amount"] == 1000, (
                "Default verification amount should be 1000 kobo (KES 10)"
            )

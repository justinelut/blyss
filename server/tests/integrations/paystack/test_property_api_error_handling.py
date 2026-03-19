"""Property-based tests for PaystackService API error handling.

This module contains property-based tests using hypothesis to verify
that API errors produce descriptive exceptions.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from polar.integrations.paystack.service import (
    PaystackAuthenticationError,
    PaystackNetworkError,
    PaystackService,
    PaystackTransactionError,
    PaystackValidationError,
)


class TestAPIErrorHandlingProperties:
    """Property-based tests for API error handling."""

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
    async def test_property_3_authentication_error_produces_descriptive_exception(
        self,
        email: str,
        amount: int,
        reference: str,
        subaccount: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 3: API Errors Produce Descriptive Exceptions

        For any Paystack API error response with status 401, the PaystackService should raise
        a PaystackAuthenticationError with a descriptive error message that includes the
        error type and details.

        **Validates: Requirements 1.5, 9.2**
        """
        # Create mock response for authentication error
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {
            "status": False,
            "message": "Invalid API key",
        }

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_invalid_key"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            # Property assertion: Authentication error must raise PaystackAuthenticationError
            with pytest.raises(PaystackAuthenticationError) as exc_info:
                await service.initialize_transaction(
                    email=email,
                    amount=amount,
                    currency="KES",
                    reference=reference,
                    subaccount=subaccount,
                )

            # Property assertion: Exception must have descriptive message
            exception = exc_info.value
            assert exception.message is not None, "Exception must have a message"
            assert len(exception.message) > 0, "Exception message must not be empty"
            assert "authentication" in exception.message.lower(), (
                "Exception message must mention authentication"
            )

            # Property assertion: Exception must have correct status code
            assert exception.status_code == 401, (
                "Authentication error must have status code 401"
            )

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
        error_message=st.text(min_size=10, max_size=100),
        error_field=st.text(min_size=3, max_size=20),
    )
    @pytest.mark.asyncio
    async def test_property_3_validation_error_produces_descriptive_exception(
        self,
        email: str,
        amount: int,
        reference: str,
        subaccount: str,
        error_message: str,
        error_field: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 3: API Errors Produce Descriptive Exceptions

        For any Paystack API error response with status 422, the PaystackService should raise
        a PaystackValidationError with a descriptive error message that includes the
        validation error details.

        **Validates: Requirements 1.5, 9.2**
        """
        # Create mock response for validation error
        mock_response = MagicMock()
        mock_response.status_code = 422
        mock_response.json.return_value = {
            "status": False,
            "message": error_message,
            "errors": {
                error_field: [f"The {error_field} field is invalid"],
            },
        }

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_property_test"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            # Property assertion: Validation error must raise PaystackValidationError
            with pytest.raises(PaystackValidationError) as exc_info:
                await service.initialize_transaction(
                    email=email,
                    amount=amount,
                    currency="KES",
                    reference=reference,
                    subaccount=subaccount,
                )

            # Property assertion: Exception must have descriptive message
            exception = exc_info.value
            assert exception.message is not None, "Exception must have a message"
            assert len(exception.message) > 0, "Exception message must not be empty"
            assert exception.message == error_message, (
                "Exception message must match the API error message"
            )

            # Property assertion: Exception must have correct status code
            assert exception.status_code == 422, (
                "Validation error must have status code 422"
            )

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
        server_status_code=st.sampled_from([500, 502, 503, 504]),
    )
    @pytest.mark.asyncio
    async def test_property_3_server_error_produces_descriptive_exception(
        self,
        email: str,
        amount: int,
        reference: str,
        subaccount: str,
        server_status_code: int,
    ) -> None:
        """
        Feature: paystack-integration, Property 3: API Errors Produce Descriptive Exceptions

        For any Paystack API error response with status >= 500, the PaystackService should
        raise a PaystackNetworkError with a descriptive error message that includes the
        error type and status code.

        **Validates: Requirements 1.5, 9.2**
        """
        # Create mock response for server error
        mock_response = MagicMock()
        mock_response.status_code = server_status_code
        mock_response.json.return_value = {
            "status": False,
            "message": "Internal server error",
        }

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_property_test"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            # Property assertion: Server error must raise PaystackNetworkError
            with pytest.raises(PaystackNetworkError) as exc_info:
                await service.initialize_transaction(
                    email=email,
                    amount=amount,
                    currency="KES",
                    reference=reference,
                    subaccount=subaccount,
                )

            # Property assertion: Exception must have descriptive message
            exception = exc_info.value
            assert exception.message is not None, "Exception must have a message"
            assert len(exception.message) > 0, "Exception message must not be empty"
            assert "server error" in exception.message.lower(), (
                "Exception message must mention server error"
            )
            assert str(server_status_code) in exception.message, (
                f"Exception message must include status code {server_status_code}"
            )

            # Property assertion: Exception must have correct status code
            assert exception.status_code == 503, (
                "Network error must have status code 503"
            )

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
        error_message=st.text(min_size=10, max_size=100),
    )
    @pytest.mark.asyncio
    async def test_property_3_transaction_error_produces_descriptive_exception(
        self,
        email: str,
        amount: int,
        reference: str,
        subaccount: str,
        error_message: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 3: API Errors Produce Descriptive Exceptions

        For any Paystack API response with status=false, the PaystackService should raise
        a PaystackTransactionError with a descriptive error message that includes the
        transaction reference and error details.

        **Validates: Requirements 1.5, 9.2**
        """
        # Create mock response for transaction error
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": False,
            "message": error_message,
        }

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_property_test"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            # Property assertion: Transaction error must raise PaystackTransactionError
            with pytest.raises(PaystackTransactionError) as exc_info:
                await service.initialize_transaction(
                    email=email,
                    amount=amount,
                    currency="KES",
                    reference=reference,
                    subaccount=subaccount,
                )

            # Property assertion: Exception must have descriptive message
            exception = exc_info.value
            assert exception.message is not None, "Exception must have a message"
            assert len(exception.message) > 0, "Exception message must not be empty"
            assert exception.message == error_message, (
                "Exception message must match the API error message"
            )

            # Property assertion: Exception must have transaction reference
            assert exception.transaction_reference == reference, (
                "Exception must include the transaction reference"
            )

            # Property assertion: Exception must have correct status code
            assert exception.status_code == 422, (
                "Transaction error must have status code 422"
            )

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
        network_error_type=st.sampled_from(
            [
                "ConnectTimeout",
                "ReadTimeout",
                "ConnectError",
                "RemoteProtocolError",
            ]
        ),
    )
    @pytest.mark.asyncio
    async def test_property_3_network_error_produces_descriptive_exception(
        self,
        reference: str,
        network_error_type: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 3: API Errors Produce Descriptive Exceptions

        For any network communication error with Paystack, the PaystackService should raise
        a PaystackNetworkError with a descriptive error message that includes the error
        type and details.

        **Validates: Requirements 1.5, 9.2**
        """
        # Create appropriate httpx exception based on error type
        if network_error_type == "ConnectTimeout":
            network_exception = httpx.ConnectTimeout("Connection timed out")
        elif network_error_type == "ReadTimeout":
            network_exception = httpx.ReadTimeout("Read timed out")
        elif network_error_type == "ConnectError":
            network_exception = httpx.ConnectError("Connection failed")
        else:  # RemoteProtocolError
            network_exception = httpx.RemoteProtocolError("Protocol error")

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_property_test"

            service = PaystackService()
            service._client.get = AsyncMock(side_effect=network_exception)

            # Property assertion: Network error must raise PaystackNetworkError
            with pytest.raises(PaystackNetworkError) as exc_info:
                await service.verify_transaction(reference=reference)

            # Property assertion: Exception must have descriptive message
            exception = exc_info.value
            assert exception.message is not None, "Exception must have a message"
            assert len(exception.message) > 0, "Exception message must not be empty"
            assert "network error" in exception.message.lower(), (
                "Exception message must mention network error"
            )

            # Property assertion: Exception must have correct status code
            assert exception.status_code == 503, (
                "Network error must have status code 503"
            )

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
    async def test_property_3_error_messages_are_not_empty(
        self,
        email: str,
        amount: int,
        reference: str,
        subaccount: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 3: API Errors Produce Descriptive Exceptions

        For any Paystack API error, the exception message must never be empty or None,
        ensuring that developers always have context for debugging.

        **Validates: Requirements 1.5, 9.2**
        """
        # Test with authentication error
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {"status": False}

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_property_test"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            with pytest.raises(PaystackAuthenticationError) as exc_info:
                await service.initialize_transaction(
                    email=email,
                    amount=amount,
                    currency="KES",
                    reference=reference,
                    subaccount=subaccount,
                )

            # Property assertion: Message must never be empty
            exception = exc_info.value
            assert exception.message is not None
            assert exception.message != ""
            assert len(exception.message.strip()) > 0

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
        error_message=st.text(min_size=10, max_size=100),
    )
    @pytest.mark.asyncio
    async def test_property_3_error_type_matches_status_code(
        self,
        reference: str,
        error_message: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 3: API Errors Produce Descriptive Exceptions

        For any Paystack API error, the exception type must match the HTTP status code,
        ensuring consistent error handling across the application.

        **Validates: Requirements 1.5, 9.2**
        """
        # Test that 401 always raises PaystackAuthenticationError
        mock_response_401 = MagicMock()
        mock_response_401.status_code = 401
        mock_response_401.json.return_value = {
            "status": False,
            "message": error_message,
        }

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_property_test"

            service = PaystackService()
            service._client.get = AsyncMock(return_value=mock_response_401)

            # Property assertion: 401 must raise PaystackAuthenticationError
            with pytest.raises(PaystackAuthenticationError):
                await service.verify_transaction(reference=reference)

            # Test that 422 always raises PaystackValidationError
            mock_response_422 = MagicMock()
            mock_response_422.status_code = 422
            mock_response_422.json.return_value = {
                "status": False,
                "message": error_message,
            }

            service._client.get = AsyncMock(return_value=mock_response_422)

            # Property assertion: 422 must raise PaystackValidationError
            with pytest.raises(PaystackValidationError):
                await service.verify_transaction(reference=reference)

            # Test that 500+ always raises PaystackNetworkError
            mock_response_500 = MagicMock()
            mock_response_500.status_code = 500
            mock_response_500.json.return_value = {
                "status": False,
                "message": error_message,
            }

            service._client.get = AsyncMock(return_value=mock_response_500)

            # Property assertion: 500+ must raise PaystackNetworkError
            with pytest.raises(PaystackNetworkError):
                await service.verify_transaction(reference=reference)

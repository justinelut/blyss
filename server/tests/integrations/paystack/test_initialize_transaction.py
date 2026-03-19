"""Unit tests for PaystackService.initialize_transaction method."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from polar.integrations.paystack.service import (
    PaystackAuthenticationError,
    PaystackNetworkError,
    PaystackService,
    PaystackTransactionError,
    PaystackValidationError,
)


class TestInitializeTransaction:
    """Unit tests for initialize_transaction method."""

    @pytest.mark.asyncio
    async def test_successful_initialization(self) -> None:
        """Test successful transaction initialization."""
        # Mock response data
        mock_response_data = {
            "status": True,
            "message": "Authorization URL created",
            "data": {
                "authorization_url": "https://checkout.paystack.com/test123",
                "access_code": "test_access_code",
                "reference": "test_reference_123",
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
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_123"

            # Initialize service
            service = PaystackService()

            # Mock the HTTP client's post method
            service._client.post = AsyncMock(return_value=mock_response)

            # Call initialize_transaction
            result = await service.initialize_transaction(
                email="test@example.com",
                amount=10000,
                currency="KES",
                reference="test_ref_001",
                subaccount="ACCT_test123",
                metadata={"order_id": "order_001"},
            )

            # Verify the result
            assert (
                result["authorization_url"] == "https://checkout.paystack.com/test123"
            )
            assert result["reference"] == "test_reference_123"
            assert result["access_code"] == "test_access_code"

            # Verify the HTTP client was called correctly
            service._client.post.assert_called_once()
            call_args = service._client.post.call_args
            assert call_args[0][0] == "/transaction/initialize"
            assert call_args[1]["json"]["email"] == "test@example.com"
            assert call_args[1]["json"]["amount"] == 10000
            assert call_args[1]["json"]["currency"] == "KES"
            assert call_args[1]["json"]["reference"] == "test_ref_001"
            assert call_args[1]["json"]["subaccount"] == "ACCT_test123"
            assert call_args[1]["json"]["metadata"]["order_id"] == "order_001"

    @pytest.mark.asyncio
    async def test_authentication_error(self) -> None:
        """Test that authentication errors are handled correctly."""
        # Create mock response with 401 status
        mock_response = MagicMock()
        mock_response.status_code = 401

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_invalid"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            # Verify that PaystackAuthenticationError is raised
            with pytest.raises(PaystackAuthenticationError) as exc_info:
                await service.initialize_transaction(
                    email="test@example.com",
                    amount=10000,
                    reference="test_ref_001",
                    subaccount="ACCT_test123",
                )

            assert "authentication failed" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_validation_error(self) -> None:
        """Test that validation errors are handled correctly."""
        # Create mock response with 422 status
        mock_response = MagicMock()
        mock_response.status_code = 422
        mock_response.json.return_value = {
            "status": False,
            "message": "Invalid email address",
        }

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_123"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            # Verify that PaystackValidationError is raised
            with pytest.raises(PaystackValidationError) as exc_info:
                await service.initialize_transaction(
                    email="invalid-email",
                    amount=10000,
                    reference="test_ref_001",
                    subaccount="ACCT_test123",
                )

            assert "Invalid email address" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_server_error(self) -> None:
        """Test that server errors are handled correctly."""
        # Create mock response with 500 status
        mock_response = MagicMock()
        mock_response.status_code = 500

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_123"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            # Verify that PaystackNetworkError is raised
            with pytest.raises(PaystackNetworkError) as exc_info:
                await service.initialize_transaction(
                    email="test@example.com",
                    amount=10000,
                    reference="test_ref_001",
                    subaccount="ACCT_test123",
                )

            assert "server error" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_transaction_initialization_failed(self) -> None:
        """Test that transaction initialization failures are handled correctly."""
        # Create mock response with status=False
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": False,
            "message": "Subaccount not found",
        }

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_123"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            # Verify that PaystackTransactionError is raised
            with pytest.raises(PaystackTransactionError) as exc_info:
                await service.initialize_transaction(
                    email="test@example.com",
                    amount=10000,
                    reference="test_ref_001",
                    subaccount="ACCT_invalid",
                )

            assert "Subaccount not found" in str(exc_info.value)
            assert exc_info.value.transaction_reference == "test_ref_001"

    @pytest.mark.asyncio
    async def test_metadata_optional(self) -> None:
        """Test that metadata parameter is optional."""
        mock_response_data = {
            "status": True,
            "message": "Authorization URL created",
            "data": {
                "authorization_url": "https://checkout.paystack.com/test123",
                "access_code": "test_access_code",
                "reference": "test_reference_123",
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
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_123"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            # Call without metadata
            result = await service.initialize_transaction(
                email="test@example.com",
                amount=10000,
                reference="test_ref_001",
                subaccount="ACCT_test123",
            )

            # Verify the result
            assert (
                result["authorization_url"] == "https://checkout.paystack.com/test123"
            )

            # Verify metadata was not included in the request
            call_args = service._client.post.call_args
            assert "metadata" not in call_args[1]["json"]

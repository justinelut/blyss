"""Unit tests for PaystackService core methods.

This module contains unit tests for the PaystackService class, focusing on
specific examples and edge cases with mocked Paystack API responses.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from polar.integrations.paystack.service import (
    PaystackAuthenticationError,
    PaystackNetworkError,
    PaystackService,
    PaystackTransactionError,
    PaystackValidationError,
)


@pytest.fixture
def mock_paystack_service() -> PaystackService:
    """Create a PaystackService instance with mocked HTTP client."""
    with (
        patch("polar.integrations.paystack.service.settings") as mock_settings,
        patch("polar.integrations.paystack.service.instrument_httpx"),
    ):
        mock_settings.PAYSTACK_SECRET_KEY = "sk_test_mock_key"
        service = PaystackService()
        service._client = AsyncMock(spec=httpx.AsyncClient)
        return service


class TestPaystackServiceInitialization:
    """Tests for PaystackService initialization."""

    def test_initialization_sets_correct_attributes(self) -> None:
        """Test that PaystackService initializes with correct attributes."""
        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_abc123"

            service = PaystackService()

            assert service.secret_key == "sk_test_abc123"
            assert service.base_url == "https://api.paystack.co"
            assert service._client is not None


class TestInitializeTransaction:
    """Tests for PaystackService.initialize_transaction method."""

    @pytest.mark.asyncio
    async def test_successful_initialization(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test successful transaction initialization."""
        # Mock successful API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": True,
            "message": "Authorization URL created",
            "data": {
                "authorization_url": "https://checkout.paystack.com/test123",
                "access_code": "test_access_code",
                "reference": "test_ref_123",
            },
        }
        mock_paystack_service._client.post = AsyncMock(return_value=mock_response)

        # Call the method
        result = await mock_paystack_service.initialize_transaction(
            email="customer@example.com",
            amount=10000,
            currency="KES",
            reference="test_ref_123",
            subaccount="ACCT_test123",
            metadata={"order_id": "order_123"},
        )

        # Verify the result
        assert result["authorization_url"] == "https://checkout.paystack.com/test123"
        assert result["reference"] == "test_ref_123"
        assert result["access_code"] == "test_access_code"

        # Verify the API was called with correct parameters
        mock_paystack_service._client.post.assert_called_once_with(
            "/transaction/initialize",
            json={
                "email": "customer@example.com",
                "amount": 10000,
                "currency": "KES",
                "reference": "test_ref_123",
                "subaccount": "ACCT_test123",
                "metadata": {"order_id": "order_123"},
            },
        )

    @pytest.mark.asyncio
    async def test_initialization_without_metadata(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test transaction initialization without metadata."""
        # Mock successful API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": True,
            "message": "Authorization URL created",
            "data": {
                "authorization_url": "https://checkout.paystack.com/test456",
                "access_code": "test_access_code_2",
                "reference": "test_ref_456",
            },
        }
        mock_paystack_service._client.post = AsyncMock(return_value=mock_response)

        # Call the method without metadata
        result = await mock_paystack_service.initialize_transaction(
            email="customer@example.com",
            amount=5000,
            currency="KES",
            reference="test_ref_456",
            subaccount="ACCT_test456",
        )

        # Verify the result
        assert result["authorization_url"] == "https://checkout.paystack.com/test456"
        assert result["reference"] == "test_ref_456"

        # Verify metadata was not included in the request
        call_args = mock_paystack_service._client.post.call_args
        assert "metadata" not in call_args[1]["json"]

    @pytest.mark.asyncio
    async def test_authentication_failure(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test transaction initialization with authentication failure."""
        # Mock 401 authentication error response
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {
            "status": False,
            "message": "Invalid API key",
        }
        mock_paystack_service._client.post = AsyncMock(return_value=mock_response)

        # Verify that PaystackAuthenticationError is raised
        with pytest.raises(PaystackAuthenticationError) as exc_info:
            await mock_paystack_service.initialize_transaction(
                email="customer@example.com",
                amount=10000,
                currency="KES",
                reference="test_ref_123",
                subaccount="ACCT_test123",
            )

        assert "authentication failed" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_validation_error(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test transaction initialization with validation error."""
        # Mock 422 validation error response
        mock_response = MagicMock()
        mock_response.status_code = 422
        mock_response.json.return_value = {
            "status": False,
            "message": "Invalid email address",
        }
        mock_paystack_service._client.post = AsyncMock(return_value=mock_response)

        # Verify that PaystackValidationError is raised
        with pytest.raises(PaystackValidationError) as exc_info:
            await mock_paystack_service.initialize_transaction(
                email="invalid-email",
                amount=10000,
                currency="KES",
                reference="test_ref_123",
                subaccount="ACCT_test123",
            )

        assert "Invalid email address" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_server_error(self, mock_paystack_service: PaystackService) -> None:
        """Test transaction initialization with server error."""
        # Mock 500 server error response
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_paystack_service._client.post = AsyncMock(return_value=mock_response)

        # Verify that PaystackNetworkError is raised
        with pytest.raises(PaystackNetworkError) as exc_info:
            await mock_paystack_service.initialize_transaction(
                email="customer@example.com",
                amount=10000,
                currency="KES",
                reference="test_ref_123",
                subaccount="ACCT_test123",
            )

        assert "server error" in str(exc_info.value).lower()
        assert "500" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_transaction_initialization_failed_status(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test transaction initialization with failed status in response."""
        # Mock response with status=False
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": False,
            "message": "Subaccount not found",
        }
        mock_paystack_service._client.post = AsyncMock(return_value=mock_response)

        # Verify that PaystackTransactionError is raised
        with pytest.raises(PaystackTransactionError) as exc_info:
            await mock_paystack_service.initialize_transaction(
                email="customer@example.com",
                amount=10000,
                currency="KES",
                reference="test_ref_123",
                subaccount="ACCT_invalid",
            )

        assert "Subaccount not found" in str(exc_info.value)
        assert exc_info.value.transaction_reference == "test_ref_123"

    @pytest.mark.asyncio
    async def test_network_error(self, mock_paystack_service: PaystackService) -> None:
        """Test transaction initialization with network error."""
        # Mock network error
        mock_paystack_service._client.post = AsyncMock(
            side_effect=httpx.ConnectError("Connection refused")
        )

        # Verify that PaystackNetworkError is raised
        with pytest.raises(PaystackNetworkError) as exc_info:
            await mock_paystack_service.initialize_transaction(
                email="customer@example.com",
                amount=10000,
                currency="KES",
                reference="test_ref_123",
                subaccount="ACCT_test123",
            )

        assert "network error" in str(exc_info.value).lower()
        assert "Connection refused" in str(exc_info.value)


class TestVerifyTransaction:
    """Tests for PaystackService.verify_transaction method."""

    @pytest.mark.asyncio
    async def test_successful_verification(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test successful transaction verification."""
        # Mock successful API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": True,
            "message": "Verification successful",
            "data": {
                "id": 123456789,
                "status": "success",
                "reference": "test_ref_123",
                "amount": 10000,
                "currency": "KES",
                "customer": {
                    "email": "customer@example.com",
                },
                "metadata": {"order_id": "order_123"},
            },
        }
        mock_paystack_service._client.get = AsyncMock(return_value=mock_response)

        # Call the method
        result = await mock_paystack_service.verify_transaction("test_ref_123")

        # Verify the result
        assert result["status"] == "success"
        assert result["reference"] == "test_ref_123"
        assert result["amount"] == 10000
        assert result["currency"] == "KES"

        # Verify the API was called with correct parameters
        mock_paystack_service._client.get.assert_called_once_with(
            "/transaction/verify/test_ref_123"
        )

    @pytest.mark.asyncio
    async def test_verification_failed_transaction(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test verification of a failed transaction."""
        # Mock API response for failed transaction
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": True,
            "message": "Verification successful",
            "data": {
                "id": 123456789,
                "status": "failed",
                "reference": "test_ref_456",
                "amount": 5000,
                "currency": "KES",
            },
        }
        mock_paystack_service._client.get = AsyncMock(return_value=mock_response)

        # Call the method
        result = await mock_paystack_service.verify_transaction("test_ref_456")

        # Verify the result shows failed status
        assert result["status"] == "failed"
        assert result["reference"] == "test_ref_456"

    @pytest.mark.asyncio
    async def test_verification_authentication_failure(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test transaction verification with authentication failure."""
        # Mock 401 authentication error response
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {
            "status": False,
            "message": "Invalid API key",
        }
        mock_paystack_service._client.get = AsyncMock(return_value=mock_response)

        # Verify that PaystackAuthenticationError is raised
        with pytest.raises(PaystackAuthenticationError) as exc_info:
            await mock_paystack_service.verify_transaction("test_ref_123")

        assert "authentication failed" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_verification_validation_error(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test transaction verification with validation error."""
        # Mock 422 validation error response
        mock_response = MagicMock()
        mock_response.status_code = 422
        mock_response.json.return_value = {
            "status": False,
            "message": "Transaction reference not found",
        }
        mock_paystack_service._client.get = AsyncMock(return_value=mock_response)

        # Verify that PaystackValidationError is raised
        with pytest.raises(PaystackValidationError) as exc_info:
            await mock_paystack_service.verify_transaction("invalid_ref")

        assert "Transaction reference not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_verification_server_error(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test transaction verification with server error."""
        # Mock 503 server error response
        mock_response = MagicMock()
        mock_response.status_code = 503
        mock_paystack_service._client.get = AsyncMock(return_value=mock_response)

        # Verify that PaystackNetworkError is raised
        with pytest.raises(PaystackNetworkError) as exc_info:
            await mock_paystack_service.verify_transaction("test_ref_123")

        assert "server error" in str(exc_info.value).lower()
        assert "503" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_verification_failed_status(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test transaction verification with failed status in response."""
        # Mock response with status=False
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": False,
            "message": "Transaction not found",
        }
        mock_paystack_service._client.get = AsyncMock(return_value=mock_response)

        # Verify that PaystackTransactionError is raised
        with pytest.raises(PaystackTransactionError) as exc_info:
            await mock_paystack_service.verify_transaction("nonexistent_ref")

        assert "Transaction not found" in str(exc_info.value)
        assert exc_info.value.transaction_reference == "nonexistent_ref"

    @pytest.mark.asyncio
    async def test_verification_network_error(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test transaction verification with network error."""
        # Mock network timeout error
        mock_paystack_service._client.get = AsyncMock(
            side_effect=httpx.TimeoutException("Request timeout")
        )

        # Verify that PaystackNetworkError is raised
        with pytest.raises(PaystackNetworkError) as exc_info:
            await mock_paystack_service.verify_transaction("test_ref_123")

        assert "network error" in str(exc_info.value).lower()
        assert "Request timeout" in str(exc_info.value)


class TestErrorScenarios:
    """Tests for various error scenarios across PaystackService methods."""

    @pytest.mark.asyncio
    async def test_multiple_network_errors(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test handling of different types of network errors."""
        # Test different httpx exceptions
        network_errors = [
            httpx.ConnectError("Connection refused"),
            httpx.TimeoutException("Request timeout"),
            httpx.ReadTimeout("Read timeout"),
            httpx.WriteTimeout("Write timeout"),
        ]

        for error in network_errors:
            mock_paystack_service._client.post = AsyncMock(side_effect=error)

            with pytest.raises(PaystackNetworkError) as exc_info:
                await mock_paystack_service.initialize_transaction(
                    email="customer@example.com",
                    amount=10000,
                    currency="KES",
                    reference="test_ref",
                    subaccount="ACCT_test",
                )

            assert "network error" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_empty_response_data(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test handling of empty data in successful response."""
        # Mock response with empty data
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": True,
            "message": "Success",
            "data": {},
        }
        mock_paystack_service._client.post = AsyncMock(return_value=mock_response)

        # Call the method
        result = await mock_paystack_service.initialize_transaction(
            email="customer@example.com",
            amount=10000,
            currency="KES",
            reference="test_ref",
            subaccount="ACCT_test",
        )

        # Verify the result handles missing fields gracefully
        assert result["authorization_url"] is None
        assert result["reference"] is None
        assert result["access_code"] is None

    @pytest.mark.asyncio
    async def test_malformed_json_response(
        self, mock_paystack_service: PaystackService
    ) -> None:
        """Test handling of malformed JSON response."""
        # Mock response that raises JSONDecodeError
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.side_effect = ValueError("Invalid JSON")
        mock_paystack_service._client.post = AsyncMock(return_value=mock_response)

        # Verify that the error is propagated
        with pytest.raises(ValueError):
            await mock_paystack_service.initialize_transaction(
                email="customer@example.com",
                amount=10000,
                currency="KES",
                reference="test_ref",
                subaccount="ACCT_test",
            )

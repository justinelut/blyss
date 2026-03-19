"""
Unit tests for Paystack integration logging functionality.

This module tests that API calls are logged, errors are logged with context,
and sensitive data is not logged.
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from polar.config import settings
from polar.integrations.paystack.logging import (
    PaystackErrorLogger,
    log_api_authentication_error,
    log_api_validation_error,
    log_subaccount_creation_failure,
    log_transaction_verification_failure,
    log_webhook_processing_failure,
)
from polar.integrations.paystack.service import (
    PaystackAuthenticationError,
    PaystackNetworkError,
    PaystackService,
)
from polar.models.organization import Organization


class TestPaystackServiceLogging:
    """Test logging in PaystackService methods."""

    @pytest.fixture
    def mock_logger(self):
        """Mock logger to capture log entries."""
        logger = MagicMock()
        with patch("polar.integrations.paystack.service.log", logger):
            yield logger

    @pytest.fixture
    def paystack_service(self):
        """Create PaystackService instance for testing."""
        return PaystackService()

    @pytest.mark.asyncio
    async def test_initialize_transaction_logs_api_call(
        self, mock_logger, paystack_service
    ):
        """Test that transaction initialization logs API call with sanitized parameters."""
        # Mock HTTP client response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": True,
            "data": {
                "authorization_url": "https://checkout.paystack.com/test123",
                "reference": "test_ref_123",
                "access_code": "test_access_code",
            },
        }

        with patch.object(paystack_service._client, "post", return_value=mock_response):
            await paystack_service.initialize_transaction(
                email="test@example.com",
                amount=10000,
                reference="test_ref_123",
                subaccount="ACCT_test123",
                metadata={"order_id": "order_123"},
            )

        # Verify initialization log was called
        mock_logger.info.assert_any_call(
            "paystack.transaction.initialize",
            email="test@example.com",
            amount=10000,
            currency="KES",
            reference="test_ref_123",
            subaccount="ACCT_test123",
            has_metadata=True,
        )

        # Verify success log was called
        mock_logger.info.assert_any_call(
            "paystack.transaction.initialize.success",
            reference="test_ref_123",
            has_authorization_url=True,
        )

        # Verify no sensitive data in logs
        for call in mock_logger.info.call_args_list:
            log_message = str(call)
            assert settings.PAYSTACK_SECRET_KEY not in log_message
            assert "Bearer" not in log_message

    @pytest.mark.asyncio
    async def test_verify_transaction_logs_api_call(
        self, mock_logger, paystack_service
    ):
        """Test that transaction verification logs API call."""
        # Mock HTTP client response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": True,
            "data": {
                "reference": "test_ref_123",
                "status": "success",
                "amount": 10000,
            },
        }

        with patch.object(paystack_service._client, "get", return_value=mock_response):
            await paystack_service.verify_transaction("test_ref_123")

        # Verify verification log was called
        mock_logger.info.assert_any_call(
            "paystack.transaction.verify",
            reference="test_ref_123",
        )

        # Verify success log was called
        mock_logger.info.assert_any_call(
            "paystack.transaction.verify.success",
            reference="test_ref_123",
            status="success",
        )

    @pytest.mark.asyncio
    async def test_create_subaccount_logs_api_call(self, mock_logger, paystack_service):
        """Test that subaccount creation logs API call with sanitized parameters."""
        # Mock HTTP client response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": True,
            "data": {
                "subaccount_code": "ACCT_test123",
                "business_name": "Test Business",
                "percentage_charge": 20.0,
                "is_verified": True,
            },
        }

        with patch.object(paystack_service._client, "post", return_value=mock_response):
            await paystack_service.create_subaccount(
                business_name="Test Business",
                percentage_charge=20.0,
                settlement_bank="044",
                account_number="1234567890",
            )

        # Verify creation log was called
        mock_logger.info.assert_any_call(
            "paystack.subaccount.create",
            business_name="Test Business",
            percentage_charge=20.0,
            has_settlement_bank=True,
            has_account_number=True,
        )

        # Verify success log was called
        mock_logger.info.assert_any_call(
            "paystack.subaccount.create.success",
            business_name="Test Business",
            subaccount_code="ACCT_test123",
            is_verified=True,
        )

    @pytest.mark.asyncio
    async def test_api_error_logging(self, mock_logger, paystack_service):
        """Test that API errors are logged with proper context."""
        # Mock HTTP client to return authentication error
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {
            "status": False,
            "message": "Invalid API key",
        }

        with patch.object(paystack_service._client, "post", return_value=mock_response):
            with pytest.raises(PaystackAuthenticationError):
                await paystack_service.initialize_transaction(
                    email="test@example.com",
                    amount=10000,
                    reference="test_ref_123",
                    subaccount="ACCT_test123",
                )

        # Verify error log was called
        mock_logger.error.assert_any_call(
            "paystack.api.error",
            error_type="authentication",
            status_code=401,
        )

        # Verify no sensitive data in error logs
        for call in mock_logger.error.call_args_list:
            log_message = str(call)
            assert settings.PAYSTACK_SECRET_KEY not in log_message
            assert "Bearer" not in log_message

    @pytest.mark.asyncio
    async def test_network_error_logging(self, mock_logger, paystack_service):
        """Test that network errors are logged properly."""
        import httpx

        with patch.object(
            paystack_service._client,
            "post",
            side_effect=httpx.ConnectError("Connection failed"),
        ):
            with pytest.raises(PaystackNetworkError):
                await paystack_service.initialize_transaction(
                    email="test@example.com",
                    amount=10000,
                    reference="test_ref_123",
                    subaccount="ACCT_test123",
                )

        # Verify network error log was called
        mock_logger.error.assert_any_call(
            "paystack.api.error",
            error_type="network",
            error_message="Connection failed",
        )


class TestPaystackErrorLogger:
    """Test the PaystackErrorLogger utility class."""

    @pytest.fixture
    def mock_logger(self):
        """Mock logger to capture log entries."""
        logger = MagicMock()
        with patch("polar.integrations.paystack.logging.log", logger):
            yield logger

    def test_log_api_error(self, mock_logger):
        """Test API error logging with context."""
        PaystackErrorLogger.log_api_error(
            operation="transaction.initialize",
            error_type="validation",
            error_message="Invalid amount",
            status_code=422,
            transaction_reference="test_ref_123",
            organization_id=uuid4(),
        )

        # Verify error log was called with correct structure
        mock_logger.error.assert_called_once()
        call_args = mock_logger.error.call_args
        assert "paystack.api.error.transaction.initialize" in call_args[0]

        # Check that context was included
        log_data = call_args[1]
        assert log_data["operation"] == "transaction.initialize"
        assert log_data["error_type"] == "validation"
        assert log_data["error_message"] == "Invalid amount"
        assert log_data["status_code"] == 422
        assert "transaction_reference" in log_data
        assert "organization_id" in log_data

    def test_log_payment_failure(self, mock_logger):
        """Test payment failure logging with context."""
        checkout_id = uuid4()
        order_id = uuid4()

        PaystackErrorLogger.log_payment_failure(
            transaction_reference="test_ref_123",
            checkout_id=checkout_id,
            order_id=order_id,
            failure_reason="verification_failed",
        )

        # Verify error log was called
        mock_logger.error.assert_called_once_with(
            "paystack.payment.failure",
            transaction_reference="test_ref_123",
            checkout_id=checkout_id,
            order_id=order_id,
            failure_reason="verification_failed",
        )

    def test_log_subaccount_error(self, mock_logger):
        """Test subaccount error logging with context."""
        organization_id = uuid4()

        PaystackErrorLogger.log_subaccount_error(
            organization_id=organization_id,
            operation="create",
            error_message="API rate limit exceeded",
            subaccount_code="ACCT_test123",
        )

        # Verify error log was called
        mock_logger.error.assert_called_once_with(
            "paystack.subaccount.create.error",
            organization_id=organization_id,
            operation="create",
            error_message="API rate limit exceeded",
            subaccount_code="ACCT_test123",
        )

    def test_log_webhook_error(self, mock_logger):
        """Test webhook error logging with context."""
        event_id = uuid4()

        PaystackErrorLogger.log_webhook_error(
            event_id=event_id,
            event_type="charge.success",
            error_message="Checkout not found",
            transaction_reference="test_ref_123",
        )

        # Verify error log was called
        mock_logger.error.assert_called_once_with(
            "paystack.webhook.charge.success.error",
            event_id=event_id,
            event_type="charge.success",
            error_message="Checkout not found",
            transaction_reference="test_ref_123",
        )

    def test_log_mpesa_error(self, mock_logger):
        """Test M-Pesa error logging with context."""
        organization_id = uuid4()

        PaystackErrorLogger.log_mpesa_error(
            organization_id=organization_id,
            operation="verify",
            error_message="Verification transaction failed",
            mpesa_number="+254712345678",
            verification_reference="mpesa_verify_123",
        )

        # Verify error log was called
        mock_logger.error.assert_called_once_with(
            "paystack.mpesa.verify.error",
            organization_id=organization_id,
            operation="verify",
            error_message="Verification transaction failed",
            mpesa_number="+254712345678",
            verification_reference="mpesa_verify_123",
        )

    def test_sensitive_data_filtering(self, mock_logger):
        """Test that sensitive data is filtered from logs."""
        PaystackErrorLogger.log_api_error(
            operation="test",
            error_type="test",
            error_message="Test error",
            api_key="sk_test_secret",  # Should be filtered
            secret="webhook_secret",  # Should be filtered
            authorization="Bearer token",  # Should be filtered
            bearer="token",  # Should be filtered
            safe_data="should_be_included",  # Should be included
        )

        # Verify error log was called
        mock_logger.error.assert_called_once()
        call_args = mock_logger.error.call_args
        log_data = call_args[1]

        # Verify sensitive data was filtered
        assert "api_key" not in log_data
        assert "secret" not in log_data
        assert "authorization" not in log_data
        assert "bearer" not in log_data

        # Verify safe data was included
        assert log_data["safe_data"] == "should_be_included"


class TestConvenienceLoggingFunctions:
    """Test convenience logging functions."""

    @pytest.fixture
    def mock_logger(self):
        """Mock logger to capture log entries."""
        logger = MagicMock()
        with patch("polar.integrations.paystack.logging.log", logger):
            yield logger

    def test_log_api_authentication_error(self, mock_logger):
        """Test API authentication error convenience function."""
        log_api_authentication_error(
            operation="transaction.initialize",
            transaction_reference="test_ref_123",
        )

        # Verify error log was called with correct parameters
        mock_logger.error.assert_called_once()
        call_args = mock_logger.error.call_args
        assert "paystack.api.error.transaction.initialize" in call_args[0]

        log_data = call_args[1]
        assert log_data["error_type"] == "authentication"
        assert log_data["status_code"] == 401
        assert log_data["transaction_reference"] == "test_ref_123"

    def test_log_api_validation_error(self, mock_logger):
        """Test API validation error convenience function."""
        log_api_validation_error(
            operation="subaccount.create",
            message="Invalid business name",
            organization_id=uuid4(),
        )

        # Verify error log was called with correct parameters
        mock_logger.error.assert_called_once()
        call_data = mock_logger.error.call_args[1]
        assert log_data["error_type"] == "validation"
        assert log_data["error_message"] == "Invalid business name"
        assert log_data["status_code"] == 422

    def test_log_transaction_verification_failure(self, mock_logger):
        """Test transaction verification failure convenience function."""
        checkout_id = uuid4()

        log_transaction_verification_failure(
            transaction_reference="test_ref_123",
            reason="Transaction not found",
            checkout_id=checkout_id,
        )

        # Verify error log was called
        mock_logger.error.assert_called_once_with(
            "paystack.payment.failure",
            transaction_reference="test_ref_123",
            failure_reason="verification_failed: Transaction not found",
            checkout_id=checkout_id,
        )

    def test_log_subaccount_creation_failure(self, mock_logger):
        """Test subaccount creation failure convenience function."""
        organization_id = uuid4()

        log_subaccount_creation_failure(
            organization_id=organization_id,
            error_message="Network timeout",
            organization_name="Test Org",
        )

        # Verify error log was called
        mock_logger.error.assert_called_once_with(
            "paystack.subaccount.create.error",
            organization_id=organization_id,
            operation="create",
            error_message="Network timeout",
            organization_name="Test Org",
        )

    def test_log_webhook_processing_failure(self, mock_logger):
        """Test webhook processing failure convenience function."""
        event_id = uuid4()

        log_webhook_processing_failure(
            event_id=event_id,
            event_type="charge.success",
            error_message="Database connection failed",
            transaction_reference="test_ref_123",
        )

        # Verify error log was called
        mock_logger.error.assert_called_once_with(
            "paystack.webhook.charge.success.error",
            event_id=event_id,
            event_type="charge.success",
            error_message="Database connection failed",
            transaction_reference="test_ref_123",
        )


class TestOrganizationServiceLogging:
    """Test logging in organization service Paystack integration."""

    @pytest.fixture
    def mock_logger(self):
        """Mock logger to capture log entries."""
        logger = MagicMock()
        with patch("polar.integrations.paystack.logging.log", logger):
            yield logger

    @pytest.mark.asyncio
    async def test_create_organization_subaccount_success_logging(self, mock_logger):
        """Test that successful subaccount creation is logged."""
        from polar.organization.service import OrganizationService

        # Create mock organization
        organization = Organization(
            id=uuid4(),
            name="Test Organization",
            slug="test-org",
        )

        # Mock session and repository
        mock_session = MagicMock()
        mock_repository = MagicMock()

        # Mock PaystackService
        with patch("polar.organization.service.paystack") as mock_paystack:
            mock_paystack.create_subaccount.return_value = {
                "subaccount_code": "ACCT_test123",
                "status": "active",
            }

            with patch(
                "polar.organization.service.OrganizationRepository.from_session",
                return_value=mock_repository,
            ):
                mock_repository.update.return_value = organization

                with patch("polar.organization.service.log") as mock_org_logger:
                    service = OrganizationService()

                    result = await service.create_organization_subaccount(
                        mock_session, organization
                    )

                    # Verify success logs were called
                    mock_org_logger.info.assert_any_call(
                        "organization.subaccount.create.start",
                        organization_id=organization.id,
                        organization_name=organization.name,
                    )

                    mock_org_logger.info.assert_any_call(
                        "organization.subaccount.create.success",
                        organization_id=organization.id,
                        subaccount_code="ACCT_test123",
                        status="active",
                    )

    @pytest.mark.asyncio
    async def test_create_organization_subaccount_failure_logging(self, mock_logger):
        """Test that subaccount creation failures are logged with enhanced logging."""
        from polar.exceptions import OrganizationError
        from polar.organization.service import OrganizationService

        # Create mock organization
        organization = Organization(
            id=uuid4(),
            name="Test Organization",
            slug="test-org",
        )

        # Mock session and repository
        mock_session = MagicMock()
        mock_repository = MagicMock()

        # Mock PaystackService to raise an error
        with patch("polar.organization.service.paystack") as mock_paystack:
            mock_paystack.create_subaccount.side_effect = PaystackNetworkError(
                "Network error"
            )

            with patch(
                "polar.organization.service.OrganizationRepository.from_session",
                return_value=mock_repository,
            ):
                mock_repository.update.return_value = organization

                service = OrganizationService()

                with pytest.raises(OrganizationError):
                    await service.create_organization_subaccount(
                        mock_session, organization
                    )

                # Verify enhanced error logging was called
                mock_logger.error.assert_called_once_with(
                    "paystack.subaccount.create.error",
                    organization_id=organization.id,
                    operation="create",
                    error_message="Network error",
                    organization_name=organization.name,
                    error_type="PaystackNetworkError",
                )


class TestWebhookLogging:
    """Test logging in webhook handlers."""

    @pytest.fixture
    def mock_logger(self):
        """Mock logger to capture log entries."""
        logger = MagicMock()
        with patch("polar.integrations.paystack.endpoints.log", logger):
            yield logger

    @pytest.mark.asyncio
    async def test_webhook_signature_verification_failure_logging(self, mock_logger):
        """Test that webhook signature verification failures are logged."""
        from polar.integrations.paystack.endpoints import PaystackWebhookEventGetter

        webhook_getter = PaystackWebhookEventGetter(settings.PAYSTACK_WEBHOOK_SECRET)

        # Mock request with invalid signature
        mock_request = MagicMock()
        mock_request.body = AsyncMock(
            return_value=b'{"event": "charge.success", "data": {"id": "test123"}}'
        )
        mock_request.headers = {"x-paystack-signature": "invalid_signature"}

        with pytest.raises(Exception):  # Should raise HTTPException
            await webhook_getter(mock_request)

        # Verify warning log was called
        mock_logger.warning.assert_called_once_with(
            "paystack.webhook.signature_verification_failed",
            signature_provided=True,
        )

    @pytest.mark.asyncio
    async def test_webhook_event_received_logging(self, mock_logger):
        """Test that valid webhook events are logged."""
        import hashlib
        import hmac

        from polar.integrations.paystack.endpoints import PaystackWebhookEventGetter

        webhook_secret = settings.PAYSTACK_WEBHOOK_SECRET
        webhook_getter = PaystackWebhookEventGetter(webhook_secret)

        # Create valid webhook payload and signature
        payload = b'{"event": "charge.success", "data": {"id": "test123", "reference": "test_ref"}}'
        signature = hmac.new(
            webhook_secret.encode("utf-8"), payload, hashlib.sha512
        ).hexdigest()

        # Mock request with valid signature
        mock_request = MagicMock()
        mock_request.body = AsyncMock(return_value=payload)
        mock_request.headers = {"x-paystack-signature": signature}

        result = await webhook_getter(mock_request)

        # Verify event received log was called
        mock_logger.info.assert_called_once_with(
            "paystack.webhook.event_received",
            event_type="charge.success",
            event_id="test123",
        )

        # Verify result structure
        assert result["event"] == "charge.success"
        assert result["data"]["id"] == "test123"

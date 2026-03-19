"""
Enhanced error logging utilities for Paystack integration.

This module provides structured error logging with context for all Paystack operations.
"""

from typing import Any
from uuid import UUID

import structlog

from polar.logging import Logger

log: Logger = structlog.get_logger()


class PaystackErrorLogger:
    """Centralized error logging for Paystack operations with context."""

    @staticmethod
    def log_api_error(
        operation: str,
        error_type: str,
        error_message: str,
        status_code: int | None = None,
        **context: Any,
    ) -> None:
        """
        Log Paystack API errors with context.

        Args:
            operation: The operation that failed (e.g., "transaction.initialize")
            error_type: Type of error (authentication, validation, network, etc.)
            error_message: Error message from API or exception
            status_code: HTTP status code if available
            **context: Additional context (transaction_reference, organization_id, etc.)
        """
        log_data = {
            "operation": operation,
            "error_type": error_type,
            "error_message": error_message,
        }

        if status_code:
            log_data["status_code"] = status_code

        # Add context while ensuring no sensitive data
        for key, value in context.items():
            if key not in ["api_key", "secret", "authorization", "bearer"]:
                log_data[key] = value

        log.error(f"paystack.api.error.{operation}", **log_data)

    @staticmethod
    def log_payment_failure(
        transaction_reference: str,
        checkout_id: UUID | None = None,
        order_id: UUID | None = None,
        failure_reason: str | None = None,
        **context: Any,
    ) -> None:
        """
        Log payment failures with transaction context.

        Args:
            transaction_reference: Paystack transaction reference
            checkout_id: Associated checkout ID if available
            order_id: Associated order ID if available
            failure_reason: Reason for payment failure
            **context: Additional context
        """
        log_data = {
            "transaction_reference": transaction_reference,
        }

        if checkout_id:
            log_data["checkout_id"] = checkout_id
        if order_id:
            log_data["order_id"] = order_id
        if failure_reason:
            log_data["failure_reason"] = failure_reason

        # Add additional context
        for key, value in context.items():
            if key not in ["api_key", "secret", "authorization", "bearer"]:
                log_data[key] = value

        log.error("paystack.payment.failure", **log_data)

    @staticmethod
    def log_subaccount_error(
        organization_id: UUID,
        operation: str,
        error_message: str,
        subaccount_code: str | None = None,
        **context: Any,
    ) -> None:
        """
        Log subaccount creation/update failures with organization context.

        Args:
            organization_id: Organization ID
            operation: Operation that failed (create, update, etc.)
            error_message: Error message
            subaccount_code: Subaccount code if available
            **context: Additional context
        """
        log_data = {
            "organization_id": organization_id,
            "operation": operation,
            "error_message": error_message,
        }

        if subaccount_code:
            log_data["subaccount_code"] = subaccount_code

        # Add additional context
        for key, value in context.items():
            if key not in ["api_key", "secret", "authorization", "bearer"]:
                log_data[key] = value

        log.error(f"paystack.subaccount.{operation}.error", **log_data)

    @staticmethod
    def log_webhook_error(
        event_id: UUID,
        event_type: str,
        error_message: str,
        transaction_reference: str | None = None,
        **context: Any,
    ) -> None:
        """
        Log webhook processing errors with event context.

        Args:
            event_id: Webhook event ID
            event_type: Type of webhook event
            error_message: Error message
            transaction_reference: Transaction reference if available
            **context: Additional context
        """
        log_data = {
            "event_id": event_id,
            "event_type": event_type,
            "error_message": error_message,
        }

        if transaction_reference:
            log_data["transaction_reference"] = transaction_reference

        # Add additional context
        for key, value in context.items():
            if key not in ["api_key", "secret", "authorization", "bearer"]:
                log_data[key] = value

        log.error(f"paystack.webhook.{event_type}.error", **log_data)

    @staticmethod
    def log_mpesa_error(
        organization_id: UUID,
        operation: str,
        error_message: str,
        mpesa_number: str | None = None,
        verification_reference: str | None = None,
        **context: Any,
    ) -> None:
        """
        Log M-Pesa configuration/verification errors with context.

        Args:
            organization_id: Organization ID
            operation: Operation that failed (configure, verify, etc.)
            error_message: Error message
            mpesa_number: M-Pesa number if available
            verification_reference: Verification transaction reference if available
            **context: Additional context
        """
        log_data = {
            "organization_id": organization_id,
            "operation": operation,
            "error_message": error_message,
        }

        if mpesa_number:
            log_data["mpesa_number"] = mpesa_number
        if verification_reference:
            log_data["verification_reference"] = verification_reference

        # Add additional context
        for key, value in context.items():
            if key not in ["api_key", "secret", "authorization", "bearer"]:
                log_data[key] = value

        log.error(f"paystack.mpesa.{operation}.error", **log_data)

    @staticmethod
    def log_checkout_error(
        checkout_id: UUID,
        operation: str,
        error_message: str,
        organization_id: UUID | None = None,
        transaction_reference: str | None = None,
        **context: Any,
    ) -> None:
        """
        Log checkout integration errors with context.

        Args:
            checkout_id: Checkout ID
            operation: Operation that failed (initialize, verify, etc.)
            error_message: Error message
            organization_id: Organization ID if available
            transaction_reference: Transaction reference if available
            **context: Additional context
        """
        log_data = {
            "checkout_id": checkout_id,
            "operation": operation,
            "error_message": error_message,
        }

        if organization_id:
            log_data["organization_id"] = organization_id
        if transaction_reference:
            log_data["transaction_reference"] = transaction_reference

        # Add additional context
        for key, value in context.items():
            if key not in ["api_key", "secret", "authorization", "bearer"]:
                log_data[key] = value

        log.error(f"paystack.checkout.{operation}.error", **log_data)


# Convenience functions for common error logging scenarios
def log_api_authentication_error(operation: str, **context: Any) -> None:
    """Log API authentication errors."""
    PaystackErrorLogger.log_api_error(
        operation=operation,
        error_type="authentication",
        error_message="Paystack API authentication failed",
        status_code=401,
        **context,
    )


def log_api_validation_error(operation: str, message: str, **context: Any) -> None:
    """Log API validation errors."""
    PaystackErrorLogger.log_api_error(
        operation=operation,
        error_type="validation",
        error_message=message,
        status_code=422,
        **context,
    )


def log_api_network_error(operation: str, message: str, **context: Any) -> None:
    """Log API network errors."""
    PaystackErrorLogger.log_api_error(
        operation=operation,
        error_type="network",
        error_message=message,
        status_code=503,
        **context,
    )


def log_transaction_verification_failure(
    transaction_reference: str, reason: str, **context: Any
) -> None:
    """Log transaction verification failures."""
    PaystackErrorLogger.log_payment_failure(
        transaction_reference=transaction_reference,
        failure_reason=f"verification_failed: {reason}",
        **context,
    )


def log_subaccount_creation_failure(
    organization_id: UUID, error_message: str, **context: Any
) -> None:
    """Log subaccount creation failures."""
    PaystackErrorLogger.log_subaccount_error(
        organization_id=organization_id,
        operation="create",
        error_message=error_message,
        **context,
    )


def log_webhook_processing_failure(
    event_id: UUID, event_type: str, error_message: str, **context: Any
) -> None:
    """Log webhook processing failures."""
    PaystackErrorLogger.log_webhook_error(
        event_id=event_id, event_type=event_type, error_message=error_message, **context
    )

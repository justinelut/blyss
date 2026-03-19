"""
Payment metrics tracking for Paystack integration.

This module provides metrics collection and monitoring for Paystack operations
to track success rates, processing times, and other key performance indicators.
"""

import time
from contextlib import asynccontextmanager
from uuid import UUID

import structlog
from prometheus_client import Counter, Gauge, Histogram

from polar.logging import Logger

log: Logger = structlog.get_logger()

# Prometheus metrics for Paystack operations
paystack_transaction_total = Counter(
    "paystack_transactions_total",
    "Total number of Paystack transactions",
    ["operation", "status", "currency"],
)

paystack_transaction_duration = Histogram(
    "paystack_transaction_duration_seconds",
    "Duration of Paystack transaction operations",
    ["operation"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
)

paystack_api_requests_total = Counter(
    "paystack_api_requests_total",
    "Total number of Paystack API requests",
    ["endpoint", "method", "status_code"],
)

paystack_api_duration = Histogram(
    "paystack_api_duration_seconds",
    "Duration of Paystack API requests",
    ["endpoint", "method"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
)

paystack_webhook_events_total = Counter(
    "paystack_webhook_events_total",
    "Total number of Paystack webhook events",
    ["event_type", "status"],
)

paystack_webhook_processing_duration = Histogram(
    "paystack_webhook_processing_duration_seconds",
    "Duration of Paystack webhook processing",
    ["event_type"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
)

paystack_subaccount_operations_total = Counter(
    "paystack_subaccount_operations_total",
    "Total number of Paystack subaccount operations",
    ["operation", "status"],
)

paystack_mpesa_operations_total = Counter(
    "paystack_mpesa_operations_total",
    "Total number of M-Pesa operations",
    ["operation", "status"],
)

paystack_active_subaccounts = Gauge(
    "paystack_active_subaccounts_total", "Total number of active Paystack subaccounts"
)

paystack_payment_amounts = Histogram(
    "paystack_payment_amounts_kes",
    "Distribution of payment amounts in KES",
    buckets=[100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
)


class PaystackMetrics:
    """Centralized metrics collection for Paystack operations."""

    @staticmethod
    def record_transaction_attempt(
        operation: str, currency: str = "KES", amount: int | None = None
    ) -> None:
        """
        Record a transaction attempt.

        Args:
            operation: Type of operation (initialize, verify, etc.)
            currency: Transaction currency
            amount: Transaction amount in kobo if available
        """
        paystack_transaction_total.labels(
            operation=operation, status="attempted", currency=currency
        ).inc()

        if amount is not None:
            # Convert kobo to KES for histogram
            amount_kes = amount / 100
            paystack_payment_amounts.observe(amount_kes)

        log.info(
            "paystack.metrics.transaction.attempted",
            operation=operation,
            currency=currency,
            amount=amount,
        )

    @staticmethod
    def record_transaction_success(
        operation: str, currency: str = "KES", duration: float | None = None
    ) -> None:
        """
        Record a successful transaction.

        Args:
            operation: Type of operation
            currency: Transaction currency
            duration: Operation duration in seconds
        """
        paystack_transaction_total.labels(
            operation=operation, status="success", currency=currency
        ).inc()

        if duration is not None:
            paystack_transaction_duration.labels(operation=operation).observe(duration)

        log.info(
            "paystack.metrics.transaction.success",
            operation=operation,
            currency=currency,
            duration=duration,
        )

    @staticmethod
    def record_transaction_failure(
        operation: str,
        currency: str = "KES",
        error_type: str | None = None,
        duration: float | None = None,
    ) -> None:
        """
        Record a failed transaction.

        Args:
            operation: Type of operation
            currency: Transaction currency
            error_type: Type of error that occurred
            duration: Operation duration in seconds
        """
        paystack_transaction_total.labels(
            operation=operation, status="failed", currency=currency
        ).inc()

        if duration is not None:
            paystack_transaction_duration.labels(operation=operation).observe(duration)

        log.info(
            "paystack.metrics.transaction.failed",
            operation=operation,
            currency=currency,
            error_type=error_type,
            duration=duration,
        )

    @staticmethod
    def record_api_request(
        endpoint: str, method: str, status_code: int, duration: float | None = None
    ) -> None:
        """
        Record a Paystack API request.

        Args:
            endpoint: API endpoint path
            method: HTTP method
            status_code: HTTP status code
            duration: Request duration in seconds
        """
        paystack_api_requests_total.labels(
            endpoint=endpoint, method=method, status_code=status_code
        ).inc()

        if duration is not None:
            paystack_api_duration.labels(endpoint=endpoint, method=method).observe(
                duration
            )

        log.debug(
            "paystack.metrics.api.request",
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            duration=duration,
        )

    @staticmethod
    def record_webhook_event(
        event_type: str, status: str, processing_duration: float | None = None
    ) -> None:
        """
        Record a webhook event.

        Args:
            event_type: Type of webhook event
            status: Processing status (success, failed, etc.)
            processing_duration: Processing duration in seconds
        """
        paystack_webhook_events_total.labels(event_type=event_type, status=status).inc()

        if processing_duration is not None:
            paystack_webhook_processing_duration.labels(event_type=event_type).observe(
                processing_duration
            )

        log.info(
            "paystack.metrics.webhook.event",
            event_type=event_type,
            status=status,
            processing_duration=processing_duration,
        )

    @staticmethod
    def record_subaccount_operation(
        operation: str, status: str, organization_id: UUID | None = None
    ) -> None:
        """
        Record a subaccount operation.

        Args:
            operation: Type of operation (create, update, etc.)
            status: Operation status (success, failed, etc.)
            organization_id: Organization ID for context
        """
        paystack_subaccount_operations_total.labels(
            operation=operation, status=status
        ).inc()

        log.info(
            "paystack.metrics.subaccount.operation",
            operation=operation,
            status=status,
            organization_id=organization_id,
        )

    @staticmethod
    def record_mpesa_operation(
        operation: str, status: str, organization_id: UUID | None = None
    ) -> None:
        """
        Record an M-Pesa operation.

        Args:
            operation: Type of operation (configure, verify, etc.)
            status: Operation status (success, failed, etc.)
            organization_id: Organization ID for context
        """
        paystack_mpesa_operations_total.labels(operation=operation, status=status).inc()

        log.info(
            "paystack.metrics.mpesa.operation",
            operation=operation,
            status=status,
            organization_id=organization_id,
        )

    @staticmethod
    def update_active_subaccounts_count(count: int) -> None:
        """
        Update the count of active subaccounts.

        Args:
            count: Current number of active subaccounts
        """
        paystack_active_subaccounts.set(count)

        log.debug(
            "paystack.metrics.subaccounts.active_count",
            count=count,
        )

    @staticmethod
    @asynccontextmanager
    async def time_operation(operation: str):
        """
        Context manager to time an operation.

        Args:
            operation: Name of the operation being timed

        Usage:
            async with PaystackMetrics.time_operation("transaction.initialize"):
                result = await paystack_service.initialize_transaction(...)
        """
        start_time = time.time()
        try:
            yield
            duration = time.time() - start_time
            PaystackMetrics.record_transaction_success(operation, duration=duration)
        except Exception as e:
            duration = time.time() - start_time
            PaystackMetrics.record_transaction_failure(
                operation, error_type=type(e).__name__, duration=duration
            )
            raise

    @staticmethod
    @asynccontextmanager
    async def time_api_request(endpoint: str, method: str):
        """
        Context manager to time an API request.

        Args:
            endpoint: API endpoint path
            method: HTTP method

        Usage:
            async with PaystackMetrics.time_api_request("/transaction/initialize", "POST"):
                response = await client.post(...)
        """
        start_time = time.time()
        status_code = None
        try:
            yield
            duration = time.time() - start_time
            # Status code should be set by the caller
            PaystackMetrics.record_api_request(endpoint, method, 200, duration)
        except Exception as e:
            duration = time.time() - start_time
            # Default to 500 for exceptions
            PaystackMetrics.record_api_request(endpoint, method, 500, duration)
            raise

    @staticmethod
    @asynccontextmanager
    async def time_webhook_processing(event_type: str):
        """
        Context manager to time webhook processing.

        Args:
            event_type: Type of webhook event

        Usage:
            async with PaystackMetrics.time_webhook_processing("charge.success"):
                await process_charge_success(event)
        """
        start_time = time.time()
        try:
            yield
            duration = time.time() - start_time
            PaystackMetrics.record_webhook_event(event_type, "success", duration)
        except Exception as e:
            duration = time.time() - start_time
            PaystackMetrics.record_webhook_event(event_type, "failed", duration)
            raise


# Convenience functions for common metrics
def track_payment_success(amount: int, currency: str = "KES") -> None:
    """Track a successful payment."""
    PaystackMetrics.record_transaction_success("payment", currency)
    PaystackMetrics.record_transaction_attempt("payment", currency, amount)


def track_payment_failure(amount: int, error_type: str, currency: str = "KES") -> None:
    """Track a failed payment."""
    PaystackMetrics.record_transaction_failure("payment", currency, error_type)
    PaystackMetrics.record_transaction_attempt("payment", currency, amount)


def track_subaccount_creation_success(organization_id: UUID) -> None:
    """Track successful subaccount creation."""
    PaystackMetrics.record_subaccount_operation("create", "success", organization_id)


def track_subaccount_creation_failure(organization_id: UUID) -> None:
    """Track failed subaccount creation."""
    PaystackMetrics.record_subaccount_operation("create", "failed", organization_id)


def track_mpesa_verification_success(organization_id: UUID) -> None:
    """Track successful M-Pesa verification."""
    PaystackMetrics.record_mpesa_operation("verify", "success", organization_id)


def track_mpesa_verification_failure(organization_id: UUID) -> None:
    """Track failed M-Pesa verification."""
    PaystackMetrics.record_mpesa_operation("verify", "failed", organization_id)


def track_webhook_success(event_type: str) -> None:
    """Track successful webhook processing."""
    PaystackMetrics.record_webhook_event(event_type, "success")


def track_webhook_failure(event_type: str) -> None:
    """Track failed webhook processing."""
    PaystackMetrics.record_webhook_event(event_type, "failed")

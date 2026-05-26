# Paystack webhook event handlers
import uuid
from typing import cast

import structlog
from dramatiq import Retry

from polar.checkout.service import checkout as checkout_service
from polar.external_event.service import external_event as external_event_service
from polar.integrations.paystack.service import (
    PaystackAuthenticationError,
    PaystackNetworkError,
    PaystackTransactionError,
    PaystackValidationError,
    paystack,
)
from polar.logging import Logger
from polar.models.checkout import CheckoutStatus
from polar.models.external_event import PaystackEvent
from polar.order.service import order as order_service
from polar.postgres import AsyncSessionMaker
from polar.worker import TaskPriority, actor, can_retry

log: Logger = structlog.get_logger()


async def _handle_verification_failure(
    session,
    event_id: uuid.UUID,
    transaction_reference: str,
    transaction_status: str | None = None,
) -> None:
    """
    Handle payment verification failure by returning checkout to open status.

    This allows the customer to retry payment with a different method.

    Args:
        session: Database session
        event_id: Webhook event ID
        transaction_reference: Paystack transaction reference
        transaction_status: Failed transaction status from Paystack
    """
    try:
        # Extract checkout ID from the transaction reference
        # Transaction reference format: checkout_{checkout_id}_{token}
        if transaction_reference.startswith("checkout_"):
            parts = transaction_reference.split("_")
            if len(parts) >= 2:
                checkout_id_str = parts[1]
                checkout_id = uuid.UUID(checkout_id_str)

                # Retrieve checkout
                checkout = await checkout_service.get(session, checkout_id)
                if checkout:
                    # Use the existing handle_failure method to return checkout to open status
                    await checkout_service.handle_failure(
                        session, checkout, payment=None
                    )

                    log.info(
                        "paystack.webhook.verification_failure.checkout_reopened",
                        event_id=event_id,
                        reference=transaction_reference,
                        checkout_id=checkout_id,
                        failed_status=transaction_status,
                    )
                else:
                    log.error(
                        "paystack.webhook.verification_failure.checkout_not_found",
                        event_id=event_id,
                        reference=transaction_reference,
                        checkout_id=checkout_id,
                    )
            else:
                log.error(
                    "paystack.webhook.verification_failure.invalid_reference_format",
                    event_id=event_id,
                    reference=transaction_reference,
                )
        else:
            log.error(
                "paystack.webhook.verification_failure.unexpected_reference_format",
                event_id=event_id,
                reference=transaction_reference,
            )
    except Exception as e:
        log.error(
            "paystack.webhook.verification_failure.error",
            event_id=event_id,
            reference=transaction_reference,
            error=str(e),
        )


@actor(
    actor_name="paystack.webhook.charge.success",
    priority=TaskPriority.HIGH,
    max_retries=3,
    min_backoff=1000,
    max_backoff=60000,
)
async def charge_success(event_id: uuid.UUID) -> None:
    """
    Handle successful Paystack payment.

    This task is triggered by charge.success webhook events from Paystack.
    It verifies the transaction with Paystack API, creates an Order record,
    and updates the Checkout status to confirmed.
    """
    async with AsyncSessionMaker() as session:
        async with external_event_service.handle_paystack(session, event_id) as event:
            event_data = cast(PaystackEvent, event).paystack_data
            transaction_data = event_data.get("data", {})
            transaction_reference = transaction_data.get("reference")

            if not transaction_reference:
                log.error(
                    "paystack.webhook.charge.success.missing_reference",
                    event_id=event_id,
                )
                return

            log.info(
                "paystack.webhook.charge.success.processing",
                event_id=event_id,
                reference=transaction_reference,
            )

            try:
                # Verify transaction with Paystack API
                try:
                    verified_transaction = await paystack.verify_transaction(
                        transaction_reference
                    )
                except PaystackTransactionError as e:
                    log.error(
                        "paystack.webhook.charge.success.verification_failed",
                        event_id=event_id,
                        reference=transaction_reference,
                        error=str(e),
                    )

                    # Handle verification failure - return checkout to open status
                    await _handle_verification_failure(
                        session, event_id, transaction_reference, "verification_failed"
                    )
                    return
                except (
                    PaystackAuthenticationError,
                    PaystackValidationError,
                    PaystackNetworkError,
                ) as e:
                    log.error(
                        "paystack.webhook.charge.success.api_error",
                        event_id=event_id,
                        reference=transaction_reference,
                        error_type=type(e).__name__,
                        error=str(e),
                    )

                    # For API errors, we should retry rather than mark as failed
                    if can_retry():
                        raise Retry() from e

                    # If no more retries, handle as verification failure
                    await _handle_verification_failure(
                        session, event_id, transaction_reference, "api_error"
                    )
                    return

                transaction_status = verified_transaction.get("status")
                if transaction_status != "success":
                    log.warning(
                        "paystack.webhook.charge.success.invalid_status",
                        event_id=event_id,
                        reference=transaction_reference,
                        status=transaction_status,
                    )

                    # Handle verification failure - return checkout to open status
                    await _handle_verification_failure(
                        session, event_id, transaction_reference, transaction_status
                    )
                    return

                # Extract checkout ID from metadata
                metadata = verified_transaction.get("metadata", {})
                checkout_id_str = metadata.get("checkout_id")

                if not checkout_id_str:
                    log.error(
                        "paystack.webhook.charge.success.missing_checkout_id",
                        event_id=event_id,
                        reference=transaction_reference,
                    )
                    return

                checkout_id = uuid.UUID(checkout_id_str)

                # Retrieve checkout
                checkout = await checkout_service.get(session, checkout_id)
                if not checkout:
                    log.error(
                        "paystack.webhook.charge.success.checkout_not_found",
                        event_id=event_id,
                        reference=transaction_reference,
                        checkout_id=checkout_id,
                    )
                    if can_retry():
                        raise Retry()
                    return

                # Update checkout status to confirmed if not already
                if checkout.status == CheckoutStatus.open:
                    checkout = await checkout_service.update(
                        session,
                        checkout,
                        update_dict={"status": CheckoutStatus.confirmed},
                    )

                # Check if order already exists for this checkout
                if checkout.order:
                    log.info(
                        "paystack.webhook.charge.success.order_exists",
                        event_id=event_id,
                        reference=transaction_reference,
                        checkout_id=checkout_id,
                        order_id=checkout.order.id,
                    )
                    return

                # Create order from checkout
                if checkout.product and checkout.product.is_recurring:
                    # For recurring products, we need subscription handling
                    # This will be implemented in the checkout integration task
                    log.warning(
                        "paystack.webhook.charge.success.recurring_not_supported",
                        event_id=event_id,
                        reference=transaction_reference,
                        checkout_id=checkout_id,
                    )
                    return
                else:
                    # Create one-time order
                    order = await order_service.create_from_checkout_one_time(
                        session, checkout, payment=None
                    )

                    # Calculate and store platform fee for Paystack orders
                    from polar.integrations.paystack.fee_calculator import (
                        calculate_platform_fee,
                    )

                    platform_fee_amount, creator_payout_amount = calculate_platform_fee(
                        order.total_amount, order.currency
                    )

                    # Update order with platform fee information
                    order.platform_fee_amount = platform_fee_amount
                    order.platform_fee_currency = order.currency
                    order.creator_payout_amount = creator_payout_amount

                    # Store Paystack transaction reference in order
                    # Using stripe_invoice_id field for backward compatibility
                    order.stripe_invoice_id = transaction_reference
                    await session.flush()

                    log.info(
                        "paystack.webhook.charge.success.platform_fee_calculated",
                        event_id=event_id,
                        reference=transaction_reference,
                        order_id=order.id,
                        order_amount=order.total_amount,
                        platform_fee_amount=platform_fee_amount,
                        creator_payout_amount=creator_payout_amount,
                        currency=order.currency,
                    )

                    log.info(
                        "paystack.webhook.charge.success.order_created",
                        event_id=event_id,
                        reference=transaction_reference,
                        checkout_id=checkout_id,
                        order_id=order.id,
                    )

            except Exception as e:
                log.error(
                    "paystack.webhook.charge.success.error",
                    event_id=event_id,
                    reference=transaction_reference,
                    error=str(e),
                )
                if can_retry():
                    raise Retry() from e
                raise


@actor(
    actor_name="paystack.webhook.charge.failed",
    priority=TaskPriority.HIGH,
    max_retries=3,
    min_backoff=1000,
    max_backoff=60000,
)
async def charge_failed(event_id: uuid.UUID) -> None:
    """
    Handle failed Paystack payment.

    This task is triggered by charge.failed webhook events from Paystack.
    It updates the Checkout status to failed without creating an Order record.
    """
    async with AsyncSessionMaker() as session:
        async with external_event_service.handle_paystack(session, event_id) as event:
            event_data = cast(PaystackEvent, event).paystack_data
            transaction_data = event_data.get("data", {})
            transaction_reference = transaction_data.get("reference")

            if not transaction_reference:
                log.error(
                    "paystack.webhook.charge.failed.missing_reference",
                    event_id=event_id,
                )
                return

            log.info(
                "paystack.webhook.charge.failed.processing",
                event_id=event_id,
                reference=transaction_reference,
            )

            try:
                # Extract checkout ID from metadata
                metadata = transaction_data.get("metadata", {})
                checkout_id_str = metadata.get("checkout_id")

                if not checkout_id_str:
                    log.error(
                        "paystack.webhook.charge.failed.missing_checkout_id",
                        event_id=event_id,
                        reference=transaction_reference,
                    )
                    return

                checkout_id = uuid.UUID(checkout_id_str)

                # Retrieve checkout
                checkout = await checkout_service.get(session, checkout_id)
                if not checkout:
                    log.error(
                        "paystack.webhook.charge.failed.checkout_not_found",
                        event_id=event_id,
                        reference=transaction_reference,
                        checkout_id=checkout_id,
                    )
                    if can_retry():
                        raise Retry()
                    return

                # Update checkout status to failed using handle_failure method
                # This returns the checkout to open status to allow retry
                if checkout.status != CheckoutStatus.failed:
                    await checkout_service.handle_failure(
                        session, checkout, payment=None
                    )

                    log.info(
                        "paystack.webhook.charge.failed.checkout_reopened",
                        event_id=event_id,
                        reference=transaction_reference,
                        checkout_id=checkout_id,
                    )

            except Exception as e:
                log.error(
                    "paystack.webhook.charge.failed.error",
                    event_id=event_id,
                    reference=transaction_reference,
                    error=str(e),
                )
                if can_retry():
                    raise Retry() from e
                raise


@actor(
    actor_name="paystack.organization.create_subaccount",
    priority=TaskPriority.MEDIUM,
    max_retries=3,
    min_backoff=5000,
    max_backoff=300000,
)
async def create_organization_subaccount(organization_id: uuid.UUID) -> None:
    """
    Create Paystack subaccount for organization.

    This task is triggered when an organization is created.
    It creates a Paystack subaccount for automatic payment splitting.
    """
    from polar.organization.service import organization as organization_service

    async with AsyncSessionMaker() as session:
        log.info(
            "paystack.organization.create_subaccount.start",
            organization_id=organization_id,
        )

        try:
            # Get organization
            organization = await organization_service.get(
                session, auth_subject=None, id=organization_id
            )

            if not organization:
                log.error(
                    "paystack.organization.create_subaccount.not_found",
                    organization_id=organization_id,
                )
                return

            # Skip if subaccount already exists and is active
            if (
                organization.subaccount_code
                and organization.subaccount_status == "active"
            ):
                log.info(
                    "paystack.organization.create_subaccount.already_exists",
                    organization_id=organization_id,
                    subaccount_code=organization.subaccount_code,
                )
                return

            # Create subaccount
            await organization_service.create_organization_subaccount(
                session, organization
            )

            log.info(
                "paystack.organization.create_subaccount.success",
                organization_id=organization_id,
            )

        except Exception as e:
            log.error(
                "paystack.organization.create_subaccount.error",
                organization_id=organization_id,
                error=str(e),
            )
            if can_retry():
                raise Retry() from e
            raise

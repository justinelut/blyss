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

                # P3: For recurring products, persist the Paystack
                # authorization_code returned with this charge as a
                # PaymentMethod so the renewal worker can charge again
                # at the end of each period without re-prompting the
                # buyer. Linked to the Subscription via payment_method.
                payment_method = None
                if checkout.product and checkout.product.is_recurring:
                    auth = verified_transaction.get("authorization") or {}
                    auth_code = auth.get("authorization_code")
                    customer_id_meta = metadata.get("customer_id")
                    if auth_code and customer_id_meta:
                        from polar.models.payment_method import PaymentMethod
                        from polar.enums import PaymentProcessor as _Processor
                        from sqlalchemy import select

                        existing_q = await session.execute(
                            select(PaymentMethod).where(
                                PaymentMethod.processor == _Processor.paystack,
                                PaymentMethod.processor_id == auth_code,
                                PaymentMethod.customer_id
                                == uuid.UUID(customer_id_meta),
                            )
                        )
                        payment_method = existing_q.scalar_one_or_none()
                        if payment_method is None:
                            payment_method = PaymentMethod(
                                processor=_Processor.paystack,
                                processor_id=auth_code,
                                type=auth.get("channel", "card"),
                                customer_id=uuid.UUID(customer_id_meta),
                                method_metadata={
                                    "last4": auth.get("last4"),
                                    "exp_month": auth.get("exp_month"),
                                    "exp_year": auth.get("exp_year"),
                                    "card_type": auth.get("card_type"),
                                    "bank": auth.get("bank"),
                                    "channel": auth.get("channel"),
                                    "reusable": auth.get("reusable", False),
                                    "country_code": auth.get("country_code"),
                                    "fingerprint": auth.get("signature"),
                                },
                            )
                            session.add(payment_method)
                            await session.flush()

                # Unified order/subscription creation via handle_success.
                # handle_success branches internally on product.is_recurring,
                # creating Subscription + Order(billing_reason=subscription_create)
                # for recurring products and Order(billing_reason=purchase) for
                # one-time. Keeps trial-redemption + cart-cleanup + admin-notif
                # logic centralized — Paystack matches the Stripe webhook
                # path's behavior now.
                checkout = await checkout_service.handle_success(
                    session, checkout, payment=None, payment_method=payment_method
                )
                order = checkout.order
                if order is None:
                    log.error(
                        "paystack.webhook.charge.success.handle_success_no_order",
                        event_id=event_id,
                        reference=transaction_reference,
                        checkout_id=checkout_id,
                    )
                    return

                # Calculate and store platform fee for Paystack orders
                from polar.integrations.paystack.fee_calculator import (
                    calculate_platform_fee,
                )

                platform_fee_amount, creator_payout_amount = calculate_platform_fee(
                    order.total_amount, order.currency
                )

                order.platform_fee_amount = platform_fee_amount
                order.platform_fee_currency = order.currency
                order.creator_payout_amount = creator_payout_amount

                # Store Paystack transaction reference for back-compat
                order.stripe_invoice_id = transaction_reference
                await session.flush()

                log.info(
                    "paystack.webhook.charge.success.order_created",
                    event_id=event_id,
                    reference=transaction_reference,
                    checkout_id=checkout_id,
                    order_id=order.id,
                    is_recurring=checkout.product.is_recurring
                    if checkout.product
                    else False,
                    platform_fee_amount=platform_fee_amount,
                    creator_payout_amount=creator_payout_amount,
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

    This task is callable but is no longer triggered automatically on
    organization creation — Paystack rejects subaccount creation without
    settlement details, so we now create the subaccount lazily inside the
    M-Pesa / bank verification endpoints. This task remains in place for
    legacy retry flows that explicitly enqueue it.
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

            # Skip if the org has no settlement intent yet — without an
            # M-Pesa number or a linked payout account, Paystack will reject
            # subaccount creation. Wait until the creator supplies one.
            if (
                not organization.subaccount_code
                and not organization.mpesa_number
                and organization.account_id is None
            ):
                log.info(
                    "paystack.organization.create_subaccount.deferred_no_settlement_intent",
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

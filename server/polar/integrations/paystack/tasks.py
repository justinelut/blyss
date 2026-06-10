# Paystack webhook event handlers
import uuid
from typing import cast

import structlog
from dramatiq import Retry

from polar.checkout.repository import CheckoutRepository
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
from polar.order.repository import OrderRepository
from polar.order.service import order as order_service
from polar.worker import AsyncSessionMaker, TaskPriority, actor, can_retry, enqueue_job

log: Logger = structlog.get_logger()


async def _get_checkout_by_id(session, checkout_id: uuid.UUID):
    """Fetch a checkout by id for webhook processing.

    Unscoped (no auth_subject) with eager relationships loaded — the
    webhook runs as the system, not a user. CheckoutService.get() requires
    an AuthSubject and applies member-only scoping, and the service has no
    plain `get` method, so calling checkout_service.get(session, id) raised
    AttributeError("'CheckoutService' object has no attribute 'get'") and
    crashed every charge.success after payment, leaving the checkout stuck
    on 'confirmed' (the buyer saw 'processing your order' forever).
    """
    repository = CheckoutRepository.from_session(session)
    return await repository.get_by_id(
        checkout_id, options=repository.get_eager_options()
    )


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
                checkout = await _get_checkout_by_id(session, checkout_id)
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
                        transaction_reference, session=session
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

                # Extract metadata from the verified transaction.
                # Paystack echoes back whatever we set on /charge or
                # what Inline JS passed via PaystackPop.newTransaction's
                # `metadata` field.
                metadata = verified_transaction.get("metadata", {})

                # Route by purpose. Three flows share this single
                # webhook task — we dispatch on `metadata.purpose`
                # (set by the frontend when opening the Paystack pop)
                # OR fall back to legacy heuristics
                # (metadata.checkout_id present → checkout flow).
                purpose = metadata.get("purpose")

                if purpose == "donation" or metadata.get(
                    "donation_for_organization_id"
                ):
                    # New: donation/tipping finalization. Donor email
                    # + name + message arrive via metadata; the
                    # transaction.amount is the tip in kobo. The
                    # creator's organization_id is in
                    # `metadata.donation_for_organization_id`.
                    await _handle_donation_success(
                        session,
                        event_id=event_id,
                        verified_transaction=verified_transaction,
                        metadata=metadata,
                    )
                    return

                if purpose == "mpesa_verification" or metadata.get(
                    "mpesa_verification_organization_id"
                ):
                    # New: M-Pesa subaccount verification. The creator
                    # paid KSh 100 via the Paystack pop on their own
                    # M-Pesa number — extract the phone from the
                    # charge.success payload (Paystack returns it on
                    # data.authorization.mobile_number /
                    # data.customer.phone) and provision the
                    # subaccount with that phone. Means we never have
                    # to ask the creator to type their phone in our
                    # form, AND we never call /charge ourselves.
                    await _handle_mpesa_verification_success(
                        session,
                        event_id=event_id,
                        verified_transaction=verified_transaction,
                        metadata=metadata,
                    )
                    return

                # Default: legacy checkout flow (P1 wiring).
                # `metadata.checkout_id` was set by the prior /charge
                # API path AND by the new Mode A inline-js popup.
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
                checkout = await _get_checkout_by_id(session, checkout_id)
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
                # (idempotency for webhook retries / duplicate events).
                # checkout.order is lazy='raise' — fetch explicitly.
                order_repository = OrderRepository.from_session(session)
                existing_order = await order_repository.get_earliest_by_checkout_id(
                    checkout.id
                )
                if existing_order is not None:
                    log.info(
                        "paystack.webhook.charge.success.order_exists",
                        event_id=event_id,
                        reference=transaction_reference,
                        checkout_id=checkout_id,
                        order_id=existing_order.id,
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
                # handle_success creates the Order but does NOT populate the
                # checkout.order relationship (it's lazy='raise', so reading
                # checkout.order throws "'Checkout' object has no attribute
                # 'order'" and crashed the webhook here — order created, but
                # the task failed before flipping status, so the buyer was
                # stuck on 'processing'). Fetch the order explicitly by
                # checkout id instead.
                order_repository = OrderRepository.from_session(session)
                order = await order_repository.get_earliest_by_checkout_id(
                    checkout.id
                )
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
                checkout = await _get_checkout_by_id(session, checkout_id)
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



# ── Donation finalization ────────────────────────────────────────────


async def _handle_donation_success(
    session,
    *,
    event_id: uuid.UUID,
    verified_transaction: dict,
    metadata: dict,
) -> None:
    """Record a successful donation tip from a Paystack popup charge.

    The donor opened the donation popup (DonationPaymentInterface),
    Paystack collected the actual payment (card or M-Pesa STK), the
    charge.success webhook now lands here. We persist a Donation row
    and surface it on the creator's dashboard.

    Metadata expected (set by the popup config in the frontend):
      - donation_for_organization_id: UUID of the creator's org
      - donor_name: optional friendly name
      - donor_message: optional message shown to the creator
      - donor_email: same as transaction.email — kept for clarity

    Idempotent: if the Donation row already exists for this Paystack
    reference, no-op + return. Webhooks can fire twice (Paystack
    retries) and we mustn't double-count.
    """
    from polar.donation.repository import DonationRepository
    from polar.models.donation import Donation
    from polar.organization.repository import OrganizationRepository

    reference = verified_transaction.get("reference") or ""
    org_id_str = metadata.get(
        "donation_for_organization_id"
    ) or metadata.get("organization_id")

    if not org_id_str:
        log.error(
            "paystack.webhook.donation.missing_organization_id",
            event_id=event_id,
            reference=reference,
        )
        return

    try:
        org_id = uuid.UUID(str(org_id_str))
    except (ValueError, TypeError):
        log.error(
            "paystack.webhook.donation.invalid_organization_id",
            event_id=event_id,
            reference=reference,
            organization_id=org_id_str,
        )
        return

    org_repo = OrganizationRepository.from_session(session)
    organization = await org_repo.get_by_id(org_id)
    if organization is None:
        log.error(
            "paystack.webhook.donation.organization_not_found",
            event_id=event_id,
            reference=reference,
            organization_id=str(org_id),
        )
        return

    donation_repo = DonationRepository.from_session(session)
    # Idempotency: Paystack retries webhooks, so skip if we already
    # recorded this reference.
    existing = await donation_repo.get_by_payment_reference(reference)

    if existing is not None:
        log.info(
            "paystack.webhook.donation.already_recorded",
            event_id=event_id,
            reference=reference,
            donation_id=str(existing.id),
        )
        return

    amount = int(verified_transaction.get("amount", 0))
    currency = (verified_transaction.get("currency") or "KES").upper()
    donor_email = (
        metadata.get("donor_email")
        or verified_transaction.get("customer", {}).get("email")
        or ""
    )
    donor_name = metadata.get("donor_name") or "Anonymous"
    donor_message = metadata.get("donor_message") or None

    donation = Donation(
        organization_id=organization.id,
        amount=amount,
        currency=currency,
        donor_email=donor_email,
        donor_name=donor_name,
        message=donor_message,
        payment_reference=reference,
        payment_status="succeeded",
    )
    session.add(donation)
    await session.flush()

    # Notify the creator + thank the donor (best-effort; never block the
    # webhook on email delivery).
    try:
        enqueue_job(
            "donation.notify",
            donation_id=donation.id,
        )
    except Exception as e:  # noqa: BLE001
        log.warning(
            "paystack.webhook.donation.notify_enqueue_failed",
            event_id=event_id,
            reference=reference,
            error=str(e),
        )

    log.info(
        "paystack.webhook.donation.recorded",
        event_id=event_id,
        reference=reference,
        donation_id=str(donation.id),
        organization_id=str(organization.id),
        amount=amount,
    )


# ── M-Pesa verification finalization ─────────────────────────────────


def _extract_phone_from_payload(verified_transaction: dict) -> str | None:
    """Try every known location Paystack exposes the phone number.

    Different channels populate different fields:
      - mobile_money charges → data.authorization.mobile_number
      - bank_transfer        → data.authorization.account_number (not phone)
      - data.customer.phone  → set when the customer profile has one
      - data.metadata.phone  → if the popup metadata supplied it (rare;
                               we don't use this path)
    """
    auth = verified_transaction.get("authorization") or {}
    mobile = auth.get("mobile_number")
    if mobile:
        return mobile
    customer = verified_transaction.get("customer") or {}
    phone = customer.get("phone")
    if phone:
        return phone
    metadata = verified_transaction.get("metadata") or {}
    return metadata.get("phone")


async def _handle_mpesa_verification_success(
    session,
    *,
    event_id: uuid.UUID,
    verified_transaction: dict,
    metadata: dict,
) -> None:
    """Provision a Paystack subaccount from the M-Pesa verification charge.

    Flow: creator hits "Verify M-Pesa" → frontend opens Paystack pop
    with metadata.purpose='mpesa_verification' + organization_id.
    Creator enters their M-Pesa number IN PAYSTACK'S POPUP, completes
    the KSh 100 STK push. Paystack fires charge.success with the
    actual phone number that was charged (proof of ownership).

    We extract that phone here, create the subaccount with it, and
    mark the org's M-Pesa as verified. We never call /charge ourselves.

    Idempotent: if the org already has a real (non-test) subaccount
    code, no-op. Webhook retries are safe.
    """
    from polar.organization.repository import OrganizationRepository

    reference = verified_transaction.get("reference") or ""
    org_id_str = metadata.get(
        "mpesa_verification_organization_id"
    ) or metadata.get("organization_id")

    if not org_id_str:
        log.error(
            "paystack.webhook.mpesa_verification.missing_organization_id",
            event_id=event_id,
            reference=reference,
        )
        return

    try:
        org_id = uuid.UUID(str(org_id_str))
    except (ValueError, TypeError):
        log.error(
            "paystack.webhook.mpesa_verification.invalid_organization_id",
            event_id=event_id,
            reference=reference,
            organization_id=org_id_str,
        )
        return

    org_repo = OrganizationRepository.from_session(session)
    organization = await org_repo.get_by_id(org_id)
    if organization is None:
        log.error(
            "paystack.webhook.mpesa_verification.organization_not_found",
            event_id=event_id,
            reference=reference,
            organization_id=str(org_id),
        )
        return

    # Idempotency check — already verified
    if (
        organization.subaccount_code
        and not organization.subaccount_code.startswith("ACCT_test_")
        and organization.mpesa_verified
    ):
        log.info(
            "paystack.webhook.mpesa_verification.already_provisioned",
            event_id=event_id,
            reference=reference,
            organization_id=str(org_id),
            subaccount_code=organization.subaccount_code,
        )
        return

    # Resolve the M-Pesa number to provision the subaccount with.
    # Priority:
    #   1. The number Paystack actually charged (proof of ownership) —
    #      data.authorization.mobile_number / data.customer.phone. This is
    #      the strongest signal but isn't always populated (notably in test
    #      mode, and some live channels).
    #   2. The number the creator entered in the dashboard form, passed
    #      through the popup metadata as `mpesa_number`. Since the KSh-1
    #      charge succeeded, we trust this as the payout number.
    phone = _extract_phone_from_payload(verified_transaction)
    phone_source = "payload"
    if not phone:
        meta_number = (metadata or {}).get("mpesa_number")
        if meta_number and str(meta_number).strip():
            phone = str(meta_number).strip()
            phone_source = "metadata"
    if not phone:
        log.error(
            "paystack.webhook.mpesa_verification.no_phone_in_payload",
            event_id=event_id,
            reference=reference,
            organization_id=str(org_id),
        )
        return
    log.info(
        "paystack.webhook.mpesa_verification.phone_resolved",
        event_id=event_id,
        reference=reference,
        organization_id=str(org_id),
        phone_source=phone_source,
    )

    # Reuse the subaccount creation path that the legacy
    # finalize-verification endpoint uses. The endpoint module's
    # helper takes (organization, mpesa_number, session) and handles
    # the Kenya-local-format conversion + immutable-account-number
    # rules. We import it lazily to avoid module-load cycles.
    from polar.integrations.paystack.endpoints import (
        _create_or_reactivate_mpesa_subaccount,
    )

    try:
        await _create_or_reactivate_mpesa_subaccount(
            session=session,
            organization=organization,
            mpesa_number=phone,
        )
    except Exception as e:
        log.error(
            "paystack.webhook.mpesa_verification.provision_failed",
            event_id=event_id,
            reference=reference,
            organization_id=str(org_id),
            error=str(e),
        )
        if can_retry():
            raise Retry() from e
        return

    log.info(
        "paystack.webhook.mpesa_verification.provisioned",
        event_id=event_id,
        reference=reference,
        organization_id=str(org_id),
        phone=phone,
    )


@actor(
    actor_name="paystack.webhook.refund.processed",
    priority=TaskPriority.LOW,
    max_retries=3,
)
async def refund_processed(event_id: uuid.UUID) -> None:
    """Reconcile an order when Paystack confirms a refund.

    Paystack fires `refund.processed` (and `refund.failed`) after a refund
    is created. We mark the order refunded/partially_refunded based on the
    cumulative refunded amount. The refund may have been initiated from our
    dashboard (which already optimistically updated the order) or directly
    in Paystack's dashboard — this handler makes the order consistent
    either way. Idempotent: re-applying the same refunded total is a no-op.
    """
    async with AsyncSessionMaker() as session:
        async with external_event_service.handle_paystack(session, event_id) as event:
            event_data = cast(PaystackEvent, event).paystack_data
            data = event_data.get("data", {})
            # Paystack nests the original transaction under data.transaction.
            transaction = data.get("transaction") or {}
            transaction_reference = (
                transaction.get("reference")
                or data.get("transaction_reference")
                or transaction.get("reference")
            )
            if not transaction_reference:
                log.error(
                    "paystack.webhook.refund.processed.missing_reference",
                    event_id=event_id,
                )
                return

            from sqlalchemy import select

            from polar.models import Order
            from polar.models.order import OrderStatus

            # The order stores the original transaction reference in
            # stripe_invoice_id (back-compat column).
            result = await session.execute(
                select(Order).where(
                    Order.stripe_invoice_id == transaction_reference
                )
            )
            order = result.scalar_one_or_none()
            if order is None:
                log.warning(
                    "paystack.webhook.refund.processed.order_not_found",
                    event_id=event_id,
                    reference=transaction_reference,
                )
                return

            refunded_amount = int(data.get("amount", 0) or 0)
            # Use the larger of our optimistic value and Paystack's, so a
            # dashboard-initiated refund (already applied) isn't reduced.
            new_refunded = max(order.refunded_amount or 0, refunded_amount)
            order.refunded_amount = new_refunded
            order.status = (
                OrderStatus.refunded
                if new_refunded >= order.total_amount
                else OrderStatus.partially_refunded
            )
            session.add(order)
            await session.flush()

            log.info(
                "paystack.webhook.refund.processed.reconciled",
                event_id=event_id,
                reference=transaction_reference,
                order_id=str(order.id),
                refunded_amount=new_refunded,
                status=order.status,
            )

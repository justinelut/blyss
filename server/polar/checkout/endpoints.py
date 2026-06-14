from typing import Annotated, List

import secrets

import structlog
from fastapi import Depends, Path, Query, Request
from pydantic import UUID4
from sse_starlette.sse import EventSourceResponse

from polar.customer.schemas.customer import CustomerID, ExternalCustomerID
from polar.eventstream.endpoints import subscribe
from polar.eventstream.service import Receivers
from polar.exceptions import PaymentNotReady, ResourceNotFound
from polar.kit.pagination import ListResource, PaginationParamsQuery
from polar.kit.schemas import (
    MultipleQueryFilter,
    SetSchemaReference,
)
from polar.models import Checkout
from polar.models.checkout import CheckoutStatus
from polar.openapi import APITag
from polar.organization.schemas import OrganizationID
from polar.postgres import (
    AsyncReadSession,
    AsyncSession,
    get_db_read_session,
    get_db_session,
)
from polar.product.schemas import ProductID
from polar.redis import Redis, get_redis
from polar.routing import APIRouter

from . import auth, ip_geolocation, sorting
from .schemas import Checkout as CheckoutSchema
from .schemas import (
    CheckoutConfirm,
    CheckoutCreate,
    CheckoutOpened,
    CheckoutPublic,
    CheckoutPublicConfirmed,
    CheckoutUpdate,
    CheckoutUpdatePublic,
)
from .service import (
    AlreadyActiveSubscriptionError,
    ExpiredCheckoutError,
    NotOpenCheckout,
    PaymentError,
    TrialAlreadyRedeemed,
)
from .service import checkout as checkout_service

inner_router = APIRouter(tags=["checkouts", APITag.public])

log = structlog.get_logger()


CheckoutID = Annotated[UUID4, Path(description="The checkout session ID.")]
CheckoutClientSecret = Annotated[
    str, Path(description="The checkout session client secret.")
]
CheckoutNotFound = {
    "description": "Checkout session not found.",
    "model": ResourceNotFound.schema(),
}
CheckoutExpired = {
    "description": "The checkout session is expired.",
    "model": ExpiredCheckoutError.schema(),
}
CheckoutPaymentError = {
    "description": "The payment failed.",
    "model": PaymentError.schema(),
}
CheckoutForbiddenError = {
    "description": "The checkout is expired, the customer already has an active subscription, or the organization is not ready to accept payments.",
    "model": Annotated[
        AlreadyActiveSubscriptionError.schema()
        | NotOpenCheckout.schema()
        | PaymentNotReady.schema()
        | TrialAlreadyRedeemed.schema(),
        SetSchemaReference("CheckoutForbiddenError"),
    ],
}


@inner_router.get(
    "/", summary="List Checkout Sessions", response_model=ListResource[CheckoutSchema]
)
async def list(
    auth_subject: auth.CheckoutRead,
    pagination: PaginationParamsQuery,
    sorting: sorting.ListSorting,
    organization_id: MultipleQueryFilter[OrganizationID] | None = Query(
        None, title="OrganizationID Filter", description="Filter by organization ID."
    ),
    product_id: MultipleQueryFilter[ProductID] | None = Query(
        None, title="ProductID Filter", description="Filter by product ID."
    ),
    customer_id: MultipleQueryFilter[CustomerID] | None = Query(
        None, title="CustomerID Filter", description="Filter by customer ID."
    ),
    external_customer_id: MultipleQueryFilter[ExternalCustomerID] | None = Query(
        None,
        title="ExternalCustomerID Filter",
        description="Filter by customer external ID.",
    ),
    status: MultipleQueryFilter[CheckoutStatus] | None = Query(
        None,
        title="Status Filter",
        description="Filter by checkout session status.",
    ),
    query: str | None = Query(None, description="Filter by customer email."),
    session: AsyncReadSession = Depends(get_db_read_session),
) -> ListResource[CheckoutSchema]:
    """List checkout sessions."""
    results, count = await checkout_service.list(
        session,
        auth_subject,
        organization_id=organization_id,
        product_id=product_id,
        customer_id=customer_id,
        external_customer_id=external_customer_id,
        status=status,
        query=query,
        pagination=pagination,
        sorting=sorting,
    )

    return ListResource.from_paginated_results(
        [CheckoutSchema.model_validate(result) for result in results],
        count,
        pagination,
    )


@inner_router.get(
    "/{id}",
    summary="Get Checkout Session",
    response_model=CheckoutSchema,
    responses={404: CheckoutNotFound},
)
async def get(
    id: CheckoutID,
    auth_subject: auth.CheckoutRead,
    session: AsyncReadSession = Depends(get_db_read_session),
) -> Checkout:
    """Get a checkout session by ID."""
    checkout = await checkout_service.get_by_id(session, auth_subject, id)

    if checkout is None:
        raise ResourceNotFound()

    return checkout


@inner_router.post(
    "/",
    response_model=CheckoutSchema,
    status_code=201,
    summary="Create Checkout Session",
    responses={201: {"description": "Checkout session created."}},
)
async def create(
    checkout_create: CheckoutCreate,
    auth_subject: auth.CheckoutWrite,
    ip_geolocation_client: ip_geolocation.IPGeolocationClient,
    session: AsyncSession = Depends(get_db_session),
) -> Checkout:
    """Create a checkout session."""
    return await checkout_service.create(
        session, checkout_create, auth_subject, ip_geolocation_client
    )


@inner_router.patch(
    "/{id}",
    response_model=CheckoutSchema,
    summary="Update Checkout Session",
    responses={
        200: {"description": "Checkout session updated."},
        404: CheckoutNotFound,
        403: CheckoutForbiddenError,
    },
)
async def update(
    id: CheckoutID,
    checkout_update: CheckoutUpdate,
    auth_subject: auth.CheckoutWrite,
    ip_geolocation_client: ip_geolocation.IPGeolocationClient,
    session: AsyncSession = Depends(get_db_session),
) -> Checkout:
    """Update a checkout session."""
    checkout = await checkout_service.get_by_id(session, auth_subject, id)

    if checkout is None:
        raise ResourceNotFound()

    return await checkout_service.update(
        session, checkout, checkout_update, ip_geolocation_client
    )


@inner_router.get(
    "/client/{client_secret}",
    summary="Get Checkout Session from Client",
    response_model=CheckoutPublic,
    responses={404: CheckoutNotFound, 410: CheckoutExpired},
)
async def client_get(
    client_secret: CheckoutClientSecret,
    session: AsyncSession = Depends(get_db_session),
) -> Checkout:
    """Get a checkout session by client secret.

    Includes a self-heal reconciliation pass for Paystack checkouts
    stuck at status='confirmed': if the Paystack charge has been
    confirmed on their side but our webhook hasn't processed
    charge.success yet (signature verify failure, network blip,
    Paystack retry queue), call /transaction/verify here and fire
    handle_success if successful. Without this, the confirmation
    page polls forever showing 'Processing your order' until the
    webhook eventually goes through.
    """
    checkout = await checkout_service.get_by_client_secret(session, client_secret)

    # Self-heal: confirmed paystack checkout with a charge_reference,
    # check Paystack live and finalize if charge succeeded.
    meta = checkout.payment_processor_metadata or {}
    reference = meta.get("charge_reference")
    if (
        checkout.status == CheckoutStatus.confirmed
        and checkout.payment_processor == "paystack"
        and reference
    ):
        try:
            from polar.integrations.paystack.service import (
                paystack as paystack_service,
            )

            tx = await paystack_service.verify_transaction(
                reference, session=session
            )
            if tx.get("status") == "success":
                payment_method = None
                if (
                    checkout.product is not None
                    and checkout.product.is_recurring
                    and checkout.customer is not None
                ):
                    auth = tx.get("authorization") or {}
                    auth_code = auth.get("authorization_code")
                    if auth_code:
                        from polar.models.payment_method import PaymentMethod
                        from polar.enums import PaymentProcessor as _Processor
                        from sqlalchemy import select

                        existing_q = await session.execute(
                            select(PaymentMethod).where(
                                PaymentMethod.processor == _Processor.paystack,
                                PaymentMethod.processor_id == auth_code,
                                PaymentMethod.customer_id == checkout.customer.id,
                            )
                        )
                        payment_method = existing_q.scalar_one_or_none()
                        if payment_method is None:
                            payment_method = PaymentMethod(
                                processor=_Processor.paystack,
                                processor_id=auth_code,
                                type=auth.get("channel", "card"),
                                customer_id=checkout.customer.id,
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

                checkout = await checkout_service.handle_success(
                    session,
                    checkout,
                    payment=None,
                    payment_method=payment_method,
                )
                log.info(
                    "checkout.client_get.self_heal.succeeded",
                    checkout_id=str(checkout.id),
                    reference=reference,
                )
        except Exception as e:
            # Don't break the GET — confirmation page can keep polling.
            log.warning(
                "checkout.client_get.self_heal.failed",
                checkout_id=str(checkout.id),
                reference=reference,
                error=str(e),
            )

    return checkout


@inner_router.patch(
    "/client/{client_secret}",
    response_model=CheckoutPublic,
    summary="Update Checkout Session from Client",
    responses={
        200: {"description": "Checkout session updated."},
        404: CheckoutNotFound,
        403: CheckoutForbiddenError,
        410: CheckoutExpired,
    },
)
async def client_update(
    client_secret: CheckoutClientSecret,
    checkout_update: CheckoutUpdatePublic,
    ip_geolocation_client: ip_geolocation.IPGeolocationClient,
    session: AsyncSession = Depends(get_db_session),
) -> Checkout:
    """Update a checkout session by client secret."""
    checkout = await checkout_service.get_by_client_secret(session, client_secret)

    return await checkout_service.update(
        session, checkout, checkout_update, ip_geolocation_client
    )


@inner_router.post(
    "/client/{client_secret}/abandon",
    response_model=CheckoutPublic,
    summary="Abandon Checkout (popup closed before payment)",
    responses={
        200: {
            "description": (
                "Checkout reset to open state so the buyer can retry. "
                "No-ops on already-open / already-succeeded checkouts."
            )
        },
        404: CheckoutNotFound,
        410: CheckoutExpired,
    },
)
async def client_abandon(
    client_secret: CheckoutClientSecret,
    session: AsyncSession = Depends(get_db_session),
) -> Checkout:
    """Reset a confirmed-but-uncharged checkout back to `open` state.

    Why this exists: the Paystack popup flow opens AFTER the buyer has
    already hit /confirm, which locks the checkout to `confirmed` and
    redirects the page to /checkout/{secret}/confirmation. If the buyer
    closes the popup without paying, the popup's onCancel hook fires
    in the browser but the page has already moved on — leaving them
    stuck on the "Processing your order" polling screen forever.

    Frontend calls this from onCancel to flip status back to `open`,
    then bounces the buyer to /checkout/{secret} where they can retry.

    Idempotent: if the checkout is already open, succeeded, failed, or
    expired we return as-is without touching it. Only `confirmed`
    checkouts that haven't yet had a successful charge fire are
    reverted. We also clear any stamped charge_reference so a retry
    generates a fresh one.

    Public — no auth needed beyond the unguessable client_secret. The
    only state change is checkout.status, and reverting `confirmed` →
    `open` cannot be exploited (it just unlocks the same checkout for
    another payment attempt).
    """
    checkout = await checkout_service.get_by_client_secret(session, client_secret)

    # No-op for any non-confirmed state. Idempotent — safe to call
    # multiple times from a flaky onCancel handler.
    if checkout.status != CheckoutStatus.confirmed:
        return checkout

    # Defensive: if a charge actually went through and the webhook is
    # mid-flight (or the self-heal in client_get is about to land it),
    # don't blow away the confirmed state. The reference is stamped on
    # /confirm before the popup opens, so its presence alone doesn't
    # imply payment — only a charge_status of 'success' does. If the
    # status was anything other than success / pending the buyer
    # genuinely abandoned and we can revert.
    meta = checkout.payment_processor_metadata or {}
    charge_status = meta.get("charge_status")
    if charge_status == "success":
        return checkout

    # Reuse the existing handle_failure path so any side effects
    # (Discount Redemption release, _after_checkout_updated hooks)
    # fire identically to the post-failure recovery flow.
    return await checkout_service.handle_failure(session, checkout)


@inner_router.post(
    "/client/{client_secret}/confirm",
    response_model=CheckoutPublicConfirmed,
    summary="Confirm Checkout Session from Client",
    responses={
        200: {"description": "Checkout session confirmed."},
        400: CheckoutPaymentError,
        404: CheckoutNotFound,
        403: CheckoutForbiddenError,
        410: CheckoutExpired,
    },
)
async def client_confirm(
    client_secret: CheckoutClientSecret,
    checkout_confirm: CheckoutConfirm,
    auth_subject: auth.CheckoutWeb,
    session: AsyncSession = Depends(get_db_session),
) -> Checkout:
    """
    Confirm a checkout session by client secret.

    Orders and subscriptions will be processed.
    """
    checkout = await checkout_service.get_by_client_secret(session, client_secret)

    return await checkout_service.confirm(
        session, auth_subject, checkout, checkout_confirm
    )


@inner_router.post(
    "/client/{client_secret}/opened",
    response_model=CheckoutPublic,
    summary="Mark Checkout Session as Opened",
    responses={
        200: {"description": "Checkout session marked as opened."},
        404: CheckoutNotFound,
        410: CheckoutExpired,
    },
    tags=[APITag.private],
    include_in_schema=False,
)
async def client_opened(
    client_secret: CheckoutClientSecret,
    checkout_opened: CheckoutOpened,
    session: AsyncSession = Depends(get_db_session),
) -> Checkout:
    """
    Mark a checkout session as opened by client for analytics/experiment purposes.
    """
    checkout = await checkout_service.get_by_client_secret(session, client_secret)
    return await checkout_service.mark_opened(
        session, checkout, checkout_opened.distinct_id
    )


@inner_router.get("/client/{client_secret}/stream", include_in_schema=False)
async def client_stream(
    request: Request,
    client_secret: CheckoutClientSecret,
    session: AsyncSession = Depends(get_db_session),
    redis: Redis = Depends(get_redis),
) -> EventSourceResponse:
    checkout = await checkout_service.get_by_client_secret(session, client_secret)

    receivers = Receivers(checkout_client_secret=checkout.client_secret)
    return EventSourceResponse(subscribe(redis, receivers.get_channels(), request))


# --- Inline Paystack Charge Endpoints ---

from polar.integrations.paystack.service import paystack as paystack_service

from .payment_channels import get_channels_for_currency
from .schemas import (
    CheckoutChargeRequest,
    CheckoutChargeResponse,
    CheckoutChargeStepSubmitRequest,
    CheckoutPaymentChannel,
    CheckoutPaymentStatus,
)


@inner_router.get(
    "/client/{client_secret}/payment-channels",
    summary="Get Payment Channels",
    response_model=List[CheckoutPaymentChannel],
    responses={404: CheckoutNotFound, 410: CheckoutExpired},
)
async def client_payment_channels(
    client_secret: CheckoutClientSecret,
    session: AsyncSession = Depends(get_db_session),
) -> List[CheckoutPaymentChannel]:
    """Get available payment channels for a checkout session."""
    checkout = await checkout_service.get_by_client_secret(session, client_secret)
    return get_channels_for_currency(checkout.currency or "USD")


@inner_router.post(
    "/client/{client_secret}/charge",
    summary="Initiate Charge",
    response_model=CheckoutChargeResponse,
    responses={404: CheckoutNotFound, 410: CheckoutExpired},
)
async def client_charge(
    client_secret: CheckoutClientSecret,
    body: CheckoutChargeRequest,
    session: AsyncSession = Depends(get_db_session),
) -> CheckoutChargeResponse:
    """Initiate a Paystack charge for the checkout session."""
    checkout = await checkout_service.get_by_client_secret(session, client_secret)
    email = checkout.customer_email or "customer@checkout.blyss.africa"
    amount = checkout.total_amount

    # Guard: creator must have an active Paystack subaccount before
    # we can route money to them via split payments. Mirrors the
    # check in checkout_service._confirm_inner for the hosted-page
    # flow. Without this, /charge would either silently send funds
    # to the platform account (not the creator) or hit obscure
    # Paystack errors. The creator-side dashboard has the canonical
    # banner explaining what action is needed; this branch only
    # ever fires if the buyer cached an old checkout link.
    org = checkout.organization
    if (
        checkout.payment_processor == "paystack"
        and org.subaccount_status != "active"
    ):
        raise PaymentNotReady("This item is currently unavailable. Please try again later.")

    # Build Paystack /charge payload
    # Pre-generate a Blyss-branded reference so the customer-facing
    # receipt number reads 'blyss_…' instead of Paystack's auto-
    # generated 'momo_…' (which leaks the channel + isn't branded).
    # 8 hex chars from the checkout id + 8 random urlsafe chars keeps
    # it short, unique, and easy for support to grep against the
    # checkout row in the DB.
    reference = f"blyss_{checkout.id.hex[:8]}_{secrets.token_urlsafe(8)}"
    payload: dict = {
        "email": email,
        "amount": amount,
        # Paystack returns the misleading 'Invalid provider' error when
        # currency is lowercase. Verified live 2026-06-08:
        #   currency='KES' → accepted
        #   currency='kes' → 'Invalid provider' (lies — not a provider issue)
        # Polar's settings.DEFAULT_CURRENCY is 'kes' lowercase so checkout
        # rows inherit that. Always uppercase before sending to Paystack.
        "currency": (checkout.currency or "KES").upper(),
        "reference": reference,
    }

    # Split payment via subaccount: the creator's funds land in
    # their Paystack subaccount, Blyss platform fee stays in the
    # main account. Mirrors the hosted-page initialize_transaction
    # path which has been doing this since launch.
    if org.subaccount_code:
        payload["subaccount"] = org.subaccount_code

    ch = body.channel
    if ch == "card":
        payload["card"] = {
            "number": body.card_number,
            "cvv": body.cvv,
            "expiry_month": body.expiry_month,
            "expiry_year": body.expiry_year,
        }
        if body.pin:
            payload["pin"] = body.pin
    elif ch == "mobile_money":
        payload["mobile_money"] = {
            "phone": body.phone,
            "provider": body.provider or "mpesa",
        }
    elif ch == "bank":
        payload["bank"] = {
            "code": body.bank_code,
            "account_number": body.bank_account_number,
        }
    elif ch == "bank_transfer":
        payload["bank_transfer"] = {"account_expires_at": body.account_expires_at}
    elif ch == "ussd":
        payload["ussd"] = {"type": body.ussd_type}
    elif ch == "qr":
        payload["qr"] = {"provider": body.qr_provider}
    elif ch == "eft":
        payload["eft"] = {"provider": body.eft_provider}

    result = await paystack_service.charge(payload, session=session)
    meta = dict(checkout.payment_processor_metadata or {})
    meta["charge_reference"] = result["reference"]
    meta["charge_status"] = result["status"]
    checkout.payment_processor_metadata = meta
    session.add(checkout)
    await session.commit()

    raw = result.get("raw", {})
    return CheckoutChargeResponse(
        reference=result["reference"],
        status=result["status"],
        display_text=result.get("display_text"),
        ussd_code=raw.get("ussd_code"),
        qr_code=raw.get("qr_code"),
        qr_image_url=raw.get("qr_image_url"),
        account_number=raw.get("account_number"),
        account_name=raw.get("account_name"),
        bank_name=raw.get("bank_name"),
        account_expires_at=raw.get("account_expires_at"),
        redirect_url=raw.get("redirect_url"),
    )


@inner_router.post(
    "/client/{client_secret}/charge/submit/{action}",
    summary="Submit Charge Step",
    response_model=CheckoutChargeResponse,
    responses={404: CheckoutNotFound, 410: CheckoutExpired},
)
async def client_charge_submit(
    client_secret: CheckoutClientSecret,
    action: str,
    body: CheckoutChargeStepSubmitRequest,
    session: AsyncSession = Depends(get_db_session),
) -> CheckoutChargeResponse:
    """Submit an OTP/PIN/phone/birthday for a pending charge."""
    if action not in ("otp", "pin", "phone", "birthday"):
        raise ResourceNotFound()

    checkout = await checkout_service.get_by_client_secret(session, client_secret)
    meta = checkout.payment_processor_metadata or {}
    reference = meta.get("charge_reference")
    if not reference:
        raise ResourceNotFound()

    result = await paystack_service.submit_charge_step(action, reference, body.value, session=session)

    # Update metadata
    meta = dict(meta)
    meta["charge_status"] = result["status"]
    checkout.payment_processor_metadata = meta
    session.add(checkout)
    await session.commit()

    raw = result.get("raw", {})
    return CheckoutChargeResponse(
        reference=result["reference"],
        status=result["status"],
        display_text=result.get("display_text"),
        ussd_code=raw.get("ussd_code"),
        qr_code=raw.get("qr_code"),
        qr_image_url=raw.get("qr_image_url"),
        account_number=raw.get("account_number"),
        account_name=raw.get("account_name"),
        bank_name=raw.get("bank_name"),
        account_expires_at=raw.get("account_expires_at"),
        redirect_url=raw.get("redirect_url"),
    )


@inner_router.get(
    "/client/{client_secret}/payment-status",
    summary="Get Payment Status",
    response_model=CheckoutPaymentStatus,
    responses={404: CheckoutNotFound, 410: CheckoutExpired},
)
async def client_payment_status(
    client_secret: CheckoutClientSecret,
    session: AsyncSession = Depends(get_db_session),
) -> CheckoutPaymentStatus:
    """Check the current payment status of a checkout's charge.

    On the FIRST observation of `status='success'` we also fire the
    Order-creation pipeline (handle_success) — Polar upstream relied on
    a Stripe webhook for this, but the inline Paystack STK push flow
    has no webhook in the loop. Without firing handle_success here,
    the buyer's payment succeeds, the success page renders, but no
    Order row, no benefit grants, no /portal/orders entry, and no
    download link. handle_success is idempotent — it guards on
    checkout.status != confirmed so retries / poll-races are safe.
    """
    checkout = await checkout_service.get_by_client_secret(session, client_secret)
    meta = checkout.payment_processor_metadata or {}
    reference = meta.get("charge_reference")
    if not reference:
        return CheckoutPaymentStatus(
            status="pending", message="No charge initiated yet."
        )

    async def _fire_handle_success(verified_tx: dict | None = None) -> None:
        # Only run once per checkout. handle_success itself raises
        # NotConfirmedCheckout when the checkout isn't in 'confirmed'
        # state. We explicitly transition open → confirmed here so the
        # call lands cleanly. Wrapped in try so a transient
        # post-success failure (DB hiccup, benefit-grant queue full)
        # doesn't fail the status poll the buyer is watching.
        try:
            from polar.models.checkout import CheckoutStatus

            if checkout.status == CheckoutStatus.confirmed:
                return  # already processed
            if checkout.status == CheckoutStatus.open:
                checkout.status = CheckoutStatus.confirmed
                session.add(checkout)
                await session.flush()

            # P3: For recurring products, persist the Paystack
            # authorization_code as a PaymentMethod so the renewal
            # worker can charge again later via charge_authorization.
            payment_method = None
            if (
                verified_tx
                and checkout.product is not None
                and checkout.product.is_recurring
                and checkout.customer is not None
            ):
                auth = verified_tx.get("authorization") or {}
                auth_code = auth.get("authorization_code")
                if auth_code:
                    from polar.models.payment_method import PaymentMethod
                    from polar.enums import PaymentProcessor as _Processor
                    from sqlalchemy import select

                    existing_q = await session.execute(
                        select(PaymentMethod).where(
                            PaymentMethod.processor == _Processor.paystack,
                            PaymentMethod.processor_id == auth_code,
                            PaymentMethod.customer_id == checkout.customer.id,
                        )
                    )
                    payment_method = existing_q.scalar_one_or_none()
                    if payment_method is None:
                        payment_method = PaymentMethod(
                            processor=_Processor.paystack,
                            processor_id=auth_code,
                            type=auth.get("channel", "card"),
                            customer_id=checkout.customer.id,
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

            await checkout_service.handle_success(
                session, checkout, payment=None, payment_method=payment_method
            )
        except Exception as e:
            log.error(
                "checkout.payment_status.handle_success_failed",
                checkout_id=str(checkout.id),
                reference=reference,
                error=str(e),
            )

    # Try verify_transaction first
    try:
        tx = await paystack_service.verify_transaction(reference, session=session)
        tx_status = tx.get("status")
        if tx_status == "success":
            await _fire_handle_success(verified_tx=tx)
            return CheckoutPaymentStatus(status="success", message="Payment successful.")
        if tx_status == "failed":
            return CheckoutPaymentStatus(
                status="failed",
                message=tx.get("gateway_response", "Payment failed."),
            )
    except Exception:
        pass

    # If still pending, check /charge/{reference} for next-action info
    try:
        pending = await paystack_service.check_pending_charge(reference, session=session)
        p_status = pending.get("status")
        if p_status == "success":
            await _fire_handle_success(verified_tx=pending)
            return CheckoutPaymentStatus(status="success", message="Payment successful.")
        if p_status in ("send_otp", "send_pin", "send_phone", "send_birthday"):
            action = p_status.replace("send_", "")
            return CheckoutPaymentStatus(
                status="requires_action",
                message=pending.get("display_text"),
                next_action={"action": action, "display_text": pending.get("display_text")},
            )
        if p_status == "open_url":
            return CheckoutPaymentStatus(
                status="requires_action",
                message=pending.get("display_text"),
                next_action={
                    "action": "redirect",
                    "url": pending.get("raw", {}).get("url"),
                    "display_text": pending.get("display_text"),
                },
            )
        if p_status == "failed":
            return CheckoutPaymentStatus(
                status="failed", message=pending.get("display_text") or "Payment failed."
            )
    except Exception:
        pass

    return CheckoutPaymentStatus(status="pending", message="Payment is being processed.")


router = APIRouter(prefix="/checkouts")
router.include_router(inner_router, prefix="/custom", include_in_schema=False)
router.include_router(inner_router)

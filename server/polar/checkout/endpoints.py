from typing import Annotated, List

import secrets

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
    """Get a checkout session by client secret."""
    return await checkout_service.get_by_client_secret(session, client_secret)


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
        "currency": checkout.currency or "KES",
        "reference": reference,
    }

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
    """Check the current payment status of a checkout's charge."""
    checkout = await checkout_service.get_by_client_secret(session, client_secret)
    meta = checkout.payment_processor_metadata or {}
    reference = meta.get("charge_reference")
    if not reference:
        return CheckoutPaymentStatus(
            status="pending", message="No charge initiated yet."
        )

    # Try verify_transaction first
    try:
        tx = await paystack_service.verify_transaction(reference, session=session)
        tx_status = tx.get("status")
        if tx_status == "success":
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

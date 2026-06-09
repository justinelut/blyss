import hashlib
import hmac
import json
from typing import Annotated
from uuid import UUID

import structlog
from fastapi import Depends, HTTPException, Path, Request
from starlette.status import HTTP_202_ACCEPTED, HTTP_401_UNAUTHORIZED

from polar.auth.dependencies import WebUserRead
from polar.checkout.payment_channels import get_channels_for_currency
from polar.config import settings
from polar.exceptions import ResourceNotFound
from polar.kit.pagination import ListResource, PaginationParamsQuery
from polar.openapi import APITag
from polar.organization.repository import OrganizationRepository
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter
from polar.runtime_settings import runtime_settings

from .schemas import (
    DonationChargeRequest,
    DonationChargeResponse,
    DonationChargeStepSubmitRequest,
    DonationCreate,
    DonationInitiateResponse,
    DonationPaymentChannel,
    DonationPaymentStatus,
    DonationPopupConfig,
    DonationPublic,
)
from .service import (
    DonationError,
    InvalidDonationAmountError,
    donation_service,
)

log = structlog.get_logger()

router = APIRouter(prefix="/donation", tags=["donation", APITag.public])


@router.post(
    "/initiate",
    response_model=DonationInitiateResponse,
    status_code=201,
    summary="Initiate Donation",
    responses={
        201: {"description": "Donation initiated successfully."},
        422: {"description": "Invalid donation amount or organization configuration."},
    },
)
async def initiate_donation(
    donation_create: DonationCreate,
    session: AsyncSession = Depends(get_db_session),
) -> DonationInitiateResponse:
    """Initiate donation payment. No authentication required."""
    try:
        donation, payment_url = await donation_service.initiate_donation(
            session,
            donation_create.organization_id,
            donation_create.amount,
            donation_create.donor_name,
            donation_create.donor_email,
            donation_create.message,
        )

        return DonationInitiateResponse(
            donation=DonationPublic.model_validate(donation),
            payment_url=payment_url,
        )

    except InvalidDonationAmountError:
        raise


# ---------------------------------------------------------------------------
# Inline Paystack-native tipping against a creator storefront.
#
# These mirror the buyer-checkout inline charge endpoints so the frontend can
# reuse the same PaystackPaymentInterface channel selector + polling. The donor
# never leaves Blyss (no hosted redirect).
# ---------------------------------------------------------------------------


def _charge_response_from_result(result: dict) -> DonationChargeResponse:
    raw = result.get("raw", {}) or {}
    return DonationChargeResponse(
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


@router.get(
    "/{slug}/payment-channels",
    response_model=list[DonationPaymentChannel],
    summary="Get Donation Payment Channels",
    responses={200: {"description": "Available payment channels for tipping."}},
)
async def donation_payment_channels(
    slug: Annotated[str, Path(description="The creator slug.")],
    session: AsyncSession = Depends(get_db_session),
) -> list[DonationPaymentChannel]:
    """List Paystack payment channels available for tipping a creator.

    Donations are always in KES, so this returns the KES channel set. The slug
    is validated so the frontend gets a 404 for unknown creators rather than a
    confusing empty channel list.
    """
    org_repository = OrganizationRepository.from_session(session)
    organization = await org_repository.get_by_slug(slug)
    if organization is None or organization.blocked_at is not None:
        raise ResourceNotFound()

    channels = get_channels_for_currency("KES")
    return [
        DonationPaymentChannel(
            id=c.id,
            name=c.name,
            description=c.description,
            fields=c.fields,
            providers=c.providers,
        )
        for c in channels
    ]


@router.get(
    "/{slug}/popup-config",
    response_model=DonationPopupConfig,
    summary="Get Donation Paystack Popup Config",
    responses={
        200: {"description": "Config for opening the Paystack popup."},
        404: {"description": "Creator not found or blocked."},
    },
)
async def donation_popup_config(
    slug: Annotated[str, Path(description="The creator slug.")],
    session: AsyncSession = Depends(get_db_session),
) -> DonationPopupConfig:
    """Return the config the donation page needs to open Paystack's
    Inline JS popup for tipping this creator.

    Public endpoint (donation/tipping is open to anyone — no auth).

    The popup config bundles:
      - Paystack public key (runtime_settings overlay → env)
      - Creator's organization_id (echoed into popup metadata as
        donation_for_organization_id, picked up by the
        charge.success webhook to record the Donation row)
      - Creator's subaccount_code (so the tip lands in their
        Paystack subaccount, with the platform percentage_charge
        split applied)
      - Currency + suggested amounts + minimum

    Frontend should hide the Pay button when subaccount_code is
    null — the creator hasn't finished M-Pesa verification yet so
    Paystack would reject the charge.
    """
    org_repository = OrganizationRepository.from_session(session)
    organization = await org_repository.get_by_slug(slug)
    if organization is None or organization.blocked_at is not None:
        raise ResourceNotFound()

    # Resolve public key — runtime_settings overlay first.
    public_key = ""
    try:
        override = await runtime_settings.get(
            session, "PAYSTACK_PUBLIC_KEY"
        )
        if override:
            public_key = override
    except Exception:  # noqa: BLE001
        pass
    if not public_key:
        public_key = settings.PAYSTACK_PUBLIC_KEY or ""

    # Same env-mismatch diagnostic as the checkout config endpoint:
    # a stored subaccount provisioned with live keys throws "Invalid
    # Subaccount" when the popup runs in test mode. Warn loudly.
    try:
        from polar.integrations.paystack.key_environment import (
            key_environment,
            keys_mismatched,
        )
        from polar.integrations.paystack.service import paystack as _paystack

        secret_key = await _paystack._resolve_secret_key(session)
        if keys_mismatched(public_key, secret_key):
            log.error(
                "paystack.config.key_environment_mismatch",
                surface="donation_popup_config",
                public_key_env=key_environment(public_key),
                secret_key_env=key_environment(secret_key),
                organization_id=str(organization.id),
            )
    except Exception:  # noqa: BLE001
        pass

    return DonationPopupConfig(
        public_key=public_key,
        organization_id=str(organization.id),
        organization_name=organization.name,
        subaccount_code=(
            organization.subaccount_code
            if organization.subaccount_code
            and not organization.subaccount_code.startswith("ACCT_test_")
            else None
        ),
        currency="KES",
    )


@router.post(
    "/{slug}/",
    response_model=DonationChargeResponse,
    status_code=201,
    summary="Tip a Creator",
    responses={
        201: {"description": "Donation charge initiated."},
        404: {"description": "Creator not found."},
        422: {"description": "Invalid amount or channel fields."},
    },
)
async def tip_creator(
    slug: Annotated[str, Path(description="The creator slug.")],
    charge: DonationChargeRequest,
    session: AsyncSession = Depends(get_db_session),
) -> DonationChargeResponse:
    """Initiate an inline Paystack charge to tip a creator. No auth required.

    Returns a reference + status the frontend polls via
    GET /donation/payment-status/{reference}. The donor stays on Blyss's UI.
    """
    org_repository = OrganizationRepository.from_session(session)
    organization = await org_repository.get_by_slug(slug)
    if organization is None or organization.blocked_at is not None:
        raise ResourceNotFound()

    donation, result = await donation_service.initiate_donation_charge(
        session,
        organization=organization,
        charge=charge,
    )
    await session.commit()

    return _charge_response_from_result(result)


@router.post(
    "/charge/submit/{action}/{reference}",
    response_model=DonationChargeResponse,
    summary="Submit Donation Charge Step",
    responses={
        200: {"description": "Charge step submitted."},
        404: {"description": "Donation not found."},
    },
)
async def submit_donation_charge_step(
    action: Annotated[str, Path(description="otp | pin | phone | birthday")],
    reference: Annotated[str, Path(description="The donation payment reference.")],
    body: DonationChargeStepSubmitRequest,
    session: AsyncSession = Depends(get_db_session),
) -> DonationChargeResponse:
    """Submit an OTP/PIN/phone/birthday for a pending donation charge."""
    if action not in ("otp", "pin", "phone", "birthday"):
        raise ResourceNotFound()

    result = await donation_service.submit_donation_charge_step(
        session,
        payment_reference=reference,
        action=action,
        value=body.value,
    )
    await session.commit()
    return _charge_response_from_result(result)


@router.get(
    "/payment-status/{reference}",
    response_model=DonationPaymentStatus,
    summary="Get Donation Payment Status",
    responses={
        200: {"description": "Current donation payment status."},
        404: {"description": "Donation not found."},
    },
)
async def donation_payment_status(
    reference: Annotated[str, Path(description="The donation payment reference.")],
    session: AsyncSession = Depends(get_db_session),
) -> DonationPaymentStatus:
    """Poll the live status of a donation charge.

    On a success transition, fires the confirmation + receipt emails to the
    donor exactly once (idempotent: only the pending→success edge enqueues).
    """
    # Snapshot prior status so we only enqueue emails on the pending→success
    # transition (the poller hits this endpoint repeatedly).
    from .repository import DonationRepository

    repository = DonationRepository.from_session(session)
    before = await repository.get_by_payment_reference(reference)
    if before is None:
        raise ResourceNotFound()
    was_pending = before.payment_status not in ("success", "failed")

    status = await donation_service.get_donation_payment_status(
        session, payment_reference=reference
    )
    await session.commit()

    if was_pending and status["status"] == "success":
        donation = await repository.get_by_payment_reference(reference)
        if donation is not None:
            from .tasks import send_donation_confirmation, send_donation_receipt

            send_donation_confirmation.send(
                donation.donor_email,
                donation.donor_name,
                donation.amount,
                donation.organization_id,
            )
            send_donation_receipt.send(
                donation.donor_email,
                donation.donor_name,
                donation.amount,
                donation.payment_reference,
                donation.organization_id,
                donation.created_at.isoformat(),
            )

    return DonationPaymentStatus(**status)


async def verify_paystack_signature(payload: bytes, signature: str, session: AsyncSession) -> bool:
    """Verify Paystack webhook signature using HMAC-SHA512."""
    if not signature:
        return False

    secret = await runtime_settings.get(session, "PAYSTACK_WEBHOOK_SECRET")
    if not secret:
        return False

    expected_signature = hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha512,
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)


@router.post(
    "/webhook/paystack",
    status_code=HTTP_202_ACCEPTED,
    summary="Paystack Donation Webhook",
    responses={
        202: {"description": "Webhook received and processed."},
        401: {"description": "Invalid webhook signature."},
    },
)
async def paystack_donation_webhook(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    """Handle Paystack payment confirmation webhook"""
    payload = await request.body()
    signature = request.headers.get("x-paystack-signature", "")

    if not await verify_paystack_signature(payload, signature, session):
        log.warning(
            "donation.webhook.signature_verification_failed",
            signature_provided=bool(signature),
        )
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED, detail="Invalid signature"
        )

    try:
        event_data = json.loads(payload.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        log.error(
            "donation.webhook.payload_parsing_failed",
            error=str(e),
        )
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from e

    event_type = event_data.get("event")
    data = event_data.get("data", {})
    payment_reference = data.get("reference")

    log.info(
        "donation.webhook.received",
        event_type=event_type,
        payment_reference=payment_reference,
    )

    if event_type == "charge.success" and payment_reference:
        try:
            donation = await donation_service.confirm_donation(
                session, payment_reference
            )

            from .tasks import send_donation_confirmation, send_donation_receipt

            send_donation_confirmation.send(
                donation.donor_email,
                donation.donor_name,
                donation.amount,
                donation.organization_id,
            )

            send_donation_receipt.send(
                donation.donor_email,
                donation.donor_name,
                donation.amount,
                donation.payment_reference,
                donation.organization_id,
                donation.created_at.isoformat(),
            )

        except Exception as e:
            log.error(
                "donation.webhook.processing_failed",
                error=str(e),
                payment_reference=payment_reference,
            )

    return {"message": "Webhook received"}


@router.get(
    "/creator/{organization_id}",
    response_model=ListResource[DonationPublic],
    summary="Get Creator Donations",
    responses={200: {"description": "List of donations for creator."}},
)
async def get_creator_donations(
    organization_id: Annotated[UUID, Path(description="The organization ID.")],
    auth_subject: WebUserRead,
    pagination: PaginationParamsQuery,
    session: AsyncSession = Depends(get_db_session),
) -> ListResource[DonationPublic]:
    """Get donations for creator. Requires authentication."""
    donations, total_count = await donation_service.get_creator_donations(
        session, organization_id, pagination
    )

    return ListResource(
        items=[DonationPublic.model_validate(donation) for donation in donations],
        pagination={
            "total_count": total_count,
            "max_page": (total_count // pagination.limit) + 1,
        },
    )

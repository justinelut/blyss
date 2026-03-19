import hashlib
import hmac
import json
from typing import Annotated
from uuid import UUID

import structlog
from fastapi import Depends, HTTPException, Path, Request
from starlette.status import HTTP_202_ACCEPTED, HTTP_401_UNAUTHORIZED

from polar.auth.dependencies import WebUserRead
from polar.config import settings
from polar.kit.pagination import ListResource, PaginationParams
from polar.openapi import APITag
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter

from .schemas import DonationCreate, DonationInitiateResponse, DonationPublic
from .service import (
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


def verify_paystack_signature(payload: bytes, signature: str) -> bool:
    """Verify Paystack webhook signature using HMAC-SHA512."""
    if not signature:
        return False

    expected_signature = hmac.new(
        settings.PAYSTACK_WEBHOOK_SECRET.encode("utf-8"),
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

    if not verify_paystack_signature(payload, signature):
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
    pagination: PaginationParams = Depends(),
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

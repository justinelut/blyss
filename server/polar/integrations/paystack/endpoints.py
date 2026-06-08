import hashlib
import hmac
import json
import re
from typing import Any
from uuid import UUID

import structlog
from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from starlette.status import HTTP_202_ACCEPTED, HTTP_401_UNAUTHORIZED

from polar.auth.dependencies import WebUserWrite
from polar.config import settings
from polar.exceptions import ResourceNotFound
from polar.external_event.service import external_event as external_event_service
from polar.models.external_event import ExternalEventSource
from polar.models.organization import PayoutMethod
from polar.organization.repository import OrganizationRepository
from polar.organization.schemas import Organization as OrganizationSchema
from polar.organization.service import organization as organization_service
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter
from polar.runtime_settings.service import runtime_settings

from .service import paystack

log = structlog.get_logger()

router = APIRouter(
    prefix="/integrations/paystack",
    tags=["integrations_paystack"],
    include_in_schema=False,
)


class MPesaConfigurationRequest(BaseModel):
    """Request schema for M-Pesa configuration."""

    mpesa_number: str = Field(
        ..., description="M-Pesa phone number in Kenyan format (+254XXXXXXXXX)"
    )

    @field_validator("mpesa_number")
    @classmethod
    def validate_mpesa_number(cls, v: str) -> str:
        """Validate M-Pesa number format (+254XXXXXXXXX)."""
        # Remove any spaces or dashes
        cleaned = re.sub(r"[\s\-]", "", v)

        # Check if it matches Kenyan M-Pesa format
        if not re.match(r"^\+254[17]\d{8}$", cleaned):
            raise ValueError(
                "M-Pesa number must be in Kenyan format (+254XXXXXXXXX) "
                "where X is a digit and the number starts with 7 or 1 after country code"
            )

        return cleaned


class PaystackWebhookEventGetter:
    """Handles Paystack webhook signature verification and event parsing."""

    def __init__(self, secret: str) -> None:
        self.secret = secret

    def _verify_signature(self, payload: bytes, signature: str) -> bool:
        """Verify webhook signature using HMAC-SHA512."""
        if not signature:
            return False

        # Compute expected signature
        expected_signature = hmac.new(
            self.secret.encode("utf-8"), payload, hashlib.sha512
        ).hexdigest()

        # Use constant-time comparison to prevent timing attacks
        return hmac.compare_digest(signature, expected_signature)

    async def __call__(self, request: Request) -> dict[str, Any]:
        """Extract and verify webhook event from request."""
        payload = await request.body()
        signature = request.headers.get("x-paystack-signature", "")

        # Verify signature
        if not self._verify_signature(payload, signature):
            log.warning(
                "paystack.webhook.signature_verification_failed",
                signature_provided=bool(signature),
            )
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED, detail="Invalid signature"
            )

        # Parse JSON payload
        try:
            event_data = json.loads(payload.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            log.error(
                "paystack.webhook.payload_parsing_failed",
                error=str(e),
            )
            raise HTTPException(status_code=400, detail="Invalid JSON payload") from e

        # Validate payload structure
        if (
            not isinstance(event_data, dict)
            or "event" not in event_data
            or "data" not in event_data
        ):
            log.error(
                "paystack.webhook.invalid_payload_structure",
                payload_keys=list(event_data.keys())
                if isinstance(event_data, dict)
                else None,
            )
            raise HTTPException(status_code=400, detail="Invalid payload structure")

        log.info(
            "paystack.webhook.event_received",
            event_type=event_data.get("event"),
            event_id=event_data.get("data", {}).get("id"),
        )

        return event_data


@router.post(
    "/webhook", status_code=HTTP_202_ACCEPTED, name="integrations.paystack.webhook"
)
async def webhook(
    session: AsyncSession = Depends(get_db_session),
    event: dict[str, Any] = Depends(
        PaystackWebhookEventGetter(settings.PAYSTACK_WEBHOOK_SECRET)
    ),
) -> None:
    """Receive and process Paystack webhook events."""
    event_type = event["event"]
    event_data = event["data"]
    event_id = event_data.get("id", event_data.get("reference", "unknown"))

    # Store webhook event for audit purposes and enqueue processing
    await external_event_service.enqueue(
        session,
        ExternalEventSource.paystack,
        f"paystack.webhook.{event_type}",
        event_id,
        event,
    )

    log.info(
        "paystack.webhook.event_enqueued",
        event_type=event_type,
        event_id=event_id,
    )


class MPesaInitiateVerificationRequest(BaseModel):
    """Request schema for kicking off the M-Pesa verification charge.

    The creator submits their M-Pesa number; Blyss charges KSh 100 from it
    via Paystack `/charge` (mobile_money channel). The KSh 100 is
    non-refundable, kept by Blyss, and used as proof-of-ownership +
    anti-fraud signal before activating their payouts.
    """

    mpesa_number: str = Field(
        ..., description="M-Pesa phone number in Kenyan format (+254XXXXXXXXX)"
    )

    @field_validator("mpesa_number")
    @classmethod
    def validate_mpesa_number(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-]", "", v)
        if not re.match(r"^\+254[17]\d{8}$", cleaned):
            raise ValueError(
                "M-Pesa number must be in Kenyan format (+254XXXXXXXXX) "
                "where X is a digit and the number starts with 7 or 1 after country code"
            )
        return cleaned


class MPesaFinalizeVerificationRequest(BaseModel):
    """Request schema for finalizing the M-Pesa verification charge."""

    reference: str = Field(
        ..., min_length=4,
        description="Paystack charge reference returned by initiate-verification.",
    )


class MPesaInitiateVerificationResponse(BaseModel):
    """Response from initiate-verification — the buyer-facing STK push prompt."""

    reference: str
    status: str
    display_text: str


class MPesaChargeStatusResponse(BaseModel):
    """Lightweight Paystack /transaction/verify status check.

    Used by the dashboard's payouts setup form to poll for STK push
    completion every 3 seconds without provisioning anything. Once
    `status='success'`, the frontend calls finalize-verification ONCE
    to provision the subaccount (idempotent on the server).
    """

    status: str = Field(
        ...,
        description=(
            "One of 'success', 'failed', 'abandoned', or 'pending' "
            "(any other status is treated as still in-flight)."
        ),
    )
    gateway_response: str | None = Field(
        None,
        description="Paystack's human-readable status message, when present.",
    )


# Anti-fraud verification charge amount in kobo (KES cents).
# Default 100 KES = 10000 kobo. Non-refundable, kept by Blyss.
# Tunable at runtime via /backoffice/runtime-settings — set the
# MPESA_VERIFICATION_AMOUNT_KOBO row to override without redeploying.
DEFAULT_MPESA_VERIFICATION_AMOUNT_KOBO = 10000


async def _resolve_mpesa_verification_amount(session: AsyncSession) -> int:
    """Return the M-Pesa verification charge amount in kobo.

    Read order: runtime_settings DB row → env var → built-in default.
    Failures (parse errors, runtime_settings disabled) fall through to
    the default so a misconfigured override never blocks a creator
    from finishing onboarding.
    """
    try:
        raw = await runtime_settings.get(session, "MPESA_VERIFICATION_AMOUNT_KOBO")
    except Exception as e:  # noqa: BLE001 — runtime_settings can raise if disabled
        log.warning(
            "paystack.mpesa.verification_amount.runtime_settings_unavailable",
            error=str(e),
        )
        raw = None
    if raw is None:
        return DEFAULT_MPESA_VERIFICATION_AMOUNT_KOBO
    try:
        amount = int(str(raw).strip())
        if amount <= 0:
            raise ValueError("non-positive")
        return amount
    except (ValueError, TypeError) as e:
        log.warning(
            "paystack.mpesa.verification_amount.invalid_override",
            raw_value=str(raw),
            error=str(e),
        )
        return DEFAULT_MPESA_VERIFICATION_AMOUNT_KOBO


@router.post(
    "/organizations/{id}/mpesa/initiate-verification",
    response_model=MPesaInitiateVerificationResponse,
)
async def initiate_mpesa_verification(
    id: UUID,
    request: MPesaInitiateVerificationRequest,
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> MPesaInitiateVerificationResponse:
    """Charge KSh 100 from the creator's M-Pesa to verify ownership.

    Saves the M-Pesa number on the org with `mpesa_verified=False` and
    pushes an STK prompt to the creator's phone via Paystack. The
    creator authorizes the KSh 100 charge in their M-Pesa app, then the
    frontend calls `finalize-verification` with the returned reference.
    """
    repository = OrganizationRepository.from_session(session)
    organization = await repository.get_by_id(id)
    if not organization:
        raise ResourceNotFound("Organization not found")

    try:
        amount_kobo = await _resolve_mpesa_verification_amount(session)
        charge = await paystack.charge_mobile_money(
            email=auth_subject.subject.email,
            amount=amount_kobo,
            phone=request.mpesa_number,
            provider="mpesa",
            metadata={
                "purpose": "blyss.payout_method.mpesa.verification",
                "organization_id": str(organization.id),
            },
            session=session,
        )
    except Exception as e:
        log.error(
            "paystack.mpesa.initiate_verification.failed",
            organization_id=organization.id,
            mpesa_number=request.mpesa_number,
            error=str(e),
        )
        raise HTTPException(
            status_code=422,
            detail=f"Failed to start M-Pesa verification: {str(e)}",
        ) from e

    # Save number with mpesa_verified=False; finalize-verification will
    # promote it to True once the charge succeeds.
    await repository.update(
        organization,
        update_dict={
            "mpesa_number": request.mpesa_number,
            "mpesa_verified": False,
            "payout_method": PayoutMethod.MPESA,
        },
        flush=True,
    )

    log.info(
        "paystack.mpesa.initiate_verification.ok",
        organization_id=organization.id,
        mpesa_number=request.mpesa_number,
        reference=charge["reference"],
    )

    return MPesaInitiateVerificationResponse(
        reference=charge["reference"],
        status=charge["status"] or "pending",
        display_text=charge["display_text"],
    )


class MPesaVerificationConfigResponse(BaseModel):
    """Public-readable M-Pesa verification config.

    Currently exposes only the amount because that's all the dashboard
    needs to render the right copy on the payouts settings screen.
    Returns the resolved value (runtime_settings DB row → env var →
    in-code default) in both kobo (the smallest currency unit Paystack
    expects) and KES (for human-readable UI rendering).
    """

    amount_kobo: int = Field(
        description=(
            "Verification charge amount in the smallest currency unit "
            "(KES * 100). e.g. 10000 = KES 100."
        )
    )
    amount_kes: int = Field(
        description="Same amount expressed in KES for UI rendering.",
    )


@router.get(
    "/mpesa/verification-config",
    response_model=MPesaVerificationConfigResponse,
)
async def mpesa_verification_config(
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> MPesaVerificationConfigResponse:
    """Return the current M-Pesa verification charge so the dashboard
    can render copy that matches what's actually charged.

    Without this endpoint, the dashboard hardcoded 'KSh 100' even
    after the backoffice override flipped the real value to KES 1
    for testing — a confusing leak between the data layer and the UI.
    """
    amount_kobo = await _resolve_mpesa_verification_amount(session)
    return MPesaVerificationConfigResponse(
        amount_kobo=amount_kobo,
        amount_kes=amount_kobo // 100,
    )


@router.get(
    "/organizations/{id}/mpesa/charge-status",
    response_model=MPesaChargeStatusResponse,
)
async def mpesa_charge_status(
    id: UUID,
    reference: str,
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> MPesaChargeStatusResponse:
    """Polling-friendly status check for an in-flight M-Pesa STK charge.

    The dashboard polls this every ~3 seconds while the creator approves
    the KSh 100 verification charge on their phone. The response is
    intentionally minimal — no DB writes, no subaccount provisioning —
    so it's safe to call repeatedly. Once status='success' the frontend
    calls finalize-verification once to mark the org verified and
    create the Paystack subaccount.

    Status values returned:
      - 'success'  : charge confirmed by Paystack
      - 'failed'   : declined / cancelled / network error
      - 'abandoned': customer dismissed the STK prompt
      - 'pending'  : still waiting on the customer's phone
    """
    repository = OrganizationRepository.from_session(session)
    organization = await repository.get_by_id(id)
    if not organization:
        raise ResourceNotFound("Organization not found")

    try:
        verification = await paystack.verify_transaction(
            reference, session=session
        )
    except Exception as e:
        # Network / upstream errors are transient — return pending so
        # the client keeps polling. Logging at warn so ops can see if
        # this is a sustained outage.
        log.warning(
            "paystack.mpesa.charge_status.verify_error",
            organization_id=organization.id,
            reference=reference,
            error=str(e),
        )
        return MPesaChargeStatusResponse(
            status="pending", gateway_response=None
        )

    return MPesaChargeStatusResponse(
        status=verification.get("status") or "pending",
        gateway_response=verification.get("gateway_response"),
    )


@router.post(
    "/organizations/{id}/mpesa/finalize-verification",
    response_model=OrganizationSchema,
)
async def finalize_mpesa_verification(
    id: UUID,
    request: MPesaFinalizeVerificationRequest,
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> OrganizationSchema:
    """Verify the M-Pesa charge succeeded and provision the subaccount.

    Polls Paystack `GET /transaction/verify/{reference}`. On success:
    sets `mpesa_verified=True` and creates a Paystack subaccount with
    `settlement_bank=MPESA` so future buyer payments to this creator's
    products auto-split (80% creator / 20% Blyss).

    On failure: marks `subaccount_status=failed` and returns 422 so the
    creator can retry from the UI.
    """
    repository = OrganizationRepository.from_session(session)
    organization = await repository.get_by_id(id)
    if not organization:
        raise ResourceNotFound("Organization not found")

    if not organization.mpesa_number:
        raise HTTPException(
            status_code=422,
            detail="No M-Pesa number on file. Call initiate-verification first.",
        )

    # 1. Verify the charge with Paystack.
    try:
        verification = await paystack.verify_transaction(
            request.reference, session=session
        )
    except Exception as e:
        log.error(
            "paystack.mpesa.finalize_verification.verify_failed",
            organization_id=organization.id,
            reference=request.reference,
            error=str(e),
        )
        raise HTTPException(
            status_code=422,
            detail=f"Failed to verify M-Pesa charge: {str(e)}",
        ) from e

    charge_status = verification.get("status")
    if charge_status != "success":
        await repository.update(
            organization,
            update_dict={"subaccount_status": "failed"},
            flush=True,
        )
        log.info(
            "paystack.mpesa.finalize_verification.charge_not_success",
            organization_id=organization.id,
            reference=request.reference,
            status=charge_status,
        )
        raise HTTPException(
            status_code=422,
            detail=(
                f"M-Pesa verification charge did not succeed (status={charge_status}). "
                "Please retry."
            ),
        )

    # 2. Charge succeeded — mark verified and provision subaccount.
    organization = await repository.update(
        organization,
        update_dict={"mpesa_verified": True},
        flush=True,
    )

    # We used to short-circuit subaccount creation in test mode because
    # Paystack's test env rejected Kenyan M-Pesa numbers with
    # 'Account number is invalid'. That bypass made the dashboard
    # report success but the subaccount never appeared in Paystack's
    # test dashboard — which is what the user is seeing right now.
    # Removed: the real /subaccount call now fires in both test and
    # live mode. If Paystack test mode still rejects, the upstream
    # error message is surfaced via the existing 422 path below.

    try:
        # Paystack's subaccount API expects M-Pesa MSISDN without the '+'
        # (i.e. '254712345678', not '+254712345678'). Strip it on the way
        # in. Storage stays in E.164 form for our own UI / display.
        mpesa_account_number = (organization.mpesa_number or "").lstrip("+")
        if organization.subaccount_code:
            await paystack.update_subaccount(
                subaccount_code=organization.subaccount_code,
                settlement_bank="MPESA",
                account_number=mpesa_account_number,
                session=session,
            )
            organization = await repository.update(
                organization,
                update_dict={"subaccount_status": "active"},
                flush=True,
            )
        else:
            sub = await paystack.create_subaccount(
                business_name=organization.name,
                settlement_bank="MPESA",
                account_number=mpesa_account_number,
                percentage_charge=20.0,
                session=session,
            )
            organization = await repository.update(
                organization,
                update_dict={
                    "subaccount_code": sub["subaccount_code"],
                    "subaccount_status": sub.get("status", "active"),
                },
                flush=True,
            )
        log.info(
            "paystack.mpesa.finalize_verification.subaccount_ok",
            organization_id=organization.id,
            subaccount_code=organization.subaccount_code,
        )
    except Exception as e:
        log.error(
            "paystack.mpesa.finalize_verification.subaccount_failed",
            organization_id=organization.id,
            error=str(e),
        )
        organization = await repository.update(
            organization,
            update_dict={"subaccount_status": "failed"},
            flush=True,
        )
        # Surface the actual Paystack error message so the creator can
        # act on it (e.g. 'Account number is invalid' vs a vague generic
        # rejection). The fallback is a polite generic when paystack
        # returns nothing useful.
        upstream_msg = str(e).strip()
        detail = (
            f"M-Pesa charge succeeded but Paystack rejected the payout "
            f"subaccount: {upstream_msg}. Your M-Pesa number is saved — "
            f"please retry from Settings, or check the number format."
            if upstream_msg
            else (
                "M-Pesa charge succeeded but Paystack rejected the payout "
                "subaccount. Your M-Pesa number is saved — please retry "
                "from Settings."
            )
        )
        raise HTTPException(status_code=422, detail=detail) from e

    return OrganizationSchema.model_validate(organization)


@router.post("/organizations/{id}/mpesa", response_model=MPesaInitiateVerificationResponse)
async def configure_mpesa(
    id: UUID,
    request: MPesaConfigurationRequest,
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> MPesaInitiateVerificationResponse:
    """Legacy alias for initiate-verification. Kept for backward
    compatibility with the existing dashboard call-site that POSTs here.
    Delegates to `initiate_mpesa_verification`.
    """
    return await initiate_mpesa_verification(
        id=id,
        request=MPesaInitiateVerificationRequest(mpesa_number=request.mpesa_number),
        auth_subject=auth_subject,
        session=session,
    )


@router.post("/organizations/{id}/mpesa/verify", response_model=OrganizationSchema)
async def verify_mpesa(
    id: UUID,
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> OrganizationSchema:
    """Legacy no-op kept for backward compatibility.

    The new verification flow is two endpoints:
      1. POST /mpesa/initiate-verification — charges KSh 100 from the creator
      2. POST /mpesa/finalize-verification — confirms charge + provisions subaccount

    Calling this old endpoint just returns the current organization state.
    The frontend should be updated to call the new pair.
    """
    repository = OrganizationRepository.from_session(session)
    organization = await repository.get_by_id(id)
    if not organization:
        raise ResourceNotFound("Organization not found")
    return OrganizationSchema.model_validate(organization)


class BankConfigurationRequest(BaseModel):
    """Request schema for bank-account payout configuration."""

    bank_code: str = Field(
        ..., min_length=2, max_length=10,
        description="Paystack KE bank code (from GET /v1/integrations/paystack/banks).",
    )
    account_number: str = Field(
        ..., min_length=4, max_length=20,
        description="Settlement bank account number.",
    )
    account_name: str = Field(
        ..., min_length=2, max_length=200,
        description="Account holder's name on the settlement account.",
    )


@router.post(
    "/organizations/{id}/bank",
    response_model=OrganizationSchema,
    name="integrations.paystack.configure_bank",
)
async def configure_bank(
    id: UUID,
    request: BankConfigurationRequest,
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> OrganizationSchema:
    """Configure bank-account payout for an organization.

    Creates (or updates) the Paystack subaccount with bank settlement and
    persists the bank fields. Unlike M-Pesa, no verification transaction
    is required — Paystack validates the bank account on subaccount
    creation/update.
    """
    repository = OrganizationRepository.from_session(session)
    organization = await repository.get_by_id(id)
    if not organization:
        raise ResourceNotFound("Organization not found")

    try:
        if organization.subaccount_code:
            await paystack.update_subaccount(
                subaccount_code=organization.subaccount_code,
                settlement_bank=request.bank_code,
                account_number=request.account_number,
                session=session,
            )
            update_dict = {
                "bank_code": request.bank_code,
                "bank_account_number": request.account_number,
                "bank_account_name": request.account_name,
                "payout_method": PayoutMethod.BANK,
                "subaccount_status": "active",
            }
        else:
            sub = await paystack.create_subaccount(
                business_name=organization.name,
                settlement_bank=request.bank_code,
                account_number=request.account_number,
                percentage_charge=20.0,
                session=session,
            )
            update_dict = {
                "bank_code": request.bank_code,
                "bank_account_number": request.account_number,
                "bank_account_name": request.account_name,
                "payout_method": PayoutMethod.BANK,
                "subaccount_code": sub["subaccount_code"],
                "subaccount_status": sub["status"],
            }

        organization = await repository.update(
            organization, update_dict=update_dict, flush=True
        )
        log.info(
            "paystack.bank.configured",
            organization_id=organization.id,
            bank_code=request.bank_code,
            subaccount_code=organization.subaccount_code,
        )
        return OrganizationSchema.model_validate(organization)
    except Exception as e:
        log.error(
            "paystack.bank.configuration_failed",
            organization_id=organization.id,
            bank_code=request.bank_code,
            error=str(e),
        )
        raise HTTPException(
            status_code=422, detail=f"Failed to configure bank: {str(e)}"
        ) from e


@router.get(
    "/banks",
    name="integrations.paystack.list_banks",
)
async def list_banks(
    country: str = "kenya",
) -> list[dict[str, Any]]:
    """Public list of Paystack-recognized banks for the given country.

    Used by the dashboard's bank-payout dropdown. The response items match
    Paystack's `/bank` shape — each item has `code`, `name`, `slug`, etc.
    """
    try:
        return await paystack.list_banks(country=country)
    except Exception as e:
        log.error("paystack.banks.list_failed", country=country, error=str(e))
        raise HTTPException(
            status_code=502,
            detail="Failed to load banks from Paystack",
        ) from e


@router.post("/organizations/{id}/subaccount/retry", response_model=OrganizationSchema)
async def retry_subaccount_creation(
    id: UUID,
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> OrganizationSchema:
    """Retry failed subaccount creation for organization."""
    repository = OrganizationRepository.from_session(session)

    # Get organization and verify user has access
    organization = await repository.get_by_id(id)
    if not organization:
        raise ResourceNotFound("Organization not found")

    # TODO: Add proper authorization check to ensure user can modify this organization

    # Check if subaccount creation is needed
    if organization.subaccount_status == "active":
        # Already active, return current state
        return OrganizationSchema.model_validate(organization)

    if organization.subaccount_code and organization.subaccount_status != "failed":
        raise HTTPException(
            status_code=422,
            detail="Subaccount creation is already in progress or completed",
        )

    try:
        # Call OrganizationService.create_organization_subaccount
        updated_organization = (
            await organization_service.create_organization_subaccount(
                session, organization
            )
        )

        log.info(
            "paystack.subaccount.retry_success",
            organization_id=organization.id,
            subaccount_code=updated_organization.subaccount_code,
            status=updated_organization.subaccount_status,
        )

        return OrganizationSchema.model_validate(updated_organization)

    except Exception as e:
        log.error(
            "paystack.subaccount.retry_failed",
            organization_id=organization.id,
            error=str(e),
        )
        raise HTTPException(
            status_code=422, detail=f"Failed to retry subaccount creation: {str(e)}"
        ) from e

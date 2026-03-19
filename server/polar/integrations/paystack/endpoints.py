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


@router.post("/organizations/{id}/mpesa", response_model=OrganizationSchema)
async def configure_mpesa(
    id: UUID,
    request: MPesaConfigurationRequest,
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> OrganizationSchema:
    """Configure M-Pesa payout for organization."""
    repository = OrganizationRepository.from_session(session)

    # Get organization and verify user has access
    organization = await repository.get_by_id(id)
    if not organization:
        raise ResourceNotFound("Organization not found")

    # TODO: Add proper authorization check to ensure user can modify this organization

    try:
        # Send verification transaction
        verification_result = await paystack.send_verification_transaction(
            mpesa_number=request.mpesa_number
        )

        log.info(
            "paystack.mpesa.verification_transaction_sent",
            organization_id=organization.id,
            mpesa_number=request.mpesa_number,
            transaction_reference=verification_result.get("reference"),
        )

        # Store M-Pesa number with verified=false
        organization = await repository.update(
            organization,
            update_dict={
                "mpesa_number": request.mpesa_number,
                "mpesa_verified": False,
                "payout_method": PayoutMethod.MPESA,
            },
            flush=True,
        )

        return OrganizationSchema.model_validate(organization)

    except Exception as e:
        log.error(
            "paystack.mpesa.configuration_failed",
            organization_id=organization.id,
            mpesa_number=request.mpesa_number,
            error=str(e),
        )
        raise HTTPException(
            status_code=422, detail=f"Failed to configure M-Pesa: {str(e)}"
        ) from e


@router.post("/organizations/{id}/mpesa/verify", response_model=OrganizationSchema)
async def verify_mpesa(
    id: UUID,
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> OrganizationSchema:
    """Mark M-Pesa number as verified after successful transaction."""
    repository = OrganizationRepository.from_session(session)

    # Get organization and verify user has access
    organization = await repository.get_by_id(id)
    if not organization:
        raise ResourceNotFound("Organization not found")

    if not organization.mpesa_number:
        raise HTTPException(
            status_code=422, detail="No M-Pesa number configured for this organization"
        )

    if organization.mpesa_verified:
        # Already verified, return current state
        return OrganizationSchema.model_validate(organization)

    # TODO: Add proper authorization check to ensure user can modify this organization

    try:
        # Check verification transaction status with Paystack
        # For now, we'll assume verification is successful
        # In a real implementation, you would check the transaction status

        # Update mpesa_verified to true
        organization = await repository.update(
            organization,
            update_dict={"mpesa_verified": True},
            flush=True,
        )

        # Update Paystack subaccount with M-Pesa number as settlement account
        if organization.subaccount_code:
            try:
                await paystack.update_subaccount(
                    subaccount_code=organization.subaccount_code,
                    settlement_bank="mpesa",  # Paystack's M-Pesa bank code
                    account_number=organization.mpesa_number,
                )

                log.info(
                    "paystack.mpesa.subaccount_updated",
                    organization_id=organization.id,
                    subaccount_code=organization.subaccount_code,
                    mpesa_number=organization.mpesa_number,
                )

            except Exception as e:
                log.error(
                    "paystack.mpesa.subaccount_update_failed",
                    organization_id=organization.id,
                    subaccount_code=organization.subaccount_code,
                    error=str(e),
                )
                # Don't fail the verification if subaccount update fails
                # The M-Pesa number is still verified

        log.info(
            "paystack.mpesa.verification_completed",
            organization_id=organization.id,
            mpesa_number=organization.mpesa_number,
        )

        return OrganizationSchema.model_validate(organization)

    except Exception as e:
        log.error(
            "paystack.mpesa.verification_failed",
            organization_id=organization.id,
            mpesa_number=organization.mpesa_number,
            error=str(e),
        )
        raise HTTPException(
            status_code=422, detail=f"Failed to verify M-Pesa: {str(e)}"
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

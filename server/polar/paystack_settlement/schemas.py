"""Pydantic schemas for the public paystack-settlements endpoint.

Read-only — settlements are written by webhook handlers, never via the
HTTP API. The dashboard's BlyssPayoutLedger consumes these to render
real settlement timelines instead of the previous T+2 estimate.
"""

from datetime import datetime
from uuid import UUID

from pydantic import Field

from polar.kit.schemas import IDSchema, Schema, TimestampedSchema
from polar.models.paystack_settlement import PaystackSettlementStatus


class PaystackSettlementResponse(IDSchema, TimestampedSchema):
    """Single Paystack settlement row as exposed to the dashboard."""

    organization_id: UUID | None = Field(
        description=(
            "Resolved creator organization. Null when reconciliation "
            "hasn't matched the event yet (rare — happens when Paystack "
            "sends a transfer for a subaccount we don't recognise)."
        )
    )

    paystack_transfer_id: str = Field(
        description="Idempotency key — Paystack's `data.id` for the transfer."
    )

    status: PaystackSettlementStatus = Field(
        description=(
            "Settlement status. Maps to a row of: pending / success / "
            "failed / reversed."
        )
    )

    amount: int = Field(
        description="Amount in minor units (KES kobo for KE settlements)."
    )

    currency: str = Field(
        description="ISO 4217 currency code, lowercased (e.g. 'kes')."
    )

    settled_at: datetime | None = Field(
        description=(
            "When Paystack reports the transfer completed. Null while "
            "pending."
        )
    )

    recipient_name: str | None = Field(
        description="Display name of the destination bank/M-Pesa account."
    )

    recipient_account_last4: str | None = Field(
        description="Last 4 digits of the recipient account number."
    )

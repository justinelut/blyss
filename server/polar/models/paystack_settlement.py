"""PaystackSettlement model — records every Paystack payout webhook
(`transfer.success`, `transfer.failed`, `transfer.reversed`) so creators
can see the actual settlement timeline rather than a T+2 estimate.

Per discussion: Paystack auto-splits at charge time into the creator's
subaccount, then settles the accumulated subaccount balance to the
creator's bank/M-Pesa per their settlement schedule (T+1 to T+3).
Paystack DOES emit `transfer.*` webhooks for these settlement transfers.
This model captures every event so the dashboard payout ledger reflects
reality, not an estimate.

Reconciliation:
    The webhook payload's `data.recipient.subaccount` (when present)
    or `data.subaccount.subaccount_code` ties the transfer to a creator's
    subaccount. We store the raw event AND the resolved organization_id
    when reconciliation succeeds. Unmatched events are kept anyway —
    a follow-up reconciliation task can run with looser matching
    (amount + window) if the direct linkage fails.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from polar.kit.db.models import RecordModel
from polar.kit.extensions.sqlalchemy import StringEnum


class PaystackSettlementStatus(StrEnum):
    """Status of a Paystack settlement event.

    Mirrors the Paystack `data.status` field on transfer webhook payloads.
    `success` is the canonical "money has landed in the creator's bank /
    M-Pesa" state — reflects to the dashboard as a confirmed settlement.
    """

    pending = "pending"
    """Recorded the event but Paystack hasn't completed the transfer yet."""
    success = "success"
    """Paystack confirmed the transfer landed in the recipient's account."""
    failed = "failed"
    """Paystack reported the transfer failed."""
    reversed = "reversed"
    """Paystack reversed a previously successful transfer."""


class PaystackSettlement(RecordModel):
    """A single Paystack settlement event.

    Created by `paystack.webhook.transfer.success` (and friends). One row
    per webhook event — Paystack guarantees idempotency on `data.id`,
    we enforce it via a unique constraint on `paystack_transfer_id`.
    """

    __tablename__ = "paystack_settlements"
    __table_args__ = (
        UniqueConstraint(
            "paystack_transfer_id",
            name="uq_paystack_settlements_transfer_id",
        ),
        Index(
            "ix_paystack_settlements_org_settled_at",
            "organization_id",
            "settled_at",
        ),
    )

    # Paystack-side identity
    paystack_transfer_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    """Paystack `data.id` (numeric) coerced to string. Idempotency key."""

    paystack_transfer_code: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )
    """Paystack `data.transfer_code` (e.g. `TRF_xyz`). Nullable because
    older event payloads may omit it."""

    paystack_subaccount_code: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )
    """Subaccount code lifted from `data.recipient.subaccount` when present.
    Used to reconcile the settlement to a creator's organization."""

    # Resolved creator — null when reconciliation didn't find a match
    # (e.g. an event for a subaccount that was deleted, or a fresh
    # event before the org row exists). Reconciliation worker can fill
    # this in later.
    organization_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="set null"),
        nullable=True,
        index=True,
    )

    # Settlement amount + currency (Paystack reports in minor units,
    # e.g. KES kobo)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    """Amount in minor units (KES kobo for KE settlements)."""

    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    """ISO 4217 currency code, lowercased (e.g. `kes`)."""

    # Timing — settled_at is when Paystack reports the transfer
    # completed; this can be the same as created_at for `transfer.success`
    # events delivered in real-time, but separate for delayed events.
    settled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    """When Paystack reports the transfer completed. Null while pending."""

    status: Mapped[PaystackSettlementStatus] = mapped_column(
        StringEnum(PaystackSettlementStatus),
        nullable=False,
        default=PaystackSettlementStatus.pending,
        index=True,
    )

    # Recipient details for the dashboard "settled to ___" line.
    # Stored on the row so the UI doesn't have to fetch from Paystack.
    recipient_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    """Display name of the recipient bank/M-Pesa account."""

    recipient_account_last4: Mapped[str | None] = mapped_column(
        String(8),
        nullable=True,
    )
    """Last 4 digits of the recipient account number (or M-Pesa number)."""

    # Raw event for debug / audit. Keep the full payload so a future
    # reconciliation pass can pick up additional fields without a
    # migration.
    raw_event: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )
    """Raw `transfer.*` event payload from Paystack for audit + debug."""

    organization = relationship(
        "Organization",
        lazy="raise",
        viewonly=True,
    )

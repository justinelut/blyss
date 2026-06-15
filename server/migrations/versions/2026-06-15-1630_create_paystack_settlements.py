"""create paystack_settlements table

Records every Paystack `transfer.*` webhook event so the dashboard payouts
ledger reflects real settlement events instead of a T+2 estimate.

Revision ID: paystack_settlements_001
Revises: storefront_theme_001
Create Date: 2026-06-15 16:30:00
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "paystack_settlements_001"
down_revision = "storefront_theme_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "paystack_settlements",
        # RecordModel base columns
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "modified_at",
            sa.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        # Paystack identity
        sa.Column("paystack_transfer_id", sa.String(length=64), nullable=False),
        sa.Column("paystack_transfer_code", sa.String(length=64), nullable=True),
        sa.Column("paystack_subaccount_code", sa.String(length=64), nullable=True),
        # Resolved organization (nullable so unmatched events still persist)
        sa.Column("organization_id", sa.Uuid(), nullable=True),
        # Money
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        # Timing + status
        sa.Column("settled_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        # Recipient details for the dashboard line
        sa.Column("recipient_name", sa.String(length=255), nullable=True),
        sa.Column("recipient_account_last4", sa.String(length=8), nullable=True),
        # Raw event for audit
        sa.Column(
            "raw_event",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "paystack_transfer_id",
            name="uq_paystack_settlements_transfer_id",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="SET NULL",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'success', 'failed', 'reversed')",
            name="ck_paystack_settlements_status",
        ),
    )
    op.create_index(
        "ix_paystack_settlements_org_settled_at",
        "paystack_settlements",
        ["organization_id", "settled_at"],
    )
    op.create_index(
        "ix_paystack_settlements_organization_id",
        "paystack_settlements",
        ["organization_id"],
    )
    op.create_index(
        "ix_paystack_settlements_paystack_subaccount_code",
        "paystack_settlements",
        ["paystack_subaccount_code"],
    )
    op.create_index(
        "ix_paystack_settlements_status",
        "paystack_settlements",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_paystack_settlements_status",
        table_name="paystack_settlements",
    )
    op.drop_index(
        "ix_paystack_settlements_paystack_subaccount_code",
        table_name="paystack_settlements",
    )
    op.drop_index(
        "ix_paystack_settlements_organization_id",
        table_name="paystack_settlements",
    )
    op.drop_index(
        "ix_paystack_settlements_org_settled_at",
        table_name="paystack_settlements",
    )
    op.drop_table("paystack_settlements")

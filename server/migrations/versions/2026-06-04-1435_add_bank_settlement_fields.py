"""add_bank_settlement_fields_to_organization

Revision ID: bank_settle_001
Revises: 32a856673190
Create Date: 2026-06-04 14:35:00.000000

Adds bank settlement columns to support bank payouts via Paystack.

Paystack's subaccount API accepts a settlement_bank (Paystack-recognized
KE bank code, or "mpesa" for M-Pesa) plus an account_number. M-Pesa uses
the phone number; bank payouts use the actual bank account number. Storing
these three columns lets a creator pick "bank" as their payout method in
Settings → Finance, configure their bank details, and have us provision
the Paystack subaccount with bank settlement.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "bank_settle_001"
down_revision = "32a856673190"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("bank_code", sa.String(), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("bank_account_number", sa.String(), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("bank_account_name", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("organizations", "bank_account_name")
    op.drop_column("organizations", "bank_account_number")
    op.drop_column("organizations", "bank_code")

"""add_paystack_fields_to_organization

Revision ID: c12477d57224
Revises: 9b73bce01fd4
Create Date: 2026-03-17 03:01:28.929134

"""

import sqlalchemy as sa
from alembic import op

# Polar Custom Imports
from polar.kit.extensions.sqlalchemy.types import StringEnum
from polar.models.organization import PayoutMethod, SubaccountStatus

# revision identifiers, used by Alembic.
revision = "c12477d57224"
down_revision = "9b73bce01fd4"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    # Add subaccount_code column (nullable string)
    op.add_column(
        "organizations",
        sa.Column("subaccount_code", sa.String(), nullable=True),
    )

    # Add subaccount_status column (enum: pending/active/failed)
    op.add_column(
        "organizations",
        sa.Column(
            "subaccount_status",
            StringEnum(SubaccountStatus),
            nullable=True,
            server_default=SubaccountStatus.PENDING.value,
        ),
    )

    # Add mpesa_number column (nullable string)
    op.add_column(
        "organizations",
        sa.Column("mpesa_number", sa.String(), nullable=True),
    )

    # Add mpesa_verified column (boolean, default false)
    op.add_column(
        "organizations",
        sa.Column(
            "mpesa_verified",
            sa.Boolean(),
            nullable=True,
            server_default="false",
        ),
    )

    # Add payout_method column (enum: bank/mpesa)
    op.add_column(
        "organizations",
        sa.Column(
            "payout_method",
            StringEnum(PayoutMethod),
            nullable=True,
            server_default=PayoutMethod.BANK.value,
        ),
    )

    # Backfill existing organizations with default values
    op.execute(
        """
        UPDATE organizations
        SET subaccount_status = 'pending'
        WHERE subaccount_status IS NULL;
        """
    )

    op.execute(
        """
        UPDATE organizations
        SET mpesa_verified = false
        WHERE mpesa_verified IS NULL;
        """
    )

    op.execute(
        """
        UPDATE organizations
        SET payout_method = 'bank'
        WHERE payout_method IS NULL;
        """
    )

    # Make columns non-nullable after backfilling
    op.alter_column("organizations", "subaccount_status", nullable=False)
    op.alter_column("organizations", "mpesa_verified", nullable=False)
    op.alter_column("organizations", "payout_method", nullable=False)


def downgrade() -> None:
    op.drop_column("organizations", "payout_method")
    op.drop_column("organizations", "mpesa_verified")
    op.drop_column("organizations", "mpesa_number")
    op.drop_column("organizations", "subaccount_status")
    op.drop_column("organizations", "subaccount_code")

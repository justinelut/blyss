"""add donation flags: products.accepts_donations + organizations.tipping_enabled

Revision ID: donation_flags_001
Revises: runtime_settings_001
Create Date: 2026-06-05 10:30:00.000000

Adds two boolean opt-in flags powering inline Paystack-native tipping:

- products.accepts_donations — product detail page shows a "Tip the creator"
  CTA when true.
- organizations.tipping_enabled — creator opted into receiving tips; gates the
  "Tip" affordance on the storefront hero, creator cards, directory,
  marketplace and search.

Both default to false with a server_default so the backfill on existing rows is
non-null and the columns are safe to add online.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "donation_flags_001"
down_revision = "runtime_settings_001"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column(
            "accepts_donations",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "tipping_enabled",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )


def downgrade() -> None:
    op.drop_column("organizations", "tipping_enabled")
    op.drop_column("products", "accepts_donations")

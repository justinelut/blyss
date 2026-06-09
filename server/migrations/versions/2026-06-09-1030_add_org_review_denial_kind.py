"""add organization_reviews.denial_kind column

Revision ID: org_review_denial_kind_001
Revises: paystack_pending_to_active_001
Create Date: 2026-06-09 10:30:00.000000

Adds a nullable `denial_kind` column so a FAIL verdict can be classified
as 'country' (creator's region not enabled yet — dashboard routes them to
a waitlist form) vs 'policy' (standard denial with the appeal flow).

Guarded with IF NOT EXISTS for idempotency across environments.
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "org_review_denial_kind_001"
down_revision = "paystack_pending_to_active_001"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE organization_reviews "
        "ADD COLUMN IF NOT EXISTS denial_kind VARCHAR"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE organization_reviews DROP COLUMN IF EXISTS denial_kind"
    )

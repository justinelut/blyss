"""Add is_admin column to user_organizations.

Blyss runs Paystack, not Stripe Connect. The legacy upstream
"organization admin" concept lived on the Stripe Account row
(Account.admin_id) and was unusable for Paystack orgs — every
"Make Admin" click in the backoffice 400'd because Account didn't
exist for Kenyan creators.

This migration adds an is_admin boolean directly to the
user_organizations junction table, giving Blyss a Paystack-native
per-member admin role:

  - is_admin defaults to False at row insert.
  - The first user added to an organization is automatically promoted
    to admin via the data-fix block below (one admin per org). New
    orgs going forward get their first member promoted in
    organization_service.add_user (separate code change).
  - Multiple admins per org are allowed by the schema — the schema
    is intentionally permissive so a creator can hand off without a
    privileged-action handover dance. The backoffice "Make Admin"
    button promotes; demotion is a separate action handled in code.

Revision ID: user_org_is_admin_001
Revises: creator_waitlist_001
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "user_org_is_admin_001"
down_revision = "creator_waitlist_001"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    # 1) Add the column, default False at the database layer so existing
    #    rows pick it up without a NULL value.
    op.add_column(
        "user_organizations",
        sa.Column(
            "is_admin",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # 2) Backfill: promote the OLDEST member of each organization to
    #    admin. UserOrganization.created_at is a TimestampedModel column,
    #    so MIN(created_at) per org gives us the founder/first member.
    #    DISTINCT ON keeps the row with the smallest created_at per org
    #    (Postgres-only; Blyss is Postgres-only).
    op.execute(
        """
        UPDATE user_organizations
        SET is_admin = TRUE
        WHERE (organization_id, user_id) IN (
            SELECT DISTINCT ON (organization_id) organization_id, user_id
            FROM user_organizations
            WHERE deleted_at IS NULL
            ORDER BY organization_id, created_at ASC
        )
        """
    )

    # 3) Index for the typical "is X an admin of org Y?" lookup. Keep
    #    the existing PK (user_id, organization_id) — this index just
    #    speeds up the partial scan when listing admins.
    op.create_index(
        "ix_user_organizations_org_admin",
        "user_organizations",
        ["organization_id"],
        postgresql_where=sa.text("is_admin = TRUE"),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_user_organizations_org_admin",
        table_name="user_organizations",
    )
    op.drop_column("user_organizations", "is_admin")

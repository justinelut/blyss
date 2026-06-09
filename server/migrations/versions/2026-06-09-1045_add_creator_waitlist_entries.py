"""add creator_waitlist_entries table

Revision ID: creator_waitlist_001
Revises: org_review_denial_kind_001
Create Date: 2026-06-09 10:45:00.000000

Stores creators denied during AI review because their country isn't
enabled yet, who left their email for notification. Backoffice
aggregates by country to gauge market demand.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import CITEXT

# revision identifiers, used by Alembic.
revision = "creator_waitlist_001"
down_revision = "org_review_denial_kind_001"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    op.create_table(
        "creator_waitlist_entries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("modified_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("email", CITEXT(), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=True),
        sa.Column("source", sa.String(length=64), nullable=True),
        sa.Column("organization_id", sa.Uuid(), nullable=True),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "email", "country_code", name="uq_creator_waitlist_email_country"
        ),
    )
    op.create_index(
        op.f("ix_creator_waitlist_entries_email"),
        "creator_waitlist_entries",
        ["email"],
    )
    op.create_index(
        op.f("ix_creator_waitlist_entries_country_code"),
        "creator_waitlist_entries",
        ["country_code"],
    )
    op.create_index(
        op.f("ix_creator_waitlist_entries_organization_id"),
        "creator_waitlist_entries",
        ["organization_id"],
    )
    op.create_index(
        op.f("ix_creator_waitlist_entries_user_id"),
        "creator_waitlist_entries",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_creator_waitlist_entries_user_id"),
        table_name="creator_waitlist_entries",
    )
    op.drop_index(
        op.f("ix_creator_waitlist_entries_organization_id"),
        table_name="creator_waitlist_entries",
    )
    op.drop_index(
        op.f("ix_creator_waitlist_entries_country_code"),
        table_name="creator_waitlist_entries",
    )
    op.drop_index(
        op.f("ix_creator_waitlist_entries_email"),
        table_name="creator_waitlist_entries",
    )
    op.drop_table("creator_waitlist_entries")

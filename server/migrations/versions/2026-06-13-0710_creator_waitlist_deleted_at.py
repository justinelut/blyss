"""Add missing deleted_at column to creator_waitlist_entries.

The CreatorWaitlistEntry SQLAlchemy model inherits from TimestampedModel
which includes ``created_at``, ``modified_at``, AND ``deleted_at``. The
original create_table migration (creator_waitlist_001) shipped only the
first two columns, so every SELECT against the model crashed in
production with::

    UndefinedColumnError: column creator_waitlist_entries.deleted_at
    does not exist

The 500 surfaced as a fatal error on the backoffice
``/backoffice/creator-waitlist/`` page (used by ops to review demand
by country and decide which markets to enable).

This migration backfills the column in shape with the rest of the
TimestampedModel tables (TIMESTAMP WITH TIME ZONE, nullable, indexed
on the column for soft-delete filters).

Revision ID: creator_waitlist_deleted_at_001
Revises: user_org_is_admin_001
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "creator_waitlist_deleted_at_001"
down_revision = "user_org_is_admin_001"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    op.add_column(
        "creator_waitlist_entries",
        sa.Column(
            "deleted_at",
            sa.TIMESTAMP(timezone=True),
            nullable=True,
        ),
    )
    op.create_index(
        op.f("ix_creator_waitlist_entries_deleted_at"),
        "creator_waitlist_entries",
        ["deleted_at"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_creator_waitlist_entries_deleted_at"),
        table_name="creator_waitlist_entries",
    )
    op.drop_column("creator_waitlist_entries", "deleted_at")

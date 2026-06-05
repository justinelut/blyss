"""add missing creator_categories.deleted_at column

Revision ID: creator_categories_002
Revises: creator_categories_001
Create Date: 2026-06-05 14:10:00.000000

creator_categories_001 created the table without the RecordModel `deleted_at`
soft-delete column, so SQLAlchemy's SELECT (which lists deleted_at) failed with
'column creator_categories.deleted_at does not exist'. This adds the column.

Guarded with IF NOT EXISTS so it's a no-op on environments where
creator_categories_001 was re-run after being fixed to include the column.
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "creator_categories_002"
down_revision = "creator_categories_001"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE creator_categories "
        "ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE creator_categories DROP COLUMN IF EXISTS deleted_at")

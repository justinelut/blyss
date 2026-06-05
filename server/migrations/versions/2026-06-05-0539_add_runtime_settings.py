"""add_runtime_settings

Revision ID: runtime_settings_001
Revises: bank_settle_001
Create Date: 2026-06-05 05:39:00.000000

DB-backed overlay for integration secrets. Rows with status='active' win
over env; pending/failed rows fall through to env.
"""

import sqlalchemy as sa
from alembic import op

revision = "runtime_settings_001"
down_revision = "bank_settle_001"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    op.create_table(
        "runtime_settings",
        sa.Column("key", sa.Text(), primary_key=True),
        sa.Column("encrypted_value", sa.LargeBinary(), nullable=False),
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("last_verified_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("value_hash", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_by_user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("runtime_settings")

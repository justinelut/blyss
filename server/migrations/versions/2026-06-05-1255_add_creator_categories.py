"""add creator_categories table + organizations.creator_category_id

Revision ID: creator_categories_001
Revises: donation_flags_001
Create Date: 2026-06-05 12:55:00.000000

Backoffice-managed creator categories surfaced as filters on /creators and
selectable by creators in onboarding + settings. Seeds the initial set
(Designers, Writers, Musicians, Educators, Photographers, Developers). The
"All" directory tab is UI-only and not stored.
"""

import uuid

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "creator_categories_001"
down_revision = "donation_flags_001"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


_SEED = [
    ("designers", "Designers"),
    ("writers", "Writers"),
    ("musicians", "Musicians"),
    ("educators", "Educators"),
    ("photographers", "Photographers"),
    ("developers", "Developers"),
]


def upgrade() -> None:
    op.create_table(
        "creator_categories",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("modified_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("slug", postgresql_citext(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "display_order", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default="true"
        ),
    )
    op.create_unique_constraint(
        "creator_categories_slug_key", "creator_categories", ["slug"]
    )

    op.add_column(
        "organizations",
        sa.Column("creator_category_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "organizations_creator_category_id_fkey",
        "organizations",
        "creator_categories",
        ["creator_category_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Seed the initial category set.
    creator_categories = sa.table(
        "creator_categories",
        sa.column("id", sa.Uuid()),
        sa.column("slug", sa.String()),
        sa.column("name", sa.String()),
        sa.column("display_order", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
    )
    op.bulk_insert(
        creator_categories,
        [
            {
                "id": uuid.uuid4(),
                "slug": slug,
                "name": name,
                "display_order": i,
                "is_active": True,
            }
            for i, (slug, name) in enumerate(_SEED)
        ],
    )


def downgrade() -> None:
    op.drop_constraint(
        "organizations_creator_category_id_fkey",
        "organizations",
        type_="foreignkey",
    )
    op.drop_column("organizations", "creator_category_id")
    op.drop_table("creator_categories")


def postgresql_citext():
    """Return the CITEXT type, importing lazily so the migration module loads
    even if the dialect import path changes."""
    from sqlalchemy.dialects.postgresql import CITEXT

    return CITEXT()

"""seed default product_categories for Blyss

Revision ID: seed_product_categories_001
Revises: creator_categories_002
Create Date: 2026-06-07 12:50:00.000000

The product_categories table was created back in 2026-03-20 by the
add_marketplace_features migration but was never seeded — so the
public /v1/categories/ endpoint was returning an empty list and
the marketplace /categories index page was blank.

Seeds a sensible default set covering the primary digital-product
categories Blyss creators sell into: Templates, Beats, Ebooks,
Courses, Presets, Photography, Software, Design, Video, Writing.

The set is conservative — enough to get the index page rendering
without making product-creators feel boxed-in to a narrow taxonomy.
Backoffice operators can add or update via the existing
POST/PUT /v1/categories/* endpoints.

Idempotent: skips rows whose slug already exists, so re-running on
an environment that's been hand-seeded won't double up.
"""

import uuid

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "seed_product_categories_001"
down_revision = "creator_categories_002"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


_SEED = [
    # (slug, name, description, display_order)
    (
        "templates",
        "Templates",
        "Notion templates, design files, spreadsheets, productivity systems.",
        0,
    ),
    (
        "ebooks",
        "Ebooks",
        "Long-form digital reads — guides, nonfiction, fiction.",
        1,
    ),
    (
        "courses",
        "Courses",
        "Structured lessons, video series, cohort programmes.",
        2,
    ),
    (
        "beats",
        "Beats & Music",
        "Instrumentals, sample packs, stems, music production.",
        3,
    ),
    (
        "presets",
        "Presets",
        "Lightroom presets, audio presets, plugin chains.",
        4,
    ),
    (
        "photography",
        "Photography",
        "Stock photo packs, prints, photo zines.",
        5,
    ),
    (
        "software",
        "Software",
        "Apps, scripts, tools, plugins, source code.",
        6,
    ),
    (
        "design",
        "Design Assets",
        "Fonts, icons, illustrations, mockups, UI kits.",
        7,
    ),
    (
        "video",
        "Video & Film",
        "Short films, documentaries, video lessons, LUTs.",
        8,
    ),
    (
        "writing",
        "Writing",
        "Newsletters, articles, journalism, scripts.",
        9,
    ),
]


def upgrade() -> None:
    bind = op.get_bind()

    # Idempotent insert — pull existing slugs first so re-running on a
    # hand-seeded env (or after a partial rollback) doesn't violate the
    # uq_product_category_slug uniqueness constraint.
    existing_slugs = {
        row[0]
        for row in bind.execute(
            sa.text("SELECT slug FROM product_categories")
        ).fetchall()
    }

    insert_sql = sa.text(
        """
        INSERT INTO product_categories
          (id, name, slug, description, display_order, is_active, created_at)
        VALUES
          (:id, :name, :slug, :description, :display_order, :is_active, now())
        """
    )

    for slug, name, description, display_order in _SEED:
        if slug in existing_slugs:
            continue
        bind.execute(
            insert_sql,
            {
                "id": uuid.uuid4(),
                "name": name,
                "slug": slug,
                "description": description,
                "display_order": display_order,
                "is_active": True,
            },
        )


def downgrade() -> None:
    # Only delete the slugs we seeded — leaves any hand-added categories
    # intact for safer rollback.
    slugs = [slug for (slug, *_rest) in _SEED]
    op.execute(
        sa.text(
            "DELETE FROM product_categories WHERE slug = ANY(:slugs)"
        ).bindparams(
            sa.bindparam("slugs", value=slugs, type_=sa.ARRAY(sa.String()))
        )
    )

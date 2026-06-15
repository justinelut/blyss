"""Add storefront theme columns + version hash to organizations.

Per plan §19 (storefront themes spec) §19.6.1. Three columns drive the
v1→v3 theme system:

  - ``theme_layout`` — closed-enum slug of the layout component to render
    on /creators/{slug}. v1 only mounts ``editorial``; the CHECK
    constraint accepts the full set so v2/v3 layouts ship behind a
    feature flag without a schema migration.
  - ``theme_tokens`` — JSONB blob with the curated palette / font /
    display style / motion choice. Validated against
    ``polar.organization.theme_schemas.StorefrontTokens`` at the
    PATCH endpoint. Default matches Blyss' current rendering so no
    visible change for any existing creator.
  - ``theme_modules`` — JSONB array of opt-in niche modules
    (``waveform_player``, ``recipe_card``, …). v3 adds component
    implementations; v1 ships the column empty.

A fourth column ``theme_version_hash`` carries a SHA-256 of the
canonicalised theme triple. Used as a cache key for SSR storefront
renders (per §19.7.2) — when a creator saves a theme change the hash
flips and the cache key changes, so the next visitor gets a fresh
render with no explicit invalidation. Backfilled in this migration so
existing rows ship a stable initial value.

Revision ID: storefront_theme_001
Revises: creator_waitlist_deleted_at_001
"""

import hashlib
import json

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = "storefront_theme_001"
down_revision = "creator_waitlist_deleted_at_001"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


# Default token blob — matches STOREFRONT_TOKENS_DEFAULTS in
# both `clients/web/src/types/storefront-theme.ts` and
# `server/polar/organization/theme_schemas.py`. Kept here as a literal
# rather than imported so the migration is self-contained and can run
# even if the model layer changes shape later.
_DEFAULT_TOKENS = {
    "accent": "burnt-orange",
    "headline_font": "space-grotesk",
    "display_style": "editorial",
    "motion": "standard",
}
_DEFAULT_LAYOUT = "editorial"
_DEFAULT_MODULES: list = []
_VALID_LAYOUTS = (
    "editorial",
    "gallery",
    "catalog",
    "portfolio",
    "studio",
)


def _initial_version_hash() -> str:
    """Mirror the runtime hash function so rows backfilled here match
    what the SQLAlchemy event hook will produce on first save."""

    canonical = json.dumps(
        {
            "layout": _DEFAULT_LAYOUT,
            "tokens": _DEFAULT_TOKENS,
            "modules": _DEFAULT_MODULES,
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column(
            "theme_layout",
            sa.String(length=32),
            nullable=False,
            server_default=_DEFAULT_LAYOUT,
        ),
    )
    op.create_check_constraint(
        "ck_organizations_theme_layout_valid",
        "organizations",
        f"theme_layout IN ({', '.join(repr(s) for s in _VALID_LAYOUTS)})",
    )
    op.add_column(
        "organizations",
        sa.Column(
            "theme_tokens",
            JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text(f"'{json.dumps(_DEFAULT_TOKENS)}'::jsonb"),
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "theme_modules",
            JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "theme_version_hash",
            sa.String(length=64),
            nullable=True,
        ),
    )

    # Backfill `theme_version_hash` for every existing row with the
    # default-tokens hash. Subsequent saves will recompute via the
    # SQLAlchemy `before_update` hook on the model.
    op.execute(
        sa.text(
            "UPDATE organizations SET theme_version_hash = :h "
            "WHERE theme_version_hash IS NULL"
        ).bindparams(h=_initial_version_hash())
    )


def downgrade() -> None:
    op.drop_column("organizations", "theme_version_hash")
    op.drop_column("organizations", "theme_modules")
    op.drop_column("organizations", "theme_tokens")
    op.drop_constraint(
        "ck_organizations_theme_layout_valid",
        "organizations",
        type_="check",
    )
    op.drop_column("organizations", "theme_layout")

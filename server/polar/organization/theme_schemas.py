"""Storefront theme — Pydantic schemas.

Mirror of `clients/web/src/types/storefront-theme.ts`. The two sides MUST
stay in lock-step; if you add a token or a layout slug here, also add it
on the TypeScript side and vice versa. The acceptance test
`server/tests/organization/test_storefront_theme.py` enforces the
allow-list at the API boundary so unknown keys are rejected with 422
instead of silently persisted.

Per plan §19 (storefront themes spec).
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import ConfigDict, Field

from polar.kit.schemas import Schema

# ---------------------------------------------------------------------------
# Layer 1 — Tokens (§19.3)
# ---------------------------------------------------------------------------

# Curated palette accents. Adding a new entry requires:
#  1. New entry in clients/web/src/design/storefront-palette.ts
#  2. WCAG contrast test passes on the new value
#  3. New entry in the AccentName Literal below
AccentName = Literal[
    "burnt-orange",
    "forest",
    "clay",
    "ink",
    "oxblood",
    "bronze",
    "cobalt",
    "aubergine",
]

# Curated headline-display fonts. Body type is always Inter (locked).
HeadlineFont = Literal[
    "space-grotesk",
    "inter-display",
    "cormorant-garamond",
    "inter-tight",
]

DisplayStyle = Literal["editorial", "minimal", "bold"]
Motion = Literal["subtle", "standard", "expressive"]


class StorefrontTokens(Schema):
    """Token shape persisted on `organizations.theme_tokens`.

    `extra='forbid'` — any client-supplied unknown key returns 422 with
    the field path. This is the security boundary that makes the closed
    enum design enforceable.
    """

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    accent: AccentName = Field(
        default="burnt-orange",
        description="Curated accent name. See plan §19.3.2.",
    )
    accent_secondary: AccentName | None = Field(
        default=None,
        description=(
            "Optional override for the paired secondary accent. Each "
            "primary accent ships with a default secondary; this field "
            "lets the creator override it. Reserved for v3+ modules."
        ),
    )
    headline_font: HeadlineFont = Field(
        default="space-grotesk",
        description="Curated display-font name. See plan §19.3.3.",
    )
    display_style: DisplayStyle = Field(
        default="editorial",
        description="Typography preset bundle. See plan §19.3.3.",
    )
    motion: Motion = Field(
        default="standard",
        description="Motion intensity multiplier. See plan §19.3.4.",
    )


# Default value applied to every existing org on migration. Must match
# clients/web/src/types/storefront-theme.ts STOREFRONT_TOKENS_DEFAULTS.
STOREFRONT_TOKENS_DEFAULTS: dict[str, Any] = {
    "accent": "burnt-orange",
    "headline_font": "space-grotesk",
    "display_style": "editorial",
    "motion": "standard",
}


# ---------------------------------------------------------------------------
# Layer 2 — Layouts (§19.4)
# ---------------------------------------------------------------------------

StorefrontLayoutSlug = Literal[
    "editorial",
    "gallery",
    "catalog",
    "portfolio",
    "studio",
]

DEFAULT_STOREFRONT_LAYOUT: StorefrontLayoutSlug = "editorial"


# ---------------------------------------------------------------------------
# Layer 3 — Niche modules (§19.5)
# ---------------------------------------------------------------------------

ModuleKind = Literal[
    "waveform_player",
    "before_after_slider",
    "recipe_card",
    "curriculum_outline",
    "palette_swatches",
    "license_tier_picker",
    "specimens",
]


class EnabledModule(Schema):
    """A single enabled module on a creator's storefront.

    `settings` is left as a free-form dict at this layer. v3 will add a
    per-kind validator that picks the right Zod / Pydantic schema based
    on `kind` and validates `settings` against it. v1 just stores the
    enable / disable flag and ordering.
    """

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    kind: ModuleKind
    enabled: bool = True
    settings: dict[str, Any] = Field(default_factory=dict)
    display_order: int = Field(default=0, ge=0, le=99)


# ---------------------------------------------------------------------------
# Endpoint payloads
# ---------------------------------------------------------------------------


class StorefrontTokensUpdate(Schema):
    """PATCH body for `/v1/organizations/{id}/storefront/tokens`.

    Same shape as `StorefrontTokens` — having a separate Update schema
    leaves room for v2+ to make fields optional (partial updates).
    """

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    accent: AccentName
    accent_secondary: AccentName | None = None
    headline_font: HeadlineFont
    display_style: DisplayStyle
    motion: Motion


class StorefrontTokensPreviewResponse(Schema):
    """Return shape from `/v1/organizations/{id}/storefront/tokens/preview`.

    The `preview_token` is a signed string the dashboard's iframe passes
    as `?preview_theme=` to render the storefront with the unsaved
    tokens. See plan §19.7.3.
    """

    preview_token: Annotated[
        str,
        Field(description="HMAC-signed token referencing a Redis draft."),
    ]
    expires_in: Annotated[
        int,
        Field(description="Seconds until the draft is purged."),
    ]


class StorefrontTokensUpdateResponse(Schema):
    """Return shape from `PATCH /v1/organizations/{id}/storefront/tokens`.

    A minimal echo — the dashboard reloads after save (full SSR
    refresh picks up the new tokens), so the endpoint doesn't need to
    return the full storefront payload. Keeping this small avoids the
    `Organization.products` lazy-load trap on the save path: the org
    is loaded for write here, not with the eager-product-relationship
    options the public GET uses.
    """

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    theme_layout: StorefrontLayoutSlug
    theme_tokens: dict[str, Any]
    theme_modules: list[dict[str, Any]]
    theme_version_hash: str


class StorefrontLayoutUpdate(Schema):
    """PATCH body for `/v1/organizations/{id}/storefront/layout` (§19.4).

    The closed-enum here is the security boundary: layouts outside
    the curated five return 422.
    """

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    layout: StorefrontLayoutSlug


class StorefrontModulesUpdate(Schema):
    """PATCH body for `/v1/organizations/{id}/storefront/modules` (§19.5).

    The list may be empty (no modules enabled). `extra='forbid'` on
    each EnabledModule blocks unknown kinds.
    """

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    modules: list[EnabledModule] = Field(default_factory=list, max_length=20)


class StorefrontPreviewBody(Schema):
    """POST body for `/v1/organizations/{id}/storefront/tokens/preview`.

    Each axis is optional. The draft envelope only carries the axes
    the dashboard sent — the public-page splice falls back to the
    saved row's value for any missing axis. Per plan §19.6.3.
    """

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    tokens: StorefrontTokensUpdate | None = None
    layout: StorefrontLayoutSlug | None = None
    modules: list[EnabledModule] | None = Field(default=None, max_length=20)


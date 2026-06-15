"""Unit tests for storefront theme Pydantic schemas.

Pure validation tests — no DB, no async, no fixtures. These assert
the security boundary at /v1/organizations/{id}/storefront/tokens:
unknown keys rejected, unknown values rejected, defaults applied
correctly, every Literal value accepted.

Per plan §19.3.1.
"""

import pytest
from pydantic import ValidationError

from polar.organization.theme_schemas import (
    STOREFRONT_TOKENS_DEFAULTS,
    EnabledModule,
    StorefrontTokens,
    StorefrontTokensUpdate,
)


class TestStorefrontTokens:
    def test_defaults_applied(self) -> None:
        t = StorefrontTokens()
        assert t.accent == "burnt-orange"
        assert t.headline_font == "space-grotesk"
        assert t.display_style == "editorial"
        assert t.motion == "standard"
        assert t.accent_secondary is None

    def test_all_palette_accents_accepted(self) -> None:
        for accent in [
            "burnt-orange",
            "forest",
            "clay",
            "ink",
            "oxblood",
            "bronze",
            "cobalt",
            "aubergine",
        ]:
            t = StorefrontTokens(accent=accent)  # type: ignore[arg-type]
            assert t.accent == accent

    def test_all_fonts_accepted(self) -> None:
        for font in [
            "space-grotesk",
            "inter-display",
            "cormorant-garamond",
            "inter-tight",
        ]:
            t = StorefrontTokens(headline_font=font)  # type: ignore[arg-type]
            assert t.headline_font == font

    def test_unknown_accent_rejected(self) -> None:
        with pytest.raises(ValidationError) as exc:
            StorefrontTokens(accent="lavender")  # type: ignore[arg-type]
        # Pydantic's `literal_error` carries the input field path.
        errors = exc.value.errors()
        assert any(e["loc"] == ("accent",) for e in errors)

    def test_unknown_font_rejected(self) -> None:
        with pytest.raises(ValidationError):
            StorefrontTokens(headline_font="comic-sans")  # type: ignore[arg-type]

    def test_unknown_display_style_rejected(self) -> None:
        with pytest.raises(ValidationError):
            StorefrontTokens(display_style="brutalist")  # type: ignore[arg-type]

    def test_unknown_motion_rejected(self) -> None:
        with pytest.raises(ValidationError):
            StorefrontTokens(motion="hyperactive")  # type: ignore[arg-type]

    def test_extra_key_rejected(self) -> None:
        # extra='forbid' is the security boundary that makes the
        # closed-enum design enforceable. A creator cannot smuggle
        # arbitrary CSS via this endpoint.
        with pytest.raises(ValidationError) as exc:
            StorefrontTokens(  # type: ignore[call-arg]
                accent="burnt-orange",
                custom_css="body { display: none; }",
            )
        errors = exc.value.errors()
        assert any(e["type"] == "extra_forbidden" for e in errors)

    def test_accent_secondary_is_optional(self) -> None:
        t = StorefrontTokens(accent="cobalt", accent_secondary="bronze")
        assert t.accent_secondary == "bronze"

    def test_secondary_must_also_be_palette_entry(self) -> None:
        with pytest.raises(ValidationError):
            StorefrontTokens(  # type: ignore[arg-type]
                accent="cobalt", accent_secondary="hot-pink"
            )

    def test_defaults_constant_matches_pydantic_defaults(self) -> None:
        # The migration backfills + the model `default=` literal both
        # consume STOREFRONT_TOKENS_DEFAULTS, so it MUST equal what a
        # bare StorefrontTokens() produces.
        t = StorefrontTokens()
        for key, value in STOREFRONT_TOKENS_DEFAULTS.items():
            assert getattr(t, key) == value


class TestStorefrontTokensUpdate:
    def test_all_fields_required(self) -> None:
        # The Update schema doesn't have defaults — the dashboard
        # always sends a complete payload. Missing fields → 422.
        with pytest.raises(ValidationError):
            StorefrontTokensUpdate(  # type: ignore[call-arg]
                accent="forest",
            )

    def test_full_payload_round_trips(self) -> None:
        u = StorefrontTokensUpdate(
            accent="forest",
            headline_font="cormorant-garamond",
            display_style="minimal",
            motion="subtle",
        )
        dump = u.model_dump(mode="json")
        # Round-trip through the saved-shape Pydantic model — this is
        # what the PATCH endpoint persists to JSONB.
        re_parsed = StorefrontTokens(**dump)
        assert re_parsed.accent == "forest"
        assert re_parsed.headline_font == "cormorant-garamond"


class TestEnabledModule:
    def test_unknown_kind_rejected(self) -> None:
        with pytest.raises(ValidationError):
            EnabledModule(kind="ad_block")  # type: ignore[arg-type]

    def test_default_enabled_true(self) -> None:
        m = EnabledModule(kind="waveform_player")
        assert m.enabled is True
        assert m.settings == {}
        assert m.display_order == 0

    def test_extra_key_rejected(self) -> None:
        with pytest.raises(ValidationError):
            EnabledModule(  # type: ignore[call-arg]
                kind="recipe_card",
                injected_html="<script>",
            )

    def test_display_order_bounds(self) -> None:
        with pytest.raises(ValidationError):
            EnabledModule(kind="recipe_card", display_order=-1)
        with pytest.raises(ValidationError):
            EnabledModule(kind="recipe_card", display_order=100)

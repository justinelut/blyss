"""Tests for the multi-provider chain builder in
`polar.organization_review.analyzer._build_provider_chain`.

Background:
- The analyzer used to be hard-pinned to either Gemini or OpenAI. When the
  Gemini key hit a 429 RESOURCE_EXHAUSTED quota, the analyzer just kept
  failing — no fallback.
- New behaviour: scan for any of POLAR_GROQ_API_KEY,
  POLAR_CEREBRAS_API_KEY, POLAR_OPENROUTER_API_KEY,
  POLAR_GOOGLE_AI_API_KEY, POLAR_OPENAI_API_KEY in the env. Build a
  pydantic-ai FallbackModel from whichever are present. Order is
  free-tier-first, paid-last so the cheapest provider runs first and the
  paid ones only fire when everything else fails.

These tests pin the order, the empty-state, and the legacy
single-provider override.
"""

from __future__ import annotations

from importlib import reload

import pytest


# Each test mutates settings via env vars, so we reload the analyzer module
# fresh per test to pick up the new config.


def _set_env(monkeypatch, **overrides):
    """Reset every AI-provider env var, then apply the overrides. Reload
    config + analyzer modules so the cached `settings` object picks up the
    new values.

    NOTE: pydantic-settings reads from `.env`/`.env.testing`/`.env.test` AS
    WELL as the process env. `monkeypatch.delenv()` doesn't clear .env
    values, so we instead `setenv("", "")` for every key — pydantic treats
    an empty env var as a real override and skips the .env fallback.

    The analyzer module instantiates a singleton `review_analyzer` at
    import, which fails under the no-keys case. We swallow that during
    reload so the tests can still inspect `_build_provider_chain` and
    `ReviewAnalyzer` directly.
    """
    keys = [
        "POLAR_AI_PROVIDER",
        "POLAR_GROQ_API_KEY",
        "POLAR_CEREBRAS_API_KEY",
        "POLAR_OPENROUTER_API_KEY",
        "POLAR_GOOGLE_AI_API_KEY",
        "POLAR_OPENAI_API_KEY",
    ]
    for k in keys:
        monkeypatch.setenv(k, "")
    for k, v in overrides.items():
        monkeypatch.setenv(k, v)

    import polar.config as config_mod

    reload(config_mod)
    # If the reload fails because the analyzer's module-level singleton
    # can't init under the empty-keys case, return the importable module
    # without re-instantiating the singleton — tests still call the
    # constructor / chain builder directly.
    import polar.organization_review.analyzer as analyzer_mod

    try:
        reload(analyzer_mod)
    except ValueError:
        # Re-import without the module-level constructor running. We need
        # the helpers (_build_provider_chain, ReviewAnalyzer class), and
        # those exist on the previously-loaded module object — they just
        # failed at the singleton line. Drop the cached singleton so any
        # access via `analyzer_mod.review_analyzer` raises clearly.
        if hasattr(analyzer_mod, "review_analyzer"):
            del analyzer_mod.review_analyzer
    return analyzer_mod


class TestProviderChainBuilder:
    def test_no_keys_raises(self, monkeypatch):
        analyzer_mod = _set_env(monkeypatch, POLAR_AI_PROVIDER="auto")
        with pytest.raises(ValueError, match="No AI provider configured"):
            analyzer_mod._build_provider_chain()

    def test_single_provider_returns_bare_model(self, monkeypatch):
        analyzer_mod = _set_env(
            monkeypatch,
            POLAR_AI_PROVIDER="auto",
            POLAR_GROQ_API_KEY="test-groq",
        )
        from pydantic_ai.models.fallback import FallbackModel

        model, names = analyzer_mod._build_provider_chain()
        # Single provider — no FallbackModel wrapping (pydantic-ai's
        # FallbackModel adds overhead per call; skipping it for the trivial
        # single-key case keeps latency clean).
        assert not isinstance(model, FallbackModel)
        assert names == ["groq:llama-3.3-70b-versatile"]

    def test_two_keys_returns_fallback_model(self, monkeypatch):
        analyzer_mod = _set_env(
            monkeypatch,
            POLAR_AI_PROVIDER="auto",
            POLAR_GROQ_API_KEY="test-groq",
            POLAR_OPENROUTER_API_KEY="test-or",
        )
        from pydantic_ai.models.fallback import FallbackModel

        model, names = analyzer_mod._build_provider_chain()
        assert isinstance(model, FallbackModel)
        assert len(names) == 2
        # Order matters — Groq first (free, fastest), OpenRouter second.
        assert names == [
            "groq:llama-3.3-70b-versatile",
            "openrouter:meta-llama/llama-3.3-70b-instruct:free",
        ]

    def test_full_chain_orders_free_first_paid_last(self, monkeypatch):
        analyzer_mod = _set_env(
            monkeypatch,
            POLAR_AI_PROVIDER="auto",
            POLAR_GROQ_API_KEY="test-groq",
            POLAR_CEREBRAS_API_KEY="test-cerebras",
            POLAR_OPENROUTER_API_KEY="test-or",
            POLAR_GOOGLE_AI_API_KEY="test-gemini",
            POLAR_OPENAI_API_KEY="test-openai",
        )
        _model, names = analyzer_mod._build_provider_chain()
        # Strict order assertion — the analyzer's behavior depends on this.
        # Free tiers first (Groq → Cerebras → OpenRouter → Gemini), paid last
        # (OpenAI). Don't reorder without thinking through cost implications.
        provider_names = [n.split(":", 1)[0] for n in names]
        assert provider_names == [
            "groq",
            "cerebras",
            "openrouter",
            "gemini",
            "openai",
        ]

    def test_only_paid_provider_works(self, monkeypatch):
        analyzer_mod = _set_env(
            monkeypatch,
            POLAR_AI_PROVIDER="auto",
            POLAR_OPENAI_API_KEY="test-openai",
        )
        _model, names = analyzer_mod._build_provider_chain()
        assert names == ["openai:gpt-4o-mini"]


class TestAnalyzerInit:
    def test_auto_mode_with_two_keys_uses_chain(self, monkeypatch):
        analyzer_mod = _set_env(
            monkeypatch,
            POLAR_AI_PROVIDER="auto",
            POLAR_GROQ_API_KEY="test-groq",
            POLAR_GOOGLE_AI_API_KEY="test-gemini",
        )
        from pydantic_ai.models.fallback import FallbackModel

        analyzer = analyzer_mod.ReviewAnalyzer()
        assert isinstance(analyzer.model, FallbackModel)

    def test_auto_mode_with_one_key_uses_single_model(self, monkeypatch):
        analyzer_mod = _set_env(
            monkeypatch,
            POLAR_AI_PROVIDER="auto",
            POLAR_GROQ_API_KEY="test-groq",
        )
        from pydantic_ai.models.fallback import FallbackModel

        analyzer = analyzer_mod.ReviewAnalyzer()
        assert not isinstance(analyzer.model, FallbackModel)

    def test_auto_mode_no_keys_raises(self, monkeypatch):
        analyzer_mod = _set_env(monkeypatch, POLAR_AI_PROVIDER="auto")
        with pytest.raises(ValueError, match="No AI provider configured"):
            analyzer_mod.ReviewAnalyzer()

    def test_legacy_gemini_override_pins_single_provider(self, monkeypatch):
        # Even with Groq + OpenAI keys present, AI_PROVIDER=gemini must pin
        # to Gemini-only (legacy contract). FallbackModel must NOT be used.
        analyzer_mod = _set_env(
            monkeypatch,
            POLAR_AI_PROVIDER="gemini",
            POLAR_GROQ_API_KEY="test-groq",
            POLAR_GOOGLE_AI_API_KEY="test-gemini",
            POLAR_OPENAI_API_KEY="test-openai",
        )
        from pydantic_ai.models.fallback import FallbackModel
        from pydantic_ai.models.google import GoogleModel

        analyzer = analyzer_mod.ReviewAnalyzer()
        assert not isinstance(analyzer.model, FallbackModel)
        assert isinstance(analyzer.model, GoogleModel)

    def test_legacy_openai_override_pins_single_provider(self, monkeypatch):
        analyzer_mod = _set_env(
            monkeypatch,
            POLAR_AI_PROVIDER="openai",
            POLAR_GROQ_API_KEY="test-groq",
            POLAR_OPENAI_API_KEY="test-openai",
        )
        from pydantic_ai.models.fallback import FallbackModel
        from pydantic_ai.models.openai import OpenAIChatModel

        analyzer = analyzer_mod.ReviewAnalyzer()
        assert not isinstance(analyzer.model, FallbackModel)
        assert isinstance(analyzer.model, OpenAIChatModel)

    def test_legacy_gemini_override_without_key_raises(self, monkeypatch):
        analyzer_mod = _set_env(
            monkeypatch,
            POLAR_AI_PROVIDER="gemini",
            POLAR_GROQ_API_KEY="test-groq",  # plenty of other keys, doesn't matter
        )
        with pytest.raises(ValueError, match="GOOGLE_AI_API_KEY is required"):
            analyzer_mod.ReviewAnalyzer()

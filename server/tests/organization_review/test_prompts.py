"""Tests locking in the Blyss-context shape of the AI org-review prompts.

These exist because the upstream Polar prompt was generic SaaS framing — it
called the product "Polar", referenced Stripe's AUP, used USD thresholds, and
even labelled marketplaces as auto-deny (which would auto-deny every Blyss
creator, since Blyss IS a marketplace). This test stops those regressions.
"""
from __future__ import annotations

import re

from polar.organization_review.analyzer import (
    MANUAL_PREAMBLE,
    SETUP_COMPLETE_PREAMBLE,
    SUBMISSION_PREAMBLE,
    SYSTEM_PROMPT,
    THRESHOLD_PREAMBLE,
)


# ---- helpers ----------------------------------------------------------------


def _word(text: str, word: str) -> bool:
    """Match `word` as a whole word (case-insensitive)."""
    return re.search(rf"\b{re.escape(word)}\b", text, flags=re.IGNORECASE) is not None


# ---- system prompt ----------------------------------------------------------


class TestSystemPromptFraming:
    def test_names_blyss(self) -> None:
        assert _word(SYSTEM_PROMPT, "Blyss")

    def test_names_kenyan_creators(self) -> None:
        # The phrase "Kenyan creators" must appear so the model anchors on
        # the right merchant population.
        assert "Kenyan creators" in SYSTEM_PROMPT

    def test_mentions_paystack_not_stripe_aup(self) -> None:
        assert _word(SYSTEM_PROMPT, "Paystack")
        # We must not be invoking Stripe's AUP — Blyss is Paystack-based.
        assert not re.search(r"Stripe'?s? Acceptable Use", SYSTEM_PROMPT, re.I)
        assert "Stripe AUP" not in SYSTEM_PROMPT

    def test_mentions_mpesa(self) -> None:
        # M-Pesa is core to Blyss payouts and must be in the framing.
        assert re.search(r"M[\-\u2011]?Pesa", SYSTEM_PROMPT, re.I)

    def test_mentions_digital_products(self) -> None:
        assert "digital product" in SYSTEM_PROMPT.lower()

    def test_marketplace_is_not_auto_denied(self) -> None:
        # Upstream Polar prompt had "Marketplaces are prohibited regardless of
        # how they describe themselves." — that auto-denies every Blyss
        # creator. Lock against the exact regression sentence.
        assert "Marketplaces are prohibited" not in SYSTEM_PROMPT
        # And the prompt must explicitly tell the model NOT to flag the
        # marketplace business model.
        assert "Blyss IS a marketplace" in SYSTEM_PROMPT

    def test_thresholds_use_kes_not_usd(self) -> None:
        # The new prompt uses KSh thresholds, not $1000 USD.
        assert "KSh" in SYSTEM_PROMPT
        assert "$1,000" not in SYSTEM_PROMPT
        assert "$500/month" not in SYSTEM_PROMPT

    def test_lists_actually_prohibited_categories(self) -> None:
        # These need to be explicitly named so Gemini denies them.
        for needle in (
            "Financial trading signals",
            "Pyramid schemes",
            "Adult content",
            "Pirated software",
        ):
            assert needle in SYSTEM_PROMPT, f"missing prohibited category: {needle!r}"

    def test_no_generic_polar_property_examples(self) -> None:
        # The upstream prompt's Example 3 was a "Space Rental Marketplace" with
        # "property owners" — pure Polar legacy. None of those terms should
        # remain in the rewritten prompt.
        assert "property owners" not in SYSTEM_PROMPT
        assert "Space Rental Marketplace" not in SYSTEM_PROMPT
        assert "Dating Platform" not in SYSTEM_PROMPT


# ---- per-context preambles --------------------------------------------------


class TestPreamblesPaystackFraming:
    """SETUP_COMPLETE / THRESHOLD / MANUAL all reference Paystack, not Stripe."""

    def test_setup_complete_uses_paystack_subaccount(self) -> None:
        assert "Paystack subaccount" in SETUP_COMPLETE_PREAMBLE
        assert "Stripe Connect" not in SETUP_COMPLETE_PREAMBLE
        assert "Stripe verification errors" not in SETUP_COMPLETE_PREAMBLE
        assert "selfie_mismatch" not in SETUP_COMPLETE_PREAMBLE

    def test_setup_complete_thresholds_in_kes(self) -> None:
        assert "KSh" in SETUP_COMPLETE_PREAMBLE
        assert "$1,000" not in SETUP_COMPLETE_PREAMBLE

    def test_threshold_preamble_blyss_voice(self) -> None:
        assert _word(THRESHOLD_PREAMBLE, "Blyss")
        # The upstream "missing website is a red flag" rule was too harsh for
        # Blyss creators who run their entire store on Blyss.
        assert "blyss.co.ke" in THRESHOLD_PREAMBLE

    def test_manual_preamble_paystack(self) -> None:
        assert "Paystack subaccount" in MANUAL_PREAMBLE
        assert "Stripe Connect" not in MANUAL_PREAMBLE

    def test_submission_preamble_creator_voice(self) -> None:
        # Submission preamble talks to creators, not "merchants".
        assert _word(SUBMISSION_PREAMBLE, "creator")
        # No Stripe-specific framing in the merchant_summary examples.
        assert "Stripe verification errors" not in SUBMISSION_PREAMBLE
        # Approve copy must welcome the creator to Blyss, not Polar.
        assert "Welcome to Blyss" in SUBMISSION_PREAMBLE


class TestNoUpstreamPolarLeak:
    """The product is Blyss. The word "Polar" should not appear in any prompt
    text shown to the model. (Code-internal references like the package name
    `polar.config` are fine — they live outside the prompt strings.)"""

    def _prompt_corpus(self) -> str:
        return "\n".join(
            (
                SYSTEM_PROMPT,
                SUBMISSION_PREAMBLE,
                SETUP_COMPLETE_PREAMBLE,
                THRESHOLD_PREAMBLE,
                MANUAL_PREAMBLE,
            )
        )

    def test_no_polar_word_in_prompts(self) -> None:
        corpus = self._prompt_corpus()
        # Whole-word "Polar" — not "polar" inside a path or a code identifier
        # (the prompts are plain text so this is unambiguous).
        assert not re.search(r"\bPolar\b", corpus), (
            "The literal word 'Polar' appeared in a prompt shown to the model. "
            "Replace with 'Blyss'."
        )

    def test_no_merchant_of_record_phrase(self) -> None:
        corpus = self._prompt_corpus()
        assert "Merchant of Record" not in corpus
        assert "Stripe-based MoR" not in corpus

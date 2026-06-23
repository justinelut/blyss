"""Declarative registry of every secret manageable via backoffice."""

from __future__ import annotations

from dataclasses import dataclass

from polar.runtime_settings.verifiers import (
    VerifierFn,
    verify_cerebras,
    verify_gemini,
    verify_google_oauth_client_id,
    verify_google_oauth_client_secret,
    verify_groq,
    verify_loops,
    verify_openai,
    verify_openrouter,
    verify_paystack,
    verify_resend,
)


@dataclass(frozen=True)
class RegisteredKey:
    key: str
    category: str
    label: str
    description: str
    sensitive: bool = True
    requires_verification: bool = True
    verifier: VerifierFn | None = None
    # In-code fallback shown in the backoffice list when no DB row
    # AND no env var override exists. Only used for non-sensitive
    # settings — secrets always render masked. Persist as a string
    # so non-string types (ints, durations) round-trip cleanly through
    # the runtime_settings encryption layer.
    default_value: str | None = None


ALLOWED_CATEGORIES = {"payments", "email", "ai", "auth", "other"}

REGISTRY: list[RegisteredKey] = [
    RegisteredKey(
        key="PAYSTACK_SECRET_KEY",
        category="payments",
        label="Paystack Secret Key",
        description="Server-side Paystack API secret",
        verifier=verify_paystack,
    ),
    RegisteredKey(
        key="PAYSTACK_PUBLIC_KEY",
        category="payments",
        label="Paystack Public Key",
        description="Client-side Paystack publishable key",
        requires_verification=False,
    ),
    RegisteredKey(
        key="PAYSTACK_WEBHOOK_SECRET",
        category="payments",
        label="Paystack Webhook Secret",
        description="HMAC secret for verifying Paystack webhook signatures",
        requires_verification=False,
    ),
    RegisteredKey(
        key="RESEND_API_KEY",
        category="email",
        label="Resend API Key",
        description="Transactional email via Resend",
        verifier=verify_resend,
    ),
    RegisteredKey(
        key="LOOPS_API_KEY",
        category="email",
        label="Loops API Key",
        description="Marketing email via Loops",
        verifier=verify_loops,
    ),
    RegisteredKey(
        key="POLAR_GOOGLE_AI_API_KEY",
        category="ai",
        label="Google Gemini API Key",
        description="Google Generative AI (Gemini) key",
        verifier=verify_gemini,
    ),
    RegisteredKey(
        key="POLAR_GROQ_API_KEY",
        category="ai",
        label="Groq API Key",
        description="Groq inference key",
        verifier=verify_groq,
    ),
    RegisteredKey(
        key="POLAR_OPENROUTER_API_KEY",
        category="ai",
        label="OpenRouter API Key",
        description="OpenRouter gateway key",
        verifier=verify_openrouter,
    ),
    RegisteredKey(
        key="POLAR_OPENAI_API_KEY",
        category="ai",
        label="OpenAI API Key",
        description="OpenAI API key",
        verifier=verify_openai,
    ),
    RegisteredKey(
        key="POLAR_CEREBRAS_API_KEY",
        category="ai",
        label="Cerebras API Key",
        description="Cerebras inference key",
        verifier=verify_cerebras,
    ),
    RegisteredKey(
        key="PLAIN_TOKEN",
        category="auth",
        label="Plain Token",
        description="Plain.com support API token",
        requires_verification=False,
    ),
    RegisteredKey(
        key="GOOGLE_CLIENT_ID",
        category="auth",
        label="Google OAuth Client ID",
        description=(
            "Google Sign-In OAuth 2.0 client ID — get it from "
            "https://console.cloud.google.com/apis/credentials. "
            "Format: <project_number>-<32-chars>.apps.googleusercontent.com. "
            "After saving, run the 'Refresh Secrets & Restart' workflow "
            "so the API pod picks up the new value (the OAuth client is "
            "constructed at boot)."
        ),
        sensitive=False,
        verifier=verify_google_oauth_client_id,
    ),
    RegisteredKey(
        key="GOOGLE_CLIENT_SECRET",
        category="auth",
        label="Google OAuth Client Secret",
        description=(
            "Google Sign-In OAuth 2.0 client secret — paired with the "
            "Client ID above. Always starts with 'GOCSPX-'. After "
            "rotating, run 'Refresh Secrets & Restart' so the API pod "
            "boots with the new secret."
        ),
        verifier=verify_google_oauth_client_secret,
    ),
    RegisteredKey(
        key="MPESA_VERIFICATION_AMOUNT_KOBO",
        category="payments",
        label="M-Pesa Verification Amount",
        description=(
            "Anti-fraud charge a creator pays to verify their M-Pesa "
            "payout number. Enter the amount in the smallest unit — "
            "KES * 100. Examples: 100 = KES 1, 500 = KES 5, "
            "5000 = KES 50, 10000 = KES 100, 25000 = KES 250."
        ),
        sensitive=False,
        requires_verification=False,
        default_value="10000",
    ),
    RegisteredKey(
        key="POLAR_OPENROUTER_MODELS",
        category="ai",
        label="OpenRouter Free Model Chain",
        description=(
            "Comma-separated OpenRouter model IDs the analyzer tries "
            "in order, in addition to Gemini / Groq / Cerebras / OpenAI. "
            "Each gets its own slot in the FallbackModel so per-model "
            "outages don't take the chain down. Default lineup is the "
            "5 strongest free models as of 2026 — Nemotron 120B, Kimi "
            "K2.6, Qwen3-Next-80B, GPT-OSS-120B, GLM 4.5 Air. Append "
            "':free' to any model id to use OpenRouter's free pool. "
            "Browse the catalogue: https://openrouter.ai/models?q=:free"
        ),
        sensitive=False,
        requires_verification=False,
        default_value=(
            "nvidia/nemotron-3-super-120b-a12b:free,"
            "moonshotai/kimi-k2.6:free,"
            "qwen/qwen3-next-80b-a3b-instruct:free,"
            "openai/gpt-oss-120b:free,"
            "z-ai/glm-4.5-air:free"
        ),
    ),
    RegisteredKey(
        key="ALLOWED_CREATOR_COUNTRIES",
        category="other",
        label="Allowed Creator Countries",
        description=(
            "Comma-separated lowercase ISO 3166-1 alpha-2 codes for the "
            "countries where creators may be approved to sell. The AI "
            "review hard-denies any creator whose detected country is "
            "NOT in this list and the dashboard shows them a waitlist "
            "form. Buyers are unaffected — the marketplace stays global. "
            "Edit via the country picker. Default: ke (Kenya only)."
        ),
        sensitive=False,
        requires_verification=False,
        default_value="ke",
    ),
    RegisteredKey(
        key="GA_MEASUREMENT_ID",
        category="other",
        label="Google Analytics Measurement ID",
        description=(
            "Public GA4 measurement ID (format: G-XXXXXXXXXX) used to "
            "load gtag.js on every public marketplace page. Public by "
            "design — leaks nothing — so we keep it non-sensitive so "
            "ops can read it back from the backoffice without a "
            "decrypt round-trip. Leave blank to disable analytics "
            "entirely (no script tag is injected). Find your ID in "
            "Google Analytics → Admin → Data streams → your web "
            "stream → Measurement ID."
        ),
        sensitive=False,
        requires_verification=False,
        default_value=None,
    ),
]

REGISTRY_MAP: dict[str, RegisteredKey] = {r.key: r for r in REGISTRY}

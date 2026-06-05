"""Declarative registry of every secret manageable via backoffice."""

from __future__ import annotations

from dataclasses import dataclass

from polar.runtime_settings.verifiers import (
    VerifierFn,
    verify_cerebras,
    verify_gemini,
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
]

REGISTRY_MAP: dict[str, RegisteredKey] = {r.key: r for r in REGISTRY}

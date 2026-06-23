"""Per-key connection probes for runtime settings verification."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Callable, Coroutine

import httpx

type VerifierFn = Callable[[str], Coroutine[None, None, VerifierResult]]


@dataclass
class VerifierResult:
    ok: bool
    message: str


async def _bearer_get(url: str, key: str) -> VerifierResult:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, headers={"Authorization": f"Bearer {key}"})
        if r.status_code < 300:
            return VerifierResult(ok=True, message="connection ok")
        return VerifierResult(ok=False, message=f"HTTP {r.status_code}")
    except httpx.TimeoutException:
        return VerifierResult(ok=False, message="request timed out")
    except Exception as e:
        return VerifierResult(ok=False, message=str(e)[:200])


async def verify_paystack(key: str) -> VerifierResult:
    return await _bearer_get(
        "https://api.paystack.co/transaction?perPage=1", key
    )


async def verify_resend(key: str) -> VerifierResult:
    return await _bearer_get("https://api.resend.com/api-keys", key)


async def verify_loops(key: str) -> VerifierResult:
    return await _bearer_get("https://app.loops.so/api/v1/api-key", key)


async def verify_gemini(key: str) -> VerifierResult:
    from scripts.validate_gemini_key import validate

    code = await asyncio.to_thread(validate, key)
    if code == 0:
        return VerifierResult(ok=True, message="connection ok")
    return VerifierResult(ok=False, message=f"validation failed (exit code {code})")


async def verify_groq(key: str) -> VerifierResult:
    return await _bearer_get("https://api.groq.com/openai/v1/models", key)


async def verify_openrouter(key: str) -> VerifierResult:
    return await _bearer_get("https://openrouter.ai/api/v1/models", key)


async def verify_openai(key: str) -> VerifierResult:
    return await _bearer_get("https://api.openai.com/v1/models", key)


async def verify_cerebras(key: str) -> VerifierResult:
    return await _bearer_get("https://api.cerebras.ai/v1/models", key)


async def verify_google_oauth_client_id(key: str) -> VerifierResult:
    """Validate the Google OAuth Client ID format only — Google doesn't
    expose an unauthenticated endpoint that confirms a client_id is
    valid + active without issuing a real OAuth flow. We at minimum
    enforce the canonical shape: <project_number>-<32-char>.apps.googleusercontent.com.
    A wrong format means the key is definitely broken; a right format
    means it's well-shaped (final validation happens on first login).
    """
    import re

    pattern = r"^\d+-[a-z0-9]{32}\.apps\.googleusercontent\.com$"
    if re.match(pattern, key.strip()):
        return VerifierResult(
            ok=True,
            message=(
                "client_id shape ok (final validation on first OAuth flow)"
            ),
        )
    return VerifierResult(
        ok=False,
        message=(
            "expected format: <project_number>-<32 chars>.apps.googleusercontent.com"
        ),
    )


async def verify_google_oauth_client_secret(key: str) -> VerifierResult:
    """Google OAuth client secrets start with 'GOCSPX-'. Format check
    only — the secret is one half of a pair and can't be validated in
    isolation against Google's API."""
    if key.strip().startswith("GOCSPX-") and len(key.strip()) >= 28:
        return VerifierResult(
            ok=True, message="client_secret shape ok (GOCSPX- prefix present)"
        )
    return VerifierResult(
        ok=False,
        message=(
            "Google OAuth client secrets start with 'GOCSPX-' and are at "
            "least 28 chars. Got something else — re-copy from "
            "console.cloud.google.com/apis/credentials"
        ),
    )

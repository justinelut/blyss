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

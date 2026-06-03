"""Validate any supported AI provider's API key against its public endpoint.

Run BEFORE writing a rotated key to any GitHub secret or env file. Exits
non-zero if the key is rejected so a CI step can gate `gh secret set` on
this script's exit code.

Supported providers:
    gemini      Google Gemini  (https://aistudio.google.com)
    groq        Groq           (https://console.groq.com)
    openrouter  OpenRouter     (https://openrouter.ai)
    cerebras    Cerebras       (https://cloud.cerebras.ai)
    openai      OpenAI         (https://platform.openai.com)

Privacy contract:
- The supplied key is sent only to the provider's API.
- The key is NEVER echoed in stdout or stderr.
- Network/HTTP error messages are truncated before printing.

Exit codes:
    0  key valid, model returned a non-empty completion
    1  key rejected (401, 403, or 400 on bad creds)
    2  bad invocation (missing args, --help, unknown provider)
    3  network error / timeout / unreachable / non-JSON response
    4  malformed response (200 but no completion text)
    5  key authenticated OK but quota / rate-limit hit (429)

Usage:
    uv run python scripts/validate_ai_keys.py <provider> <key>

Examples:
    uv run python scripts/validate_ai_keys.py gemini "AQ.Ab8RN6..."
    uv run python scripts/validate_ai_keys.py groq "gsk_..."
    uv run python scripts/validate_ai_keys.py openrouter "sk-or-..."
"""

from __future__ import annotations

import json
import sys
from typing import Any

import httpx

TIMEOUT_SECONDS = 20
MAX_ERR_MSG_LEN = 200


def _truncate(s: str, n: int = MAX_ERR_MSG_LEN) -> str:
    s = s.replace("\n", " ").replace("\r", " ").strip()
    return s if len(s) <= n else s[: n - 1] + "\u2026"


# ---- per-provider request shapes -------------------------------------------
#
# Each provider entry returns:
#   url, headers, json body, query params, model name, response_path
# `response_path` walks the JSON to extract the completion text — used to
# verify the call really succeeded (some providers return 200 with an empty
# body on auth issues).


def _gemini_request(key: str) -> tuple[dict, str]:
    model = "gemini-2.0-flash"
    return (
        {
            "url": (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:generateContent"
            ),
            "params": {"key": key},
            "json": {
                "contents": [
                    {"parts": [{"text": "reply with the single word: ok"}]}
                ]
            },
            "headers": {"Content-Type": "application/json"},
        },
        model,
    )


def _openai_compat_request(
    *, key: str, base_url: str, model: str
) -> tuple[dict, str]:
    """Builder for any OpenAI-compatible provider (Groq, OpenRouter,
    Cerebras, OpenAI itself)."""
    return (
        {
            "url": f"{base_url.rstrip('/')}/chat/completions",
            "params": None,
            "json": {
                "model": model,
                "messages": [
                    {"role": "user", "content": "reply with the single word: ok"}
                ],
                "max_tokens": 10,
            },
            "headers": {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {key}",
            },
        },
        model,
    )


def _groq_request(key: str) -> tuple[dict, str]:
    return _openai_compat_request(
        key=key,
        base_url="https://api.groq.com/openai/v1",
        model="llama-3.3-70b-versatile",
    )


def _openrouter_request(key: str) -> tuple[dict, str]:
    return _openai_compat_request(
        key=key,
        base_url="https://openrouter.ai/api/v1",
        model="meta-llama/llama-3.3-70b-instruct:free",
    )


def _cerebras_request(key: str) -> tuple[dict, str]:
    return _openai_compat_request(
        key=key,
        base_url="https://api.cerebras.ai/v1",
        model="llama-3.3-70b",
    )


def _openai_request(key: str) -> tuple[dict, str]:
    return _openai_compat_request(
        key=key,
        base_url="https://api.openai.com/v1",
        model="gpt-4o-mini",
    )


PROVIDERS = {
    "gemini": (_gemini_request, ("candidates", 0, "content", "parts", 0, "text")),
    "groq": (_groq_request, ("choices", 0, "message", "content")),
    "openrouter": (_openrouter_request, ("choices", 0, "message", "content")),
    "cerebras": (_cerebras_request, ("choices", 0, "message", "content")),
    "openai": (_openai_request, ("choices", 0, "message", "content")),
}


def _walk_path(body: dict, path: tuple) -> str:
    obj: Any = body
    for k in path:
        try:
            obj = obj[k]
        except (KeyError, IndexError, TypeError):
            return ""
    return obj if isinstance(obj, str) else ""


def validate(provider: str, key: str) -> int:
    if provider not in PROVIDERS:
        print(
            f"ABORT: unknown provider '{provider}'. "
            f"Supported: {', '.join(sorted(PROVIDERS))}",
            file=sys.stderr,
        )
        return 2

    builder, response_path = PROVIDERS[provider]
    request_kwargs, model = builder(key)

    try:
        response = httpx.post(
            request_kwargs["url"],
            params=request_kwargs.get("params"),
            json=request_kwargs["json"],
            headers=request_kwargs["headers"],
            timeout=TIMEOUT_SECONDS,
        )
    except httpx.TimeoutException:
        print(
            f"ABORT: provider={provider} code=timeout msg=\"request timed out\"",
            file=sys.stderr,
        )
        return 3
    except (httpx.ConnectError, httpx.NetworkError, httpx.TransportError) as e:
        print(
            f"ABORT: provider={provider} code=network msg=\"{_truncate(str(e))}\"",
            file=sys.stderr,
        )
        return 3
    except Exception as e:  # pragma: no cover — defensive
        print(
            f"ABORT: provider={provider} code=unknown "
            f"msg=\"{_truncate(type(e).__name__ + ': ' + str(e))}\"",
            file=sys.stderr,
        )
        return 3

    try:
        body: dict = response.json()
    except (json.JSONDecodeError, ValueError):
        print(
            f"ABORT: provider={provider} code={response.status_code} "
            f"msg=\"non-JSON response\"",
            file=sys.stderr,
        )
        return 3

    if response.status_code == 429:
        # Auth passed; project rate-limited or quota-exhausted. Distinct exit
        # code so callers can decide whether to gate a rotation on this.
        err = body.get("error") or {}
        status = (
            err.get("status")
            or err.get("type")
            or err.get("code")
            or "RATE_LIMITED"
        )
        msg = _truncate(err.get("message") or str(body)[:200])
        print(
            f"WARN: provider={provider} code=429 status={status} "
            f'msg="{msg}" — key authenticated, quota exhausted',
            file=sys.stderr,
        )
        return 5

    if response.status_code != 200:
        err = body.get("error") or {}
        status = (
            err.get("status")
            or err.get("type")
            or err.get("code")
            or "UNKNOWN"
        )
        msg = _truncate(err.get("message") or str(body)[:200])
        print(
            f"ABORT: provider={provider} code={response.status_code} "
            f'status={status} msg="{msg}"',
            file=sys.stderr,
        )
        return 1

    text = _walk_path(body, response_path)
    if not text or not text.strip():
        print(
            f"ABORT: provider={provider} code=200 "
            f'msg="empty completion text in response"',
            file=sys.stderr,
        )
        return 4

    print(f"{provider} key valid (model={model}, completion={text.strip()[:40]!r})")
    return 0


def _print_usage() -> None:
    print(
        "usage: validate_ai_keys.py <provider> <key>\n"
        "\n"
        f"Providers: {', '.join(sorted(PROVIDERS))}\n"
        "\n"
        "Validates an AI provider's API key against its public endpoint.\n"
        "Exits 0 if accepted, non-zero otherwise. Never echoes the key.",
        file=sys.stderr,
    )


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        _print_usage()
        return 2
    if len(args) < 2:
        _print_usage()
        return 2
    provider = args[0].strip().lower()
    key = args[1].strip()
    if not key:
        _print_usage()
        return 2
    return validate(provider, key)


if __name__ == "__main__":
    sys.exit(main())

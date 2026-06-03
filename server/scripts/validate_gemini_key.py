"""Validate a Google Gemini API key against the public REST endpoint.

Run BEFORE writing any rotated key to a GitHub secret or env file. Exits
non-zero if the key is rejected so a CI step can gate `gh secret set` on
this script's exit code.

Privacy contract:
- The supplied key is sent only to `https://generativelanguage.googleapis.com`
  via an HTTPS query string.
- The key is NEVER echoed in stdout or stderr (not in the request URL,
  the success print, or the error print).
- Network/HTTP error messages are truncated to 200 chars before printing
  in case Google's response ever embeds the key (it doesn't today, but
  this is belt-and-braces).

Exit codes:
  0  key valid, model returned candidates with non-empty text
  1  key rejected (401, 403, or 400 INVALID_ARGUMENT — wrong key)
  2  bad invocation (missing key, --help)
  3  network error / timeout / unreachable / non-JSON response
  4  malformed response (200 but no candidates / empty text)
  5  key authenticated OK but quota / rate-limit hit (429)

Usage:
    uv run python scripts/validate_gemini_key.py "<key>"

Output (stdout) on success:
    Gemini key valid (model=gemini-2.0-flash, finishReason=STOP)

Output (stderr) on failure:
    ABORT: code=400 status=INVALID_ARGUMENT msg="API key not valid"
"""

from __future__ import annotations

import json
import sys
from typing import Any

import httpx

GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
)
TIMEOUT_SECONDS = 20
MAX_ERR_MSG_LEN = 200


def _truncate(s: str, n: int = MAX_ERR_MSG_LEN) -> str:
    s = s.replace("\n", " ").replace("\r", " ").strip()
    return s if len(s) <= n else s[: n - 1] + "\u2026"


def validate(key: str) -> int:
    """Validate the supplied key. Returns the process exit code.

    The key is passed as a query parameter (Google's documented mechanism);
    it never appears in the printed output of this function.
    """
    payload = {
        "contents": [
            {"parts": [{"text": "reply with the single word: ok"}]}
        ]
    }

    try:
        response = httpx.post(
            GEMINI_URL,
            params={"key": key},
            json=payload,
            timeout=TIMEOUT_SECONDS,
            headers={"Content-Type": "application/json"},
        )
    except httpx.TimeoutException:
        print("ABORT: code=timeout msg=\"request timed out\"", file=sys.stderr)
        return 3
    except (httpx.ConnectError, httpx.NetworkError, httpx.TransportError) as e:
        print(
            f"ABORT: code=network msg=\"{_truncate(str(e))}\"",
            file=sys.stderr,
        )
        return 3
    except Exception as e:  # pragma: no cover — defensive
        print(
            f"ABORT: code=unknown msg=\"{_truncate(type(e).__name__ + ': ' + str(e))}\"",
            file=sys.stderr,
        )
        return 3

    # Parse JSON regardless of status — Google returns structured errors as JSON.
    try:
        body: dict[str, Any] = response.json()
    except (json.JSONDecodeError, ValueError):
        print(
            f"ABORT: code={response.status_code} msg=\"non-JSON response\"",
            file=sys.stderr,
        )
        return 3

    if response.status_code != 200:
        err = body.get("error") or {}
        status = err.get("status", "UNKNOWN")
        msg = _truncate(err.get("message", ""))
        # 429 RESOURCE_EXHAUSTED means Google AUTHENTICATED the key but the
        # project hit its quota / rate limit. The key is structurally valid;
        # the failure is recoverable (wait for quota window, raise quota,
        # or use a different project's key). Distinct exit code so callers
        # can decide whether to gate a rotation on this.
        if response.status_code == 429:
            print(
                f"WARN: code=429 status={status} msg=\"{msg}\" — key authenticated, quota exhausted",
                file=sys.stderr,
            )
            return 5
        print(
            f"ABORT: code={response.status_code} status={status} msg=\"{msg}\"",
            file=sys.stderr,
        )
        return 1

    # 200 — verify the response actually carries content.
    candidates = body.get("candidates") or []
    if not candidates:
        print(
            "ABORT: code=200 msg=\"no candidates in response\"",
            file=sys.stderr,
        )
        return 4

    first = candidates[0]
    finish_reason = first.get("finishReason", "UNKNOWN")
    parts = (first.get("content") or {}).get("parts") or []
    text = parts[0].get("text", "") if parts else ""
    if not text.strip():
        print(
            f"ABORT: code=200 msg=\"empty candidate text (finishReason={finish_reason})\"",
            file=sys.stderr,
        )
        return 4

    print(
        f"Gemini key valid (model={GEMINI_MODEL}, finishReason={finish_reason})"
    )
    return 0


def _print_usage() -> None:
    print(
        "usage: validate_gemini_key.py <key>\n"
        "\n"
        "Validates a Google Gemini API key against the generateContent endpoint.\n"
        "Exits 0 if the key is accepted, non-zero otherwise. Never echoes the key.",
        file=sys.stderr,
    )


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        _print_usage()
        # --help is a benign request, missing-key is a misuse — both exit 2.
        return 2
    key = args[0].strip()
    if not key:
        _print_usage()
        return 2
    return validate(key)


if __name__ == "__main__":
    sys.exit(main())

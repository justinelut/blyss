"""Storefront theme — Redis-backed draft preview helper.

Per plan §19.6.3 + §19.7.3. The dashboard's preview iframe needs to
render the storefront with the creator's *unsaved* tokens; we keep
those tokens in Redis (TTL 30min) keyed by `(org_id, user_id)` and hand
back an HMAC-signed token the iframe attaches as `?preview_theme=`.

The storefront route validates the token, looks up the draft, splices
it onto the public response in place of the org row's stored theme.

Scope:
    `storefront-theme-draft:{org_id}:{user_id}` → JSON of full theme

A user can only ever produce a token referencing their own (org, user)
draft pair — so a creator's draft can never bleed into another
creator's preview.

Tokens are HMAC-SHA256-signed with `settings.SECRET`. Tampering with
any field invalidates the signature and verify_token returns None.

The endpoints in `polar/organization/endpoints.py` consume this
module's `save_theme_draft`, `get_theme_draft`, `discard_theme_draft`,
`verify_token`, and `STOREFRONT_THEME_DRAFT_TTL_SECONDS`.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from typing import Any
from uuid import UUID

import structlog

from polar.config import settings
from polar.redis import Redis, create_redis

log = structlog.get_logger()

# Draft TTL — long enough for a leisurely customization session, short
# enough that an abandoned dashboard tab doesn't fill Redis with stale
# blobs. 30 minutes per §19.6.3.
STOREFRONT_THEME_DRAFT_TTL_SECONDS = 30 * 60

_KEY_PREFIX = "storefront-theme-draft"


# ---------------------------------------------------------------------------
# Token signing
# ---------------------------------------------------------------------------


def _sign(payload: str) -> str:
    return hmac.new(
        settings.SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _make_token(*, org_id: UUID, user_id: UUID, draft_id: str) -> str:
    """Build a `payload:signature` token. The payload encodes the
    triple plainly; the HMAC signature lets the verifier confirm
    nothing's been tampered with — no Redis lookup needed for that.
    Replay-safety comes from the Redis TTL: even with a valid token,
    the draft is gone after 30 minutes."""

    payload = f"{org_id}:{user_id}:{draft_id}"
    return f"{payload}:{_sign(payload)}"


def verify_token(token: str) -> dict[str, str] | None:
    """Validate a preview token and return its decoded fields, or None
    if the token is malformed / signature-invalid.

    Returned shape:
        {"org_id": "<uuid>", "user_id": "<uuid>", "draft_id": "<random>"}

    Does NOT check the Redis draft exists — callers do that separately
    via `get_theme_draft`. Splitting the two means a verifier can fail
    fast on tampered tokens without paying a Redis round-trip.
    """

    if not token or token.count(":") < 3:
        return None
    try:
        payload, signature = token.rsplit(":", 1)
        org_id, user_id, draft_id = payload.split(":")
    except ValueError:
        return None
    expected = _sign(payload)
    # Constant-time comparison to dodge timing oracle attacks.
    if not hmac.compare_digest(expected, signature):
        return None
    return {"org_id": org_id, "user_id": user_id, "draft_id": draft_id}


# ---------------------------------------------------------------------------
# Redis helpers
# ---------------------------------------------------------------------------


def _redis_key(*, org_id: UUID, user_id: UUID) -> str:
    return f"{_KEY_PREFIX}:{org_id}:{user_id}"


def _get_redis() -> Redis:
    """Open an ad-hoc Redis client for theme-preview usage.

    The endpoint-bound `request.state.redis` would also work, but the
    helper-level entrypoints here aren't always reached from a request
    context (the storefront SSR fetch uses its own pool). Open a
    dedicated client and let the connection pool reuse the connection.
    """

    return create_redis("app")


async def save_theme_draft(
    *,
    organization_id: UUID,
    user_id: UUID,
    tokens: dict[str, Any],
) -> str:
    """Store `tokens` in Redis under `(org, user)` and return a signed
    preview token referencing it.

    Calling save_theme_draft for the same `(org, user)` pair overwrites
    the previous draft and rotates the draft_id — old tokens are
    immediately stale by signature even if they weren't past the TTL.
    """

    redis = _get_redis()
    try:
        draft_id = secrets.token_urlsafe(12)
        key = _redis_key(org_id=organization_id, user_id=user_id)
        # The draft envelope carries the draft_id alongside the tokens
        # so a verify-token call doesn't have to hash twice. JSON-encoded
        # because the value may grow as v2/v3 modules ship and we don't
        # want to redo the storage shape later.
        value = json.dumps(
            {"draft_id": draft_id, "tokens": tokens},
            separators=(",", ":"),
            sort_keys=True,
        )
        await redis.set(key, value, ex=STOREFRONT_THEME_DRAFT_TTL_SECONDS)
        return _make_token(
            org_id=organization_id, user_id=user_id, draft_id=draft_id
        )
    finally:
        # Don't leave the connection lingering — let the pool reclaim.
        await redis.aclose()


async def get_theme_draft(*, token: str) -> dict[str, Any] | None:
    """Resolve a preview token to the stored token blob.

    Returns None for any of: invalid signature, expired/missing draft,
    draft_id mismatch (token was for an older draft that's been rotated).
    """

    decoded = verify_token(token)
    if decoded is None:
        return None
    redis = _get_redis()
    try:
        key = _redis_key(
            org_id=UUID(decoded["org_id"]),
            user_id=UUID(decoded["user_id"]),
        )
        raw = await redis.get(key)
        if raw is None:
            return None
        try:
            envelope = json.loads(raw)
        except json.JSONDecodeError:
            log.warning(
                "storefront_theme_draft.malformed_envelope",
                key=key,
            )
            return None
        # Reject if the draft has been rotated since this token was
        # issued — prevents a stale tab from rendering yesterday's
        # draft after the creator started a new editing session.
        if envelope.get("draft_id") != decoded["draft_id"]:
            return None
        tokens = envelope.get("tokens")
        if not isinstance(tokens, dict):
            return None
        return tokens
    finally:
        await redis.aclose()


async def discard_theme_draft(
    *,
    organization_id: UUID,
    user_id: UUID,
) -> None:
    """Delete a draft. No-op if no draft exists."""

    redis = _get_redis()
    try:
        await redis.delete(_redis_key(org_id=organization_id, user_id=user_id))
    finally:
        await redis.aclose()

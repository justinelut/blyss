"""Paystack key-environment helpers.

Paystack keys are environment-scoped: `pk_test_` / `sk_test_` operate on
the test environment, `pk_live_` / `sk_live_` on live. A transaction
created with a test public key can ONLY be verified with the test secret
key, and a subaccount provisioned with live keys is invalid under test
keys (and vice-versa).

When the public key (used by the frontend popup) and the secret key (used
by the backend to verify charges + create subaccounts) are in DIFFERENT
environments, payments fail with confusing errors like "Transaction
reference not found" or "Invalid Subaccount" — even though each key is
individually valid. This module detects that mismatch so we can log a
loud, actionable warning instead of failing silently at verify time.
"""

from __future__ import annotations

from typing import Literal

PaystackEnvironment = Literal["test", "live", "unknown"]


def key_environment(key: str | None) -> PaystackEnvironment:
    """Classify a Paystack key as 'test', 'live', or 'unknown'.

    Works for both public (pk_) and secret (sk_) keys.
    """
    if not key:
        return "unknown"
    k = key.strip().lower()
    if "_test_" in k:
        return "test"
    if "_live_" in k:
        return "live"
    return "unknown"


def keys_mismatched(public_key: str | None, secret_key: str | None) -> bool:
    """True when public and secret keys are in different known environments.

    Returns False if either key's environment is unknown (we can't be sure,
    so we don't cry wolf) — only flags a definite test-vs-live split.
    """
    pub = key_environment(public_key)
    sec = key_environment(secret_key)
    if pub == "unknown" or sec == "unknown":
        return False
    return pub != sec

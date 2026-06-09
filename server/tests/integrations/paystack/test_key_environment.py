"""Unit tests for Paystack key-environment detection."""

from polar.integrations.paystack.key_environment import (
    key_environment,
    keys_mismatched,
)


def test_key_environment_classifies_test_and_live() -> None:
    assert key_environment("pk_test_abc") == "test"
    assert key_environment("sk_test_abc") == "test"
    assert key_environment("pk_live_abc") == "live"
    assert key_environment("sk_live_abc") == "live"


def test_key_environment_unknown() -> None:
    assert key_environment(None) == "unknown"
    assert key_environment("") == "unknown"
    assert key_environment("garbage") == "unknown"


def test_keys_mismatched_flags_split_envs() -> None:
    assert keys_mismatched("pk_test_a", "sk_live_b") is True
    assert keys_mismatched("pk_live_a", "sk_test_b") is True


def test_keys_matched_same_env() -> None:
    assert keys_mismatched("pk_test_a", "sk_test_b") is False
    assert keys_mismatched("pk_live_a", "sk_live_b") is False


def test_keys_mismatched_safe_on_unknown() -> None:
    # Don't cry wolf when we can't classify one of the keys.
    assert keys_mismatched("garbage", "sk_live_b") is False
    assert keys_mismatched("pk_live_a", None) is False

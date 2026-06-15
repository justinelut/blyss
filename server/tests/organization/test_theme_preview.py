"""Unit tests for storefront theme preview-token signing.

Pure crypto / parsing tests — no Redis, no DB, no async. They assert
the HMAC signing logic is solid:
  - A token signed by `_make_token` round-trips through `verify_token`.
  - Tampering with any segment invalidates the signature.
  - A made-up signature can't be forged without the SECRET.
  - Malformed tokens return None (not raise).

Per plan §19.6.3.

Note we deliberately don't use the Redis-backed save/get/discard
functions here — those need an event loop + Redis fixture. The
session's pytest infra has historically been flaky for fixture-driven
tests; pure-crypto tests work in any env.
"""

from uuid import uuid4

from polar.organization.theme_preview import (
    _make_token,
    _sign,
    verify_token,
)


class TestVerifyToken:
    def test_round_trip(self) -> None:
        org = uuid4()
        user = uuid4()
        token = _make_token(org_id=org, user_id=user, draft_id="abc123")
        decoded = verify_token(token)
        assert decoded is not None
        assert decoded["org_id"] == str(org)
        assert decoded["user_id"] == str(user)
        assert decoded["draft_id"] == "abc123"

    def test_tampered_signature_rejected(self) -> None:
        org = uuid4()
        user = uuid4()
        token = _make_token(org_id=org, user_id=user, draft_id="abc")
        # Flip the last hex char of the signature.
        last = token[-1]
        flipped = "0" if last != "0" else "1"
        tampered = token[:-1] + flipped
        assert verify_token(tampered) is None

    def test_tampered_payload_rejected(self) -> None:
        org = uuid4()
        user = uuid4()
        token = _make_token(org_id=org, user_id=user, draft_id="abc")
        # Replace the org_id with a different UUID; signature won't match.
        parts = token.split(":")
        parts[0] = str(uuid4())
        forged = ":".join(parts)
        assert verify_token(forged) is None

    def test_malformed_token_returns_none(self) -> None:
        assert verify_token("") is None
        assert verify_token("totally-not-a-token") is None
        assert verify_token("aaa:bbb") is None  # not enough segments
        assert verify_token("aaa:bbb:ccc:ddd:extra") is None

    def test_unsigned_token_rejected(self) -> None:
        # Even if the payload format is correct, an unsigned forgery
        # has the wrong HMAC.
        forged = (
            f"{uuid4()}:{uuid4()}:abc:" + ("0" * 64)
        )  # plausible-looking sig
        assert verify_token(forged) is None

    def test_signature_is_deterministic(self) -> None:
        # Same payload → same signature, every time. Otherwise the
        # round-trip would never verify.
        sig_a = _sign("test-payload")
        sig_b = _sign("test-payload")
        assert sig_a == sig_b

    def test_different_payload_different_signature(self) -> None:
        sig_a = _sign("payload-a")
        sig_b = _sign("payload-b")
        assert sig_a != sig_b

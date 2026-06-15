"""Pure-unit tests for the paystack settlement webhook helpers.

These don't need a DB / Redis fixture — they exercise the pure
extraction functions used by the `transfer.*` event actors. A real
end-to-end test that hits the actor through external_event_service
would require the session-conftest infra that's been flaky; the unit
tests here verify the logic that's most likely to break (payload
shape variance) without that dependency.
"""

from datetime import datetime, timezone

from polar.integrations.paystack.tasks import (
    _extract_recipient_summary,
    _extract_subaccount_code,
    _parse_settled_at,
)


class TestExtractSubaccountCode:
    def test_recipient_subaccount_subaccount_code(self) -> None:
        data = {
            "recipient": {
                "subaccount": {"subaccount_code": "ACCT_abc123"},
            },
        }
        assert _extract_subaccount_code(data) == "ACCT_abc123"

    def test_recipient_subaccount_code(self) -> None:
        # Older payload shape uses `code` instead of `subaccount_code`.
        data = {
            "recipient": {
                "subaccount": {"code": "ACCT_old456"},
            },
        }
        assert _extract_subaccount_code(data) == "ACCT_old456"

    def test_top_level_subaccount(self) -> None:
        data = {"subaccount": {"subaccount_code": "ACCT_top"}}
        assert _extract_subaccount_code(data) == "ACCT_top"

    def test_top_level_subaccount_code(self) -> None:
        data = {"subaccount_code": "ACCT_flat"}
        assert _extract_subaccount_code(data) == "ACCT_flat"

    def test_missing_returns_none(self) -> None:
        assert _extract_subaccount_code({}) is None
        assert _extract_subaccount_code({"recipient": {}}) is None
        assert _extract_subaccount_code({"recipient": None}) is None

    def test_non_acct_prefix_rejected(self) -> None:
        # Defensive: only accept Paystack's canonical ACCT_ prefix.
        # Catches accidental misuse (e.g. transfer recipient code RCP_*).
        data = {"subaccount_code": "RCP_recipient"}
        assert _extract_subaccount_code(data) is None

    def test_non_string_rejected(self) -> None:
        data = {"subaccount_code": 12345}
        assert _extract_subaccount_code(data) is None


class TestExtractRecipientSummary:
    def test_full_recipient(self) -> None:
        data = {
            "recipient": {
                "name": "Jane Doe",
                "details": {"account_number": "0712345678"},
            },
        }
        name, last4 = _extract_recipient_summary(data)
        assert name == "Jane Doe"
        assert last4 == "5678"

    def test_name_fallback_to_account_name(self) -> None:
        data = {
            "recipient": {
                "account_name": "Acme Studio",
                "account_number": "ACCT00FOOBAR",
            },
        }
        name, last4 = _extract_recipient_summary(data)
        assert name == "Acme Studio"
        assert last4 == "OBAR"

    def test_strip_whitespace_in_name(self) -> None:
        data = {"recipient": {"name": "  Jane  "}}
        name, _ = _extract_recipient_summary(data)
        assert name == "Jane"

    def test_missing_returns_none(self) -> None:
        name, last4 = _extract_recipient_summary({})
        assert name is None
        assert last4 is None

    def test_short_account_number_no_last4(self) -> None:
        data = {
            "recipient": {
                "name": "Short",
                "details": {"account_number": "12"},
            },
        }
        name, last4 = _extract_recipient_summary(data)
        assert name == "Short"
        assert last4 is None


class TestParseSettledAt:
    def test_iso_with_z(self) -> None:
        result = _parse_settled_at({"transferred_at": "2026-06-15T14:30:00Z"})
        assert result == datetime(2026, 6, 15, 14, 30, 0, tzinfo=timezone.utc)

    def test_iso_with_offset(self) -> None:
        result = _parse_settled_at(
            {"transferred_at": "2026-06-15T14:30:00+03:00"}
        )
        assert result is not None
        # +03:00 → UTC equivalent 11:30
        assert result.utcoffset() is not None

    def test_paid_at_fallback(self) -> None:
        result = _parse_settled_at({"paid_at": "2026-06-15T10:00:00Z"})
        assert result is not None
        assert result.year == 2026

    def test_missing_returns_none(self) -> None:
        assert _parse_settled_at({}) is None

    def test_malformed_returns_none(self) -> None:
        # Don't raise on garbage — return None so the row still records
        # without a settled_at.
        assert _parse_settled_at({"transferred_at": "not-a-date"}) is None
        assert _parse_settled_at({"transferred_at": 12345}) is None

"""Unit tests for the creator country-gate allowlist parser."""

from polar.organization.country_gate import parse_allowlist


def test_none_falls_back_to_kenya() -> None:
    assert parse_allowlist(None) == {"ke"}


def test_empty_falls_back_to_kenya() -> None:
    assert parse_allowlist("") == {"ke"}
    assert parse_allowlist("   ") == {"ke"}


def test_single_country() -> None:
    assert parse_allowlist("ke") == {"ke"}


def test_csv_lowercases_and_trims() -> None:
    assert parse_allowlist("KE, TZ , us") == {"ke", "tz", "us"}


def test_invalid_codes_dropped() -> None:
    # 'xx'/'zz' aren't real ISO codes; only 'ke' survives.
    assert parse_allowlist("ke,xx,zz") == {"ke"}


def test_all_invalid_falls_back_to_kenya() -> None:
    # Never open to everyone nor close to no one on a bad edit.
    assert parse_allowlist("xx,zz,99") == {"ke"}

"""Unit tests for the ISO country list."""

from polar.kit.countries import (
    ISO_ALPHA2_COUNTRIES,
    country_name,
    is_valid_country_code,
)


def test_list_is_substantial() -> None:
    # We ship the bulk of ISO 3166-1; sanity-check we didn't truncate it.
    assert len(ISO_ALPHA2_COUNTRIES) >= 190


def test_all_codes_are_lowercase_len2_unique() -> None:
    codes = [code for code, _ in ISO_ALPHA2_COUNTRIES]
    assert all(len(c) == 2 and c == c.lower() for c in codes)
    assert len(codes) == len(set(codes)), "duplicate country codes"


def test_kenya_present() -> None:
    assert country_name("ke") == "Kenya"
    assert is_valid_country_code("ke")
    # case-insensitive
    assert is_valid_country_code("KE")


def test_unknown_code_rejected() -> None:
    assert not is_valid_country_code("xx")
    assert not is_valid_country_code("")
    assert not is_valid_country_code(None)
    assert country_name("zz") is None
    assert country_name(None) is None


def test_sorted_by_name() -> None:
    names = [name for _, name in ISO_ALPHA2_COUNTRIES]
    assert names == sorted(names)

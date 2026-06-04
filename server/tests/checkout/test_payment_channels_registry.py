"""Tests for payment_channels.py registry."""

from __future__ import annotations

import pytest

from polar.checkout.payment_channels import get_channels_for_currency


class TestGetChannelsForCurrency:
    def test_kes_has_card_mpesa_bank(self):
        channels = get_channels_for_currency("KES")
        ids = [c.id for c in channels]
        assert "card" in ids
        assert "mobile_money" in ids
        assert "bank" in ids
        # M-Pesa provider
        momo = next(c for c in channels if c.id == "mobile_money")
        assert any(p["code"] == "mpesa" for p in (momo.providers or []))

    def test_ngn_has_five_channels(self):
        channels = get_channels_for_currency("NGN")
        ids = [c.id for c in channels]
        assert "card" in ids
        assert "bank" in ids
        assert "bank_transfer" in ids
        assert "ussd" in ids
        assert "qr" in ids
        assert len(channels) == 5

    def test_ghs_has_card_and_mobile_money_with_three_providers(self):
        channels = get_channels_for_currency("GHS")
        ids = [c.id for c in channels]
        assert "card" in ids
        assert "mobile_money" in ids
        momo = next(c for c in channels if c.id == "mobile_money")
        assert len(momo.providers or []) == 3
        codes = {p["code"] for p in (momo.providers or [])}
        assert codes == {"mtn", "tgo", "vod"}

    def test_zar_has_card_eft_qr(self):
        channels = get_channels_for_currency("ZAR")
        ids = [c.id for c in channels]
        assert "card" in ids
        assert "eft" in ids
        assert "qr" in ids
        eft = next(c for c in channels if c.id == "eft")
        assert any(p["code"] == "ozow" for p in (eft.providers or []))
        qr = next(c for c in channels if c.id == "qr")
        assert any(p["code"] == "masterpass" for p in (qr.providers or []))

    def test_usd_has_card_only(self):
        channels = get_channels_for_currency("USD")
        assert len(channels) == 1
        assert channels[0].id == "card"

    def test_unknown_currency_falls_back_to_card(self):
        channels = get_channels_for_currency("XYZ")
        assert len(channels) == 1
        assert channels[0].id == "card"

    def test_case_insensitive(self):
        assert get_channels_for_currency("kes") == get_channels_for_currency("KES")

    def test_card_fields_correct(self):
        channels = get_channels_for_currency("USD")
        card = channels[0]
        assert card.fields == ["card_number", "expiry_month", "expiry_year", "cvv"]

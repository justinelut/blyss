"""Data-driven payment channel registry per currency.

Add a new channel by appending an entry to the relevant currency list.
No endpoint changes needed.
"""

from __future__ import annotations

from polar.checkout.schemas import CheckoutPaymentChannel

_CARD = CheckoutPaymentChannel(
    id="card",
    name="Card",
    description="Pay with debit or credit card. Visa, Mastercard, Verve, Amex.",
    fields=["card_number", "expiry_month", "expiry_year", "cvv"],
    providers=None,
)

_CARD_BASIC = CheckoutPaymentChannel(
    id="card",
    name="Card",
    description="Pay with debit or credit card. Visa, Mastercard.",
    fields=["card_number", "expiry_month", "expiry_year", "cvv"],
    providers=None,
)

CHANNELS_BY_CURRENCY: dict[str, list[CheckoutPaymentChannel]] = {
    "KES": [
        _CARD,
        CheckoutPaymentChannel(
            id="mobile_money",
            name="Mobile money",
            description="Pay via M-Pesa or Airtel Money STK push.",
            fields=["phone", "provider"],
            providers=[
                {"code": "mpesa", "name": "M-Pesa", "country": "KE"},
            ],
        ),
        CheckoutPaymentChannel(
            id="bank",
            name="Bank",
            description="Pay from your bank account.",
            fields=["bank_code", "bank_account_number"],
            providers=None,
        ),
    ],
    "NGN": [
        _CARD,
        CheckoutPaymentChannel(
            id="bank",
            name="Bank",
            description="Pay from your bank account.",
            fields=["bank_code", "bank_account_number"],
            providers=None,
        ),
        CheckoutPaymentChannel(
            id="bank_transfer",
            name="Bank Transfer",
            description="Pay via bank transfer to a generated account number.",
            fields=[],
            providers=None,
        ),
        CheckoutPaymentChannel(
            id="ussd",
            name="USSD",
            description="Pay using USSD banking code.",
            fields=["ussd_type"],
            providers=None,
        ),
        CheckoutPaymentChannel(
            id="qr",
            name="QR Code",
            description="Pay by scanning a QR code.",
            fields=["qr_provider"],
            providers=[{"code": "visa", "name": "Visa QR", "country": "NG"}],
        ),
    ],
    "GHS": [
        _CARD,
        CheckoutPaymentChannel(
            id="mobile_money",
            name="Mobile Money",
            description="Pay via mobile money.",
            fields=["phone", "provider"],
            providers=[
                {"code": "mtn", "name": "MTN", "country": "GH"},
                {"code": "tgo", "name": "Tigo", "country": "GH"},
                {"code": "vod", "name": "Vodafone", "country": "GH"},
            ],
        ),
    ],
    "ZAR": [
        _CARD_BASIC,
        CheckoutPaymentChannel(
            id="eft",
            name="EFT",
            description="Pay via EFT (instant bank redirect).",
            fields=["eft_provider"],
            providers=[{"code": "ozow", "name": "Ozow", "country": "ZA"}],
        ),
        CheckoutPaymentChannel(
            id="qr",
            name="QR Code",
            description="Pay by scanning a QR code.",
            fields=["qr_provider"],
            providers=[
                {"code": "masterpass", "name": "Masterpass", "country": "ZA"}
            ],
        ),
    ],
    "USD": [_CARD_BASIC],
}

_DEFAULT_CHANNELS = [_CARD_BASIC]


def get_channels_for_currency(currency: str) -> list[CheckoutPaymentChannel]:
    """Return available payment channels for a given currency code."""
    return CHANNELS_BY_CURRENCY.get(currency.upper(), _DEFAULT_CHANNELS)

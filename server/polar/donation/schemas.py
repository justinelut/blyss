from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import EmailStr, Field, model_validator

from polar.kit.schemas import Schema

# Donation amount bounds, in KES "cents" (Paystack works in the minor unit).
# Brief: min KES 50, max KES 50,000 → 5_000 .. 5_000_000 minor units.
MIN_DONATION_AMOUNT = 5_000
MAX_DONATION_AMOUNT = 5_000_000


class DonationCreate(Schema):
    organization_id: UUID
    amount: int = Field(..., ge=100, le=1000000, description="Amount in KES cents")
    donor_name: str = Field(..., min_length=1, max_length=255)
    donor_email: EmailStr
    message: str | None = Field(None, max_length=1000)


class DonationPublic(Schema):
    id: UUID
    amount: int
    currency: str
    donor_name: str
    donor_email: str
    message: str | None
    organization_id: UUID
    payment_reference: str
    payment_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DonationInitiateResponse(Schema):
    donation: DonationPublic
    payment_url: str


# ---------------------------------------------------------------------------
# Inline Paystack-native tipping (creator storefront)
#
# Mirrors the buyer-checkout inline charge flow (checkout/schemas.py) so the
# frontend can reuse the same PaystackPaymentInterface channel selector and
# polling cadence. The donor never leaves Blyss's UI.
# ---------------------------------------------------------------------------


class DonationChargeRequest(Schema):
    """Initiate an inline Paystack charge for a tip against a creator."""

    amount: int = Field(
        ...,
        ge=MIN_DONATION_AMOUNT,
        le=MAX_DONATION_AMOUNT,
        description="Tip amount in KES minor units (KES 50 – KES 50,000).",
    )
    donor_name: str | None = Field(
        None, max_length=255, description="Optional donor display name."
    )
    donor_email: EmailStr = Field(description="Donor email for the receipt.")
    message: str | None = Field(
        None, max_length=200, description="Optional message to the creator."
    )

    channel: Literal[
        "card", "mobile_money", "bank", "bank_transfer", "ussd", "qr", "eft"
    ]
    # Card fields
    card_number: str | None = None
    cvv: str | None = None
    expiry_month: str | None = None
    expiry_year: str | None = None
    pin: str | None = None
    # Mobile money fields
    phone: str | None = None
    provider: str | None = None
    # Bank fields
    bank_code: str | None = None
    bank_account_number: str | None = None
    # Bank transfer
    account_expires_at: str | None = None
    # USSD
    ussd_type: str | None = None
    # QR
    qr_provider: str | None = None
    # EFT
    eft_provider: str | None = None

    @model_validator(mode="after")
    def _validate_channel_fields(self) -> "DonationChargeRequest":
        ch = self.channel
        if ch == "card":
            if not all(
                [self.card_number, self.cvv, self.expiry_month, self.expiry_year]
            ):
                raise ValueError(
                    "card channel requires card_number, cvv, expiry_month, expiry_year"
                )
        elif ch == "mobile_money":
            if not self.phone:
                raise ValueError("mobile_money channel requires phone")
        elif ch == "bank":
            if not (self.bank_code and self.bank_account_number):
                raise ValueError(
                    "bank channel requires bank_code and bank_account_number"
                )
        elif ch == "ussd":
            if not self.ussd_type:
                raise ValueError("ussd channel requires ussd_type")
        elif ch == "qr":
            if not self.qr_provider:
                raise ValueError("qr channel requires qr_provider")
        elif ch == "eft":
            if not self.eft_provider:
                raise ValueError("eft channel requires eft_provider")
        # bank_transfer requires no extra fields
        return self


class DonationChargeResponse(Schema):
    """Response from a donation charge initiation / step submission."""

    reference: str
    status: str
    display_text: str | None = None
    # Channel-specific next-action extras (mirrors CheckoutChargeResponse)
    ussd_code: str | None = None
    qr_code: str | None = None
    qr_image_url: str | None = None
    account_number: str | None = None
    account_name: str | None = None
    bank_name: str | None = None
    account_expires_at: str | None = None
    redirect_url: str | None = None


class DonationChargeStepSubmitRequest(Schema):
    """Submit a value for a pending charge step (OTP, PIN, phone, birthday)."""

    value: str


class DonationPaymentChannel(Schema):
    """A payment channel available for a donation."""

    id: str
    name: str
    description: str
    fields: list[str]
    providers: list[dict[str, str]] | None = None


class DonationPaymentStatus(Schema):
    """Simplified donation payment status for the frontend poller."""

    status: Literal["pending", "success", "failed", "requires_action"]
    message: str | None = None
    next_action: dict[str, Any] | None = None

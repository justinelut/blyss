"""Response schema for /v1/marketplace/stats."""

from pydantic import Field

from polar.kit.schemas import Schema


class MarketplaceStatsResponse(Schema):
    """Aggregate counts surfaced on the homepage + /start."""

    creators: int = Field(
        description=(
            "Total active public creators (ACTIVE org status + ACTIVE "
            "subaccount, not blocked / deleted)."
        )
    )

    products: int = Field(
        description=(
            "Total live public products (non-archived, non-deleted, "
            "owned by an active public creator)."
        )
    )

    total_paid_out: int = Field(
        description=(
            "Sum (in minor units of `total_paid_out_currency`) of all "
            "successful Paystack settlement transfers — i.e. money that "
            "has actually landed in creators' bank/M-Pesa accounts. "
            "Zero on a fresh deploy with no settlements yet."
        )
    )

    total_earned: int = Field(
        description=(
            "Sum (in minor units of `total_paid_out_currency`) of "
            "creator earnings on PAID orders, regardless of whether "
            "Paystack has settled them yet. Computed as "
            "(subtotal - discount + tax - platform_fee - refunded) "
            "summed across all paid orders. Useful as a fallback "
            "metric on fresh deploys where no transfer.success "
            "webhook has fired yet but money has flowed through "
            "checkout: Paystack splits at charge time so the money "
            "is already in creators' subaccounts, just not yet "
            "transferred to their bank/M-Pesa accounts."
        )
    )

    total_paid_out_currency: str = Field(
        description=(
            "ISO 4217 lowercased. Currently always 'kes' since Blyss's "
            "marketplace fee + Paystack settlements operate in KES; if "
            "future settlements happen in USD/NGN/etc. this becomes a "
            "weighted display unit."
        )
    )

    settlements_count: int = Field(
        description=(
            "Count of distinct successful settlement events that "
            "summed into `total_paid_out`. 0 when no settlements yet."
        )
    )

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
            "Total public products (public visibility, non-archived, non-deleted, "
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
            "Creator share recorded on paid KES orders, before settlement. "
            "Computed as subtotal - discount + tax - platform fee - refunds. "
            "This ledger amount is not a settlement total; successful "
            "Paystack transfers are reported separately in `total_paid_out`."
        )
    )

    total_paid_out_currency: str = Field(
        description=(
            "ISO 4217 lowercased. The public aggregate totals include only "
            "KES orders and resolved KES settlements."
        )
    )

    settlements_count: int = Field(
        description=(
            "Count of distinct successful settlement events that "
            "summed into `total_paid_out`. 0 when no settlements yet."
        )
    )

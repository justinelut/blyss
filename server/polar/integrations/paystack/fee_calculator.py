# Platform fee calculation utilities for Paystack integration

from polar.config import settings


def calculate_platform_fee(order_amount: int, currency: str = "KES") -> tuple[int, int]:
    """
    Calculate platform fee and creator payout for Paystack orders.

    Args:
        order_amount: Order amount in smallest currency unit (kobo for KES)
        currency: Currency code (defaults to KES)

    Returns:
        Tuple of (platform_fee_amount, creator_payout_amount)

    The platform fee is calculated as 20% (2000 basis points) of the order amount.
    The creator payout is the remaining 80% of the order amount.
    """
    # Calculate platform fee as 20% of order amount
    platform_fee_amount = (order_amount * settings.PLATFORM_FEE_BASIS_POINTS) // 10000

    # Creator payout is order amount minus platform fee
    creator_payout_amount = order_amount - platform_fee_amount

    return platform_fee_amount, creator_payout_amount


def validate_currency_consistency(
    order_currency: str, platform_fee_currency: str | None
) -> bool:
    """
    Validate that platform fee currency matches order currency.

    Args:
        order_currency: Currency of the order
        platform_fee_currency: Currency of the platform fee

    Returns:
        True if currencies are consistent, False otherwise
    """
    if platform_fee_currency is None:
        return True  # Allow None for backward compatibility

    return order_currency == platform_fee_currency

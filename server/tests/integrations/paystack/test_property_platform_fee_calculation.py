"""
Property tests for Paystack platform fee calculation.

Tests Property 17: Platform Fee Calculation
Validates: Requirements 4.4, 7.2, 7.3, 7.5
"""

from hypothesis import given
from hypothesis import strategies as st

from polar.integrations.paystack.fee_calculator import calculate_platform_fee


class TestPaystackPlatformFeeCalculationProperty:
    """Property tests for platform fee calculation."""

    @given(
        order_amount=st.integers(min_value=100, max_value=10000000),  # KES 1 to 100,000
    )
    def test_property_17_platform_fee_calculation(self, order_amount: int):
        """
        Feature: paystack-integration, Property 17: Platform Fee Calculation

        For any order created through Paystack, the platform_fee_amount should equal
        exactly 20% of the order amount, and the creator payout should equal the order
        amount minus the platform fee.
        """
        platform_fee_amount, creator_payout_amount = calculate_platform_fee(
            order_amount, "KES"
        )

        # Platform fee should be exactly 20% of order amount
        expected_platform_fee = (
            order_amount * 2000
        ) // 10000  # 2000 basis points = 20%
        assert platform_fee_amount == expected_platform_fee

        # Creator payout should be 80% of order amount
        expected_creator_payout = order_amount - expected_platform_fee
        assert creator_payout_amount == expected_creator_payout

        # Total should equal original order amount
        assert platform_fee_amount + creator_payout_amount == order_amount

        # Platform fee should be non-negative
        assert platform_fee_amount >= 0

        # Creator payout should be non-negative
        assert creator_payout_amount >= 0

        # Platform fee should be less than or equal to order amount
        assert platform_fee_amount <= order_amount

        # Creator payout should be less than or equal to order amount
        assert creator_payout_amount <= order_amount

    @given(
        order_amount=st.integers(min_value=100, max_value=10000000),
        currency=st.sampled_from(["KES", "USD", "EUR", "GBP"]),
    )
    def test_platform_fee_calculation_currency_independence(
        self, order_amount: int, currency: str
    ):
        """
        Platform fee calculation should work consistently across different currencies.
        """
        platform_fee_amount, creator_payout_amount = calculate_platform_fee(
            order_amount, currency
        )

        # Same calculation logic should apply regardless of currency
        expected_platform_fee = (order_amount * 2000) // 10000
        assert platform_fee_amount == expected_platform_fee
        assert creator_payout_amount == order_amount - expected_platform_fee

    @given(
        order_amount=st.integers(min_value=1, max_value=99),  # Very small amounts
    )
    def test_platform_fee_calculation_small_amounts(self, order_amount: int):
        """
        Platform fee calculation should handle small amounts correctly.
        """
        platform_fee_amount, creator_payout_amount = calculate_platform_fee(
            order_amount, "KES"
        )

        # For very small amounts, platform fee might be 0 due to integer division
        expected_platform_fee = (order_amount * 2000) // 10000
        assert platform_fee_amount == expected_platform_fee

        # Total should still equal original amount
        assert platform_fee_amount + creator_payout_amount == order_amount

    def test_platform_fee_calculation_edge_cases(self):
        """
        Test specific edge cases for platform fee calculation.
        """
        # Test minimum amount (1 kobo)
        platform_fee, creator_payout = calculate_platform_fee(1, "KES")
        assert platform_fee == 0  # 1 * 0.20 = 0.2, rounded down to 0
        assert creator_payout == 1
        assert platform_fee + creator_payout == 1

        # Test amount that results in exact 20%
        platform_fee, creator_payout = calculate_platform_fee(10000, "KES")  # KES 100
        assert platform_fee == 2000  # Exactly 20%
        assert creator_payout == 8000  # Exactly 80%
        assert platform_fee + creator_payout == 10000

        # Test large amount
        platform_fee, creator_payout = calculate_platform_fee(
            10000000, "KES"
        )  # KES 100,000
        assert platform_fee == 2000000  # 20%
        assert creator_payout == 8000000  # 80%
        assert platform_fee + creator_payout == 10000000

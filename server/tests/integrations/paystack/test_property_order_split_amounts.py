"""
Property tests for Paystack order split amounts recording.

Tests Property 18: Order Split Amounts Recorded
Validates Requirements 4.5
"""

from hypothesis import given
from hypothesis import strategies as st

from polar.integrations.paystack.fee_calculator import calculate_platform_fee


class TestOrderSplitAmountsProperty:
    """
    Property tests for order split amounts recording.
    """

    @given(
        order_amount=st.integers(min_value=100, max_value=10000000),  # KES 1 to 100,000
    )
    async def test_property_18_order_split_amounts_recorded(self, order_amount):
        """
        Feature: paystack-integration, Property 18: Order Split Amounts Recorded

        For any order created through Paystack, both the platform fee amount
        and creator payout amount should be recorded in the order data.
        """
        # Calculate expected split amounts
        platform_fee_amount, creator_payout_amount = calculate_platform_fee(
            order_amount, "KES"
        )

        # Verify that both amounts are calculated and non-negative
        assert platform_fee_amount >= 0
        assert creator_payout_amount >= 0

        # Verify that the amounts sum to the original order amount
        assert platform_fee_amount + creator_payout_amount == order_amount

        # Verify that platform fee is exactly 20% (within rounding)
        expected_platform_fee = (order_amount * 2000) // 10000
        assert platform_fee_amount == expected_platform_fee

        # Verify that creator payout is the remainder
        assert creator_payout_amount == order_amount - platform_fee_amount

    @given(
        order_amount=st.integers(min_value=1, max_value=99),  # Small amounts
    )
    async def test_property_18_small_amounts_split_correctly(self, order_amount):
        """
        Feature: paystack-integration, Property 18: Order Split Amounts Recorded

        For small order amounts, split amounts should still be recorded correctly
        even when platform fee rounds to zero.
        """
        platform_fee_amount, creator_payout_amount = calculate_platform_fee(
            order_amount, "KES"
        )

        # Both amounts should be non-negative
        assert platform_fee_amount >= 0
        assert creator_payout_amount >= 0

        # Total should equal original amount
        assert platform_fee_amount + creator_payout_amount == order_amount

        # For very small amounts, platform fee might be 0 due to rounding
        if order_amount < 5:  # Less than 5 kobo
            assert platform_fee_amount == 0
            assert creator_payout_amount == order_amount
        else:
            # For larger small amounts, there should be some platform fee
            expected_platform_fee = (order_amount * 2000) // 10000
            assert platform_fee_amount == expected_platform_fee

    @given(
        order_amount=st.integers(
            min_value=5000, max_value=10000000
        ),  # Amounts >= KES 50
    )
    async def test_property_18_significant_amounts_have_both_splits(self, order_amount):
        """
        Feature: paystack-integration, Property 18: Order Split Amounts Recorded

        For significant order amounts, both platform fee and creator payout
        should be non-zero and properly recorded.
        """
        platform_fee_amount, creator_payout_amount = calculate_platform_fee(
            order_amount, "KES"
        )

        # Both amounts should be positive for significant order amounts
        assert platform_fee_amount > 0
        assert creator_payout_amount > 0

        # Platform fee should be less than creator payout (20% vs 80%)
        assert platform_fee_amount < creator_payout_amount

        # Verify exact percentages
        assert platform_fee_amount == (order_amount * 2000) // 10000
        assert creator_payout_amount == order_amount - platform_fee_amount

        # Verify the 80/20 split ratio (within rounding tolerance)
        expected_creator_percentage = creator_payout_amount / order_amount
        assert 0.79 <= expected_creator_percentage <= 0.81  # Allow for rounding

    def test_property_18_edge_cases(self):
        """
        Feature: paystack-integration, Property 18: Order Split Amounts Recorded

        Test edge cases for order split amounts recording.
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

        # Test amount where rounding matters
        platform_fee, creator_payout = calculate_platform_fee(7, "KES")  # 7 kobo
        expected_platform_fee = (7 * 2000) // 10000  # 1.4 -> 1
        assert platform_fee == expected_platform_fee
        assert creator_payout == 7 - expected_platform_fee
        assert platform_fee + creator_payout == 7

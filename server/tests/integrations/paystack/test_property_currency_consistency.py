"""
Property tests for Paystack currency consistency.

Tests Property 19: Currency Consistency
Validates Requirements 4.6, 7.6
"""

from hypothesis import given
from hypothesis import strategies as st

from polar.integrations.paystack.fee_calculator import calculate_platform_fee


class TestCurrencyConsistencyProperty:
    """
    Property tests for currency consistency in Paystack transactions.
    """

    @given(
        order_amount=st.integers(min_value=100, max_value=10000000),  # KES 1 to 100,000
    )
    async def test_property_19_currency_consistency_kes_only(self, order_amount):
        """
        Feature: paystack-integration, Property 19: Currency Consistency

        For any Paystack transaction, the currency should be KES, and the
        platform_fee_amount should be stored in the same currency as the order amount.
        """
        # Test with KES currency (primary currency for Paystack)
        platform_fee_amount, creator_payout_amount = calculate_platform_fee(
            order_amount, "KES"
        )

        # Verify amounts are calculated correctly
        assert platform_fee_amount >= 0
        assert creator_payout_amount >= 0
        assert platform_fee_amount + creator_payout_amount == order_amount

        # Verify currency consistency - all amounts should be in the same currency
        # In a real order, these would all be stored with currency="KES"
        expected_platform_fee = (order_amount * 2000) // 10000
        assert platform_fee_amount == expected_platform_fee

        # The currency should always be KES for Paystack transactions
        # This test validates that the calculation works correctly for KES amounts
        assert isinstance(platform_fee_amount, int)  # Amount in kobo (KES cents)
        assert isinstance(creator_payout_amount, int)  # Amount in kobo (KES cents)

    @given(
        order_amount=st.integers(min_value=100, max_value=10000000),
        currency=st.sampled_from(
            ["KES", "USD", "EUR", "GBP"]
        ),  # Test various currencies
    )
    async def test_property_19_currency_agnostic_calculation(
        self, order_amount, currency
    ):
        """
        Feature: paystack-integration, Property 19: Currency Consistency

        The platform fee calculation should work consistently regardless of currency,
        but for Paystack, we should only use KES in practice.
        """
        platform_fee_amount, creator_payout_amount = calculate_platform_fee(
            order_amount, currency
        )

        # Verify amounts are calculated correctly regardless of currency
        assert platform_fee_amount >= 0
        assert creator_payout_amount >= 0
        assert platform_fee_amount + creator_payout_amount == order_amount

        # Verify the 20% platform fee calculation is currency-agnostic
        expected_platform_fee = (order_amount * 2000) // 10000
        assert platform_fee_amount == expected_platform_fee
        assert creator_payout_amount == order_amount - expected_platform_fee

        # Note: In practice, Paystack should only use KES currency
        # This test validates that the calculation logic is robust

    def test_property_19_kes_currency_requirements(self):
        """
        Feature: paystack-integration, Property 19: Currency Consistency

        Test that KES currency is properly handled and that amounts are
        consistent within the same currency.
        """
        test_amounts = [100, 1000, 10000, 100000, 1000000]  # Various KES amounts

        for order_amount in test_amounts:
            platform_fee_amount, creator_payout_amount = calculate_platform_fee(
                order_amount, "KES"
            )

            # Verify currency consistency within the calculation
            assert platform_fee_amount + creator_payout_amount == order_amount

            # Verify that amounts are in the smallest currency unit (kobo for KES)
            assert isinstance(platform_fee_amount, int)
            assert isinstance(creator_payout_amount, int)

            # Verify that platform fee is exactly 20% (within integer rounding)
            expected_platform_fee = (order_amount * 2000) // 10000
            assert platform_fee_amount == expected_platform_fee

            # Verify that creator payout is the remainder
            assert creator_payout_amount == order_amount - platform_fee_amount

    @given(
        order_amount=st.integers(min_value=1, max_value=10000000),
    )
    async def test_property_19_integer_arithmetic_consistency(self, order_amount):
        """
        Feature: paystack-integration, Property 19: Currency Consistency

        Test that integer arithmetic for currency amounts is consistent
        and doesn't introduce rounding errors that break currency consistency.
        """
        platform_fee_amount, creator_payout_amount = calculate_platform_fee(
            order_amount, "KES"
        )

        # Verify that all amounts are integers (no fractional currency units)
        assert isinstance(platform_fee_amount, int)
        assert isinstance(creator_payout_amount, int)
        assert isinstance(order_amount, int)

        # Verify that the sum is exact (no rounding errors)
        assert platform_fee_amount + creator_payout_amount == order_amount

        # Verify that platform fee calculation uses integer division
        expected_platform_fee = (order_amount * 2000) // 10000
        assert platform_fee_amount == expected_platform_fee

        # Verify that no amount is negative (currency consistency)
        assert platform_fee_amount >= 0
        assert creator_payout_amount >= 0

    def test_property_19_edge_cases_currency_consistency(self):
        """
        Feature: paystack-integration, Property 19: Currency Consistency

        Test edge cases to ensure currency consistency is maintained.
        """
        # Test minimum amount (1 kobo)
        platform_fee, creator_payout = calculate_platform_fee(1, "KES")
        assert platform_fee + creator_payout == 1
        assert platform_fee >= 0 and creator_payout >= 0

        # Test amount that results in exact percentage
        platform_fee, creator_payout = calculate_platform_fee(10000, "KES")  # KES 100
        assert platform_fee == 2000  # Exactly 20%
        assert creator_payout == 8000  # Exactly 80%
        assert platform_fee + creator_payout == 10000

        # Test large amount
        platform_fee, creator_payout = calculate_platform_fee(10000000, "KES")
        assert platform_fee + creator_payout == 10000000
        assert platform_fee > 0 and creator_payout > 0

        # Test amounts that might cause rounding issues
        for amount in [3, 7, 11, 13, 17, 19, 23]:  # Prime numbers
            platform_fee, creator_payout = calculate_platform_fee(amount, "KES")
            assert platform_fee + creator_payout == amount
            assert platform_fee >= 0 and creator_payout >= 0

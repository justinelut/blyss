"""
Property tests for platform fee calculation (Platform Rebrand).

Feature: platform-rebrand
Property 2: Platform Fee Calculation Consistency
Validates: Requirements 3.1, 3.3

This test validates that the platform fee calculation is consistent with the
20% commission requirement for the Blyss marketplace platform.
"""

from hypothesis import given, settings
from hypothesis import strategies as st

from polar.integrations.paystack.fee_calculator import calculate_platform_fee


class TestPlatformFeeCalculationConsistency:
    """
    Feature: platform-rebrand, Property 2: Platform Fee Calculation Consistency

    **Validates: Requirements 3.1, 3.3**

    Property: For any transaction amount, the calculated platform fee should equal
    exactly 20% of the transaction amount (2000 basis points).

    Requirements:
    - 3.1: THE Platform SHALL apply a 20% commission on all transactions
    - 3.3: WHEN calculating transaction fees, THE Platform SHALL use the configured
           platform fee percentage
    """

    @settings(max_examples=100)
    @given(amount=st.integers(min_value=0, max_value=1000000))
    def test_fee_calculation_is_twenty_percent(self, amount: int):
        """
        For any transaction amount, fee should be exactly 20%.

        This property test verifies that the platform fee calculation consistently
        applies the 20% commission rate across all valid transaction amounts.
        """
        platform_fee, creator_payout = calculate_platform_fee(amount, "KES")

        # Calculate expected fee: 20% = 2000 basis points
        expected_fee = (amount * 2000) // 10000

        # Platform fee must equal exactly 20% of transaction amount
        assert platform_fee == expected_fee, (
            f"Platform fee {platform_fee} does not equal expected 20% "
            f"({expected_fee}) for amount {amount}"
        )

        # Creator payout must be the remainder
        assert creator_payout == amount - expected_fee, (
            f"Creator payout {creator_payout} does not equal expected "
            f"{amount - expected_fee} for amount {amount}"
        )

        # Total must equal original amount (no money lost or created)
        assert platform_fee + creator_payout == amount, (
            f"Total {platform_fee + creator_payout} does not equal "
            f"original amount {amount}"
        )

    @settings(max_examples=100)
    @given(
        amount=st.integers(min_value=0, max_value=1000000),
        currency=st.sampled_from(["KES", "USD", "EUR", "GBP", "NGN"]),
    )
    def test_fee_calculation_currency_independent(self, amount: int, currency: str):
        """
        Platform fee calculation should be consistent across all currencies.

        The 20% commission rate should apply uniformly regardless of the
        currency used for the transaction.
        """
        platform_fee, creator_payout = calculate_platform_fee(amount, currency)

        # Expected fee is always 20% regardless of currency
        expected_fee = (amount * 2000) // 10000

        assert platform_fee == expected_fee, (
            f"Platform fee {platform_fee} for {currency} does not equal "
            f"expected 20% ({expected_fee}) for amount {amount}"
        )

        assert creator_payout == amount - expected_fee

    @settings(max_examples=100)
    @given(amount=st.integers(min_value=0, max_value=1000000))
    def test_fee_calculation_non_negative(self, amount: int):
        """
        Platform fee and creator payout must always be non-negative.

        This ensures the fee calculation never produces invalid negative values.
        """
        platform_fee, creator_payout = calculate_platform_fee(amount, "KES")

        assert platform_fee >= 0, (
            f"Platform fee {platform_fee} is negative for amount {amount}"
        )

        assert creator_payout >= 0, (
            f"Creator payout {creator_payout} is negative for amount {amount}"
        )

    @settings(max_examples=100)
    @given(amount=st.integers(min_value=0, max_value=1000000))
    def test_fee_calculation_bounded(self, amount: int):
        """
        Platform fee must not exceed the transaction amount.

        This ensures the fee calculation never produces values greater than
        the original transaction amount.
        """
        platform_fee, creator_payout = calculate_platform_fee(amount, "KES")

        assert platform_fee <= amount, (
            f"Platform fee {platform_fee} exceeds amount {amount}"
        )

        assert creator_payout <= amount, (
            f"Creator payout {creator_payout} exceeds amount {amount}"
        )

    def test_fee_calculation_specific_examples(self):
        """
        Test specific examples to verify 20% fee calculation.

        These examples provide concrete validation of the fee calculation
        for common transaction amounts.
        """
        # Test zero amount
        platform_fee, creator_payout = calculate_platform_fee(0, "KES")
        assert platform_fee == 0
        assert creator_payout == 0

        # Test KES 100 (10000 kobo)
        platform_fee, creator_payout = calculate_platform_fee(10000, "KES")
        assert platform_fee == 2000  # Exactly 20%
        assert creator_payout == 8000  # Exactly 80%

        # Test KES 1,000 (100000 kobo)
        platform_fee, creator_payout = calculate_platform_fee(100000, "KES")
        assert platform_fee == 20000  # Exactly 20%
        assert creator_payout == 80000  # Exactly 80%

        # Test KES 10,000 (1000000 kobo)
        platform_fee, creator_payout = calculate_platform_fee(1000000, "KES")
        assert platform_fee == 200000  # Exactly 20%
        assert creator_payout == 800000  # Exactly 80%

        # Test small amount with rounding
        platform_fee, creator_payout = calculate_platform_fee(1, "KES")
        assert platform_fee == 0  # 1 * 0.20 = 0.2, rounds down to 0
        assert creator_payout == 1

        # Test amount that doesn't divide evenly
        platform_fee, creator_payout = calculate_platform_fee(999, "KES")
        expected_fee = (999 * 2000) // 10000  # = 199
        assert platform_fee == expected_fee
        assert creator_payout == 999 - expected_fee
        assert platform_fee + creator_payout == 999

"""
Unit tests for platform fee calculation and recording.

Tests Requirements 4.4, 4.5, 7.2, 7.5
"""

from polar.integrations.paystack.fee_calculator import calculate_platform_fee
from polar.models import Customer, Order, Organization
from tests.fixtures.database import SaveFixture


class TestPlatformFeeCalculation:
    """
    Unit tests for platform fee calculation logic.
    """

    def test_calculate_platform_fee_standard_amounts(self):
        """
        Test platform fee calculation with standard order amounts.
        """
        test_cases = [
            # (order_amount, expected_platform_fee, expected_creator_payout)
            (10000, 2000, 8000),  # KES 100 -> KES 20 + KES 80
            (50000, 10000, 40000),  # KES 500 -> KES 100 + KES 400
            (100000, 20000, 80000),  # KES 1,000 -> KES 200 + KES 800
            (1000000, 200000, 800000),  # KES 10,000 -> KES 2,000 + KES 8,000
        ]

        for order_amount, expected_platform_fee, expected_creator_payout in test_cases:
            platform_fee, creator_payout = calculate_platform_fee(order_amount, "KES")

            assert platform_fee == expected_platform_fee
            assert creator_payout == expected_creator_payout
            assert platform_fee + creator_payout == order_amount

    def test_calculate_platform_fee_small_amounts(self):
        """
        Test platform fee calculation with small amounts that might cause rounding.
        """
        test_cases = [
            # (order_amount, expected_platform_fee, expected_creator_payout)
            (1, 0, 1),  # 1 kobo -> 0 + 1 (rounds down)
            (2, 0, 2),  # 2 kobo -> 0 + 2 (rounds down)
            (3, 0, 3),  # 3 kobo -> 0 + 3 (rounds down)
            (4, 0, 4),  # 4 kobo -> 0 + 4 (rounds down)
            (5, 1, 4),  # 5 kobo -> 1 + 4 (first non-zero fee)
            (10, 2, 8),  # 10 kobo -> 2 + 8
            (25, 5, 20),  # 25 kobo -> 5 + 20
            (99, 19, 80),  # 99 kobo -> 19 + 80
        ]

        for order_amount, expected_platform_fee, expected_creator_payout in test_cases:
            platform_fee, creator_payout = calculate_platform_fee(order_amount, "KES")

            assert platform_fee == expected_platform_fee
            assert creator_payout == expected_creator_payout
            assert platform_fee + creator_payout == order_amount

    def test_calculate_platform_fee_currency_consistency(self):
        """
        Test that platform fee calculation works consistently across currencies.
        """
        order_amount = 10000  # 100 units in any currency
        currencies = ["KES", "USD", "EUR", "GBP"]

        for currency in currencies:
            platform_fee, creator_payout = calculate_platform_fee(
                order_amount, currency
            )

            # Should always be 20% regardless of currency
            assert platform_fee == 2000  # 20% of 10000
            assert creator_payout == 8000  # 80% of 10000
            assert platform_fee + creator_payout == order_amount

    def test_calculate_platform_fee_edge_cases(self):
        """
        Test platform fee calculation edge cases.
        """
        # Zero amount
        platform_fee, creator_payout = calculate_platform_fee(0, "KES")
        assert platform_fee == 0
        assert creator_payout == 0

        # Maximum reasonable amount (KES 1,000,000 = 100,000,000 kobo)
        platform_fee, creator_payout = calculate_platform_fee(100000000, "KES")
        assert platform_fee == 20000000  # 20%
        assert creator_payout == 80000000  # 80%
        assert platform_fee + creator_payout == 100000000

    def test_platform_fee_percentage_accuracy(self):
        """
        Test that platform fee is exactly 20% (within integer rounding).
        """
        test_amounts = [100, 500, 1000, 5000, 10000, 50000, 100000]

        for amount in test_amounts:
            platform_fee, creator_payout = calculate_platform_fee(amount, "KES")

            # Platform fee should be exactly 20% using integer division
            expected_platform_fee = (amount * 2000) // 10000
            assert platform_fee == expected_platform_fee

            # Creator payout should be the remainder
            assert creator_payout == amount - platform_fee

            # Total should equal original amount
            assert platform_fee + creator_payout == amount


class TestPlatformFeeSplitAmountsRecording:
    """
    Unit tests for recording platform fee split amounts in orders.
    """

    async def test_order_records_platform_fee_amounts(
        self,
        session,
        save_fixture: SaveFixture,
    ):
        """
        Test that orders record both platform fee and creator payout amounts.
        """
        # Create test data
        organization = Organization(
            name="Test Org",
            slug="test-org",
            subaccount_code="ACCT_test123",
            subaccount_status="active",
        )
        await save_fixture(organization)

        customer = Customer(
            email="test@example.com",
            organization=organization,
        )
        await save_fixture(customer)

        # Create order with platform fee amounts
        order_amount = 10000  # KES 100
        platform_fee_amount, creator_payout_amount = calculate_platform_fee(
            order_amount, "KES"
        )

        order = Order(
            subtotal_amount=order_amount,
            tax_amount=0,
            total_amount=order_amount,
            currency="KES",
            customer=customer,
            platform_fee_amount=platform_fee_amount,
            platform_fee_currency="KES",
            creator_payout_amount=creator_payout_amount,
            billing_reason="purchase",
            invoice_number="INV-001",
        )
        await save_fixture(order)

        # Verify amounts are recorded correctly
        assert order.platform_fee_amount == 2000  # 20% of 10000
        assert order.platform_fee_currency == "KES"
        assert order.creator_payout_amount == 8000  # 80% of 10000
        assert order.currency == "KES"

        # Verify currency consistency
        assert order.platform_fee_currency == order.currency

        # Verify split amounts sum to total
        assert (
            order.platform_fee_amount + order.creator_payout_amount
            == order.total_amount
        )

    async def test_order_currency_consistency(
        self,
        session,
        save_fixture: SaveFixture,
    ):
        """
        Test that platform fee currency matches order currency.
        """
        organization = Organization(
            name="Test Org",
            slug="test-org",
            subaccount_code="ACCT_test123",
            subaccount_status="active",
        )
        await save_fixture(organization)

        customer = Customer(
            email="test@example.com",
            organization=organization,
        )
        await save_fixture(customer)

        # Test with different currencies
        currencies = ["KES", "USD", "EUR"]
        order_amount = 10000

        for currency in currencies:
            platform_fee_amount, creator_payout_amount = calculate_platform_fee(
                order_amount, currency
            )

            order = Order(
                subtotal_amount=order_amount,
                tax_amount=0,
                total_amount=order_amount,
                currency=currency,
                customer=customer,
                platform_fee_amount=platform_fee_amount,
                platform_fee_currency=currency,
                creator_payout_amount=creator_payout_amount,
                billing_reason="purchase",
                invoice_number=f"INV-{currency}",
            )
            await save_fixture(order)

            # Verify currency consistency
            assert order.platform_fee_currency == order.currency == currency
            assert order.platform_fee_amount == 2000  # 20% regardless of currency
            assert order.creator_payout_amount == 8000  # 80% regardless of currency

    def test_split_amounts_calculation_consistency(self):
        """
        Test that split amounts calculation is consistent across different scenarios.
        """
        test_scenarios = [
            # (description, order_amount, expected_platform_fee, expected_creator_payout)
            ("Small amount", 100, 20, 80),
            ("Medium amount", 5000, 1000, 4000),
            ("Large amount", 100000, 20000, 80000),
            ("Odd amount", 12345, 2469, 9876),  # 12345 * 0.2 = 2469
            ("Prime number", 10007, 2001, 8006),  # 10007 * 0.2 = 2001.4 -> 2001
        ]

        for (
            description,
            order_amount,
            expected_platform_fee,
            expected_creator_payout,
        ) in test_scenarios:
            platform_fee, creator_payout = calculate_platform_fee(order_amount, "KES")

            assert platform_fee == expected_platform_fee, f"Failed for {description}"
            assert creator_payout == expected_creator_payout, (
                f"Failed for {description}"
            )
            assert platform_fee + creator_payout == order_amount, (
                f"Failed for {description}"
            )

    def test_zero_and_negative_amounts(self):
        """
        Test platform fee calculation with zero and edge case amounts.
        """
        # Zero amount
        platform_fee, creator_payout = calculate_platform_fee(0, "KES")
        assert platform_fee == 0
        assert creator_payout == 0

        # Very small amounts
        for amount in range(1, 10):
            platform_fee, creator_payout = calculate_platform_fee(amount, "KES")
            assert platform_fee >= 0
            assert creator_payout >= 0
            assert platform_fee + creator_payout == amount

    def test_large_amounts_no_overflow(self):
        """
        Test that large amounts don't cause integer overflow issues.
        """
        # Test with very large amounts
        large_amounts = [
            1000000,  # KES 10,000
            10000000,  # KES 100,000
            100000000,  # KES 1,000,000
        ]

        for amount in large_amounts:
            platform_fee, creator_payout = calculate_platform_fee(amount, "KES")

            # Verify calculations are correct
            expected_platform_fee = (amount * 2000) // 10000
            assert platform_fee == expected_platform_fee
            assert creator_payout == amount - platform_fee
            assert platform_fee + creator_payout == amount

            # Verify no overflow (all values should be positive integers)
            assert isinstance(platform_fee, int)
            assert isinstance(creator_payout, int)
            assert platform_fee >= 0
            assert creator_payout >= 0

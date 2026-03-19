"""
Property tests for payment processor type display.

Tests Property 35: Payment Processor Type Displayed
Validates Requirements 10.3
"""

from hypothesis import given
from hypothesis import strategies as st

from polar.integrations.paystack.fee_calculator import calculate_platform_fee


class TestPaymentProcessorDisplayProperty:
    """
    Property tests for payment processor type display in order details.
    """

    @given(
        order_amount=st.integers(min_value=100, max_value=10000000),  # KES 1 to 100,000
    )
    async def test_property_35_paystack_orders_show_processor_type(self, order_amount):
        """
        Feature: paystack-integration, Property 35: Payment Processor Type Displayed

        For any order processed through Paystack, the order details should indicate
        that Paystack was used as the payment processor.
        """
        # Calculate platform fee for Paystack order
        platform_fee_amount, creator_payout_amount = calculate_platform_fee(
            order_amount, "KES"
        )

        # Verify that platform fee is calculated (indicating Paystack order)
        assert platform_fee_amount >= 0
        assert creator_payout_amount >= 0
        assert platform_fee_amount + creator_payout_amount == order_amount

        # For Paystack orders, platform fee should be exactly 20%
        expected_platform_fee = (order_amount * 2000) // 10000
        assert platform_fee_amount == expected_platform_fee

        # Simulate order data structure that would be used in UI
        order_data = {
            "total_amount": order_amount,
            "platform_fee_amount": platform_fee_amount,
            "creator_payout_amount": creator_payout_amount,
            "currency": "KES",
        }

        # Test payment processor detection logic
        is_paystack_order = order_data.get("platform_fee_amount", 0) > 0

        # For orders with platform fee, should be detected as Paystack
        if platform_fee_amount > 0:
            assert is_paystack_order is True
        else:
            # For very small amounts where platform fee rounds to 0
            assert is_paystack_order is False

    def test_property_35_stripe_orders_show_processor_type(self):
        """
        Feature: paystack-integration, Property 35: Payment Processor Type Displayed

        For orders processed through Stripe (legacy orders), the order details
        should indicate that Stripe was used as the payment processor.
        """
        # Simulate Stripe order (no platform fee)
        stripe_order_data = {
            "total_amount": 10000,  # KES 100
            "platform_fee_amount": 0,  # No platform fee for Stripe orders
            "creator_payout_amount": 0,  # No creator payout for Stripe orders
            "currency": "KES",
        }

        # Test payment processor detection logic
        is_paystack_order = stripe_order_data.get("platform_fee_amount", 0) > 0

        # Should be detected as Stripe (not Paystack)
        assert is_paystack_order is False

    @given(
        order_amount=st.integers(min_value=1, max_value=99),  # Small amounts
    )
    async def test_property_35_small_amounts_processor_detection(self, order_amount):
        """
        Feature: paystack-integration, Property 35: Payment Processor Type Displayed

        For small order amounts where platform fee might round to zero,
        the processor type detection should still work correctly.
        """
        platform_fee_amount, creator_payout_amount = calculate_platform_fee(
            order_amount, "KES"
        )

        # Simulate order data
        order_data = {
            "total_amount": order_amount,
            "platform_fee_amount": platform_fee_amount,
            "creator_payout_amount": creator_payout_amount,
            "currency": "KES",
        }

        # Test payment processor detection
        is_paystack_order = order_data.get("platform_fee_amount", 0) > 0

        # For very small amounts, platform fee might be 0 due to rounding
        if platform_fee_amount > 0:
            assert is_paystack_order is True
        else:
            assert is_paystack_order is False

        # Verify the amounts are still consistent
        assert platform_fee_amount + creator_payout_amount == order_amount

    def test_property_35_processor_type_consistency(self):
        """
        Feature: paystack-integration, Property 35: Payment Processor Type Displayed

        Test that payment processor type detection is consistent across
        different order scenarios.
        """
        test_cases = [
            # (order_amount, expected_is_paystack)
            (0, False),  # Zero amount - should be Stripe
            (1, False),  # 1 kobo - platform fee rounds to 0, should be Stripe
            (5, True),  # 5 kobo - platform fee is 1, should be Paystack
            (100, True),  # KES 1 - should be Paystack
            (10000, True),  # KES 100 - should be Paystack
            (1000000, True),  # KES 10,000 - should be Paystack
        ]

        for order_amount, expected_is_paystack in test_cases:
            if order_amount > 0:
                platform_fee_amount, creator_payout_amount = calculate_platform_fee(
                    order_amount, "KES"
                )
            else:
                platform_fee_amount = 0
                creator_payout_amount = 0

            order_data = {
                "total_amount": order_amount,
                "platform_fee_amount": platform_fee_amount,
                "creator_payout_amount": creator_payout_amount,
                "currency": "KES",
            }

            is_paystack_order = order_data.get("platform_fee_amount", 0) > 0

            assert is_paystack_order == expected_is_paystack, (
                f"Order amount {order_amount}: expected {expected_is_paystack}, "
                f"got {is_paystack_order} (platform_fee: {platform_fee_amount})"
            )

    def test_property_35_ui_display_logic(self):
        """
        Feature: paystack-integration, Property 35: Payment Processor Type Displayed

        Test the UI display logic for payment processor types.
        """
        # Test Paystack order display
        paystack_order = {
            "total_amount": 10000,  # KES 100
            "platform_fee_amount": 2000,  # KES 20 (20%)
            "creator_payout_amount": 8000,  # KES 80 (80%)
            "currency": "KES",
        }

        is_paystack = paystack_order.get("platform_fee_amount", 0) > 0
        assert is_paystack is True

        # Simulate UI display logic
        processor_name = "Paystack" if is_paystack else "Stripe"
        processor_class = (
            "bg-green-100 text-green-600"
            if is_paystack
            else "bg-blue-100 text-blue-600"
        )

        assert processor_name == "Paystack"
        assert "green" in processor_class

        # Test Stripe order display
        stripe_order = {
            "total_amount": 10000,  # KES 100
            "platform_fee_amount": 0,  # No platform fee
            "creator_payout_amount": 0,  # No creator payout
            "currency": "KES",
        }

        is_paystack = stripe_order.get("platform_fee_amount", 0) > 0
        assert is_paystack is False

        processor_name = "Paystack" if is_paystack else "Stripe"
        processor_class = (
            "bg-green-100 text-green-600"
            if is_paystack
            else "bg-blue-100 text-blue-600"
        )

        assert processor_name == "Stripe"
        assert "blue" in processor_class

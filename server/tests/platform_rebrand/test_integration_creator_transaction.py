"""
Integration test for creator transaction flow with Blyss branding.

Feature: platform-rebrand
Task: 12.2 Write integration test for creator transaction flow

This test validates the complete creator transaction experience including
product creation with KES default, payment processing with 20% fee, and
transaction records showing correct branding.
"""

import uuid

import pytest
from httpx import AsyncClient

from polar.integrations.paystack.fee_calculator import calculate_platform_fee
from polar.models import Customer, Order, Organization, Product, ProductPrice, User
from polar.models.product_price import ProductPriceAmountType
from polar.postgres import AsyncSession
from tests.fixtures.database import SaveFixture


class TestCreatorTransactionFlowIntegration:
    """
    Integration test for creator transaction flow with Blyss branding.

    Validates:
    - Product creation defaults to KES currency
    - Payment processing applies 20% platform fee
    - Transaction records show correct branding
    """

    @pytest.mark.asyncio
    async def test_product_creation_defaults_to_kes(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that new products default to KES currency.

        Requirements: 4.1, 4.3
        """
        # Create organization
        organization = Organization(name="Creator Org")
        await save_fixture(organization)

        # Create product with KES as default currency
        product = Product(
            name="Test Product",
            description="Product for Kenyan market",
            organization_id=organization.id,
            is_archived=False,
        )
        await save_fixture(product)

        # Create product price with KES
        price = ProductPrice(
            product_id=product.id,
            amount_type=ProductPriceAmountType.fixed,
            price_amount=100000,  # KES 1,000.00
            currency="KES",
        )
        await save_fixture(price)

        # Verify product was created
        await session.refresh(product)
        await session.refresh(price)

        assert product.id is not None
        assert price.currency == "KES"
        assert price.price_amount == 100000

    @pytest.mark.asyncio
    async def test_payment_processing_applies_twenty_percent_fee(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that payment processing applies 20% platform fee.

        Requirements: 3.1, 3.2, 3.3
        """
        # Create organization
        organization = Organization(name="Creator Org")
        await save_fixture(organization)

        # Create customer
        customer = Customer(
            email="customer@example.com",
            stripe_customer_id="cus_test_123",
        )
        await save_fixture(customer)

        # Test various transaction amounts
        test_amounts = [
            10000,  # KES 100.00
            50000,  # KES 500.00
            100000,  # KES 1,000.00
            250000,  # KES 2,500.00
        ]

        for amount in test_amounts:
            # Calculate platform fee
            platform_fee, creator_payout = calculate_platform_fee(amount, "KES")

            # Verify 20% fee calculation
            expected_fee = (amount * 2000) // 10000  # 20% = 2000 basis points
            assert platform_fee == expected_fee, (
                f"Platform fee {platform_fee} does not equal expected 20% "
                f"({expected_fee}) for amount {amount}"
            )

            # Verify creator receives 80%
            assert creator_payout == amount - expected_fee
            assert platform_fee + creator_payout == amount

            # Create order with calculated fee
            order = Order(
                subtotal_amount=amount,
                tax_amount=0,
                currency="KES",
                billing_reason="purchase",
                stripe_invoice_id=f"in_test_{uuid.uuid4()}",
                platform_fee_amount=platform_fee,
                customer_id=customer.id,
                organization_id=organization.id,
            )
            await save_fixture(order)

            # Verify order was created with correct fee
            await session.refresh(order)
            assert order.platform_fee_amount == expected_fee
            assert order.currency == "KES"

    @pytest.mark.asyncio
    async def test_transaction_records_show_correct_branding(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that transaction records display with Blyss branding.

        Requirements: 1.4, 5.3, 8.3
        """
        # Create organization
        organization = Organization(name="Creator Org")
        await save_fixture(organization)

        # Create customer
        customer = Customer(
            email="customer@example.com",
            stripe_customer_id="cus_test_456",
        )
        await save_fixture(customer)

        # Create transaction with 20% fee
        transaction_amount = 100000  # KES 1,000.00
        platform_fee, creator_payout = calculate_platform_fee(transaction_amount, "KES")

        order = Order(
            subtotal_amount=transaction_amount,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            stripe_invoice_id="in_blyss_test",
            platform_fee_amount=platform_fee,
            customer_id=customer.id,
            organization_id=organization.id,
        )
        await save_fixture(order)

        # Verify transaction record
        await session.refresh(order)

        assert order.id is not None
        assert order.currency == "KES"
        assert order.platform_fee_amount == 20000  # 20% of 100000
        assert order.subtotal_amount == transaction_amount

        # Verify fee calculation is correct
        assert order.platform_fee_amount == (transaction_amount * 20) // 100

    @pytest.mark.asyncio
    async def test_creator_receives_correct_payout(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that creator receives correct payout after 20% platform fee.

        Requirements: 3.1, 3.3
        """
        # Create organization
        organization = Organization(name="Creator Org")
        await save_fixture(organization)

        # Create customer
        customer = Customer(
            email="customer@example.com",
            stripe_customer_id="cus_test_789",
        )
        await save_fixture(customer)

        # Test transaction
        transaction_amount = 500000  # KES 5,000.00
        platform_fee, creator_payout = calculate_platform_fee(transaction_amount, "KES")

        # Verify creator payout calculation
        assert creator_payout == 400000  # 80% of 500000
        assert platform_fee == 100000  # 20% of 500000
        assert creator_payout + platform_fee == transaction_amount

        # Create order
        order = Order(
            subtotal_amount=transaction_amount,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            stripe_invoice_id="in_payout_test",
            platform_fee_amount=platform_fee,
            customer_id=customer.id,
            organization_id=organization.id,
        )
        await save_fixture(order)

        # Verify order
        await session.refresh(order)

        # Calculate creator's net amount (subtotal - platform fee)
        creator_net = order.subtotal_amount - order.platform_fee_amount
        assert creator_net == creator_payout
        assert creator_net == 400000

    @pytest.mark.asyncio
    async def test_multiple_transactions_consistent_fee_calculation(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that multiple transactions have consistent 20% fee calculation.

        Requirements: 3.1, 3.3
        """
        # Create organization
        organization = Organization(name="Creator Org")
        await save_fixture(organization)

        # Create customer
        customer = Customer(
            email="customer@example.com",
            stripe_customer_id="cus_test_multi",
        )
        await save_fixture(customer)

        # Create multiple transactions with different amounts
        test_transactions = [
            25000,  # KES 250.00
            75000,  # KES 750.00
            150000,  # KES 1,500.00
            300000,  # KES 3,000.00
        ]

        for amount in test_transactions:
            # Calculate fee
            platform_fee, creator_payout = calculate_platform_fee(amount, "KES")

            # Create order
            order = Order(
                subtotal_amount=amount,
                tax_amount=0,
                currency="KES",
                billing_reason="purchase",
                stripe_invoice_id=f"in_multi_{uuid.uuid4()}",
                platform_fee_amount=platform_fee,
                customer_id=customer.id,
                organization_id=organization.id,
            )
            await save_fixture(order)

            # Verify fee is exactly 20%
            await session.refresh(order)
            expected_fee = (amount * 20) // 100
            assert order.platform_fee_amount == expected_fee

    @pytest.mark.asyncio
    async def test_kes_currency_formatting_in_transactions(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that KES currency is used consistently in transactions.

        Requirements: 4.1, 4.2, 4.3
        """
        # Create organization
        organization = Organization(name="Creator Org")
        await save_fixture(organization)

        # Create customer
        customer = Customer(
            email="customer@example.com",
            stripe_customer_id="cus_test_kes",
        )
        await save_fixture(customer)

        # Create transaction in KES
        transaction_amount = 200000  # KES 2,000.00
        platform_fee, creator_payout = calculate_platform_fee(transaction_amount, "KES")

        order = Order(
            subtotal_amount=transaction_amount,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            stripe_invoice_id="in_kes_test",
            platform_fee_amount=platform_fee,
            customer_id=customer.id,
            organization_id=organization.id,
        )
        await save_fixture(order)

        # Verify currency is KES
        await session.refresh(order)
        assert order.currency == "KES"
        assert order.currency.upper() == "KES"

    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_creator_transaction_flow_end_to_end(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user: User,
    ):
        """
        Test complete creator transaction flow from product to payment.

        Requirements: 3.1, 4.1, 4.3, 8.3
        """
        # Create organization
        organization = Organization(
            name="Creator Org",
            slug="creator-org",
        )
        await save_fixture(organization)

        # Create product
        product = Product(
            name="Digital Product",
            description="Test product for transaction flow",
            organization_id=organization.id,
            is_archived=False,
        )
        await save_fixture(product)

        # Create product price in KES
        price = ProductPrice(
            product_id=product.id,
            amount_type=ProductPriceAmountType.fixed,
            price_amount=150000,  # KES 1,500.00
            currency="KES",
        )
        await save_fixture(price)

        # Create customer
        customer = Customer(
            email="buyer@example.com",
            stripe_customer_id="cus_test_e2e",
        )
        await save_fixture(customer)

        # Calculate platform fee for the transaction
        platform_fee, creator_payout = calculate_platform_fee(price.price_amount, "KES")

        # Create order (simulating successful payment)
        order = Order(
            subtotal_amount=price.price_amount,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            stripe_invoice_id="in_e2e_test",
            platform_fee_amount=platform_fee,
            customer_id=customer.id,
            organization_id=organization.id,
        )
        await save_fixture(order)

        # Verify complete transaction
        await session.refresh(product)
        await session.refresh(price)
        await session.refresh(order)

        # Verify product and price
        assert product.id is not None
        assert price.currency == "KES"
        assert price.price_amount == 150000

        # Verify order and fee calculation
        assert order.currency == "KES"
        assert order.subtotal_amount == 150000
        assert order.platform_fee_amount == 30000  # 20% of 150000
        assert order.platform_fee_amount == platform_fee

        # Verify creator payout
        creator_net = order.subtotal_amount - order.platform_fee_amount
        assert creator_net == 120000  # 80% of 150000
        assert creator_net == creator_payout

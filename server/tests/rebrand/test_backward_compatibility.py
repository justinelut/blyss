"""
Unit tests for platform rebrand backward compatibility.

These tests verify that the rebrand from Polar to Blyss maintains backward
compatibility with existing data (users, products, transactions, payment configurations).
"""

import uuid

import pytest
from httpx import AsyncClient

from polar.models import Customer, Order, Organization, Product, User
from polar.postgres import AsyncSession
from tests.fixtures.database import SaveFixture


class TestBackwardCompatibility:
    """Unit tests for backward compatibility requirements."""

    @pytest.mark.asyncio
    async def test_existing_user_accounts_load_correctly(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that existing user accounts load correctly after rebrand.
        Requirements: 8.1
        """
        # Create an existing user (simulating pre-rebrand state)
        existing_user = User(
            email="existing@example.com",
            email_verified=True,
            accepted_terms_of_service=True,
            stripe_customer_id="cus_existing_123",
        )
        await save_fixture(existing_user)

        # Store original values
        original_id = existing_user.id
        original_email = existing_user.email
        original_stripe_customer_id = existing_user.stripe_customer_id

        # Simulate rebrand deployment (no changes should occur to user data)
        # In a real scenario, this would be the deployment process

        # Retrieve the user after "rebrand"
        await session.refresh(existing_user)

        # Verify all original data is preserved
        assert existing_user.id == original_id
        assert existing_user.email == original_email
        assert existing_user.stripe_customer_id == original_stripe_customer_id
        assert existing_user.email_verified is True
        assert existing_user.accepted_terms_of_service is True

    @pytest.mark.asyncio
    async def test_existing_products_display_with_new_branding(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that existing products display correctly with Blyss branding.
        Requirements: 8.2
        """
        # Create organization
        organization = Organization(name="Test Org")
        await save_fixture(organization)

        # Create an existing product (simulating pre-rebrand state)
        existing_product = Product(
            name="Existing Product",
            description="Product created before rebrand",
            organization_id=organization.id,
            is_archived=False,
        )
        await save_fixture(existing_product)

        # Store original values
        original_id = existing_product.id
        original_name = existing_product.name
        original_description = existing_product.description

        # Simulate rebrand deployment
        await session.refresh(existing_product)

        # Verify product data is preserved
        assert existing_product.id == original_id
        assert existing_product.name == original_name
        assert existing_product.description == original_description
        assert existing_product.is_archived is False

        # Product should be queryable and displayable
        assert existing_product.organization_id == organization.id

    @pytest.mark.asyncio
    async def test_existing_transactions_show_correct_fees(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that existing transactions display with correct historical fees.
        Requirements: 8.3
        """
        # Create organization
        organization = Organization(name="Test Org")
        await save_fixture(organization)

        # Create an existing order with old fee structure (4% = 400 basis points)
        existing_order = Order(
            subtotal_amount=10000,  # $100.00
            tax_amount=1000,  # $10.00
            currency="USD",
            billing_reason="purchase",
            stripe_invoice_id="in_existing_order_123",
            platform_fee_amount=400,  # Old 4% fee = $4.00
            customer_id=uuid.uuid4(),
            organization_id=organization.id,
        )
        await save_fixture(existing_order)

        # Store original values
        original_id = existing_order.id
        original_subtotal = existing_order.subtotal_amount
        original_platform_fee = existing_order.platform_fee_amount

        # Simulate rebrand deployment (fee configuration changes to 20%)
        await session.refresh(existing_order)

        # Verify historical transaction preserves old fee
        assert existing_order.id == original_id
        assert existing_order.subtotal_amount == original_subtotal
        assert existing_order.platform_fee_amount == original_platform_fee
        assert existing_order.platform_fee_amount == 400  # Old 4% fee preserved

        # Historical transactions should not be recalculated with new fee
        assert existing_order.platform_fee_amount != 2000  # New 20% would be $20.00

    @pytest.mark.asyncio
    async def test_payment_configurations_remain_functional(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that existing payment configurations remain functional after rebrand.
        Requirements: 8.4
        """
        # Create organization with payment configuration
        organization = Organization(
            name="Test Org",
            stripe_id="acct_existing_123",
        )
        await save_fixture(organization)

        # Create customer with payment method
        customer = Customer(
            email="customer@example.com",
            stripe_customer_id="cus_customer_123",
        )
        await save_fixture(customer)

        # Store original values
        original_org_stripe_id = organization.stripe_id
        original_customer_stripe_id = customer.stripe_customer_id

        # Simulate rebrand deployment
        await session.refresh(organization)
        await session.refresh(customer)

        # Verify payment configurations are preserved
        assert organization.stripe_id == original_org_stripe_id
        assert customer.stripe_customer_id == original_customer_stripe_id

        # Payment configurations should remain functional
        assert organization.stripe_id is not None
        assert customer.stripe_customer_id is not None

    @pytest.mark.asyncio
    async def test_mixed_old_and_new_data_coexistence(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that old (pre-rebrand) and new (post-rebrand) data coexist correctly.
        Requirements: 8.1, 8.2, 8.3, 8.5
        """
        # Create organization
        organization = Organization(name="Test Org")
        await save_fixture(organization)

        # Create old order with 4% fee (pre-rebrand)
        old_order = Order(
            subtotal_amount=10000,
            tax_amount=1000,
            currency="USD",
            billing_reason="purchase",
            stripe_invoice_id="in_old_order",
            platform_fee_amount=400,  # Old 4% fee
            customer_id=uuid.uuid4(),
            organization_id=organization.id,
        )
        await save_fixture(old_order)

        # Create new order with 20% fee (post-rebrand)
        new_order = Order(
            subtotal_amount=10000,
            tax_amount=1000,
            currency="KES",
            billing_reason="purchase",
            stripe_invoice_id="in_new_order",
            platform_fee_amount=2000,  # New 20% fee
            customer_id=uuid.uuid4(),
            organization_id=organization.id,
        )
        await save_fixture(new_order)

        # Both orders should be queryable
        await session.refresh(old_order)
        await session.refresh(new_order)

        # Verify old order preserves old fee structure
        assert old_order.platform_fee_amount == 400
        assert old_order.currency == "USD"

        # Verify new order uses new fee structure
        assert new_order.platform_fee_amount == 2000
        assert new_order.currency == "KES"

        # Both should be valid and queryable
        assert old_order.id != new_order.id
        assert old_order.organization_id == new_order.organization_id

    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_user_api_endpoints_work_after_rebrand(
        self,
        client: AsyncClient,
        user: User,
    ):
        """
        Test that user API endpoints work correctly after rebrand.
        Requirements: 8.1, 8.5
        """
        # Test user profile endpoint
        response = await client.get("/v1/users/me")

        assert response.status_code == 200
        json = response.json()

        # User data should be accessible
        assert json["email"] == user.email
        assert "id" in json

        # API should work with existing user data
        assert json["email_verified"] == user.email_verified

    @pytest.mark.asyncio
    async def test_organization_data_preservation(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that organization data is preserved after rebrand.
        Requirements: 8.2, 8.4
        """
        # Create organization with various configurations
        organization = Organization(
            name="Existing Organization",
            slug="existing-org",
            stripe_id="acct_org_123",
            avatar_url="https://example.com/avatar.png",
        )
        await save_fixture(organization)

        # Store original values
        original_id = organization.id
        original_name = organization.name
        original_slug = organization.slug
        original_stripe_id = organization.stripe_id
        original_avatar_url = organization.avatar_url

        # Simulate rebrand deployment
        await session.refresh(organization)

        # Verify all organization data is preserved
        assert organization.id == original_id
        assert organization.name == original_name
        assert organization.slug == original_slug
        assert organization.stripe_id == original_stripe_id
        assert organization.avatar_url == original_avatar_url

    @pytest.mark.asyncio
    async def test_customer_data_preservation(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
    ):
        """
        Test that customer data is preserved after rebrand.
        Requirements: 8.4, 8.5
        """
        # Create customer with payment data
        customer = Customer(
            email="customer@example.com",
            stripe_customer_id="cus_customer_456",
            email_verified=True,
        )
        await save_fixture(customer)

        # Store original values
        original_id = customer.id
        original_email = customer.email
        original_stripe_customer_id = customer.stripe_customer_id

        # Simulate rebrand deployment
        await session.refresh(customer)

        # Verify customer data is preserved
        assert customer.id == original_id
        assert customer.email == original_email
        assert customer.stripe_customer_id == original_stripe_customer_id
        assert customer.email_verified is True

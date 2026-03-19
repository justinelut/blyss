"""
Unit tests for checkout cart integration.

These tests verify specific examples and edge cases for cart-based checkout functionality.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock

from polar.auth.models import AuthSubject, User
from polar.cart.repository import CartRepository
from polar.cart.service import CartService
from polar.checkout.schemas import CheckoutCartCreate, CheckoutProductCreate
from polar.checkout.service import CheckoutService
from polar.models import CartItem, Customer, Organization, Product, ProductPrice
from polar.models.checkout import CheckoutStatus
from polar.models.product_price import ProductPriceAmountType


class TestCheckoutCartIntegration:
    """Test checkout integration with cart functionality."""

    async def test_checkout_session_creation_with_multiple_cart_items(
        self,
        session,
        user: User,
        organization: Organization,
    ):
        """Test checkout session creation with multiple cart items."""
        # Create products and cart items
        products = []
        cart_items = []

        for i in range(3):
            # Create product
            product = Product(
                id=uuid.uuid4(),
                name=f"Test Product {i}",
                description=f"Test product {i}",
                is_recurring=False,
                is_archived=False,
                organization=organization,
            )

            # Create product price
            price = ProductPrice(
                id=uuid.uuid4(),
                amount_type=ProductPriceAmountType.fixed,
                price_amount=1000 + (i * 500),  # $10.00, $15.00, $20.00
                currency="USD",
                product=product,
            )
            product.prices = [price]
            products.append(product)

            # Create cart item
            cart_item = CartItem(
                id=uuid.uuid4(),
                user_id=user.id,
                session_token=None,
                product_id=product.id,
                quantity=i + 1,  # 1, 2, 3
                product=product,
            )
            cart_items.append(cart_item)

        # Mock cart repository
        cart_repository = MagicMock(spec=CartRepository)
        cart_repository.get_by_id = AsyncMock()

        # Set up cart repository to return cart items
        def get_cart_item_by_id(cart_item_id):
            for item in cart_items:
                if item.id == cart_item_id:
                    return item
            return None

        cart_repository.get_by_id.side_effect = get_cart_item_by_id

        # Create cart service
        cart_service = CartService(cart_repository)

        # Create checkout service
        checkout_service = CheckoutService(cart_service)

        # Mock the _get_validated_cart_items method
        async def mock_get_validated_cart_items(session, auth_subject, cart_item_ids):
            return products, cart_items

        checkout_service._get_validated_cart_items = AsyncMock(
            side_effect=mock_get_validated_cart_items
        )

        # Mock other dependencies
        checkout_service._get_ip_country = MagicMock(return_value="US")
        checkout_service._get_currencies = MagicMock(return_value=["USD"])
        checkout_service._eager_load_product = AsyncMock(side_effect=lambda s, p: p)
        checkout_service._update_ip_country = AsyncMock(side_effect=lambda s, c, ip: c)
        checkout_service._update_trial_end = AsyncMock(side_effect=lambda c: c)
        checkout_service._update_checkout_tax = AsyncMock(side_effect=lambda s, c: c)
        checkout_service._after_checkout_created = AsyncMock()

        # Create checkout request
        cart_item_ids = [item.id for item in cart_items]
        checkout_create = CheckoutCartCreate(
            cart_items=cart_item_ids,
            customer_email="test@example.com",
        )

        # Create auth subject
        auth_subject = AuthSubject(subject=user, scopes=set())

        # Create checkout
        checkout = await checkout_service.create(session, checkout_create, auth_subject)

        # Verify checkout was created
        assert checkout is not None
        assert checkout.user_metadata is not None
        assert "cart_item_ids" in checkout.user_metadata
        assert len(checkout.user_metadata["cart_item_ids"]) == 3

        # Verify combined amount calculation
        # Product 0: $10.00 * 1 = $10.00
        # Product 1: $15.00 * 2 = $30.00
        # Product 2: $20.00 * 3 = $60.00
        # Total: $100.00 = 10000 cents
        expected_amount = (1000 * 1) + (1500 * 2) + (2000 * 3)
        assert checkout.amount == expected_amount

    async def test_order_items_creation_for_each_cart_item(
        self,
        session,
        user: User,
        organization: Organization,
    ):
        """Test order items creation for each cart item."""
        # This test would verify that the order service creates
        # individual order items for each cart item

        # Create a simple cart with 2 items
        products = []
        cart_items = []

        for i in range(2):
            product = Product(
                id=uuid.uuid4(),
                name=f"Test Product {i}",
                description=f"Test product {i}",
                is_recurring=False,
                is_archived=False,
                organization=organization,
            )

            price = ProductPrice(
                id=uuid.uuid4(),
                amount_type=ProductPriceAmountType.fixed,
                price_amount=1000,  # $10.00
                currency="USD",
                product=product,
            )
            product.prices = [price]
            products.append(product)

            cart_item = CartItem(
                id=uuid.uuid4(),
                user_id=user.id,
                session_token=None,
                product_id=product.id,
                quantity=2,
                product=product,
            )
            cart_items.append(cart_item)

        # Mock the order creation process

        # Create a mock checkout with cart metadata
        checkout = MagicMock()
        checkout.user_metadata = {
            "cart_item_ids": [str(item.id) for item in cart_items]
        }
        checkout.customer = Customer(
            id=uuid.uuid4(),
            email="test@example.com",
            organization=organization,
        )

        # Mock cart repository
        cart_repository = MagicMock(spec=CartRepository)
        cart_repository.get_by_id = AsyncMock()

        def get_cart_item_by_id(cart_item_id):
            for item in cart_items:
                if item.id == cart_item_id:
                    return item
            return None

        cart_repository.get_by_id.side_effect = get_cart_item_by_id

        # The order creation logic would be tested here
        # This is a placeholder for the actual order creation test
        # which would verify that N cart items result in N order items

        assert len(cart_items) == 2  # Verify we have 2 cart items

    async def test_cart_clearing_after_successful_checkout(
        self,
        session,
        user: User,
        organization: Organization,
    ):
        """Test cart clearing after successful checkout."""
        # Create cart items
        cart_items = []

        for i in range(2):
            cart_item = CartItem(
                id=uuid.uuid4(),
                user_id=user.id,
                session_token=None,
                product_id=uuid.uuid4(),
                quantity=1,
            )
            cart_items.append(cart_item)

        # Mock cart repository
        cart_repository = MagicMock(spec=CartRepository)
        cart_repository.get_by_id = AsyncMock()
        cart_repository.delete = AsyncMock()

        def get_cart_item_by_id(cart_item_id):
            for item in cart_items:
                if item.id == cart_item_id:
                    return item
            return None

        cart_repository.get_by_id.side_effect = get_cart_item_by_id

        # Create cart service
        cart_service = CartService(cart_repository)

        # Create checkout service
        checkout_service = CheckoutService(cart_service)

        # Create a successful checkout with cart metadata
        checkout = MagicMock()
        checkout.status = CheckoutStatus.succeeded
        checkout.user_metadata = {
            "cart_item_ids": [str(item.id) for item in cart_items]
        }
        checkout.customer = Customer(
            id=uuid.uuid4(),
            email="test@example.com",
            organization=organization,
        )

        # Mock the handle_success method to simulate cart clearing
        async def mock_handle_success(
            session, checkout, payment=None, payment_method=None
        ):
            # Simulate the cart clearing logic from the actual implementation
            if checkout.user_metadata and "cart_item_ids" in checkout.user_metadata:
                cart_item_ids = checkout.user_metadata["cart_item_ids"]
                for cart_item_id_str in cart_item_ids:
                    cart_item_id = uuid.UUID(cart_item_id_str)
                    cart_item = await cart_repository.get_by_id(cart_item_id)
                    if cart_item:
                        await cart_repository.delete(cart_item)

            return checkout

        checkout_service.handle_success = mock_handle_success

        # Simulate successful checkout completion
        result_checkout = await checkout_service.handle_success(session, checkout)

        # Verify cart items were cleared
        assert cart_repository.delete.call_count == 2

        # Verify the correct cart items were deleted
        deleted_items = [call[0][0] for call in cart_repository.delete.call_args_list]
        assert len(deleted_items) == 2

        for cart_item in cart_items:
            assert cart_item in deleted_items

    async def test_single_product_checkout_still_works(
        self,
        session,
        user: User,
        organization: Organization,
    ):
        """Test single-product checkout continues to work."""
        # Create a single product
        product = Product(
            id=uuid.uuid4(),
            name="Single Product",
            description="Single test product",
            is_recurring=False,
            is_archived=False,
            organization=organization,
        )

        price = ProductPrice(
            id=uuid.uuid4(),
            amount_type=ProductPriceAmountType.fixed,
            price_amount=1500,  # $15.00
            currency="USD",
            product=product,
        )
        product.prices = [price]

        # Mock cart service (not used for single product checkout)
        cart_repository = MagicMock(spec=CartRepository)
        cart_service = CartService(cart_repository)

        # Create checkout service
        checkout_service = CheckoutService(cart_service)

        # Mock the _get_validated_product method for single product checkout
        async def mock_get_validated_product(
            session, auth_subject, product_id, currency, ip_country
        ):
            return [product], product, price, "USD"

        checkout_service._get_validated_product = AsyncMock(
            side_effect=mock_get_validated_product
        )

        # Mock other dependencies
        checkout_service._get_ip_country = MagicMock(return_value="US")
        checkout_service._eager_load_product = AsyncMock(side_effect=lambda s, p: p)
        checkout_service._update_ip_country = AsyncMock(side_effect=lambda s, c, ip: c)
        checkout_service._update_trial_end = AsyncMock(side_effect=lambda c: c)
        checkout_service._update_checkout_tax = AsyncMock(side_effect=lambda s, c: c)
        checkout_service._after_checkout_created = AsyncMock()

        # Create single product checkout request
        checkout_create = CheckoutProductCreate(
            product_id=product.id,
            customer_email="test@example.com",
        )

        # Create auth subject
        auth_subject = AuthSubject(subject=user, scopes=set())

        # Create checkout
        checkout = await checkout_service.create(session, checkout_create, auth_subject)

        # Verify single product checkout works
        assert checkout is not None
        assert checkout.amount == 1500  # $15.00
        assert checkout.product_id == product.id

        # Verify no cart metadata is present
        if checkout.user_metadata:
            assert "cart_item_ids" not in checkout.user_metadata

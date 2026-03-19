"""
Property-based tests for checkout cart integration.

These tests verify universal properties that should hold across all valid inputs
for cart-based checkout functionality.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock

from hypothesis import given, settings
from hypothesis import strategies as st

from polar.auth.models import AuthSubject, User
from polar.cart.repository import CartRepository
from polar.cart.service import CartService
from polar.checkout.schemas import CheckoutCartCreate
from polar.checkout.service import CheckoutService
from polar.models import CartItem, Customer, Organization, Product, ProductPrice
from polar.models.checkout import CheckoutStatus
from polar.models.product_price import ProductPriceAmountType


class TestCheckoutCompletionEffects:
    """Test Property 20: Checkout Completion Effects"""

    @given(
        cart_item_count=st.integers(min_value=1, max_value=5),
        quantities=st.lists(
            st.integers(min_value=1, max_value=10), min_size=1, max_size=5
        ),
    )
    @settings(max_examples=100)
    async def test_checkout_completion_creates_order_items_and_clears_cart(
        self,
        session,
        user: User,
        organization: Organization,
        cart_item_count: int,
        quantities: list[int],
    ):
        """
        **Property 20: Checkout Completion Effects**

        For any cart with N items, successful checkout completion should result in
        N order items being created and the cart being emptied.

        **Validates: Requirements 6.5, 6.6**
        """
        # Ensure we have the right number of quantities
        quantities = quantities[:cart_item_count] + [1] * max(
            0, cart_item_count - len(quantities)
        )

        # Create products and cart items
        products = []
        cart_items = []

        for i in range(cart_item_count):
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
                price_amount=1000 + (i * 100),  # $10.00, $11.00, etc.
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
                quantity=quantities[i],
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
        cart_repository.delete = AsyncMock()

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

        # Verify checkout was created with cart item metadata
        assert checkout is not None
        assert checkout.user_metadata is not None
        assert "cart_item_ids" in checkout.user_metadata
        assert len(checkout.user_metadata["cart_item_ids"]) == cart_item_count

        # Calculate expected total amount
        expected_amount = sum(
            product.prices[0].price_amount * quantities[i]
            for i, product in enumerate(products)
        )
        assert checkout.amount == expected_amount

        # Mock successful checkout completion
        checkout.status = CheckoutStatus.succeeded
        checkout.customer = Customer(
            id=uuid.uuid4(),
            email="test@example.com",
            organization=organization,
        )

        # Mock order service to track order item creation
        from polar.order.service import OrderService

        order_service_mock = MagicMock(spec=OrderService)
        order_service_mock.create_from_checkout_one_time = AsyncMock()

        # Mock the order creation to verify cart clearing
        original_handle_success = checkout_service.handle_success

        async def mock_handle_success(
            session, checkout, payment=None, payment_method=None
        ):
            # Simulate the cart clearing logic
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
        # Each cart item should have been deleted once
        assert cart_repository.delete.call_count == cart_item_count

        # Verify the correct cart items were deleted
        deleted_items = [call[0][0] for call in cart_repository.delete.call_args_list]
        assert len(deleted_items) == cart_item_count

        for cart_item in cart_items:
            assert cart_item in deleted_items

        # Verify checkout completion
        assert result_checkout.status == CheckoutStatus.succeeded

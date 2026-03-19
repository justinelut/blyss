"""
Property tests for shopping cart functionality.

Feature: shopping-cart
"""

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from polar.cart.repository import CartRepository
from polar.enums import SubscriptionRecurringInterval
from polar.postgres import AsyncSession
from tests.fixtures import SaveFixture


class TestCartPersistenceRoundTrip:
    """Property tests for cart persistence round trip."""

    @given(
        quantities=st.lists(
            st.integers(min_value=1, max_value=100), min_size=1, max_size=10
        )
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_property_2_cart_persistence_round_trip_user(
        self,
        quantities: list[int],
        session: AsyncSession,
        save_fixture: SaveFixture,
        user,
        organization,
    ):
        """
        Feature: shopping-cart, Property 2: Cart Persistence Round Trip

        For any customer and any set of cart items, adding items to the cart
        and then retrieving the cart should return all the added items with
        matching product IDs and quantities.

        Validates: Requirements 1.3, 1.4
        """
        # Arrange - Create products for each quantity
        from tests.fixtures.random_objects import create_product

        products = []
        for _ in quantities:
            product = await create_product(
                save_fixture,
                organization=organization,
            )
            products.append(product)

        cart_repository = CartRepository(session)

        # Act - Add items to cart
        for product, quantity in zip(products, quantities):
            await cart_repository.upsert_item(
                user_id=user.id,
                session_token=None,
                product_id=product.id,
                quantity=quantity,
                flush=True,
            )

        await session.flush()

        # Retrieve cart
        cart_items = await cart_repository.get_by_user(user_id=user.id)

        # Assert - Verify all items are present with correct quantities
        assert len(cart_items) == len(products), (
            f"Expected {len(products)} cart items, but found {len(cart_items)}"
        )

        # Create a mapping of product_id to quantity for verification
        cart_items_map = {item.product_id: item.quantity for item in cart_items}

        for product, expected_quantity in zip(products, quantities):
            assert product.id in cart_items_map, (
                f"Product {product.id} not found in cart"
            )
            actual_quantity = cart_items_map[product.id]
            assert actual_quantity == expected_quantity, (
                f"Product {product.id} has quantity {actual_quantity}, "
                f"expected {expected_quantity}"
            )

    @given(
        quantities=st.lists(
            st.integers(min_value=1, max_value=100), min_size=1, max_size=10
        ),
        session_token=st.text(min_size=10, max_size=255),
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_property_2_cart_persistence_round_trip_guest(
        self,
        quantities: list[int],
        session_token: str,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization,
    ):
        """
        Feature: shopping-cart, Property 2: Cart Persistence Round Trip

        For any guest customer and any set of cart items, adding items to the cart
        and then retrieving the cart should return all the added items with
        matching product IDs and quantities.

        Validates: Requirements 1.3, 1.4
        """
        # Arrange - Create products for each quantity
        from tests.fixtures.random_objects import create_product

        products = []
        for _ in quantities:
            product = await create_product(
                save_fixture,
                organization=organization,
            )
            products.append(product)

        cart_repository = CartRepository(session)

        # Act - Add items to cart
        for product, quantity in zip(products, quantities):
            await cart_repository.upsert_item(
                user_id=None,
                session_token=session_token,
                product_id=product.id,
                quantity=quantity,
                flush=True,
            )

        await session.flush()

        # Retrieve cart
        cart_items = await cart_repository.get_by_session(session_token=session_token)

        # Assert - Verify all items are present with correct quantities
        assert len(cart_items) == len(products), (
            f"Expected {len(products)} cart items, but found {len(cart_items)}"
        )

        # Create a mapping of product_id to quantity for verification
        cart_items_map = {item.product_id: item.quantity for item in cart_items}

        for product, expected_quantity in zip(products, quantities):
            assert product.id in cart_items_map, (
                f"Product {product.id} not found in cart"
            )
            actual_quantity = cart_items_map[product.id]
            assert actual_quantity == expected_quantity, (
                f"Product {product.id} has quantity {actual_quantity}, "
                f"expected {expected_quantity}"
            )


class TestQuantityIncrementOnDuplicateAddition:
    """Property tests for quantity increment on duplicate addition."""

    @given(
        initial_quantity=st.integers(min_value=1, max_value=50),
        additional_quantity=st.integers(min_value=1, max_value=49),
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_property_5_quantity_increment_on_duplicate_addition_user(
        self,
        initial_quantity: int,
        additional_quantity: int,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user,
        organization,
    ):
        """
        Feature: shopping-cart, Property 5: Quantity Increment on Duplicate Addition

        For any cart item with quantity N, adding the same product again should
        result in the cart item having quantity N+1.

        Validates: Requirements 2.2
        """
        # Arrange - Create a product and add it to cart with initial quantity
        from tests.fixtures.random_objects import create_product

        product = await create_product(
            save_fixture,
            organization=organization,
        )

        cart_repository = CartRepository(session)

        # Add initial cart item
        initial_item = await cart_repository.upsert_item(
            user_id=user.id,
            session_token=None,
            product_id=product.id,
            quantity=initial_quantity,
            flush=True,
        )

        await session.flush()

        # Act - Add the same product again with additional quantity
        updated_item = await cart_repository.upsert_item(
            user_id=user.id,
            session_token=None,
            product_id=product.id,
            quantity=additional_quantity,
            flush=True,
        )

        await session.flush()

        # Assert - Verify quantity was incremented
        expected_quantity = initial_quantity + additional_quantity
        assert updated_item.id == initial_item.id, (
            "Cart item ID should remain the same after duplicate addition"
        )
        assert updated_item.quantity == expected_quantity, (
            f"Expected quantity {expected_quantity} "
            f"(initial {initial_quantity} + additional {additional_quantity}), "
            f"but got {updated_item.quantity}"
        )

        # Verify by retrieving cart
        cart_items = await cart_repository.get_by_user(user_id=user.id)
        assert len(cart_items) == 1, (
            f"Expected 1 cart item, but found {len(cart_items)}"
        )
        assert cart_items[0].quantity == expected_quantity, (
            f"Retrieved cart item has quantity {cart_items[0].quantity}, "
            f"expected {expected_quantity}"
        )

    @given(
        initial_quantity=st.integers(min_value=1, max_value=50),
        additional_quantity=st.integers(min_value=1, max_value=49),
        session_token=st.text(min_size=10, max_size=255),
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_property_5_quantity_increment_on_duplicate_addition_guest(
        self,
        initial_quantity: int,
        additional_quantity: int,
        session_token: str,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization,
    ):
        """
        Feature: shopping-cart, Property 5: Quantity Increment on Duplicate Addition

        For any guest cart item with quantity N, adding the same product again
        should result in the cart item having quantity N+1.

        Validates: Requirements 2.2
        """
        # Arrange - Create a product and add it to cart with initial quantity
        from tests.fixtures.random_objects import create_product

        product = await create_product(
            save_fixture,
            organization=organization,
        )

        cart_repository = CartRepository(session)

        # Add initial cart item
        initial_item = await cart_repository.upsert_item(
            user_id=None,
            session_token=session_token,
            product_id=product.id,
            quantity=initial_quantity,
            flush=True,
        )

        await session.flush()

        # Act - Add the same product again with additional quantity
        updated_item = await cart_repository.upsert_item(
            user_id=None,
            session_token=session_token,
            product_id=product.id,
            quantity=additional_quantity,
            flush=True,
        )

        await session.flush()

        # Assert - Verify quantity was incremented
        expected_quantity = initial_quantity + additional_quantity
        assert updated_item.id == initial_item.id, (
            "Cart item ID should remain the same after duplicate addition"
        )
        assert updated_item.quantity == expected_quantity, (
            f"Expected quantity {expected_quantity} "
            f"(initial {initial_quantity} + additional {additional_quantity}), "
            f"but got {updated_item.quantity}"
        )

        # Verify by retrieving cart
        cart_items = await cart_repository.get_by_session(session_token=session_token)
        assert len(cart_items) == 1, (
            f"Expected 1 cart item, but found {len(cart_items)}"
        )
        assert cart_items[0].quantity == expected_quantity, (
            f"Retrieved cart item has quantity {cart_items[0].quantity}, "
            f"expected {expected_quantity}"
        )


class TestGuestCartMigrationWithQuantityMerging:
    """Property tests for guest cart migration with quantity merging."""

    @given(
        guest_quantities=st.lists(
            st.integers(min_value=1, max_value=50), min_size=1, max_size=10
        ),
        user_quantities=st.lists(
            st.integers(min_value=1, max_value=50), min_size=0, max_size=10
        ),
        overlap_count=st.integers(min_value=0, max_value=5),
        session_token=st.text(min_size=10, max_size=255),
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_property_21_guest_cart_migration_with_quantity_merging(
        self,
        guest_quantities: list[int],
        user_quantities: list[int],
        overlap_count: int,
        session_token: str,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user,
        organization,
    ):
        """
        Feature: shopping-cart, Property 21: Guest Cart Migration with Quantity Merging

        For any guest cart with items and user cart with potentially overlapping items,
        migration should transfer all guest items to the user account, summing quantities
        for duplicate products (capped at 100), and delete the guest cart items.

        Validates: Requirements 7.1, 7.2, 7.3
        """
        from tests.fixtures.random_objects import create_product

        # Ensure overlap_count doesn't exceed available items
        overlap_count = min(overlap_count, len(guest_quantities), len(user_quantities))

        cart_repository = CartRepository(session)

        # Arrange - Create products for guest cart
        guest_products = []
        for _ in guest_quantities:
            product = await create_product(
                save_fixture,
                organization=organization,
            )
            guest_products.append(product)

        # Create products for user cart (some may overlap with guest cart)
        user_products = []
        for i in range(len(user_quantities)):
            if i < overlap_count:
                # Reuse guest product to create overlap
                user_products.append(guest_products[i])
            else:
                # Create new product
                product = await create_product(
                    save_fixture,
                    organization=organization,
                )
                user_products.append(product)

        # Add items to guest cart
        for product, quantity in zip(guest_products, guest_quantities):
            await cart_repository.upsert_item(
                user_id=None,
                session_token=session_token,
                product_id=product.id,
                quantity=quantity,
                flush=True,
            )

        # Add items to user cart
        for product, quantity in zip(user_products, user_quantities):
            await cart_repository.upsert_item(
                user_id=user.id,
                session_token=None,
                product_id=product.id,
                quantity=quantity,
                flush=True,
            )

        await session.flush()

        # Calculate expected quantities after migration
        expected_quantities = {}

        # Start with user cart items
        for product, quantity in zip(user_products, user_quantities):
            expected_quantities[product.id] = quantity

        # Add guest cart items (merging duplicates, capped at 100)
        for product, quantity in zip(guest_products, guest_quantities):
            if product.id in expected_quantities:
                expected_quantities[product.id] = min(
                    expected_quantities[product.id] + quantity, 100
                )
            else:
                expected_quantities[product.id] = quantity

        # Act - Migrate guest cart to user account
        migrated_count = await cart_repository.migrate_session_to_user(
            session_token=session_token,
            user_id=user.id,
            flush=True,
        )

        await session.flush()

        # Assert - Verify migration results
        # 1. All guest items should have been migrated
        assert migrated_count == len(guest_quantities), (
            f"Expected {len(guest_quantities)} items to be migrated, "
            f"but got {migrated_count}"
        )

        # 2. Guest cart should be empty
        guest_items_after = await cart_repository.get_by_session(
            session_token=session_token
        )
        assert len(guest_items_after) == 0, (
            f"Expected guest cart to be empty after migration, "
            f"but found {len(guest_items_after)} items"
        )

        # 3. User cart should contain all items with correct quantities
        user_items_after = await cart_repository.get_by_user(user_id=user.id)

        assert len(user_items_after) == len(expected_quantities), (
            f"Expected {len(expected_quantities)} items in user cart after migration, "
            f"but found {len(user_items_after)}"
        )

        # Verify each item has the correct quantity
        actual_quantities = {
            item.product_id: item.quantity for item in user_items_after
        }

        for product_id, expected_quantity in expected_quantities.items():
            assert product_id in actual_quantities, (
                f"Product {product_id} not found in user cart after migration"
            )
            actual_quantity = actual_quantities[product_id]
            assert actual_quantity == expected_quantity, (
                f"Product {product_id} has quantity {actual_quantity}, "
                f"expected {expected_quantity}"
            )

        # 4. Verify no items have user_id=None (all should be migrated)
        for item in user_items_after:
            assert item.user_id == user.id, (
                f"Cart item {item.id} has user_id={item.user_id}, expected {user.id}"
            )
            assert item.session_token is None, (
                f"Cart item {item.id} still has session_token={item.session_token}, "
                "expected None after migration"
            )


class TestQuantityValidation:
    """Property tests for quantity validation."""

    @given(
        quantity=st.integers(min_value=1, max_value=100),
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_property_9_quantity_validation_valid_range(
        self,
        quantity: int,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user,
        organization,
    ):
        """
        Feature: shopping-cart, Property 9: Quantity Validation

        For any quantity value in the range [1, 100], the cart service should
        accept the value and successfully add the item to the cart.

        Validates: Requirements 2.6, 10.3
        """
        # Arrange - Create a one-time product
        from polar.auth.models import AuthSubject
        from polar.cart.service import CartService
        from tests.fixtures.random_objects import create_product

        product = await create_product(
            save_fixture,
            organization=organization,
        )

        # Verify the product is not recurring
        assert not product.is_recurring, (
            f"Product {product.id} should be a one-time product"
        )

        cart_repository = CartRepository(session)
        cart_service = CartService(cart_repository)

        # Create auth subject for user
        auth_subject = AuthSubject(subject=user, scopes=set())

        # Act - Add item with valid quantity
        cart_item = await cart_service.add_item(
            session=session,
            auth_subject=auth_subject,
            product_id=product.id,
            quantity=quantity,
        )

        # Assert - Verify item was added with correct quantity
        assert cart_item.quantity == quantity, (
            f"Cart item should have quantity {quantity}, but got {cart_item.quantity}"
        )
        assert cart_item.product_id == product.id, (
            f"Cart item should reference product {product.id}, "
            f"but got {cart_item.product_id}"
        )
        assert cart_item.user_id == user.id, (
            f"Cart item should belong to user {user.id}, but got {cart_item.user_id}"
        )

        # Verify by retrieving cart
        cart_items = await cart_repository.get_by_user(user_id=user.id)
        assert len(cart_items) == 1, (
            f"Expected 1 cart item, but found {len(cart_items)}"
        )
        assert cart_items[0].quantity == quantity, (
            f"Retrieved cart item has quantity {cart_items[0].quantity}, "
            f"expected {quantity}"
        )

    @given(
        quantity=st.one_of(
            st.integers(max_value=0),
            st.integers(min_value=101, max_value=1000),
        ),
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_property_9_quantity_validation_invalid_range(
        self,
        quantity: int,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user,
        organization,
    ):
        """
        Feature: shopping-cart, Property 9: Quantity Validation

        For any quantity value outside the range [1, 100], the cart service should
        reject the value with a 422 error.

        Validates: Requirements 2.6, 10.3
        """
        # Arrange - Create a one-time product
        from polar.auth.models import AuthSubject
        from polar.cart.service import CartService, InvalidQuantity
        from tests.fixtures.random_objects import create_product

        product = await create_product(
            save_fixture,
            organization=organization,
        )

        # Verify the product is not recurring
        assert not product.is_recurring, (
            f"Product {product.id} should be a one-time product"
        )

        cart_repository = CartRepository(session)
        cart_service = CartService(cart_repository)

        # Create auth subject for user
        auth_subject = AuthSubject(subject=user, scopes=set())

        # Act & Assert - Attempting to add item with invalid quantity should raise error
        with pytest.raises(InvalidQuantity) as exc_info:
            await cart_service.add_item(
                session=session,
                auth_subject=auth_subject,
                product_id=product.id,
                quantity=quantity,
            )

        # Verify the error contains the correct quantity
        assert exc_info.value.quantity == quantity, (
            f"Error should reference quantity {quantity}, "
            f"but got {exc_info.value.quantity}"
        )

        # Verify the error has status code 422
        assert exc_info.value.status_code == 422, (
            f"Error should have status code 422, but got {exc_info.value.status_code}"
        )

        # Verify the error message mentions the valid range
        error_message = str(exc_info.value).lower()
        assert "1" in error_message and "100" in error_message, (
            "Error message should mention the valid range [1, 100]"
        )

        # Verify no cart item was created
        cart_items = await cart_repository.get_by_user(user_id=user.id)
        assert len(cart_items) == 0, (
            f"No cart items should be created for invalid quantities, "
            f"but found {len(cart_items)} items"
        )


class TestRecurringProductRejection:
    """Property tests for recurring product rejection."""

    @given(
        recurring_interval=st.sampled_from(
            [
                SubscriptionRecurringInterval.month,
                SubscriptionRecurringInterval.year,
            ]
        ),
        recurring_interval_count=st.integers(min_value=1, max_value=12),
        quantity=st.integers(min_value=1, max_value=100),
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_property_10_recurring_product_rejection(
        self,
        recurring_interval: SubscriptionRecurringInterval,
        recurring_interval_count: int,
        quantity: int,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user,
        organization,
    ):
        """
        Feature: shopping-cart, Property 10: Recurring Product Rejection

        For any recurring product (subscription), attempting to add it to the cart
        should result in an error indicating that subscriptions cannot be added to
        the cart.

        Validates: Requirements 3.1
        """
        # Arrange - Create a recurring product
        from polar.auth.models import AuthSubject
        from polar.cart.service import CartService, RecurringProductNotAllowed
        from tests.fixtures.random_objects import create_product

        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=recurring_interval,
            recurring_interval_count=recurring_interval_count,
        )

        # Verify the product is indeed recurring
        assert product.is_recurring, (
            f"Product {product.id} should be recurring with interval "
            f"{recurring_interval} and count {recurring_interval_count}"
        )

        cart_repository = CartRepository(session)
        cart_service = CartService(cart_repository)

        # Create auth subject for user
        auth_subject = AuthSubject(subject=user, scopes=set())

        # Act & Assert - Attempting to add recurring product should raise error
        with pytest.raises(RecurringProductNotAllowed) as exc_info:
            await cart_service.add_item(
                session=session,
                auth_subject=auth_subject,
                product_id=product.id,
                quantity=quantity,
            )

        # Verify the error contains the correct product
        assert exc_info.value.product.id == product.id, (
            f"Error should reference product {product.id}, "
            f"but got {exc_info.value.product.id}"
        )

        # Verify the error message mentions subscriptions
        assert "subscription" in str(exc_info.value).lower(), (
            "Error message should mention subscriptions"
        )

        # Verify no cart item was created
        cart_items = await cart_repository.get_by_user(user_id=user.id)
        assert len(cart_items) == 0, (
            f"No cart items should be created for recurring products, "
            f"but found {len(cart_items)} items"
        )


class TestSubtotalCalculation:
    """Property tests for subtotal calculation."""

    @given(
        cart_data=st.lists(
            st.tuples(
                st.integers(min_value=100, max_value=100000),  # price in cents
                st.integers(min_value=1, max_value=100),  # quantity
            ),
            min_size=1,
            max_size=10,
        ),
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_property_17_subtotal_calculation(
        self,
        cart_data: list[tuple[int, int]],
        session: AsyncSession,
        save_fixture: SaveFixture,
        user,
        organization,
    ):
        """
        Feature: shopping-cart, Property 17: Subtotal Calculation

        For any set of cart items, the calculated subtotal should equal the sum of
        (price × quantity) for each item.

        Validates: Requirements 6.2
        """
        # Arrange - Create products with specific prices and add to cart
        from polar.auth.models import AuthSubject
        from polar.cart.service import CartService
        from tests.fixtures.random_objects import (
            create_product,
            create_product_price_fixed,
        )

        cart_repository = CartRepository(session)
        cart_service = CartService(cart_repository)

        # Create auth subject for user
        auth_subject = AuthSubject(subject=user, scopes=set())

        # Track expected subtotal
        expected_subtotal = 0

        # Create products and add to cart
        for price_amount, quantity in cart_data:
            # Create product
            product = await create_product(
                save_fixture,
                organization=organization,
            )

            # Create price for the product
            await create_product_price_fixed(
                save_fixture,
                product=product,
                amount=price_amount,
            )

            # Refresh product to load prices relationship
            await session.refresh(product)

            # Add to cart
            await cart_service.add_item(
                session=session,
                auth_subject=auth_subject,
                product_id=product.id,
                quantity=quantity,
            )

            # Calculate expected subtotal contribution
            expected_subtotal += price_amount * quantity

        await session.flush()

        # Act - Get cart with calculated totals
        cart = await cart_service.get_cart(
            session=session,
            auth_subject=auth_subject,
        )

        # Assert - Verify subtotal matches expected calculation
        actual_subtotal = cart["subtotal"]
        assert actual_subtotal == expected_subtotal, (
            f"Calculated subtotal {actual_subtotal} does not match expected "
            f"subtotal {expected_subtotal}. Cart has {len(cart['items'])} items."
        )

        # Verify individual item subtotals sum to total subtotal
        item_subtotals_sum = sum(item["subtotal"] for item in cart["items"])
        assert item_subtotals_sum == expected_subtotal, (
            f"Sum of item subtotals {item_subtotals_sum} does not match "
            f"expected subtotal {expected_subtotal}"
        )

        # Verify each item's subtotal is correctly calculated
        for i, (price_amount, quantity) in enumerate(cart_data):
            item = cart["items"][i]
            expected_item_subtotal = price_amount * quantity
            actual_item_subtotal = item["subtotal"]
            assert actual_item_subtotal == expected_item_subtotal, (
                f"Item {i} subtotal {actual_item_subtotal} does not match "
                f"expected {expected_item_subtotal} (price={price_amount}, "
                f"quantity={quantity})"
            )

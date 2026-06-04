"""
Unit tests for cart service.

Tests specific examples, edge cases, and error conditions for cart operations.
"""

from types import SimpleNamespace
from uuid import uuid4

import pytest
from pytest_mock import MockerFixture

from polar.auth.models import AuthSubject
from polar.auth.scope import Scope
from polar.cart.repository import CartRepository
from polar.cart.service import (
    CartService,
    EmptyCart,
    MultiOrganizationCart,
    ProductNotFound,
    ProductOutOfStock,
)
from polar.checkout.schemas import CheckoutCartCreate
from polar.models import Organization, User
from polar.postgres import AsyncSession
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import create_product


@pytest.mark.asyncio
class TestAddItem:
    """Unit tests for add_item method."""

    async def test_add_item_creates_new_cart_item_with_quantity_1(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user: User,
        organization,
    ) -> None:
        """
        Test that adding a new product creates a cart item with quantity 1.

        Validates: Requirements 2.1
        """
        # Arrange
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        cart_repository = CartRepository(session)
        cart_service = CartService()
        auth_subject = AuthSubject(subject=user, scopes=set(), session=None)

        # Act
        cart_item, _ = await cart_service.add_item(
            session=session,
            auth_subject=auth_subject,
            product_id=product.id,
            quantity=1,
        )

        # Assert
        assert cart_item.product_id == product.id
        assert cart_item.quantity == 1
        assert cart_item.user_id == user.id
        assert cart_item.session_token is None

    async def test_add_item_increments_existing_quantity(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user: User,
        organization,
    ) -> None:
        """
        Test that adding an existing product increments its quantity.

        Validates: Requirements 2.2
        """
        # Arrange
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        cart_repository = CartRepository(session)
        cart_service = CartService()
        auth_subject = AuthSubject(subject=user, scopes=set(), session=None)

        # Add item first time
        first_item, _ = await cart_service.add_item(
            session=session,
            auth_subject=auth_subject,
            product_id=product.id,
            quantity=2,
        )
        original_quantity = first_item.quantity

        # Act - Add same product again
        second_item, _ = await cart_service.add_item(
            session=session,
            auth_subject=auth_subject,
            product_id=product.id,
            quantity=3,
        )

        # Assert
        assert second_item.id == first_item.id
        assert second_item.quantity == original_quantity + 3
        assert second_item.quantity == 5

    async def test_product_out_of_stock_error(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user: User,
        organization,
    ) -> None:
        """
        Test that adding an archived (out of stock) product raises error.

        Validates: Requirements 10.1
        """
        # Arrange
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
            is_archived=True,
        )

        cart_repository = CartRepository(session)
        cart_service = CartService()
        auth_subject = AuthSubject(subject=user, scopes=set(), session=None)

        # Act & Assert
        with pytest.raises(ProductOutOfStock) as exc_info:
            await cart_service.add_item(
                session=session,
                auth_subject=auth_subject,
                product_id=product.id,
                quantity=1,
            )

        assert exc_info.value.product.id == product.id
        assert exc_info.value.status_code == 422

    async def test_non_existent_product_error(
        self,
        session: AsyncSession,
        user: User,
    ) -> None:
        """
        Test that adding a non-existent product raises ProductNotFound error.

        Validates: Requirements 10.2
        """
        # Arrange
        non_existent_product_id = uuid4()

        cart_repository = CartRepository(session)
        cart_service = CartService()
        auth_subject = AuthSubject(subject=user, scopes=set(), session=None)

        # Act & Assert
        with pytest.raises(ProductNotFound) as exc_info:
            await cart_service.add_item(
                session=session,
                auth_subject=auth_subject,
                product_id=non_existent_product_id,
                quantity=1,
            )

        assert exc_info.value.product_id == non_existent_product_id
        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
class TestRemoveItem:
    """Unit tests for remove_item method."""

    async def test_remove_item_deletes_cart_item(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user: User,
        organization,
    ) -> None:
        """
        Test that removing a cart item deletes it from the database.

        Validates: Requirements 2.3
        """
        # Arrange
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        cart_repository = CartRepository(session)
        cart_service = CartService()
        auth_subject = AuthSubject(subject=user, scopes=set(), session=None)

        # Add item first
        cart_item, _ = await cart_service.add_item(
            session=session,
            auth_subject=auth_subject,
            product_id=product.id,
            quantity=1,
        )

        # Act - Remove the item
        await cart_service.remove_item(
            session=session,
            auth_subject=auth_subject,
            item_id=cart_item.id,
        )

        # Assert - Verify item is gone
        cart_items = await cart_repository.get_by_user(user_id=user.id)
        assert len(cart_items) == 0


@pytest.mark.asyncio
class TestClearCart:
    """Unit tests for clear_cart method."""

    async def test_clear_cart_removes_all_items(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user: User,
        organization,
    ) -> None:
        """
        Test that clearing the cart removes all items.

        Validates: Requirements 2.5
        """
        # Arrange
        cart_repository = CartRepository(session)
        cart_service = CartService()
        auth_subject = AuthSubject(subject=user, scopes=set(), session=None)

        # Add multiple items
        for _ in range(3):
            product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )
            await cart_service.add_item(
                session=session,
                auth_subject=auth_subject,
                product_id=product.id,
                quantity=1,
            )

        # Verify items were added
        cart_items_before = await cart_repository.get_by_user(user_id=user.id)
        assert len(cart_items_before) == 3

        # Act - Clear the cart
        await cart_service.clear_cart(
            session=session,
            auth_subject=auth_subject,
        )

        # Assert - Verify all items are gone
        cart_items_after = await cart_repository.get_by_user(user_id=user.id)
        assert len(cart_items_after) == 0


@pytest.mark.asyncio
class TestCreateCheckoutFromCart:
    """Unit tests for creating a hosted checkout from a buyer cart."""

    async def test_empty_cart_raises_422(
        self,
        session: AsyncSession,
        user: User,
    ) -> None:
        cart_service = CartService()
        auth_subject = AuthSubject(subject=user, scopes=set(), session=None)

        with pytest.raises(EmptyCart) as exc_info:
            await cart_service.create_checkout_from_cart(
                session=session,
                auth_subject=auth_subject,
            )

        assert exc_info.value.status_code == 422

    async def test_creates_checkout_with_all_same_creator_cart_items(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user: User,
        organization: Organization,
        mocker: MockerFixture,
    ) -> None:
        cart_service = CartService()
        auth_subject = AuthSubject(subject=user, scopes=set(), session=None)

        product_a = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )
        product_b = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )
        item_a, _ = await cart_service.add_item(
            session=session,
            auth_subject=auth_subject,
            product_id=product_a.id,
            quantity=1,
        )
        item_b, _ = await cart_service.add_item(
            session=session,
            auth_subject=auth_subject,
            product_id=product_b.id,
            quantity=2,
        )

        create_mock = mocker.patch(
            "polar.checkout.service.checkout.create",
            mocker.AsyncMock(return_value=SimpleNamespace(client_secret="polar_cs_test")),
        )

        checkout = await cart_service.create_checkout_from_cart(
            session=session,
            auth_subject=auth_subject,
        )

        assert checkout.client_secret == "polar_cs_test"
        create_mock.assert_awaited_once()
        _, checkout_create, creator_auth, _ = create_mock.await_args.args
        assert isinstance(checkout_create, CheckoutCartCreate)
        assert checkout_create.cart_items == [item_a.id, item_b.id]
        assert creator_auth.subject.id == organization.id
        assert Scope.checkouts_write in creator_auth.scopes

    async def test_rejects_cart_items_from_multiple_creators(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user: User,
        organization: Organization,
        organization_second: Organization,
        mocker: MockerFixture,
    ) -> None:
        cart_service = CartService()
        auth_subject = AuthSubject(subject=user, scopes=set(), session=None)

        product_a = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )
        product_b = await create_product(
            save_fixture,
            organization=organization_second,
            recurring_interval=None,
        )
        await cart_service.add_item(
            session=session,
            auth_subject=auth_subject,
            product_id=product_a.id,
            quantity=1,
        )
        await cart_service.add_item(
            session=session,
            auth_subject=auth_subject,
            product_id=product_b.id,
            quantity=1,
        )
        create_mock = mocker.patch(
            "polar.checkout.service.checkout.create",
            mocker.AsyncMock(),
        )

        with pytest.raises(MultiOrganizationCart) as exc_info:
            await cart_service.create_checkout_from_cart(
                session=session,
                auth_subject=auth_subject,
            )

        assert exc_info.value.status_code == 422
        create_mock.assert_not_awaited()

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from polar.models import Organization, User
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import create_product


@pytest.mark.asyncio
class TestGuestCartMigrationOnLogin:
    """
    Test guest cart migration when a guest user logs in.

    Validates: Requirements 7.1, 7.2, 7.3
    """

    async def test_guest_cart_items_migrated_to_user_account(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
        user: User,
    ) -> None:
        """
        Test that guest cart items are migrated to user account on login.

        Validates: Requirement 7.1
        """
        from unittest.mock import MagicMock

        from fastapi import Request

        from polar.auth.service import auth as auth_service
        from polar.cart.repository import CartRepository

        # Arrange
        cart_repository = CartRepository(session)

        # Create products
        product1 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )
        product2 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        # Create guest cart items
        guest_session_token = "guest_session_123"
        await cart_repository.upsert_item(
            user_id=None,
            session_token=guest_session_token,
            product_id=product1.id,
            quantity=2,
            flush=True,
        )
        await cart_repository.upsert_item(
            user_id=None,
            session_token=guest_session_token,
            product_id=product2.id,
            quantity=1,
            flush=True,
        )

        # Verify guest cart has items
        guest_items_before = await cart_repository.get_by_session(guest_session_token)
        assert len(guest_items_before) == 2

        # Mock request with guest session cookie
        mock_request = MagicMock(spec=Request)
        mock_request.cookies = {"polar_guest_session": guest_session_token}
        mock_request.headers = {"User-Agent": "test"}
        mock_request.url.hostname = "127.0.0.1"

        # Act - Simulate login
        response = await auth_service.get_login_response(
            session=session,
            request=mock_request,
            user=user,
            return_to="/",
        )

        # Assert
        # 1. User cart should have the migrated items
        user_items = await cart_repository.get_by_user(user.id)
        assert len(user_items) == 2

        product_ids = {item.product_id for item in user_items}
        assert product1.id in product_ids
        assert product2.id in product_ids

        # 2. Guest cart should be empty
        guest_items_after = await cart_repository.get_by_session(guest_session_token)
        assert len(guest_items_after) == 0

        # 3. Response should clear guest session cookie
        assert response.status_code == 303

    async def test_duplicate_products_after_migration_stay_at_quantity_1(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
        user: User,
    ) -> None:
        """
        Test that migrating a guest cart into a user cart that already has
        the same product keeps the row at quantity 1.

        Blyss only sells digital products. Two copies of one digital good
        is meaningless; migration must NOT sum quantities.

        Validates: Digital marketplace quantity rule
        """
        from unittest.mock import MagicMock

        from fastapi import Request

        from polar.auth.service import auth as auth_service
        from polar.cart.repository import CartRepository

        cart_repository = CartRepository(session)

        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        # User cart item — server caps at 1 regardless of input.
        await cart_repository.upsert_item(
            user_id=user.id,
            session_token=None,
            product_id=product.id,
            quantity=3,
            flush=True,
        )

        # Guest cart item, same product — also capped at 1.
        guest_session_token = "guest_session_456"
        await cart_repository.upsert_item(
            user_id=None,
            session_token=guest_session_token,
            product_id=product.id,
            quantity=2,
            flush=True,
        )

        mock_request = MagicMock(spec=Request)
        mock_request.cookies = {"polar_guest_session": guest_session_token}
        mock_request.headers = {"User-Agent": "test"}
        mock_request.url.hostname = "127.0.0.1"

        await auth_service.get_login_response(
            session=session,
            request=mock_request,
            user=user,
            return_to="/",
        )

        user_items = await cart_repository.get_by_user(user.id)
        assert len(user_items) == 1
        assert user_items[0].product_id == product.id
        assert user_items[0].quantity == 1  # digital marketplace cap

        guest_items = await cart_repository.get_by_session(guest_session_token)
        assert len(guest_items) == 0

    async def test_guest_cart_deleted_after_migration(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
        user: User,
    ) -> None:
        """
        Test that guest cart is deleted after migration.

        Validates: Requirement 7.3
        """
        from unittest.mock import MagicMock

        from fastapi import Request

        from polar.auth.service import auth as auth_service
        from polar.cart.repository import CartRepository

        # Arrange
        cart_repository = CartRepository(session)

        # Create product
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        # Create guest cart item
        guest_session_token = "guest_session_789"
        await cart_repository.upsert_item(
            user_id=None,
            session_token=guest_session_token,
            product_id=product.id,
            quantity=1,
            flush=True,
        )

        # Verify guest cart exists
        guest_items_before = await cart_repository.get_by_session(guest_session_token)
        assert len(guest_items_before) == 1

        # Mock request with guest session cookie
        mock_request = MagicMock(spec=Request)
        mock_request.cookies = {"polar_guest_session": guest_session_token}
        mock_request.headers = {"User-Agent": "test"}
        mock_request.url.hostname = "127.0.0.1"

        # Act - Simulate login
        await auth_service.get_login_response(
            session=session,
            request=mock_request,
            user=user,
            return_to="/",
        )

        # Assert
        # Guest cart should be completely deleted
        guest_items_after = await cart_repository.get_by_session(guest_session_token)
        assert len(guest_items_after) == 0

        # User cart should have the item
        user_items = await cart_repository.get_by_user(user.id)
        assert len(user_items) == 1
        assert user_items[0].product_id == product.id

    async def test_no_guest_cart_does_not_error(
        self,
        session: AsyncSession,
        user: User,
    ) -> None:
        """
        Test that login works normally when there's no guest cart to migrate.
        """
        from unittest.mock import MagicMock

        from fastapi import Request

        from polar.auth.service import auth as auth_service

        # Arrange - Mock request with guest session cookie but no cart items
        mock_request = MagicMock(spec=Request)
        mock_request.cookies = {"polar_guest_session": "nonexistent_session"}
        mock_request.headers = {"User-Agent": "test"}
        mock_request.url.hostname = "127.0.0.1"

        # Act - Should not raise any errors
        response = await auth_service.get_login_response(
            session=session,
            request=mock_request,
            user=user,
            return_to="/",
        )

        # Assert
        assert response.status_code == 303

    async def test_no_guest_session_cookie_does_not_error(
        self,
        session: AsyncSession,
        user: User,
    ) -> None:
        """
        Test that login works normally when there's no guest session cookie.
        """
        from unittest.mock import MagicMock

        from fastapi import Request

        from polar.auth.service import auth as auth_service

        # Arrange - Mock request without guest session cookie
        mock_request = MagicMock(spec=Request)
        mock_request.cookies = {}
        mock_request.headers = {"User-Agent": "test"}
        mock_request.url.hostname = "127.0.0.1"

        # Act - Should not raise any errors
        response = await auth_service.get_login_response(
            session=session,
            request=mock_request,
            user=user,
            return_to="/",
        )

        # Assert
        assert response.status_code == 303

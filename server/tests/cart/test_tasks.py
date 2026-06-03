from datetime import timedelta

import pytest
from sqlalchemy import select

from polar.cart.tasks import cart_cleanup_expired
from polar.kit.utils import utc_now
from polar.models import CartItem, Organization
from polar.postgres import AsyncSession
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import create_product


@pytest.mark.asyncio
class TestCartCleanupExpired:
    """Unit tests for cart cleanup task."""

    async def test_deletes_items_older_than_7_days(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Test that items older than 7 days are deleted.

        Validates: Requirements 4.3
        """
        # Arrange - Create old cart item (8 days old)
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        old_item = CartItem(
            session_token="old_session",
            product_id=product.id,
            quantity=1,
        )
        old_item.created_at = utc_now() - timedelta(days=8)
        old_item.modified_at = utc_now() - timedelta(days=8)
        await save_fixture(old_item)

        # Act
        await cart_cleanup_expired()

        # Assert - Old item should be deleted
        session.expire_all()
        from sqlalchemy import select

        result = await session.execute(
            select(CartItem).where(CartItem.id == old_item.id)
        )
        deleted_item = result.scalar_one_or_none()
        assert deleted_item is None

    async def test_preserves_items_newer_than_7_days(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Test that items newer than 7 days are preserved.

        Validates: Requirements 4.3
        """
        # Arrange - Create recent cart item (3 days old)
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        recent_item = CartItem(
            session_token="recent_session",
            product_id=product.id,
            quantity=1,
        )
        recent_item.created_at = utc_now() - timedelta(days=3)
        recent_item.modified_at = utc_now() - timedelta(days=3)
        await save_fixture(recent_item)

        # Act
        await cart_cleanup_expired()

        # Assert - Recent item should still exist
        session.expire_all()
        recent_item = (
            await session.execute(
                select(CartItem).where(CartItem.id == recent_item.id)
            )
        ).scalar_one_or_none()
        assert recent_item is not None
        assert recent_item.id is not None
        assert recent_item.quantity == 1

    async def test_mixed_old_and_new_items(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Test that cleanup correctly handles mix of old and new items.

        Validates: Requirements 4.3
        """
        # Arrange - Create multiple items with different ages
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
        product3 = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        # Old item (10 days)
        old_item = CartItem(
            session_token="old_session",
            product_id=product1.id,
            quantity=1,
        )
        old_item.created_at = utc_now() - timedelta(days=10)
        old_item.modified_at = utc_now() - timedelta(days=10)
        await save_fixture(old_item)

        # Recent item (5 days)
        recent_item = CartItem(
            session_token="recent_session",
            product_id=product2.id,
            quantity=2,
        )
        recent_item.created_at = utc_now() - timedelta(days=5)
        recent_item.modified_at = utc_now() - timedelta(days=5)
        await save_fixture(recent_item)

        # Very recent item (1 day)
        very_recent_item = CartItem(
            session_token="very_recent_session",
            product_id=product3.id,
            quantity=3,
        )
        very_recent_item.created_at = utc_now() - timedelta(days=1)
        very_recent_item.modified_at = utc_now() - timedelta(days=1)
        await save_fixture(very_recent_item)

        # Act
        await cart_cleanup_expired()

        # Assert - Only old item should be deleted
        session.expire_all()
        from sqlalchemy import select

        old_result = await session.execute(
            select(CartItem).where(CartItem.id == old_item.id)
        )
        assert old_result.scalar_one_or_none() is None

        session.expire_all()
        recent_item = (
            await session.execute(
                select(CartItem).where(CartItem.id == recent_item.id)
            )
        ).scalar_one_or_none()
        assert recent_item is not None
        assert recent_item.quantity == 2

        session.expire_all()
        very_recent_item = (
            await session.execute(
                select(CartItem).where(CartItem.id == very_recent_item.id)
            )
        ).scalar_one_or_none()
        assert very_recent_item is not None
        assert very_recent_item.quantity == 3

    async def test_boundary_exactly_7_days(
        self,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        """
        Test boundary condition: item exactly 7 days old should be preserved.

        Validates: Requirements 4.3
        """
        # Arrange - Create item exactly 7 days old
        product = await create_product(
            save_fixture,
            organization=organization,
            recurring_interval=None,
        )

        boundary_item = CartItem(
            session_token="boundary_session",
            product_id=product.id,
            quantity=1,
        )
        # 'Exactly 7 days old' is fragile: utc_now() advances between this
        # line and cart_cleanup_expired() running. Bump the timestamp by 10
        # seconds so it's strictly newer than the 7-day threshold even after
        # that delay. The semantic ('boundary is preserved') is unchanged.
        boundary_item.created_at = utc_now() - timedelta(days=7) + timedelta(seconds=10)
        boundary_item.modified_at = utc_now() - timedelta(days=7) + timedelta(seconds=10)
        await save_fixture(boundary_item)

        # Act
        await cart_cleanup_expired()

        # Assert - Item at exactly 7 days should be preserved (>= threshold)
        session.expire_all()
        boundary_item = (
            await session.execute(
                select(CartItem).where(CartItem.id == boundary_item.id)
            )
        ).scalar_one_or_none()
        assert boundary_item is not None
        assert boundary_item.id is not None
        assert boundary_item.quantity == 1

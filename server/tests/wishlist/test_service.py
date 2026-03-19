from uuid import uuid4

import pytest

from polar.models import Product, User, WishlistItem
from polar.postgres import AsyncSession
from polar.wishlist.service import (
    ProductArchivedError,
    ProductNotFoundError,
    WishlistItemAlreadyExistsError,
    wishlist_service,
)
from tests.fixtures.database import SaveFixture


@pytest.mark.asyncio
class TestAddToWishlist:
    async def test_add_product_to_wishlist(
        self,
        session: AsyncSession,
        user: User,
        product: Product,
    ) -> None:
        wishlist_item = await wishlist_service.add_to_wishlist(
            session, user.id, product.id
        )

        assert wishlist_item.user_id == user.id
        assert wishlist_item.product_id == product.id
        assert wishlist_item.id is not None

    async def test_add_nonexistent_product(
        self,
        session: AsyncSession,
        user: User,
    ) -> None:
        nonexistent_product_id = uuid4()

        with pytest.raises(ProductNotFoundError) as exc_info:
            await wishlist_service.add_to_wishlist(
                session, user.id, nonexistent_product_id
            )

        assert exc_info.value.product_id == nonexistent_product_id

    async def test_add_archived_product(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        user: User,
        product: Product,
    ) -> None:
        product.is_archived = True
        await save_fixture(product)

        with pytest.raises(ProductArchivedError) as exc_info:
            await wishlist_service.add_to_wishlist(session, user.id, product.id)

        assert exc_info.value.product_id == product.id

    async def test_add_duplicate_product(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        user: User,
        product: Product,
    ) -> None:
        existing_item = WishlistItem(
            user_id=user.id,
            product_id=product.id,
        )
        await save_fixture(existing_item)

        with pytest.raises(WishlistItemAlreadyExistsError) as exc_info:
            await wishlist_service.add_to_wishlist(session, user.id, product.id)

        assert exc_info.value.user_id == user.id
        assert exc_info.value.product_id == product.id


@pytest.mark.asyncio
class TestRemoveFromWishlist:
    async def test_remove_existing_item(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        user: User,
        product: Product,
    ) -> None:
        wishlist_item = WishlistItem(
            user_id=user.id,
            product_id=product.id,
        )
        await save_fixture(wishlist_item)

        await wishlist_service.remove_from_wishlist(session, user.id, product.id)

        is_in_wishlist = await wishlist_service.is_in_wishlist(
            session, user.id, product.id
        )
        assert is_in_wishlist is False

    async def test_remove_nonexistent_item(
        self,
        session: AsyncSession,
        user: User,
        product: Product,
    ) -> None:
        await wishlist_service.remove_from_wishlist(session, user.id, product.id)

        is_in_wishlist = await wishlist_service.is_in_wishlist(
            session, user.id, product.id
        )
        assert is_in_wishlist is False


@pytest.mark.asyncio
class TestGetUserWishlist:
    async def test_get_empty_wishlist(
        self,
        session: AsyncSession,
        user: User,
    ) -> None:
        wishlist = await wishlist_service.get_user_wishlist(session, user.id)

        assert len(wishlist) == 0

    async def test_get_wishlist_with_items(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        user: User,
        product: Product,
        product_one_time: Product,
    ) -> None:
        item1 = WishlistItem(
            user_id=user.id,
            product_id=product.id,
        )
        item2 = WishlistItem(
            user_id=user.id,
            product_id=product_one_time.id,
        )
        await save_fixture(item1)
        await save_fixture(item2)

        wishlist = await wishlist_service.get_user_wishlist(session, user.id)

        assert len(wishlist) == 2
        product_ids = {item.product_id for item in wishlist}
        assert product.id in product_ids
        assert product_one_time.id in product_ids

    async def test_get_wishlist_only_user_items(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        user: User,
        product: Product,
    ) -> None:
        from tests.fixtures.random_objects import create_user

        other_user = await create_user(save_fixture)

        user_item = WishlistItem(
            user_id=user.id,
            product_id=product.id,
        )
        other_user_item = WishlistItem(
            user_id=other_user.id,
            product_id=product.id,
        )
        await save_fixture(user_item)
        await save_fixture(other_user_item)

        wishlist = await wishlist_service.get_user_wishlist(session, user.id)

        assert len(wishlist) == 1
        assert wishlist[0].user_id == user.id


@pytest.mark.asyncio
class TestIsInWishlist:
    async def test_product_in_wishlist(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        user: User,
        product: Product,
    ) -> None:
        wishlist_item = WishlistItem(
            user_id=user.id,
            product_id=product.id,
        )
        await save_fixture(wishlist_item)

        is_in_wishlist = await wishlist_service.is_in_wishlist(
            session, user.id, product.id
        )

        assert is_in_wishlist is True

    async def test_product_not_in_wishlist(
        self,
        session: AsyncSession,
        user: User,
        product: Product,
    ) -> None:
        is_in_wishlist = await wishlist_service.is_in_wishlist(
            session, user.id, product.id
        )

        assert is_in_wishlist is False


@pytest.mark.asyncio
class TestCascadeDelete:
    async def test_product_deletion_removes_wishlist_items(
        self,
        save_fixture: SaveFixture,
        session: AsyncSession,
        user: User,
        product: Product,
    ) -> None:
        from tests.fixtures.random_objects import create_user

        other_user = await create_user(save_fixture)

        item1 = WishlistItem(
            user_id=user.id,
            product_id=product.id,
        )
        item2 = WishlistItem(
            user_id=other_user.id,
            product_id=product.id,
        )
        await save_fixture(item1)
        await save_fixture(item2)

        is_in_wishlist_before = await wishlist_service.is_in_wishlist(
            session, user.id, product.id
        )
        assert is_in_wishlist_before is True

        await session.delete(product)
        await session.flush()

        is_in_wishlist_after = await wishlist_service.is_in_wishlist(
            session, user.id, product.id
        )
        assert is_in_wishlist_after is False

        other_user_wishlist = await wishlist_service.get_user_wishlist(
            session, other_user.id
        )
        assert len(other_user_wishlist) == 0

from uuid import uuid4

import pytest
from httpx import AsyncClient

from polar.models import Product, User, WishlistItem
from tests.fixtures.database import SaveFixture


@pytest.mark.asyncio
class TestAddToWishlist:
    async def test_authenticated_user_can_add(
        self,
        client: AsyncClient,
        user: User,
        product: Product,
    ) -> None:
        response = await client.post(
            "/v1/wishlist/",
            json={"product_id": str(product.id)},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == str(user.id)
        assert data["product_id"] == str(product.id)

    async def test_unauthenticated_user_cannot_add(
        self,
        client: AsyncClient,
        product: Product,
    ) -> None:
        response = await client.post(
            "/v1/wishlist/",
            json={"product_id": str(product.id)},
        )

        assert response.status_code == 401

    async def test_add_nonexistent_product(
        self,
        client: AsyncClient,
        user: User,
    ) -> None:
        nonexistent_id = str(uuid4())

        response = await client.post(
            "/v1/wishlist/",
            json={"product_id": nonexistent_id},
        )

        assert response.status_code == 404

    async def test_add_archived_product(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        user: User,
        product: Product,
    ) -> None:
        product.is_archived = True
        await save_fixture(product)

        response = await client.post(
            "/v1/wishlist/",
            json={"product_id": str(product.id)},
        )

        assert response.status_code == 422

    async def test_add_duplicate_product(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        user: User,
        product: Product,
    ) -> None:
        wishlist_item = WishlistItem(
            user_id=user.id,
            product_id=product.id,
        )
        await save_fixture(wishlist_item)

        response = await client.post(
            "/v1/wishlist/",
            json={"product_id": str(product.id)},
        )

        assert response.status_code == 409


@pytest.mark.asyncio
class TestRemoveFromWishlist:
    async def test_authenticated_user_can_remove(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        user: User,
        product: Product,
    ) -> None:
        wishlist_item = WishlistItem(
            user_id=user.id,
            product_id=product.id,
        )
        await save_fixture(wishlist_item)

        response = await client.delete(
            f"/v1/wishlist/{product.id}",
        )

        assert response.status_code == 204

    async def test_unauthenticated_user_cannot_remove(
        self,
        client: AsyncClient,
        product: Product,
    ) -> None:
        response = await client.delete(
            f"/v1/wishlist/{product.id}",
        )

        assert response.status_code == 401

    async def test_remove_nonexistent_item(
        self,
        client: AsyncClient,
        user: User,
        product: Product,
    ) -> None:
        response = await client.delete(
            f"/v1/wishlist/{product.id}",
        )

        assert response.status_code == 204


@pytest.mark.asyncio
class TestGetUserWishlist:
    async def test_authenticated_user_can_get_wishlist(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
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

        response = await client.get("/v1/wishlist/")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        product_ids = {item["product_id"] for item in data}
        assert str(product.id) in product_ids
        assert str(product_one_time.id) in product_ids

    async def test_unauthenticated_user_cannot_get_wishlist(
        self,
        client: AsyncClient,
    ) -> None:
        response = await client.get("/v1/wishlist/")

        assert response.status_code == 401

    async def test_get_empty_wishlist(
        self,
        client: AsyncClient,
        user: User,
    ) -> None:
        response = await client.get("/v1/wishlist/")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0


@pytest.mark.asyncio
class TestCheckIfInWishlist:
    async def test_product_in_wishlist(
        self,
        save_fixture: SaveFixture,
        client: AsyncClient,
        user: User,
        product: Product,
    ) -> None:
        wishlist_item = WishlistItem(
            user_id=user.id,
            product_id=product.id,
        )
        await save_fixture(wishlist_item)

        response = await client.get(f"/v1/wishlist/check/{product.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["is_in_wishlist"] is True

    async def test_product_not_in_wishlist(
        self,
        client: AsyncClient,
        user: User,
        product: Product,
    ) -> None:
        response = await client.get(f"/v1/wishlist/check/{product.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["is_in_wishlist"] is False

    async def test_unauthenticated_user_cannot_check(
        self,
        client: AsyncClient,
        product: Product,
    ) -> None:
        response = await client.get(f"/v1/wishlist/check/{product.id}")

        assert response.status_code == 401

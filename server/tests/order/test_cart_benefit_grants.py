"""Multi-product (cart) checkout grants benefits for every product.

Regression test for the bug where a cart checkout with N products only
granted benefits (downloads/perks) for checkout.product — the first
product — leaving the buyer without access to the rest, even though they
paid for everything. The order itself already carried one line item per
product; this pins that benefit grants are enqueued PER product.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from polar.models.product_price import ProductPriceAmountType
from polar.order.service import order as order_service

pytestmark = pytest.mark.asyncio


def _make_product(name: str) -> MagicMock:
    product = MagicMock()
    product.id = uuid.uuid4()
    product.name = name
    product.is_recurring = False
    price = MagicMock()
    price.amount_type = ProductPriceAmountType.fixed
    price.price_amount = 1000
    # is_seat_price(price) must be False for these — give a fixed type.
    price.is_seat_based = False
    product.prices = [price]
    return product


async def test_cart_checkout_grants_benefits_for_every_product(
    mocker,
) -> None:
    product_a = _make_product("Product A")
    product_b = _make_product("Product B")

    # Cart item rows the repository returns, keyed by id.
    cart_item_a = MagicMock(product=product_a)
    cart_item_a.id = uuid.uuid4()
    cart_item_b = MagicMock(product=product_b)
    cart_item_b.id = uuid.uuid4()
    by_id = {cart_item_a.id: cart_item_a, cart_item_b.id: cart_item_b}

    # Checkout is a cart checkout: product = first (display), metadata lists
    # all cart item ids.
    checkout = MagicMock()
    checkout.product = product_a
    checkout.organization = MagicMock()
    checkout.user_metadata = {
        "cart_item_ids": f"{cart_item_a.id},{cart_item_b.id}"
    }
    # checkout_products carries all products (populated at checkout-create
    # time; persists even after cart items are deleted).
    cp_a = MagicMock()
    cp_a.product = product_a
    cp_b = MagicMock()
    cp_b.product = product_b
    checkout.checkout_products = [cp_a, cp_b]

    order = MagicMock()
    order.id = uuid.uuid4()
    order.customer = MagicMock()
    order.customer.id = uuid.uuid4()

    # Stub out the heavy order-creation + notification internals; we only
    # assert the benefit-grant enqueue behavior.
    mocker.patch.object(
        order_service,
        "_create_order_from_checkout",
        AsyncMock(return_value=order),
    )
    mocker.patch.object(
        order_service, "send_admin_notification", AsyncMock()
    )

    # is_seat_price should report False for our fixed prices.
    mocker.patch("polar.order.service.is_seat_price", return_value=False)

    # Cart repository returns our items by id.
    cart_repo = MagicMock()
    cart_repo.get_by_id = AsyncMock(side_effect=lambda cid: by_id.get(cid))
    mocker.patch(
        "polar.cart.repository.CartRepository.from_session",
        return_value=cart_repo,
    )

    enqueue_mock = mocker.patch("polar.order.service.enqueue_job")

    await order_service.create_from_checkout_one_time(
        MagicMock(), checkout, payment=None
    )

    # One grant job per product, against the single order.
    grant_calls = [
        kwargs
        for args, kwargs in enqueue_mock.call_args_list
        if args and args[0] == "benefit.enqueue_benefits_grants"
    ]
    granted_product_ids = {c["product_id"] for c in grant_calls}
    assert granted_product_ids == {product_a.id, product_b.id}
    assert all(c["order_id"] == order.id for c in grant_calls)

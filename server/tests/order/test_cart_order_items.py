"""Cart checkout must create an OrderItem for EVERY cart product.

Regression test for the bug where _create_order_from_checkout read
checkout.user_metadata["cart_item_ids"] (a comma-separated STRING) and
iterated it directly — yielding single characters, every uuid.UUID(char)
raised and was skipped, so NO cart line items were created and the order
kept only checkout.product (the first product). A 2-product cart purchase
therefore recorded + delivered only product 1.
"""

import pytest

from polar.enums import SubscriptionRecurringInterval
from polar.models import Customer, Organization, Product
from polar.models.cart_item import CartItem
from polar.models.checkout import CheckoutStatus
from polar.order.service import order as order_service
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import create_checkout, create_product

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _mute_side_effects(mocker):
    # Keep the test focused on order-item creation; silence the benefit-grant
    # enqueue so we don't need a worker.
    mocker.patch("polar.order.service.enqueue_job")


async def _make_cart_item(
    save_fixture: SaveFixture, product: Product
) -> CartItem:
    item = CartItem(
        user_id=None,
        session_token=f"sess_{product.id}",
        product_id=product.id,
        quantity=1,
    )
    await save_fixture(item)
    return item


async def test_cart_checkout_creates_one_order_item_per_product(
    save_fixture: SaveFixture,
    session,
    organization: Organization,
    product_one_time: Product,
    customer: Customer,
) -> None:
    # Two distinct FIXED-price products in the cart.
    product_b = await create_product(
        save_fixture,
        organization=organization,
        recurring_interval=None,
        name="Second Product",
        prices=[(1500, "usd")],
    )
    item_a = await _make_cart_item(save_fixture, product_one_time)
    item_b = await _make_cart_item(save_fixture, product_b)

    # Cart checkout: product = first (display), metadata lists BOTH ids as a
    # comma-separated string (exactly how checkout/service.py stores them).
    checkout = await create_checkout(
        save_fixture,
        products=[product_one_time],
        status=CheckoutStatus.confirmed,
        customer=customer,
        user_metadata={"cart_item_ids": f"{item_a.id},{item_b.id}"},
    )

    order = await order_service.create_from_checkout_one_time(session, checkout)

    # Before the fix this was 1 (cart_item_ids string iterated as chars, all
    # skipped, order kept only checkout.product); now every cart product
    # yields an item.
    assert len(order.items) == 2

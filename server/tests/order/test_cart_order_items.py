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
    customer: Customer,
) -> None:
    # USD intentionally appears first. A KES checkout must persist the KES
    # price IDs and amounts for every order line, independent of list order.
    product_a = await create_product(
        save_fixture,
        organization=organization,
        recurring_interval=None,
        name="First Product",
        prices=[(500, "usd"), (50000, "kes")],
    )
    product_b = await create_product(
        save_fixture,
        organization=organization,
        recurring_interval=None,
        name="Second Product",
        prices=[(800, "usd"), (75000, "kes")],
    )
    item_a = await _make_cart_item(save_fixture, product_a)
    item_b = await _make_cart_item(save_fixture, product_b)

    checkout = await create_checkout(
        save_fixture,
        products=[product_a, product_b],
        status=CheckoutStatus.confirmed,
        customer=customer,
        currency="kes",
        user_metadata={"cart_item_ids": f"{item_a.id},{item_b.id}"},
    )

    order = await order_service.create_from_checkout_one_time(session, checkout)

    assert len(order.items) == 2
    assert {item.amount for item in order.items} == {50000, 75000}
    assert {item.product_price_id for item in order.items} == {
        product_a.prices[1].id,
        product_b.prices[1].id,
    }


async def test_cart_order_serializes_through_schema(
    save_fixture: SaveFixture,
    session,
    organization: Organization,
    product_one_time: Product,
    customer: Customer,
) -> None:
    """A cart-created order must serialize through the Order schema without
    triggering a MissingGreenlet on legacy_product_price. Listing orders via
    GET /v1/orders/ does this serialization for every order in the response,
    so a single un-serializable order 500s the entire list.
    """
    from polar.kit.pagination import PaginationParams
    from polar.order.schemas import Order as OrderSchema
    from polar.auth.models import AuthSubject
    from polar.models import User

    product_b = await create_product(
        save_fixture,
        organization=organization,
        recurring_interval=None,
        name="Second Product For Serialization",
        prices=[(1500, "usd")],
    )
    item_a = await _make_cart_item(save_fixture, product_one_time)
    item_b = await _make_cart_item(save_fixture, product_b)

    checkout = await create_checkout(
        save_fixture,
        products=[product_one_time, product_b],
        status=CheckoutStatus.confirmed,
        customer=customer,
        user_metadata={"cart_item_ids": f"{item_a.id},{item_b.id}"},
    )

    await order_service.create_from_checkout_one_time(session, checkout)

    # Now list orders and serialize — this is what /v1/orders/ does.
    user = User(email="lister@example.com", email_verified=True, oauth_accounts=[])
    await save_fixture(user)
    auth_subject: AuthSubject[User] = AuthSubject(
        subject=user, scopes=set(), session=None
    )

    results, _count = await order_service.list(
        session,
        auth_subject,
        pagination=PaginationParams(1, 10),
    )

    # Serialize every result the way FastAPI does — this is where prod 500s.
    for o in results:
        OrderSchema.model_validate(o)

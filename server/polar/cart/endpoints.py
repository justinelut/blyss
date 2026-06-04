from uuid import UUID

from fastapi import Depends
from pydantic import Field

from polar.checkout import ip_geolocation
from polar.kit.schemas import Schema
from polar.openapi import APITag
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter

from .auth import CartRead, CartWrite
from .schemas import CartItemCreate, CartItemResponse, CartResponse
from .service import cart


class CartCheckoutResponse(Schema):
    """Response from creating a hosted checkout session from the buyer's cart."""

    client_secret: str = Field(
        description=(
            "Polar's hosted-checkout client secret. The frontend redirects the "
            "buyer to /checkout/{client_secret} to complete payment."
        ),
    )
    url: str = Field(
        description=(
            "Same-origin URL the frontend can navigate to. Equivalent to "
            "/checkout/{client_secret} on the storefront."
        ),
    )

router = APIRouter(
    prefix="/cart",
    tags=["cart", APITag.public],
)


@router.post(
    "/items",
    summary="Add Item to Cart",
    response_model=CartItemResponse,
    status_code=201,
)
async def add_cart_item(
    item: CartItemCreate,
    auth_subject: CartWrite,
    session: AsyncSession = Depends(get_db_session),
) -> CartItemResponse:
    """Add a product to the cart or increment quantity if it already exists."""
    cart_item, product = await cart.add_item(
        session=session,
        auth_subject=auth_subject,
        product_id=item.product_id,
        quantity=item.quantity,
    )

    item_subtotal = cart._calculate_item_subtotal(product, cart_item.quantity)

    return CartItemResponse(
        id=cart_item.id,
        product_id=cart_item.product_id,
        product=product,
        quantity=cart_item.quantity,
        subtotal=item_subtotal,
        created_at=cart_item.created_at,
        modified_at=cart_item.modified_at,
    )


@router.delete(
    "/items/{item_id}",
    summary="Remove Item from Cart",
    status_code=204,
)
async def remove_cart_item(
    item_id: UUID,
    auth_subject: CartWrite,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Remove a specific cart item."""
    await cart.remove_item(
        session=session,
        auth_subject=auth_subject,
        item_id=item_id,
    )


@router.get(
    "",
    summary="Get Cart",
    response_model=CartResponse,
)
async def get_cart(
    auth_subject: CartRead,
    session: AsyncSession = Depends(get_db_session),
) -> CartResponse:
    """Get all cart items with calculated totals."""
    cart_data = await cart.get_cart(
        session=session,
        auth_subject=auth_subject,
    )

    return CartResponse(**cart_data)


@router.delete(
    "",
    summary="Clear Cart",
    status_code=204,
)
async def clear_cart(
    auth_subject: CartWrite,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Clear all items from the cart."""
    await cart.clear_cart(
        session=session,
        auth_subject=auth_subject,
    )


@router.post(
    "/checkout",
    summary="Create Checkout from Cart",
    response_model=CartCheckoutResponse,
    status_code=201,
)
async def checkout_cart(
    auth_subject: CartWrite,
    ip_geolocation_client: ip_geolocation.IPGeolocationClient,
    session: AsyncSession = Depends(get_db_session),
) -> CartCheckoutResponse:
    """Create a hosted Polar checkout session containing every item in the
    requesting buyer's cart, and return its client secret.

    Public endpoint. Authenticated users check out by user_id; guest
    sessions check out by their X-Guest-Session-Token. Multiple products
    are supported as long as they all belong to the same creator (Polar's
    hosted checkout supports multi-product carts; cross-creator carts are
    rejected with 422 — buyers complete one creator's basket at a time).
    """
    checkout = await cart.create_checkout_from_cart(
        session=session,
        auth_subject=auth_subject,
        ip_geolocation_client=ip_geolocation_client,
    )

    return CartCheckoutResponse(
        client_secret=checkout.client_secret,
        url=f"/checkout/{checkout.client_secret}",
    )

from uuid import UUID
from uuid import UUID

from fastapi import Depends, Query
from pydantic import Field

from polar.checkout import ip_geolocation
from polar.kit.schemas import Schema
from polar.openapi import APITag
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter

from .auth import CartRead, CartWrite
from .schemas import (
    CartGroupedResponse,
    CartItemCreate,
    CartItemResponse,
    CartResponse,
)
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
    currency: str | None = Query(
        None,
        description=(
            "ISO 4217 lowercase currency code (e.g. 'usd', 'kes'). "
            "Drives which price entry is used to compute the row's "
            "subtotal when the product carries multiple prices. Falls "
            "back to the product's first price when no match exists."
        ),
    ),
    session: AsyncSession = Depends(get_db_session),
) -> CartItemResponse:
    """Add a product to the cart or increment quantity if it already exists."""
    cart_item, product = await cart.add_item(
        session=session,
        auth_subject=auth_subject,
        product_id=item.product_id,
        quantity=item.quantity,
    )

    item_subtotal, item_currency = cart._calculate_item_subtotal(
        product, cart_item.quantity, currency
    )

    return CartItemResponse(
        id=cart_item.id,
        product_id=cart_item.product_id,
        product=product,
        quantity=cart_item.quantity,
        subtotal=item_subtotal,
        currency=item_currency,
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
    organization_id: UUID | None = None,
    currency: str | None = Query(
        None,
        description=(
            "ISO 4217 lowercase currency code (e.g. 'usd', 'kes'). "
            "Drives which price entry on each multi-currency product "
            "is used to compute item subtotals + label rows. Falls "
            "back to the product's first price when no match exists. "
            "Frontend reads the visitor's currency from the geo cookie "
            "via useDisplayCurrency() and forwards it here so cart "
            "rows render in the buyer's currency rather than whichever "
            "price happens to sit at index 0 of the product."
        ),
    ),
    session: AsyncSession = Depends(get_db_session),
) -> CartResponse:
    """Get cart items with calculated totals.

    When `organization_id` is provided, only items belonging to that
    creator's products are returned. This is the per-creator cart view
    surfaced on creator storefront pages — the buyer sees just their
    open items with that creator, not other creators' carts.

    Without `organization_id` the response is the legacy flat list
    across all creators (preserved for backwards compatibility with
    existing callers; new code should prefer /v1/cart/grouped or pass
    organization_id explicitly).
    """
    if organization_id is not None:
        cart_data = await cart.get_cart_for_organization(
            session=session,
            auth_subject=auth_subject,
            organization_id=organization_id,
            currency=currency,
        )
    else:
        cart_data = await cart.get_cart(
            session=session,
            auth_subject=auth_subject,
            currency=currency,
        )

    return CartResponse(**cart_data)


@router.get(
    "/grouped",
    summary="Get Cart Grouped by Creator",
    response_model=CartGroupedResponse,
)
async def get_cart_grouped(
    auth_subject: CartRead,
    currency: str | None = Query(
        None,
        description=(
            "ISO 4217 lowercase currency code. See /v1/cart for "
            "semantics — same currency-resolution rule applies per "
            "row + per group."
        ),
    ),
    session: AsyncSession = Depends(get_db_session),
) -> CartGroupedResponse:
    """Return the buyer's cart grouped by creator.

    Polar's transactional model is per-org. Marketplace cart UX renders
    one section per creator, each with its own subtotal and a "Pay
    {Creator}" button that creates a checkout for just that section.
    Cross-creator combined checkout is intentionally not supported.

    Sorted most-recently-modified-creator first so the creator the
    buyer most recently engaged with appears at the top.
    """
    data = await cart.get_cart_grouped(
        session=session,
        auth_subject=auth_subject,
        currency=currency,
    )
    return CartGroupedResponse(**data)


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
    organization_id: UUID | None = None,
    currency: str | None = Query(
        None,
        min_length=3,
        max_length=3,
        description=(
            "Buyer-selected ISO 4217 currency. Every cart product must have "
            "a price in this currency."
        ),
    ),
    session: AsyncSession = Depends(get_db_session),
) -> CartCheckoutResponse:
    """Create a hosted Polar checkout session for one creator's cart slice.

    Multi-creator marketplace pattern: the buyer's cart is the
    aggregation of N per-creator carts. This endpoint checks out a
    SINGLE creator's items per call. The frontend calls it once per
    "Pay {Creator}" button press; other creators' items remain in the
    buyer's cart for subsequent checkouts.

    Pass `organization_id` to scope to one creator's items. Without it,
    the legacy single-creator-cart-only path runs (rejects 422 if the
    buyer has items from more than one creator).

    Public endpoint. Authenticated users check out by user_id; guest
    sessions check out by their X-Guest-Session-Token.
    """
    checkout = await cart.create_checkout_from_cart(
        session=session,
        auth_subject=auth_subject,
        ip_geolocation_client=ip_geolocation_client,
        organization_id=organization_id,
        currency=currency,
    )

    return CartCheckoutResponse(
        client_secret=checkout.client_secret,
        url=f"/checkout/{checkout.client_secret}",
    )


class ProductCheckoutRequest(Schema):
    product_id: UUID = Field(description="Product ID to create a checkout for")


@router.post(
    "/checkout/product",
    summary="Create Checkout for a Single Product",
    response_model=CartCheckoutResponse,
    status_code=201,
    tags=[APITag.public],
)
async def checkout_product(
    body: ProductCheckoutRequest,
    auth_subject: CartWrite,
    ip_geolocation_client: ip_geolocation.IPGeolocationClient,
    currency: str | None = Query(
        None,
        min_length=3,
        max_length=3,
        description="Buyer-selected ISO 4217 currency for this product.",
    ),
    session: AsyncSession = Depends(get_db_session),
) -> CartCheckoutResponse:
    """Create a hosted checkout session for a single product (including
    subscriptions). Used by the PDP 'Subscribe' and free-product buy
    actions where the product never enters the one-time-product cart.

    This is the buyer-facing equivalent of POST /v1/checkouts/ (which
    requires Organization/checkouts_write scope). Authenticated via the
    buyer's web session (CartWrite).
    """
    from polar.checkout.schemas import CheckoutProductCreate
    from polar.checkout.service import checkout as checkout_service
    from polar.models import Product
    from polar.organization.repository import OrganizationRepository
    from sqlalchemy import select
    from sqlalchemy.orm import joinedload

    # Look up product with its organization eagerly loaded (avoid lazy-raise).
    stmt = (
        select(Product)
        .where(Product.id == body.product_id, Product.deleted_at.is_(None))
        .options(joinedload(Product.organization))
    )
    result = await session.execute(stmt)
    product = result.unique().scalar_one_or_none()
    if product is None:
        from polar.exceptions import ResourceNotFound
        raise ResourceNotFound()

    from polar.auth.models import AuthSubject as _AuthSubject
    from polar.auth.scope import Scope

    creator_auth = _AuthSubject(
        subject=product.organization,
        scopes={Scope.web_read, Scope.web_write, Scope.checkouts_write},
        session=None,
    )

    create_payload = CheckoutProductCreate(
        product_id=body.product_id,
        currency=currency.lower() if currency else None,
    )
    checkout = await checkout_service.create(
        session, create_payload, creator_auth, ip_geolocation_client
    )

    return CartCheckoutResponse(
        client_secret=checkout.client_secret,
        url=f"/checkout/{checkout.client_secret}",
    )

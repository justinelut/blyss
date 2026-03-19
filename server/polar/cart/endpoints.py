from uuid import UUID

from fastapi import Depends

from polar.openapi import APITag
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter

from .auth import CartRead, CartWrite
from .schemas import CartItemCreate, CartItemResponse, CartResponse
from .service import cart

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
    cart_item = await cart.add_item(
        session=session,
        auth_subject=auth_subject,
        product_id=item.product_id,
        quantity=item.quantity,
    )

    product = cart_item.product
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

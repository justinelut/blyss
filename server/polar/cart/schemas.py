from uuid import UUID

from pydantic import Field

from polar.kit.schemas import Schema, TimestampedSchema
from polar.product.schemas import Product


class CartOrganization(Schema):
    """Light Organization shape for cart grouping (id + slug + display).

    Avoids pulling the full Organization schema which has financials and
    settings the buyer-facing cart UI doesn't need. Frontend uses
    {avatar_url, name} for the section header and {slug} for the
    "Pay {Creator}" button's checkout link.
    """

    id: UUID
    slug: str
    name: str
    avatar_url: str | None = None


class CartItemCreate(Schema):
    product_id: UUID = Field(description="The ID of the product to add to the cart.")
    quantity: int = Field(
        default=1,
        ge=1,
        le=100,
        description="The quantity of the product to add. Must be between 1 and 100.",
    )


class CartItemResponse(TimestampedSchema):
    id: UUID = Field(description="The ID of the cart item.")
    product_id: UUID = Field(description="The ID of the product.")
    product: Product = Field(description="The product details.")
    quantity: int = Field(description="The quantity of the product in the cart.")
    subtotal: int = Field(
        description="The subtotal for this cart item (price × quantity) in cents."
    )


class CartResponse(Schema):
    items: list[CartItemResponse] = Field(
        description="List of items in the cart.",
    )
    subtotal: int = Field(
        description="The combined subtotal of all cart items in cents.",
    )
    tax: int = Field(
        description="The estimated tax in cents.",
    )
    total: int = Field(
        description="The total amount (subtotal + tax) in cents.",
    )
    item_count: int = Field(
        description="The total number of items in the cart.",
    )


class CartGroup(Schema):
    """One creator's slice of the buyer's cart.

    Same shape as CartResponse plus an organization stub. Frontend
    renders one of these per creator the buyer has open items with.
    """

    organization: CartOrganization
    items: list[CartItemResponse]
    subtotal: int
    tax: int
    total: int
    item_count: int


class CartGroupedResponse(Schema):
    """Multi-creator cart aggregation.

    Polar's transactional model is per-org (one Order, one Subscription,
    one Checkout = one Organization). The buyer-facing "cart" in a
    multi-creator marketplace is therefore a list of per-creator carts
    that each get checked out independently — never combined into a
    single charge across multiple creators.

    `groups` is sorted by most-recently-modified item first so the
    creator the buyer most recently engaged with appears at the top.
    """

    groups: list[CartGroup]
    item_count: int = Field(
        description="Total number of items across every creator's cart.",
    )

from datetime import datetime
from uuid import UUID

from pydantic import Field

from polar.kit.schemas import Schema, TimestampedSchema
from polar.product.schemas import Product


class WishlistItemPublic(TimestampedSchema):
    """A single wishlist row.

    Mirrors the cart's CartItemResponse shape so the frontend can read
    `item.product.name`, `item.product.medias`, `item.product.prices`
    etc. without a follow-up fetch. The Wishlist repository eager-loads
    the product graph (organization, prices, medias, benefits) in one
    round-trip — see WishlistRepository.get_user_wishlist.
    """

    id: UUID = Field(description="The ID of the wishlist item.")
    user_id: UUID = Field(description="The ID of the user.")
    product_id: UUID = Field(description="The ID of the product.")
    product: Product = Field(description="The product details.")
    created_at: datetime = Field(description="When the item was added.")

    model_config = {"from_attributes": True}


class WishlistResponse(Schema):
    """Wrapper around the wishlist items list.

    Matches the cart endpoint shape (`{items, item_count}`) so the
    frontend `(wishlist as any)?.items ?? []` access works the same way
    on both surfaces. Adding `item_count` lets the header heart icon
    show a badge without a separate count call.
    """

    items: list[WishlistItemPublic] = Field(
        description="List of items in the wishlist.",
    )
    item_count: int = Field(
        description="The total number of items in the wishlist.",
    )

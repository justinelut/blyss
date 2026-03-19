from uuid import UUID

from pydantic import Field

from polar.kit.schemas import Schema, TimestampedSchema
from polar.product.schemas import Product


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

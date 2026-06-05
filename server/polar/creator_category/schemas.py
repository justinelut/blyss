from uuid import UUID

from pydantic import Field

from polar.kit.schemas import Schema


class CreatorCategorySchema(Schema):
    """Public creator category."""

    id: UUID
    slug: str
    name: str
    display_order: int

    model_config = {"from_attributes": True}


class CreatorCategoryCreate(Schema):
    slug: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=100)
    display_order: int = 0
    is_active: bool = True


class CreatorCategoryUpdate(Schema):
    name: str | None = Field(None, min_length=1, max_length=100)
    display_order: int | None = None
    is_active: bool | None = None

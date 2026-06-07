from datetime import datetime
from uuid import UUID

from pydantic import Field

from polar.kit.schemas import Schema


class CategoryCreate(Schema):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=5000)
    display_order: int = Field(default=0, ge=0)


class CategoryUpdate(Schema):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=5000)
    display_order: int | None = Field(None, ge=0)
    is_active: bool | None = None


class CategoryPublic(Schema):
    id: UUID
    name: str
    slug: str
    description: str | None
    display_order: int
    is_active: bool
    product_count: int
    created_at: datetime
    # RecordModel exposes `modified_at` (nullable until first edit). The
    # schema previously required `updated_at` which doesn't exist on the
    # model — every GET /v1/categories/ 500'd against pydantic with
    # 'Field required: updated_at'. Map to the actual ORM column and
    # make it optional so freshly seeded rows (modified_at IS NULL)
    # serialize cleanly.
    modified_at: datetime | None = None

    model_config = {"from_attributes": True}


class ProductCategoryAssignmentCreate(Schema):
    product_id: UUID
    category_id: UUID

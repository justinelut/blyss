from datetime import datetime
from typing import Any
from uuid import UUID

from polar.kit.schemas import Schema


class WishlistItemPublic(Schema):
    id: UUID
    user_id: UUID
    product_id: UUID
    product: Any
    created_at: datetime

    model_config = {"from_attributes": True}

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr

from polar.kit.schemas import Schema


class NewsletterSubscriptionCreate(Schema):
    email: EmailStr
    organization_id: UUID


class NewsletterSubscriptionPublic(Schema):
    id: UUID
    email: str
    organization_id: UUID
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

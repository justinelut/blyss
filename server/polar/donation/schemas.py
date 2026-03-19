from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field

from polar.kit.schemas import Schema


class DonationCreate(Schema):
    organization_id: UUID
    amount: int = Field(..., ge=100, le=1000000, description="Amount in KES cents")
    donor_name: str = Field(..., min_length=1, max_length=255)
    donor_email: EmailStr
    message: str | None = Field(None, max_length=1000)


class DonationPublic(Schema):
    id: UUID
    amount: int
    currency: str
    donor_name: str
    donor_email: str
    message: str | None
    organization_id: UUID
    payment_reference: str
    payment_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DonationInitiateResponse(Schema):
    donation: DonationPublic
    payment_url: str

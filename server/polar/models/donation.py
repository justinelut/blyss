from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship

from polar.kit.db.models import RecordModel

if TYPE_CHECKING:
    from polar.models import Organization


class Donation(RecordModel):
    __tablename__ = "donations"
    __table_args__ = (
        Index("ix_donations_organization_id", "organization_id"),
        Index("ix_donations_donor_email", "donor_email"),
        Index("ix_donations_created_at", "created_at"),
    )

    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    donor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    donor_email: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    organization_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )

    payment_reference: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True
    )
    payment_status: Mapped[str] = mapped_column(String(50), nullable=False)

    @declared_attr
    def organization(cls) -> Mapped["Organization"]:
        return relationship("Organization", lazy="raise")

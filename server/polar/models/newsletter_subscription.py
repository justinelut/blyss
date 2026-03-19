import secrets
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Index, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship

from polar.kit.db.models import RecordModel

if TYPE_CHECKING:
    from polar.models import Organization


class NewsletterSubscription(RecordModel):
    __tablename__ = "newsletter_subscriptions"
    __table_args__ = (
        UniqueConstraint("email", "organization_id", name="uq_newsletter_email_org"),
        Index("ix_newsletter_subscriptions_organization_id", "organization_id"),
        Index("ix_newsletter_subscriptions_email", "email"),
    )

    email: Mapped[str] = mapped_column(String(255), nullable=False)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    unsubscribe_token: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        default=lambda: secrets.token_urlsafe(32),
    )

    @declared_attr
    def organization(cls) -> Mapped["Organization"]:
        return relationship("Organization", lazy="raise")

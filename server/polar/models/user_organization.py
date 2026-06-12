from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship

from polar.kit.db.models import TimestampedModel
from polar.models.organization import Organization
from polar.models.user import User


class UserOrganization(TimestampedModel):
    __tablename__ = "user_organizations"

    user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id"),
        nullable=False,
        primary_key=True,
    )

    organization_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        primary_key=True,
    )

    # Per-member admin flag. Blyss-native role distinguishing the
    # creator(s) who own payout / billing decisions from regular
    # team members. Promoted via backoffice "Make Admin" or
    # automatically for the first user added to a new org. Multiple
    # admins per org are allowed.
    is_admin: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    @declared_attr
    def user(cls) -> "Mapped[User]":
        return relationship("User", lazy="raise")

    @declared_attr
    def organization(cls) -> "Mapped[Organization]":
        return relationship("Organization", lazy="raise")

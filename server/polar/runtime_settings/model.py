from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, LargeBinary, Text, TIMESTAMP, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from polar.kit.db.models import Model

if TYPE_CHECKING:
    from polar.models.user import User


class RuntimeSettingStatus(StrEnum):
    pending = "pending"
    active = "active"
    failed = "failed"


class RuntimeSetting(Model):
    __tablename__ = "runtime_settings"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    encrypted_value: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    last_verified_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
    updated_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    updated_by: Mapped["User | None"] = relationship("User", lazy="raise")

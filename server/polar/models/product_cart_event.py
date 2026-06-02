from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from polar.kit.db.models import RecordModel


class ProductCartEvent(RecordModel):
    """Track Add to Cart button clicks for analytics"""

    __tablename__ = "product_cart_events"
    __table_args__ = (
        Index("ix_product_cart_events_product_id", "product_id"),
        # created_at index auto-created by RecordModel.
    )

    product_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    session_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

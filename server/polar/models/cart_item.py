from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship

from polar.kit.db.models import RecordModel

if TYPE_CHECKING:
    from polar.models import Product, User


class CartItem(RecordModel):
    __tablename__ = "cart_items"
    __table_args__ = (
        CheckConstraint(
            "(user_id IS NOT NULL AND session_token IS NULL) OR "
            "(user_id IS NULL AND session_token IS NOT NULL)",
            name="cart_items_owner_check",
        ),
        CheckConstraint(
            "quantity >= 1 AND quantity <= 100",
            name="cart_items_quantity_check",
        ),
        UniqueConstraint("user_id", "product_id", name="cart_items_unique_product"),
        UniqueConstraint(
            "session_token", "product_id", name="cart_items_unique_product_session"
        ),
        Index(
            "idx_cart_items_user_id",
            "user_id",
            postgresql_where="user_id IS NOT NULL",
        ),
        Index(
            "idx_cart_items_session_token",
            "session_token",
            postgresql_where="session_token IS NOT NULL",
        ),
        Index("idx_cart_items_updated_at", "modified_at"),
    )

    user_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
    )

    session_token: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    product_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    @declared_attr
    def user(cls) -> Mapped["User | None"]:
        return relationship("User", lazy="raise")

    @declared_attr
    def product(cls) -> Mapped["Product"]:
        return relationship("Product", lazy="selectin")

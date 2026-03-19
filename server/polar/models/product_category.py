from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship

from polar.kit.db.models import RecordModel

if TYPE_CHECKING:
    from polar.models import Product


class ProductCategory(RecordModel):
    __tablename__ = "product_categories"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_product_category_slug"),
        Index("ix_product_categories_slug", "slug"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ProductCategoryAssignment(RecordModel):
    __tablename__ = "product_category_assignments"
    __table_args__ = (
        UniqueConstraint("product_id", "category_id", name="uq_product_category"),
        Index("ix_product_category_assignments_product_id", "product_id"),
        Index("ix_product_category_assignments_category_id", "category_id"),
    )

    product_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    category_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("product_categories.id", ondelete="CASCADE"),
        nullable=False,
    )

    @declared_attr
    def product(cls) -> Mapped["Product"]:
        return relationship("Product", lazy="raise")

    @declared_attr
    def category(cls) -> Mapped["ProductCategory"]:
        return relationship("ProductCategory", lazy="raise")

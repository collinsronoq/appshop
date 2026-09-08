from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.products.models import HouseholdProduct, ProductCategory


class ShoppingListStatus(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class ShoppingList(Base):
    __tablename__ = "shopping_lists"
    __table_args__ = (
        Index("ix_shopping_lists_household_status", "household_id", "status"),
        CheckConstraint("version >= 0", name="ck_shopping_lists_version_nonnegative"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    household_id: Mapped[UUID] = mapped_column(
        ForeignKey("households.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[ShoppingListStatus] = mapped_column(
        Enum(ShoppingListStatus, native_enum=False, values_callable=lambda x: [v.value for v in x]),
        nullable=False,
        default=ShoppingListStatus.ACTIVE,
        server_default="active",
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    created_by_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        server_default=func.now(),
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    items: Mapped[list["ShoppingListItem"]] = relationship(
        back_populates="shopping_list",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ShoppingListItem.position",
    )


class ShoppingListItem(Base):
    __tablename__ = "shopping_list_items"
    __table_args__ = (
        Index("ix_shopping_list_items_list_position", "shopping_list_id", "position"),
        Index("ix_shopping_list_items_household", "household_id"),
        Index("ix_shopping_list_items_product", "household_product_id"),
        CheckConstraint("requested_quantity > 0", name="ck_shopping_list_items_positive_quantity"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    household_id: Mapped[UUID] = mapped_column(
        ForeignKey("households.id", ondelete="CASCADE"), nullable=False
    )
    shopping_list_id: Mapped[UUID] = mapped_column(
        ForeignKey("shopping_lists.id", ondelete="CASCADE"), nullable=False
    )
    household_product_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("household_products.id", ondelete="SET NULL")
    )
    name_snapshot: Mapped[str] = mapped_column(String(160), nullable=False)
    brand_snapshot: Mapped[str | None] = mapped_column(String(120))
    variant_snapshot: Mapped[str | None] = mapped_column(String(160))
    size_value_snapshot: Mapped[float | None] = mapped_column(Numeric(12, 3))
    size_unit_snapshot: Mapped[str | None] = mapped_column(String(24))
    requested_quantity: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    category_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("product_categories.id", ondelete="SET NULL")
    )
    notes: Mapped[str | None] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        server_default=func.now(),
    )
    shopping_list: Mapped[ShoppingList] = relationship(back_populates="items")
    product: Mapped[HouseholdProduct | None] = relationship()
    category: Mapped[ProductCategory | None] = relationship()

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
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.auth.models import User
from app.models.base import Base
from app.products.models import ProductCategory
from app.shopping.models import ShoppingListItem


class TripStatus(StrEnum):
    ACTIVE = "active"
    CANCELLED = "cancelled"


class TripItemStatus(StrEnum):
    PENDING = "pending"
    COLLECTED = "collected"
    SKIPPED = "skipped"


class ShoppingTrip(Base):
    __tablename__ = "shopping_trips"
    __table_args__ = (
        Index("ix_shopping_trips_household", "household_id"),
        Index("ix_shopping_trips_list_status", "shopping_list_id", "status"),
        CheckConstraint("version >= 0", name="ck_shopping_trips_version_nonnegative"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    household_id: Mapped[UUID] = mapped_column(
        ForeignKey("households.id", ondelete="CASCADE"), nullable=False
    )
    shopping_list_id: Mapped[UUID] = mapped_column(
        ForeignKey("shopping_lists.id", ondelete="CASCADE"), nullable=False
    )
    started_by_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    store_name: Mapped[str | None] = mapped_column(String(160))
    status: Mapped[TripStatus] = mapped_column(
        Enum(TripStatus, native_enum=False, values_callable=lambda x: [v.value for v in x]),
        nullable=False,
        default=TripStatus.ACTIVE,
        server_default="active",
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), server_default=func.now()
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        server_default=func.now(),
    )
    items: Mapped[list["TripItem"]] = relationship(
        back_populates="trip", cascade="all, delete-orphan", order_by="TripItem.created_at"
    )


class TripItem(Base):
    __tablename__ = "trip_items"
    __table_args__ = (
        UniqueConstraint(
            "shopping_trip_id", "shopping_list_item_id", name="uq_trip_items_trip_source"
        ),
        Index("ix_trip_items_trip_status", "shopping_trip_id", "status"),
        Index("ix_trip_items_household", "household_id"),
        CheckConstraint("requested_quantity > 0", name="ck_trip_items_positive_quantity"),
        CheckConstraint(
            "purchased_quantity IS NULL OR purchased_quantity > 0",
            name="ck_trip_items_positive_purchased_quantity",
        ),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    household_id: Mapped[UUID] = mapped_column(
        ForeignKey("households.id", ondelete="CASCADE"), nullable=False
    )
    shopping_trip_id: Mapped[UUID] = mapped_column(
        ForeignKey("shopping_trips.id", ondelete="CASCADE"), nullable=False
    )
    shopping_list_item_id: Mapped[UUID] = mapped_column(
        ForeignKey("shopping_list_items.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[TripItemStatus] = mapped_column(
        Enum(TripItemStatus, native_enum=False, values_callable=lambda x: [v.value for v in x]),
        nullable=False,
        default=TripItemStatus.PENDING,
        server_default="pending",
    )
    requested_name_snapshot: Mapped[str] = mapped_column(String(160), nullable=False)
    requested_brand_snapshot: Mapped[str | None] = mapped_column(String(120))
    requested_variant_snapshot: Mapped[str | None] = mapped_column(String(160))
    requested_size_value_snapshot: Mapped[float | None] = mapped_column(Numeric(12, 3))
    requested_size_unit_snapshot: Mapped[str | None] = mapped_column(String(24))
    requested_quantity: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    category_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("product_categories.id", ondelete="SET NULL")
    )
    notes: Mapped[str | None] = mapped_column(Text)
    purchased_name_snapshot: Mapped[str | None] = mapped_column(String(160))
    purchased_brand_snapshot: Mapped[str | None] = mapped_column(String(120))
    purchased_variant_snapshot: Mapped[str | None] = mapped_column(String(160))
    purchased_size_value_snapshot: Mapped[float | None] = mapped_column(Numeric(12, 3))
    purchased_size_unit_snapshot: Mapped[str | None] = mapped_column(String(24))
    substituted: Mapped[bool] = mapped_column(default=False, nullable=False, server_default="false")
    collected_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    collected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    purchased_quantity: Mapped[float | None] = mapped_column(Numeric(12, 3))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        server_default=func.now(),
    )
    trip: Mapped[ShoppingTrip] = relationship(back_populates="items")
    source_item: Mapped[ShoppingListItem] = relationship()
    category: Mapped[ProductCategory | None] = relationship()
    collected_by: Mapped[User | None] = relationship()

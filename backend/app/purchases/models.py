# ruff: noqa
from datetime import UTC, datetime
from uuid import UUID, uuid4
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class Purchase(Base):
    __tablename__ = "purchases"
    __table_args__ = (Index("ix_purchases_household_purchased_at", "household_id", "purchased_at"), Index("ix_purchases_household_product", "household_id", "household_product_id"), CheckConstraint("requested_quantity > 0", name="ck_purchases_requested_quantity"), CheckConstraint("purchased_quantity > 0", name="ck_purchases_purchased_quantity"), CheckConstraint("unit_price IS NULL OR unit_price >= 0", name="ck_purchases_unit_price"), CheckConstraint("total_price IS NULL OR total_price >= 0", name="ck_purchases_total_price"))
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    household_id: Mapped[UUID] = mapped_column(ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    shopping_trip_id: Mapped[UUID] = mapped_column(ForeignKey("shopping_trips.id", ondelete="RESTRICT"), nullable=False)
    trip_item_id: Mapped[UUID] = mapped_column(ForeignKey("trip_items.id", ondelete="RESTRICT"), unique=True, nullable=False)
    household_product_id: Mapped[UUID | None] = mapped_column(ForeignKey("household_products.id", ondelete="SET NULL"))
    requested_name_snapshot: Mapped[str] = mapped_column(String(160), nullable=False)
    requested_brand_snapshot: Mapped[str | None] = mapped_column(String(120)); requested_variant_snapshot: Mapped[str | None] = mapped_column(String(160)); requested_size_value_snapshot: Mapped[float | None] = mapped_column(Numeric(12,3)); requested_size_unit_snapshot: Mapped[str | None] = mapped_column(String(24))
    purchased_name_snapshot: Mapped[str] = mapped_column(String(160), nullable=False); purchased_brand_snapshot: Mapped[str | None] = mapped_column(String(120)); purchased_variant_snapshot: Mapped[str | None] = mapped_column(String(160)); purchased_size_value_snapshot: Mapped[float | None] = mapped_column(Numeric(12,3)); purchased_size_unit_snapshot: Mapped[str | None] = mapped_column(String(24))
    requested_quantity: Mapped[float] = mapped_column(Numeric(12,3), nullable=False); purchased_quantity: Mapped[float] = mapped_column(Numeric(12,3), nullable=False)
    unit_price: Mapped[float | None] = mapped_column(Numeric(12,2)); total_price: Mapped[float | None] = mapped_column(Numeric(12,2)); substituted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    purchased_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False); purchased_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False); created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), server_default=func.now())

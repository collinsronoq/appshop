# mypy: ignore-errors
from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SubstitutionStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class SubstitutionRequest(Base):
    __tablename__ = "substitution_requests"
    __table_args__ = (
        Index("ix_substitution_requests_household_status", "household_id", "status"),
        CheckConstraint(
            "proposed_product_id IS NOT NULL OR length(trim(proposed_name)) > 0",
            name="ck_substitution_proposal",
        ),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    household_id: Mapped[UUID] = mapped_column(
        ForeignKey("households.id", ondelete="CASCADE"), nullable=False
    )
    shopping_trip_id: Mapped[UUID] = mapped_column(
        ForeignKey("shopping_trips.id", ondelete="CASCADE"), nullable=False
    )
    trip_item_id: Mapped[UUID] = mapped_column(
        ForeignKey("trip_items.id", ondelete="CASCADE"), nullable=False
    )
    requested_by_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    proposed_product_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("household_products.id", ondelete="SET NULL")
    )
    proposed_name: Mapped[str] = mapped_column(String(160), nullable=False)
    proposed_brand: Mapped[str | None] = mapped_column(String(120))
    proposed_variant: Mapped[str | None] = mapped_column(String(160))
    proposed_size_value: Mapped[float | None] = mapped_column(Numeric(12, 3))
    proposed_size_unit: Mapped[str | None] = mapped_column(String(24))
    image_key: Mapped[str | None] = mapped_column(String(512))
    status: Mapped[SubstitutionStatus] = mapped_column(
        Enum(SubstitutionStatus, native_enum=False, values_callable=lambda x: [v.value for v in x]),
        nullable=False,
        server_default="pending",
    )
    resolved_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

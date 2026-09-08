from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
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

from app.auth.models import User
from app.households.models import Household
from app.models.base import Base


class ProductCategory(Base):
    __tablename__ = "product_categories"
    __table_args__ = (Index("ix_product_categories_sort_order", "sort_order"),)
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    is_system: Mapped[bool] = mapped_column(default=True, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), server_default=func.now()
    )


class HouseholdProduct(Base):
    __tablename__ = "household_products"
    __table_args__ = (
        Index("ix_household_products_household_archived", "household_id", "archived_at"),
        Index("ix_household_products_household_category", "household_id", "category_id"),
        CheckConstraint("usual_quantity > 0", name="ck_household_products_positive_quantity"),
        CheckConstraint(
            "size_value IS NULL OR size_value > 0", name="ck_household_products_positive_size"
        ),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    household_id: Mapped[UUID] = mapped_column(
        ForeignKey("households.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    brand: Mapped[str | None] = mapped_column(String(120))
    variant: Mapped[str | None] = mapped_column(String(160))
    size_value: Mapped[float | None] = mapped_column(Numeric(12, 3))
    size_unit: Mapped[str | None] = mapped_column(String(24))
    usual_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    category_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("product_categories.id", ondelete="SET NULL")
    )
    notes: Mapped[str | None] = mapped_column(Text)
    primary_image_key: Mapped[str | None] = mapped_column(String(512))
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
    household: Mapped[Household] = relationship()
    category: Mapped[ProductCategory | None] = relationship()
    created_by: Mapped[User] = relationship()
    substitutes: Mapped[list["ProductSubstitute"]] = relationship(
        "ProductSubstitute",
        foreign_keys="ProductSubstitute.product_id",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ProductSubstitute(Base):
    __tablename__ = "product_substitutes"
    __table_args__ = (
        CheckConstraint(
            "substitute_product_id IS NOT NULL OR substitute_name IS NOT NULL",
            name="ck_product_substitutes_target",
        ),
        CheckConstraint("preference_rank > 0", name="ck_product_substitutes_positive_rank"),
        CheckConstraint(
            "substitute_product_id IS NULL OR substitute_product_id <> product_id",
            name="ck_product_substitutes_not_self",
        ),
        Index("ix_product_substitutes_product_rank", "product_id", "preference_rank"),
        Index("ix_product_substitutes_household", "household_id"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    household_id: Mapped[UUID] = mapped_column(
        ForeignKey("households.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("household_products.id", ondelete="CASCADE"), nullable=False
    )
    substitute_product_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("household_products.id", ondelete="RESTRICT")
    )
    substitute_name: Mapped[str | None] = mapped_column(String(200))
    preference_rank: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        server_default=func.now(),
    )

# mypy: ignore-errors
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.products.schemas import CategoryResponse


class ListCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)

    @field_validator("name")
    @classmethod
    def trim(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("List name is required")
        return v


class ListPatch(ListCreate):
    pass


class ItemCreate(BaseModel):
    household_product_id: UUID | None = None
    name: str | None = Field(default=None, max_length=160)
    brand: str | None = None
    variant: str | None = None
    size_value: Decimal | None = None
    size_unit: str | None = None
    requested_quantity: Decimal = Field(gt=0)
    category_id: UUID | None = None
    notes: str | None = None

    @field_validator("name", "brand", "variant", "size_unit", "notes", mode="before")
    @classmethod
    def clean(cls, v):
        return v.strip() if isinstance(v, str) else v


class ItemPatch(BaseModel):
    requested_quantity: Decimal | None = Field(default=None, gt=0)
    notes: str | None = None
    position: int | None = Field(default=None, ge=0)
    name: str | None = Field(default=None, max_length=160)
    category_id: UUID | None = None


class ItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    household_product_id: UUID | None
    name: str
    brand: str | None
    variant: str | None
    size_value: Decimal | None
    size_unit: str | None
    requested_quantity: Decimal
    category: CategoryResponse | None
    notes: str | None
    position: int


class ListSummary(BaseModel):
    id: UUID
    name: str
    status: str
    version: int
    item_count: int
    created_at: datetime
    updated_at: datetime


class ListDetail(ListSummary):
    items: list[ItemResponse] = Field(default_factory=list)

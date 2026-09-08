# mypy: ignore-errors
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    slug: str
    display_name: str
    sort_order: int


class ProductWrite(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    brand: str | None = Field(default=None, max_length=120)
    variant: str | None = Field(default=None, max_length=160)
    size_value: Decimal | None = Field(default=None, gt=0)
    size_unit: str | None = Field(default=None, max_length=24)
    usual_quantity: int = Field(default=1, gt=0)
    category_id: UUID | None = None
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator("name", "brand", "variant", "size_unit", "notes", mode="before")
    @classmethod
    def trim(cls, value):
        return value.strip() if isinstance(value, str) else value


class ProductPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    brand: str | None = Field(default=None, max_length=120)
    variant: str | None = Field(default=None, max_length=160)
    size_value: Decimal | None = Field(default=None, gt=0)
    size_unit: str | None = Field(default=None, max_length=24)
    usual_quantity: int | None = Field(default=None, gt=0)
    category_id: UUID | None = None
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator("name", "brand", "variant", "size_unit", "notes", mode="before")
    @classmethod
    def trim(cls, value):
        return value.strip() if isinstance(value, str) else value


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    household_id: UUID
    name: str
    brand: str | None
    variant: str | None
    size_value: Decimal | None
    size_unit: str | None
    usual_quantity: int
    notes: str | None
    image_url: str | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime
    category: CategoryResponse | None
    preferred_substitutes: list["SubstituteResponse"] = Field(default_factory=list)


class SubstituteWrite(BaseModel):
    substitute_product_id: UUID | None = None
    substitute_name: str | None = Field(default=None, max_length=200)
    preference_rank: int = Field(default=1, gt=0)
    notes: str | None = Field(default=None, max_length=4000)


class SubstituteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    substitute_product_id: UUID | None
    substitute_name: str | None
    preference_rank: int
    notes: str | None


class SubstituteList(BaseModel):
    substitutes: list[SubstituteWrite]

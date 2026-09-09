from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class TripStart(BaseModel):
    store_name: str | None = Field(default=None, max_length=160)


class CollectRequest(BaseModel):
    purchased_quantity: Decimal | None = Field(default=None, gt=0)


class TripItemResponse(BaseModel):
    id: UUID
    shopping_list_item_id: UUID
    status: str
    name: str
    brand: str | None
    variant: str | None
    size_value: Decimal | None
    size_unit: str | None
    requested_quantity: Decimal
    notes: str | None
    purchased_quantity: Decimal | None
    collected_at: datetime | None


class Progress(BaseModel):
    total: int
    pending: int
    collected: int
    skipped: int


class TripResponse(BaseModel):
    id: UUID
    household_id: UUID
    shopping_list_id: UUID
    store_name: str | None
    status: str
    version: int
    started_at: datetime
    cancelled_at: datetime | None
    progress: Progress
    items: list[TripItemResponse]

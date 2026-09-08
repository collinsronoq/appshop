from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class RealtimeEvent(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    type: str
    household_id: UUID
    list_id: UUID
    resource_id: UUID | None = None
    actor_id: UUID
    version: int
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    payload: dict[str, Any] = Field(default_factory=dict)

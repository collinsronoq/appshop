import re
from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from .models import DevicePlatform, PushProvider

EXPO_TOKEN_PATTERN = re.compile(r"^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$")


class PushTokenRegistration(BaseModel):
    provider: PushProvider
    token: Annotated[str, Field(min_length=20, max_length=255)]
    platform: DevicePlatform
    device_id: Annotated[str | None, Field(max_length=255)] = None

    @field_validator("token")
    @classmethod
    def validate_expo_token(cls, value: str) -> str:
        if not EXPO_TOKEN_PATTERN.fullmatch(value):
            raise ValueError("Token must be a valid Expo push token")
        return value


class PushTokenView(BaseModel):
    id: UUID
    provider: PushProvider
    platform: DevicePlatform
    device_id: str | None
    enabled: bool
    last_registered_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}

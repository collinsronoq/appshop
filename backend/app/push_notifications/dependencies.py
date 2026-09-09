from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from app.core.config import Settings, get_settings

from .provider import ExpoPushNotificationProvider, PushNotificationProvider


@lru_cache
def build_expo_provider(endpoint: str) -> ExpoPushNotificationProvider:
    return ExpoPushNotificationProvider(endpoint)


def get_push_provider(
    settings: Annotated[Settings, Depends(get_settings)],
) -> PushNotificationProvider:
    return build_expo_provider(settings.EXPO_PUSH_URL)


PushProviderDependency = Annotated[PushNotificationProvider, Depends(get_push_provider)]

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.core.database import get_db_session
from app.core.errors import ApiError

from .models import DevicePushToken
from .schemas import PushTokenRegistration, PushTokenView

router = APIRouter(prefix="/push-tokens", tags=["push notifications"])


@router.post("", response_model=PushTokenView)
async def register_token(
    payload: PushTokenRegistration,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> DevicePushToken:
    token = await session.scalar(
        select(DevicePushToken)
        .where(DevicePushToken.provider == payload.provider, DevicePushToken.token == payload.token)
        .with_for_update()
    )
    now = datetime.now(UTC)
    if token is None:
        token = DevicePushToken(user_id=user.id, **payload.model_dump(), last_registered_at=now)
        session.add(token)
    else:
        token.user_id = user.id
        token.platform = payload.platform
        token.device_id = payload.device_id
        token.enabled = True
        token.last_registered_at = now
    await session.commit()
    await session.refresh(token)
    return token


@router.delete("/{token_id}", status_code=204)
async def unregister_token(
    token_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    token = await session.scalar(
        select(DevicePushToken)
        .where(DevicePushToken.id == token_id, DevicePushToken.user_id == user.id)
        .with_for_update()
    )
    if token is None:
        raise ApiError(
            status_code=404, code="PUSH_TOKEN_NOT_FOUND", message="Push token not found."
        )
    token.enabled = False
    await session.commit()
    return Response(status_code=204)

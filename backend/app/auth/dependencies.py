from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserStatus
from app.auth.repository import UserRepository
from app.auth.service import AuthService
from app.core.config import Settings, get_settings
from app.core.database import get_db_session
from app.core.errors import ApiError
from app.core.security import (
    AccessTokenExpiredError,
    AccessTokenInvalidError,
    decode_access_token,
)

bearer_scheme = HTTPBearer(auto_error=False)


def get_auth_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthService:
    return AuthService(session, settings)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise ApiError(
            status_code=401,
            code="AUTH_UNAUTHENTICATED",
            message="Authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        claims = decode_access_token(credentials.credentials, settings)
    except AccessTokenExpiredError as exc:
        raise ApiError(
            status_code=401,
            code="AUTH_TOKEN_EXPIRED",
            message="The access token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except AccessTokenInvalidError as exc:
        raise ApiError(
            status_code=401,
            code="AUTH_INVALID_TOKEN",
            message="The access token is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = await UserRepository(session).get_by_id(claims.user_id)
    if user is None:
        raise ApiError(
            status_code=401,
            code="AUTH_INVALID_TOKEN",
            message="The access token is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status is UserStatus.DISABLED:
        raise ApiError(
            status_code=403,
            code="AUTH_USER_DISABLED",
            message="This account is disabled.",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
AuthServiceDependency = Annotated[AuthService, Depends(get_auth_service)]

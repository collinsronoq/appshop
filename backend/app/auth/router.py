from fastapi import APIRouter, Header, Response, status

from app.auth.dependencies import AuthServiceDependency, CurrentUser
from app.auth.schemas import (
    AuthResponse,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    service: AuthServiceDependency,
    user_agent: str | None = Header(default=None),
) -> AuthResponse:
    result = await service.register(
        email=str(payload.email),
        password=payload.password,
        display_name=payload.display_name,
        user_agent=user_agent,
    )
    return AuthResponse(
        user=UserResponse.model_validate(result.user),
        access_token=result.credentials.access_token,
        refresh_token=result.credentials.refresh_token,
        expires_in=result.credentials.expires_in,
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    service: AuthServiceDependency,
    user_agent: str | None = Header(default=None),
) -> AuthResponse:
    result = await service.login(
        email=str(payload.email),
        password=payload.password,
        user_agent=user_agent,
    )
    return AuthResponse(
        user=UserResponse.model_validate(result.user),
        access_token=result.credentials.access_token,
        refresh_token=result.credentials.refresh_token,
        expires_in=result.credentials.expires_in,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    payload: RefreshRequest,
    service: AuthServiceDependency,
    user_agent: str | None = Header(default=None),
) -> TokenResponse:
    credentials = await service.refresh(payload.refresh_token, user_agent=user_agent)
    return TokenResponse(
        access_token=credentials.access_token,
        refresh_token=credentials.refresh_token,
        expires_in=credentials.expires_in,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: LogoutRequest, service: AuthServiceDependency) -> Response:
    await service.logout(payload.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


me_router = APIRouter(tags=["authentication"])


@me_router.get("/me", response_model=UserResponse)
async def current_user(user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(user)

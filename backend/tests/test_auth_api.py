from datetime import UTC, datetime, timedelta
from uuid import UUID

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.auth.models import RefreshSession, User, UserStatus
from app.core.config import Settings
from app.core.security import create_access_token, hash_refresh_token

pytestmark = pytest.mark.postgres

PASSWORD = "correct horse battery staple"


async def register(
    client: httpx.AsyncClient,
    *,
    email: str = "jane@example.com",
    display_name: str = "Jane",
) -> dict[str, object]:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "display_name": display_name},
    )
    assert response.status_code == 201, response.text
    return response.json()


async def set_user_status(
    factory: async_sessionmaker[AsyncSession], user_id: str, status: UserStatus
) -> None:
    async with factory() as session:
        user = await session.get(User, UUID(user_id))
        assert user is not None
        user.status = status
        await session.commit()


async def test_registration_normalizes_email_and_never_exposes_hash(
    api_client: httpx.AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    body = await register(api_client, email="  Jane@Example.COM ")

    assert body["user"]["email"] == "jane@example.com"  # type: ignore[index]
    assert "password_hash" not in body["user"]  # type: ignore[operator]
    assert body["access_token"]
    assert body["refresh_token"]

    async with session_factory() as session:
        user = await session.scalar(select(User).where(User.email == "jane@example.com"))
        assert user is not None
        assert user.password_hash != PASSWORD
        assert body["refresh_token"] != user.password_hash


async def test_duplicate_registration_is_rejected(api_client: httpx.AsyncClient) -> None:
    await register(api_client)
    response = await api_client.post(
        "/api/v1/auth/register",
        json={
            "email": " JANE@example.com ",
            "password": PASSWORD,
            "display_name": "Another Jane",
        },
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "AUTH_EMAIL_ALREADY_REGISTERED"


async def test_password_validation_error_does_not_echo_password(
    api_client: httpx.AsyncClient,
) -> None:
    response = await api_client.post(
        "/api/v1/auth/register",
        json={"email": "jane@example.com", "password": "abc123", "display_name": "Jane"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "abc123" not in response.text


async def test_login_success_and_invalid_credentials_are_generic(
    api_client: httpx.AsyncClient,
) -> None:
    await register(api_client)
    valid = await api_client.post(
        "/api/v1/auth/login",
        json={"email": "JANE@example.com", "password": PASSWORD},
    )
    wrong_email = await api_client.post(
        "/api/v1/auth/login",
        json={"email": "unknown@example.com", "password": PASSWORD},
    )
    wrong_password = await api_client.post(
        "/api/v1/auth/login",
        json={"email": "jane@example.com", "password": "wrong-password"},
    )

    assert valid.status_code == 200
    assert wrong_email.status_code == wrong_password.status_code == 401
    assert wrong_email.json() == wrong_password.json()
    assert wrong_email.json()["error"]["code"] == "AUTH_INVALID_CREDENTIALS"


async def test_disabled_user_cannot_login(
    api_client: httpx.AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    body = await register(api_client)
    await set_user_status(session_factory, body["user"]["id"], UserStatus.DISABLED)  # type: ignore[index]

    response = await api_client.post(
        "/api/v1/auth/login",
        json={"email": "jane@example.com", "password": PASSWORD},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "AUTH_USER_DISABLED"


async def test_refresh_rotates_and_replay_revokes_successor(
    api_client: httpx.AsyncClient,
) -> None:
    registered = await register(api_client)
    old_token = registered["refresh_token"]
    rotated = await api_client.post(
        "/api/v1/auth/refresh", json={"refresh_token": old_token}
    )

    assert rotated.status_code == 200
    new_token = rotated.json()["refresh_token"]
    assert new_token != old_token

    replay = await api_client.post(
        "/api/v1/auth/refresh", json={"refresh_token": old_token}
    )
    successor = await api_client.post(
        "/api/v1/auth/refresh", json={"refresh_token": new_token}
    )
    assert replay.status_code == 401
    assert replay.json()["error"]["code"] == "AUTH_REFRESH_REVOKED"
    assert successor.status_code == 401
    assert successor.json()["error"]["code"] == "AUTH_REFRESH_REVOKED"


async def test_expired_revoked_and_random_refresh_tokens_are_rejected(
    api_client: httpx.AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    registered = await register(api_client)
    token = registered["refresh_token"]
    async with session_factory() as session:
        refresh_session = await session.scalar(
            select(RefreshSession).where(
                RefreshSession.token_hash == hash_refresh_token(str(token))
            )
        )
        assert refresh_session is not None
        refresh_session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        await session.commit()

    expired = await api_client.post("/api/v1/auth/refresh", json={"refresh_token": token})
    random = await api_client.post(
        "/api/v1/auth/refresh", json={"refresh_token": "random-token-value" * 4}
    )
    revoked = await api_client.post("/api/v1/auth/refresh", json={"refresh_token": token})

    assert expired.json()["error"]["code"] == "AUTH_REFRESH_EXPIRED"
    assert random.json()["error"]["code"] == "AUTH_REFRESH_INVALID"
    assert revoked.json()["error"]["code"] == "AUTH_REFRESH_REVOKED"


async def test_logout_is_idempotent_and_revokes_refresh(api_client: httpx.AsyncClient) -> None:
    registered = await register(api_client)
    payload = {"refresh_token": registered["refresh_token"]}

    first = await api_client.post("/api/v1/auth/logout", json=payload)
    second = await api_client.post("/api/v1/auth/logout", json=payload)
    refresh = await api_client.post("/api/v1/auth/refresh", json=payload)

    assert first.status_code == second.status_code == 204
    assert refresh.status_code == 401
    assert refresh.json()["error"]["code"] == "AUTH_REFRESH_REVOKED"


async def test_me_requires_valid_access_token(api_client: httpx.AsyncClient) -> None:
    registered = await register(api_client)
    success = await api_client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {registered['access_token']}"},
    )
    missing = await api_client.get("/api/v1/me")
    invalid = await api_client.get(
        "/api/v1/me", headers={"Authorization": "Bearer malformed"}
    )

    assert success.status_code == 200
    assert success.json()["email"] == "jane@example.com"
    assert "password_hash" not in success.json()
    assert missing.json()["error"]["code"] == "AUTH_UNAUTHENTICATED"
    assert invalid.json()["error"]["code"] == "AUTH_INVALID_TOKEN"


async def test_disabled_user_cannot_access_me(
    api_client: httpx.AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    registered = await register(api_client)
    await set_user_status(
        session_factory, registered["user"]["id"], UserStatus.DISABLED  # type: ignore[index]
    )
    response = await api_client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {registered['access_token']}"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "AUTH_USER_DISABLED"


async def test_expired_access_token_has_stable_error(
    api_client: httpx.AsyncClient, test_settings: Settings
) -> None:
    registered = await register(api_client)
    expired_token, _ = create_access_token(
        UUID(registered["user"]["id"]),  # type: ignore[index]
        test_settings,
        now=datetime.now(UTC) - timedelta(minutes=20),
    )
    response = await api_client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_TOKEN_EXPIRED"

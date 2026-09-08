from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest

from app.core.config import Settings
from app.core.security import (
    AccessTokenExpiredError,
    AccessTokenInvalidError,
    create_access_token,
    decode_access_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None,
        ENV="test",
        JWT_SECRET="test-only-jwt-secret-with-at-least-32-characters",
    )


def test_password_hash_is_not_plaintext_and_verifies() -> None:
    password = "correct horse battery staple"
    password_hash = hash_password(password)

    assert password_hash != password
    assert password_hash.startswith("$argon2id$")
    assert verify_password(password, password_hash)
    assert not verify_password("incorrect password", password_hash)


def test_refresh_hash_is_deterministic_without_storing_raw_token() -> None:
    raw_token = "a" * 64
    assert hash_refresh_token(raw_token) == hash_refresh_token(raw_token)
    assert hash_refresh_token(raw_token) != raw_token


def test_access_token_round_trip(settings: Settings) -> None:
    user_id = uuid4()
    token, expires_in = create_access_token(user_id, settings)
    claims = decode_access_token(token, settings)

    assert claims.user_id == user_id
    assert expires_in == 900


def test_expired_access_token_is_rejected(settings: Settings) -> None:
    token, _ = create_access_token(
        uuid4(), settings, now=datetime.now(UTC) - timedelta(minutes=20)
    )
    with pytest.raises(AccessTokenExpiredError):
        decode_access_token(token, settings)


def test_wrong_token_type_is_rejected(settings: Settings) -> None:
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": str(uuid4()),
            "type": "refresh",
            "iat": now,
            "exp": now + timedelta(minutes=5),
            "jti": str(uuid4()),
        },
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )
    with pytest.raises(AccessTokenInvalidError):
        decode_access_token(token, settings)


def test_malformed_access_token_is_rejected(settings: Settings) -> None:
    with pytest.raises(AccessTokenInvalidError):
        decode_access_token("not-a-jwt", settings)

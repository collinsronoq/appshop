import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt
from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import Settings

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128
REFRESH_TOKEN_BYTES = 48

_password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)


class AccessTokenInvalidError(ValueError):
    """The access token is malformed or has invalid claims."""


class AccessTokenExpiredError(ValueError):
    """The access token has expired."""


@dataclass(frozen=True, slots=True)
class AccessTokenClaims:
    user_id: UUID
    token_id: UUID


def validate_password(password: str) -> None:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters.")
    if len(password) > PASSWORD_MAX_LENGTH:
        raise ValueError(f"Password must be at most {PASSWORD_MAX_LENGTH} characters.")


def hash_password(password: str) -> str:
    validate_password(password)
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    try:
        return _password_hasher.check_needs_rehash(password_hash)
    except InvalidHashError:
        return False


def create_access_token(
    user_id: UUID,
    settings: Settings,
    *,
    now: datetime | None = None,
) -> tuple[str, int]:
    issued_at = now or datetime.now(UTC)
    lifetime = timedelta(minutes=settings.ACCESS_TOKEN_TTL_MINUTES)
    token = jwt.encode(
        {
            "sub": str(user_id),
            "type": "access",
            "iat": issued_at,
            "exp": issued_at + lifetime,
            "jti": str(uuid4()),
        },
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )
    return token, int(lifetime.total_seconds())


def decode_access_token(token: str, settings: Settings) -> AccessTokenClaims:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET.get_secret_value(),
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["sub", "type", "iat", "exp", "jti"]},
        )
        if payload.get("type") != "access":
            raise AccessTokenInvalidError
        return AccessTokenClaims(
            user_id=UUID(str(payload["sub"])),
            token_id=UUID(str(payload["jti"])),
        )
    except jwt.ExpiredSignatureError as exc:
        raise AccessTokenExpiredError from exc
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError) as exc:
        if isinstance(exc, AccessTokenExpiredError):
            raise
        raise AccessTokenInvalidError from exc


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(REFRESH_TOKEN_BYTES)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

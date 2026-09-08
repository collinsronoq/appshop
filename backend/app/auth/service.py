from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from anyio import to_thread
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import RefreshSession, User, UserStatus
from app.auth.repository import RefreshSessionRepository, UserRepository
from app.core.config import Settings
from app.core.errors import ApiError
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    password_needs_rehash,
    validate_password,
    verify_password,
)


def normalize_email(email: str) -> str:
    return email.strip().lower()


@dataclass(frozen=True, slots=True)
class IssuedCredentials:
    access_token: str
    refresh_token: str
    expires_in: int


@dataclass(frozen=True, slots=True)
class AuthenticatedSession:
    user: User
    credentials: IssuedCredentials


class AuthService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.users = UserRepository(session)
        self.refresh_sessions = RefreshSessionRepository(session)

    async def register(
        self, *, email: str, password: str, display_name: str, user_agent: str | None
    ) -> AuthenticatedSession:
        try:
            validate_password(password)
        except ValueError as exc:
            raise ApiError(
                status_code=422,
                code="AUTH_PASSWORD_INVALID",
                message=str(exc),
            ) from exc

        normalized_email = normalize_email(email)
        if await self.users.get_by_email(normalized_email) is not None:
            raise self._email_conflict()

        password_hash = await to_thread.run_sync(hash_password, password)
        user = User(
            email=normalized_email,
            password_hash=password_hash,
            display_name=display_name.strip(),
            status=UserStatus.ACTIVE,
        )
        try:
            async with self.session.begin_nested():
                self.users.add(user)
                await self.session.flush()
                credentials = await self._issue_credentials(user, user_agent=user_agent)
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise self._email_conflict() from exc
        return AuthenticatedSession(user=user, credentials=credentials)

    async def login(
        self, *, email: str, password: str, user_agent: str | None
    ) -> AuthenticatedSession:
        user = await self.users.get_by_email(normalize_email(email))
        if user is None:
            raise self._invalid_credentials()
        if user.status is UserStatus.DISABLED:
            raise ApiError(
                status_code=403,
                code="AUTH_USER_DISABLED",
                message="This account is disabled.",
            )
        password_is_valid = await to_thread.run_sync(
            verify_password, password, user.password_hash
        )
        if not password_is_valid:
            raise self._invalid_credentials()
        if password_needs_rehash(user.password_hash):
            user.password_hash = await to_thread.run_sync(hash_password, password)
        credentials = await self._issue_credentials(user, user_agent=user_agent)
        await self.session.commit()
        return AuthenticatedSession(user=user, credentials=credentials)

    async def refresh(self, raw_token: str, *, user_agent: str | None) -> IssuedCredentials:
        now = datetime.now(UTC)
        token_hash = hash_refresh_token(raw_token)
        refresh_session = await self.refresh_sessions.get_by_token_hash(
            token_hash, for_update=True
        )
        if refresh_session is None:
            raise ApiError(
                status_code=401,
                code="AUTH_REFRESH_INVALID",
                message="The refresh credential is invalid.",
            )
        if refresh_session.revoked_at is not None:
            await self.refresh_sessions.revoke_successor_chain(refresh_session, now)
            await self.session.commit()
            raise ApiError(
                status_code=401,
                code="AUTH_REFRESH_REVOKED",
                message="The refresh credential has been revoked.",
            )
        if refresh_session.expires_at <= now:
            refresh_session.revoked_at = now
            await self.session.commit()
            raise ApiError(
                status_code=401,
                code="AUTH_REFRESH_EXPIRED",
                message="The refresh credential has expired.",
            )

        user = await self.users.get_by_id(refresh_session.user_id)
        if user is None:
            raise ApiError(
                status_code=401,
                code="AUTH_REFRESH_INVALID",
                message="The refresh credential is invalid.",
            )
        if user.status is UserStatus.DISABLED:
            refresh_session.revoked_at = now
            await self.session.commit()
            raise ApiError(
                status_code=403,
                code="AUTH_USER_DISABLED",
                message="This account is disabled.",
            )

        replacement = await self._create_refresh_session(user, user_agent=user_agent, now=now)
        refresh_session.last_used_at = now
        refresh_session.revoked_at = now
        refresh_session.replaced_by_session_id = replacement.id
        access_token, expires_in = create_access_token(user.id, self.settings, now=now)
        await self.session.commit()
        return IssuedCredentials(
            access_token=access_token,
            refresh_token=replacement.raw_token,
            expires_in=expires_in,
        )

    async def logout(self, raw_token: str) -> None:
        refresh_session = await self.refresh_sessions.get_by_token_hash(
            hash_refresh_token(raw_token), for_update=True
        )
        if refresh_session is not None and refresh_session.revoked_at is None:
            refresh_session.revoked_at = datetime.now(UTC)
            await self.session.commit()

    async def _issue_credentials(
        self, user: User, *, user_agent: str | None
    ) -> IssuedCredentials:
        now = datetime.now(UTC)
        refresh = await self._create_refresh_session(user, user_agent=user_agent, now=now)
        access_token, expires_in = create_access_token(user.id, self.settings, now=now)
        return IssuedCredentials(
            access_token=access_token,
            refresh_token=refresh.raw_token,
            expires_in=expires_in,
        )

    async def _create_refresh_session(
        self, user: User, *, user_agent: str | None, now: datetime
    ) -> "RefreshSessionWithRawToken":
        raw_token = generate_refresh_token()
        refresh_session = RefreshSession(
            user_id=user.id,
            token_hash=hash_refresh_token(raw_token),
            created_at=now,
            expires_at=now + timedelta(days=self.settings.REFRESH_TOKEN_TTL_DAYS),
            user_agent=user_agent[:512] if user_agent else None,
        )
        self.refresh_sessions.add(refresh_session)
        await self.session.flush()
        return RefreshSessionWithRawToken(refresh_session, raw_token)

    @staticmethod
    def _invalid_credentials() -> ApiError:
        return ApiError(
            status_code=401,
            code="AUTH_INVALID_CREDENTIALS",
            message="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    @staticmethod
    def _email_conflict() -> ApiError:
        return ApiError(
            status_code=409,
            code="AUTH_EMAIL_ALREADY_REGISTERED",
            message="An account with this email already exists.",
        )


@dataclass(frozen=True, slots=True)
class RefreshSessionWithRawToken:
    session: RefreshSession
    raw_token: str

    @property
    def id(self) -> UUID:
        return self.session.id

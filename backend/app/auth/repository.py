from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import RefreshSession, User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_email(self, email: str) -> User | None:
        user = await self.session.scalar(select(User).where(User.email == email))
        return user

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self.session.get(User, user_id)

    async def get_by_email_for_update(self, email: str) -> User | None:
        user = await self.session.scalar(
            select(User).where(User.email == email).with_for_update()
        )
        return user

    def add(self, user: User) -> None:
        self.session.add(user)


class RefreshSessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_token_hash(
        self, token_hash: str, *, for_update: bool = False
    ) -> RefreshSession | None:
        statement = select(RefreshSession).where(RefreshSession.token_hash == token_hash)
        if for_update:
            statement = statement.with_for_update()
        refresh_session = await self.session.scalar(statement)
        return refresh_session

    async def get_by_id_for_update(self, session_id: UUID) -> RefreshSession | None:
        refresh_session = await self.session.scalar(
            select(RefreshSession)
            .where(RefreshSession.id == session_id)
            .with_for_update()
        )
        return refresh_session

    def add(self, refresh_session: RefreshSession) -> None:
        self.session.add(refresh_session)

    async def revoke_successor_chain(self, session: RefreshSession, revoked_at: datetime) -> None:
        next_id = session.replaced_by_session_id
        visited: set[UUID] = set()
        while next_id is not None and next_id not in visited:
            visited.add(next_id)
            successor = await self.get_by_id_for_update(next_id)
            if successor is None:
                return
            if successor.revoked_at is None:
                successor.revoked_at = revoked_at
            next_id = successor.replaced_by_session_id

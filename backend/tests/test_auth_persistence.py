from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.auth.models import RefreshSession, User

pytestmark = pytest.mark.postgres


async def test_migration_is_at_single_unit_1_head(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async with session_factory() as session:
        connection = await session.connection()
        current_heads = await connection.run_sync(
            lambda sync_connection: MigrationContext.configure(sync_connection).get_current_heads()
        )
    assert current_heads == ("0004_household_products",)


async def test_database_enforces_unique_normalized_email(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async with session_factory() as session:
        session.add_all(
            [
                User(email="same@example.com", password_hash="hash", display_name="One"),
                User(email="same@example.com", password_hash="hash", display_name="Two"),
            ]
        )
        with pytest.raises(IntegrityError):
            await session.commit()


async def test_refresh_session_foreign_key_is_enforced(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async with session_factory() as session:
        session.add(
            RefreshSession(
                user_id=uuid4(),
                token_hash="a" * 64,
                expires_at=datetime.now(UTC) + timedelta(days=1),
            )
        )
        with pytest.raises(IntegrityError):
            await session.commit()


async def test_refresh_token_hash_is_unique_and_raw_token_column_does_not_exist(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async with session_factory() as session:
        columns = await session.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'refresh_sessions'"
            )
        )
        assert "refresh_token" not in set(columns.scalars())

        user = User(email="unique@example.com", password_hash="hash", display_name="Unique")
        session.add(user)
        await session.flush()
        session.add_all(
            [
                RefreshSession(
                    user_id=user.id,
                    token_hash="b" * 64,
                    expires_at=datetime.now(UTC) + timedelta(days=1),
                ),
                RefreshSession(
                    user_id=user.id,
                    token_hash="b" * 64,
                    expires_at=datetime.now(UTC) + timedelta(days=1),
                ),
            ]
        )
        with pytest.raises(IntegrityError):
            await session.commit()

from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import httpx
import pytest
import pytest_asyncio
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from alembic import command
from app.core.config import Settings, get_settings
from app.core.database import get_db_session
from app.main import app

BACKEND_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    return Settings(_env_file=None)


@pytest.fixture(scope="session")
def migrated_postgres(test_settings: Settings) -> Iterator[None]:
    database_name = make_url(test_settings.MIGRATION_DATABASE_URL).database or ""
    if test_settings.ENV != "test" or "test" not in database_name.lower():
        pytest.skip("PostgreSQL integration tests require ENV=test and a dedicated test database")

    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    command.downgrade(config, "base")
    command.upgrade(config, "0001_baseline")
    command.upgrade(config, "head")
    yield


@pytest_asyncio.fixture
async def session_factory(
    migrated_postgres: None, test_settings: Settings
) -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(test_settings.DATABASE_URL, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.execute(
            text(
                "TRUNCATE trip_items, shopping_trips, shopping_list_items, shopping_lists, "
                "household_invitations, "
                "household_memberships, households, "
                "refresh_sessions, users CASCADE"
            )
        )
    yield factory
    async with engine.begin() as connection:
        await connection.execute(
            text(
                "TRUNCATE trip_items, shopping_trips, shopping_list_items, shopping_lists, "
                "household_invitations, "
                "household_memberships, households, "
                "refresh_sessions, users CASCADE"
            )
        )
    await engine.dispose()


@pytest_asyncio.fixture
async def api_client(
    session_factory: async_sessionmaker[AsyncSession], test_settings: Settings
) -> AsyncIterator[httpx.AsyncClient]:
    async def override_session() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_session
    app.dependency_overrides[get_settings] = lambda: test_settings
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()

from collections.abc import AsyncIterator

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.main import app


class ReadySession:
    async def execute(self, _statement: object) -> None:
        return None


async def override_db() -> AsyncIterator[AsyncSession]:
    yield ReadySession()  # type: ignore[misc]


async def test_liveness() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_readiness_when_database_is_available() -> None:
    app.dependency_overrides[get_db_session] = override_db
    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health/ready")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}

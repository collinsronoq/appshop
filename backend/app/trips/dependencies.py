# mypy: ignore-errors
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session

from .service import TripService


def get_trip_service(session: Annotated[AsyncSession, Depends(get_db_session)]) -> TripService:
    return TripService(session)


TripServiceDependency = Annotated[TripService, Depends(get_trip_service)]

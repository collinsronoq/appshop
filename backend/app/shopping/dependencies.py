# mypy: ignore-errors
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session

from .service import ShoppingService


def get_shopping_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ShoppingService:
    return ShoppingService(session)


ShoppingServiceDependency = Annotated[ShoppingService, Depends(get_shopping_service)]

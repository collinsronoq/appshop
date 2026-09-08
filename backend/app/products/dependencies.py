from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_db_session

from .service import ProductService


def get_product_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ProductService:
    return ProductService(session, settings)


ProductServiceDependency = Annotated[ProductService, Depends(get_product_service)]

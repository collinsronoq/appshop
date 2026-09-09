from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError

from app.api.health import router as health_router
from app.auth.router import me_router
from app.auth.router import router as auth_router
from app.core.database import get_engine
from app.core.errors import ApiError, api_error_handler, validation_error_handler
from app.core.logging import configure_logging
from app.households.router import router as households_router
from app.products.router import router as products_router
from app.purchases.router import router as purchases_router
from app.realtime.router import router as realtime_router
from app.shopping.router import router as shopping_router
from app.trips.router import router as trips_router
from app.trips.substitution_router import router as substitution_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    yield
    if get_engine.cache_info().currsize:
        await get_engine().dispose()


app = FastAPI(
    title="Household Shopping API",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_exception_handler(ApiError, api_error_handler)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, validation_error_handler)  # type: ignore[arg-type]
app.include_router(health_router)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(me_router, prefix="/api/v1")
app.include_router(households_router, prefix="/api/v1")
app.include_router(products_router, prefix="/api/v1")
app.include_router(purchases_router, prefix="/api/v1")
app.include_router(shopping_router, prefix="/api/v1")
app.include_router(realtime_router, prefix="/api/v1")
app.include_router(trips_router, prefix="/api/v1")
app.include_router(substitution_router, prefix="/api/v1")

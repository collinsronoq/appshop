# mypy: ignore-errors
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.core.database import get_db_session
from app.core.errors import ApiError
from app.households.repository import HouseholdRepository
from app.products.models import HouseholdProduct

from .models import Purchase

router = APIRouter(tags=["purchasing-memory"])


async def ensure_access(session, household_id, user):
    if not await HouseholdRepository(session).get_access(household_id, user.id):
        raise ApiError(status_code=404, code="HOUSEHOLD_NOT_FOUND", message="Household not found.")


def memory_query(household_id, frequent, limit):
    aggregate = (
        select(
            Purchase.household_product_id,
            func.max(Purchase.purchased_at).label("last_purchased_at"),
            func.count(Purchase.id).label("purchase_count"),
            func.sum(Purchase.purchased_quantity).label("total_purchased_quantity"),
        )
        .where(Purchase.household_id == household_id, Purchase.household_product_id.is_not(None))
        .group_by(Purchase.household_product_id)
        .subquery()
    )
    latest = (
        select(Purchase.household_product_id, Purchase.purchased_quantity)
        .where(Purchase.household_id == household_id, Purchase.household_product_id.is_not(None))
        .distinct(Purchase.household_product_id)
        .order_by(Purchase.household_product_id, Purchase.purchased_at.desc(), Purchase.id.desc())
        .subquery()
    )
    query = (
        select(
            aggregate.c.household_product_id,
            HouseholdProduct.name,
            HouseholdProduct.brand,
            HouseholdProduct.variant,
            HouseholdProduct.size_value,
            HouseholdProduct.size_unit,
            HouseholdProduct.usual_quantity,
            aggregate.c.last_purchased_at,
            aggregate.c.purchase_count,
            latest.c.purchased_quantity.label("last_purchased_quantity"),
            aggregate.c.total_purchased_quantity,
            HouseholdProduct.archived_at.is_not(None).label("archived"),
        )
        .join(HouseholdProduct, HouseholdProduct.id == aggregate.c.household_product_id)
        .join(latest, latest.c.household_product_id == aggregate.c.household_product_id)
    )
    ordering = (
        (
            desc(aggregate.c.purchase_count),
            desc(aggregate.c.last_purchased_at),
            aggregate.c.household_product_id,
        )
        if frequent
        else (desc(aggregate.c.last_purchased_at), aggregate.c.household_product_id)
    )
    return query.order_by(*ordering).limit(limit)


def output(row):
    return dict(row._mapping)


@router.get("/households/{household_id}/purchasing-memory/recent")
async def recent(
    household_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    limit: int = Query(10, ge=1, le=50),
):
    await ensure_access(session, household_id, user)
    return {
        "items": [
            output(row)
            for row in (await session.execute(memory_query(household_id, False, limit))).all()
        ]
    }


@router.get("/households/{household_id}/purchasing-memory/frequent")
async def frequent(
    household_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    limit: int = Query(10, ge=1, le=50),
):
    await ensure_access(session, household_id, user)
    return {
        "items": [
            output(row)
            for row in (await session.execute(memory_query(household_id, True, limit))).all()
        ]
    }


@router.get("/households/{household_id}/products/{product_id}/purchase-summary")
async def summary(
    household_id: UUID,
    product_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    await ensure_access(session, household_id, user)
    result = await session.execute(
        select(
            func.count(Purchase.id).label("purchase_count"),
            func.max(Purchase.purchased_at).label("last_purchased_at"),
            func.sum(Purchase.purchased_quantity).label("total_purchased_quantity"),
        ).where(Purchase.household_id == household_id, Purchase.household_product_id == product_id)
    )
    return dict(result.one()._mapping)

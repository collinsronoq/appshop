# mypy: ignore-errors
# ruff: noqa
from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.dependencies import CurrentUser
from app.core.database import get_db_session
from app.core.errors import ApiError
from app.households.repository import HouseholdRepository
from app.products.models import HouseholdProduct
from .models import Purchase

router=APIRouter(tags=["purchasing-memory"])
async def ensure(s,h,u):
    if not await HouseholdRepository(s).get_access(h,u.id): raise ApiError(status_code=404,code="HOUSEHOLD_NOT_FOUND",message="Household not found.")
def row(r): return {"household_product_id":r.household_product_id,"name":r.name,"brand":r.brand,"variant":r.variant,"size_value":r.size_value,"size_unit":r.size_unit,"last_purchased_at":r.last_purchased_at,"purchase_count":r.purchase_count,"last_purchased_quantity":r.last_purchased_quantity,"total_purchased_quantity":r.total_purchased_quantity,"archived":r.archived}
def query(h, frequent=False, limit=10):
    latest=select(Purchase.household_product_id,func.max(Purchase.purchased_at).label("last_purchased_at"),func.count(Purchase.id).label("purchase_count"),func.sum(Purchase.purchased_quantity).label("total_purchased_quantity")).where(Purchase.household_id==h,Purchase.household_product_id.is_not(None)).group_by(Purchase.household_product_id).subquery()
    q=select(latest.c.household_product_id,HouseholdProduct.name,HouseholdProduct.brand,HouseholdProduct.variant,HouseholdProduct.size_value,HouseholdProduct.size_unit,latest.c.last_purchased_at,latest.c.purchase_count,latest.c.total_purchased_quantity,HouseholdProduct.archived_at.is_not(None).label("archived")).join(HouseholdProduct,HouseholdProduct.id==latest.c.household_product_id)
    return q.order_by(desc(latest.c.purchase_count),desc(latest.c.last_purchased_at),latest.c.household_product_id).limit(limit) if frequent else q.order_by(desc(latest.c.last_purchased_at),latest.c.household_product_id).limit(limit)
@router.get("/households/{household_id}/purchasing-memory/recent")
async def recent(household_id:UUID,user:CurrentUser,limit:int=Query(10,ge=1,le=50),s:Annotated[AsyncSession,Depends(get_db_session)]=None):
    await ensure(s,household_id,user); return {"items":[row(r) for r in (await s.execute(query(household_id,False,limit))).all()]}
@router.get("/households/{household_id}/purchasing-memory/frequent")
async def frequent(household_id:UUID,user:CurrentUser,limit:int=Query(10,ge=1,le=50),s:Annotated[AsyncSession,Depends(get_db_session)]=None):
    await ensure(s,household_id,user); return {"items":[row(r) for r in (await s.execute(query(household_id,True,limit))).all()]}
@router.get("/households/{household_id}/products/{product_id}/purchase-summary")
async def summary(household_id:UUID,product_id:UUID,user:CurrentUser,s:Annotated[AsyncSession,Depends(get_db_session)]):
    await ensure(s,household_id,user); r=await s.execute(select(func.count(Purchase.id).label("purchase_count"),func.max(Purchase.purchased_at).label("last_purchased_at"),func.sum(Purchase.purchased_quantity).label("total_purchased_quantity")).where(Purchase.household_id==household_id,Purchase.household_product_id==product_id)); x=r.one(); return {"purchase_count":x.purchase_count,"last_purchased_at":x.last_purchased_at,"total_purchased_quantity":x.total_purchased_quantity}

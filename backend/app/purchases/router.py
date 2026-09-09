# mypy: ignore-errors
# ruff: noqa
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.dependencies import CurrentUser
from app.core.database import get_db_session
from app.core.errors import ApiError
from app.households.repository import HouseholdRepository
from app.realtime.events import RealtimeEvent
from app.realtime.manager import publisher
from app.trips.models import ShoppingTrip, TripItem, TripItemStatus, TripStatus
from app.shopping.models import ShoppingListItem
from .models import Purchase
router=APIRouter(tags=["purchases"])
async def auth(s,h,u):
    if not await HouseholdRepository(s).get_access(h,u.id): raise ApiError(status_code=404,code="HOUSEHOLD_NOT_FOUND",message="Household not found.")
def view(p): return {k:getattr(p,k) for k in ("id","household_id","shopping_trip_id","trip_item_id","household_product_id","requested_name_snapshot","requested_brand_snapshot","requested_variant_snapshot","requested_size_value_snapshot","requested_size_unit_snapshot","purchased_name_snapshot","purchased_brand_snapshot","purchased_variant_snapshot","purchased_size_value_snapshot","purchased_size_unit_snapshot","requested_quantity","purchased_quantity","unit_price","total_price","substituted","purchased_by_user_id","purchased_at","created_at")}
@router.post("/households/{household_id}/trips/{trip_id}/complete")
async def complete(household_id:UUID,trip_id:UUID,user:CurrentUser,s:Annotated[AsyncSession,Depends(get_db_session)]):
    await auth(s,household_id,user); trip=await s.scalar(select(ShoppingTrip).where(ShoppingTrip.id==trip_id,ShoppingTrip.household_id==household_id).with_for_update())
    if not trip: raise ApiError(status_code=404,code="SHOPPING_TRIP_NOT_FOUND",message="Shopping trip not found.")
    if trip.status is not TripStatus.ACTIVE: raise ApiError(status_code=409,code="SHOPPING_TRIP_ALREADY_COMPLETED",message="Shopping trip is no longer active.")
    items=(await s.scalars(select(TripItem).where(TripItem.shopping_trip_id==trip_id).with_for_update())).all()
    source_rows=(await s.scalars(select(ShoppingListItem).where(ShoppingListItem.id.in_([i.shopping_list_item_id for i in items])))).all()
    source_products={row.id:row.household_product_id for row in source_rows}
    if any(i.status is TripItemStatus.PENDING for i in items): raise ApiError(status_code=409,code="SHOPPING_TRIP_HAS_PENDING_ITEMS",message="Resolve all items before completing.")
    now=datetime.now(UTC); purchases=[]
    for i in items:
        if i.status is not TripItemStatus.COLLECTED: continue
        if i.substituted and not i.purchased_name_snapshot: raise ApiError(status_code=409,code="INVALID_SUBSTITUTED_ITEM",message="Substituted item is incomplete.")
        name=i.purchased_name_snapshot or i.requested_name_snapshot
        purchases.append(Purchase(household_id=household_id,shopping_trip_id=trip.id,trip_item_id=i.id,household_product_id=source_products.get(i.shopping_list_item_id),requested_name_snapshot=i.requested_name_snapshot,requested_brand_snapshot=i.requested_brand_snapshot,requested_variant_snapshot=i.requested_variant_snapshot,requested_size_value_snapshot=i.requested_size_value_snapshot,requested_size_unit_snapshot=i.requested_size_unit_snapshot,purchased_name_snapshot=name,purchased_brand_snapshot=i.purchased_brand_snapshot or i.requested_brand_snapshot,purchased_variant_snapshot=i.purchased_variant_snapshot or i.requested_variant_snapshot,purchased_size_value_snapshot=i.purchased_size_value_snapshot or i.requested_size_value_snapshot,purchased_size_unit_snapshot=i.purchased_size_unit_snapshot or i.requested_size_unit_snapshot,requested_quantity=i.requested_quantity,purchased_quantity=i.purchased_quantity or i.requested_quantity,substituted=i.substituted,purchased_by_user_id=i.collected_by_user_id or user.id,purchased_at=i.collected_at or now))
    s.add_all(purchases); trip.status=TripStatus.COMPLETED; trip.completed_at=now; trip.version=ShoppingTrip.version+1; await s.commit()
    try: await publisher.publish(RealtimeEvent(type="shopping_trip.completed",household_id=household_id,list_id=trip.shopping_list_id,trip_id=trip.id,actor_id=user.id,version=trip.version,payload={"purchased_count":len(purchases),"skipped_count":sum(i.status is TripItemStatus.SKIPPED for i in items)}))
    except Exception: pass
    return {"trip_id":trip.id,"status":trip.status,"completed_at":trip.completed_at,"summary":{"total_items":len(items),"purchased":len(purchases),"skipped":sum(i.status is TripItemStatus.SKIPPED for i in items),"substituted":sum(i.substituted for i in items if i.status is TripItemStatus.COLLECTED),"total_amount":None}}
@router.get("/households/{household_id}/purchases")
async def purchases(household_id:UUID,user:CurrentUser,limit:int=Query(50,ge=1,le=100),offset:int=Query(0,ge=0),product_id:UUID|None=None,s:Annotated[AsyncSession,Depends(get_db_session)]=None):
    await auth(s,household_id,user); q=select(Purchase).where(Purchase.household_id==household_id).order_by(Purchase.purchased_at.desc(),Purchase.id.desc()).offset(offset).limit(limit)
    if product_id: q=q.where(Purchase.household_product_id==product_id)
    return [view(p) for p in (await s.scalars(q)).all()]
@router.get("/households/{household_id}/products/{product_id}/purchase-history")
async def product_history(household_id:UUID,product_id:UUID,user:CurrentUser,limit:int=Query(50,ge=1,le=100),offset:int=Query(0,ge=0),s:Annotated[AsyncSession,Depends(get_db_session)]=None):
    await auth(s,household_id,user); q=select(Purchase).where(Purchase.household_id==household_id,Purchase.household_product_id==product_id).order_by(Purchase.purchased_at.desc(),Purchase.id.desc()).offset(offset).limit(limit); return [view(p) for p in (await s.scalars(q)).all()]

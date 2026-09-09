# mypy: ignore-errors
# ruff: noqa
from datetime import UTC, datetime
import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.core.database import get_db_session
from app.core.errors import ApiError
from app.households.repository import HouseholdRepository
from app.products.models import HouseholdProduct, ProductSubstitute
from app.products.service import LocalObjectStorage
from app.push_notifications.dependencies import PushProviderDependency
from app.push_notifications.service import PushNotificationService, product_label
from app.shopping.models import ShoppingListItem
from app.core.config import get_settings
from app.realtime.events import RealtimeEvent
from app.realtime.manager import publisher
from uuid import uuid4

from .models import ShoppingTrip, TripItem, TripItemStatus
from .substitutions import SubstitutionRequest

router = APIRouter(tags=["substitutions"])
logger = logging.getLogger(__name__)


async def emit(kind, req, trip, actor):
    try:
        await publisher.publish(
            RealtimeEvent(
                type=kind,
                household_id=req.household_id,
                list_id=trip.shopping_list_id,
                trip_id=trip.id,
                resource_id=req.id,
                actor_id=actor,
                version=trip.version,
            )
        )
    except Exception:
        logger.exception("realtime publish failed event=%s", kind)


async def notify_requested(session, provider, req, item):
    try:
        await PushNotificationService(session, provider).notify_substitution_requested(
            household_id=req.household_id,
            requester_id=req.requested_by_user_id,
            trip_id=req.shopping_trip_id,
            substitution_id=req.id,
            proposed_label=product_label(
                req.proposed_name, req.proposed_size_value, req.proposed_size_unit
            ),
            requested_label=product_label(
                item.requested_name_snapshot,
                item.requested_size_value_snapshot,
                item.requested_size_unit_snapshot,
            ),
        )
    except Exception:
        logger.exception("push dispatch failed notification=substitution.requested")


async def notify_resolved(session, provider, req, status):
    try:
        await PushNotificationService(session, provider).notify_substitution_resolved(
            status=status,
            household_id=req.household_id,
            requester_id=req.requested_by_user_id,
            trip_id=req.shopping_trip_id,
            substitution_id=req.id,
            proposed_label=product_label(
                req.proposed_name, req.proposed_size_value, req.proposed_size_unit
            ),
        )
    except Exception:
        logger.exception("push dispatch failed notification=substitution.%s", status)


class Proposal(BaseModel):
    proposed_product_id: UUID | None = None
    proposed_name: str | None = Field(default=None, max_length=160)
    proposed_brand: str | None = None
    proposed_variant: str | None = None
    proposed_size_value: float | None = None
    proposed_size_unit: str | None = None


async def access(session, hid, user):
    if not await HouseholdRepository(session).get_access(hid, user.id):
        raise ApiError(status_code=404, code="HOUSEHOLD_NOT_FOUND", message="Household not found.")


def view(r):
    return {
        k: getattr(r, k)
        for k in (
            "id",
            "household_id",
            "shopping_trip_id",
            "trip_item_id",
            "requested_by_user_id",
            "proposed_product_id",
            "proposed_name",
            "proposed_brand",
            "proposed_variant",
            "proposed_size_value",
            "proposed_size_unit",
            "status",
            "resolved_by_user_id",
            "resolved_at",
            "created_at",
            "updated_at",
        )
    }


@router.post(
    "/households/{household_id}/trips/{trip_id}/items/{trip_item_id}/substitutions", status_code=201
)
async def create(
    household_id: UUID,
    trip_id: UUID,
    trip_item_id: UUID,
    payload: Proposal,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    push_provider: PushProviderDependency,
):
    await access(session, household_id, user)
    trip = await session.scalar(
        select(ShoppingTrip)
        .where(ShoppingTrip.id == trip_id, ShoppingTrip.household_id == household_id)
        .with_for_update()
    )
    item = await session.scalar(
        select(TripItem)
        .where(
            TripItem.id == trip_item_id,
            TripItem.shopping_trip_id == trip_id,
            TripItem.household_id == household_id,
        )
        .with_for_update()
    )
    if not trip or not item:
        raise ApiError(
            status_code=404, code="SHOPPING_TRIP_NOT_FOUND", message="Shopping trip not found."
        )
    if trip.status != "active" or item.status is not TripItemStatus.PENDING:
        raise ApiError(
            status_code=409, code="TRIP_ITEM_NOT_PENDING", message="Trip item is not pending."
        )
    has_product, has_name = (
        bool(payload.proposed_product_id),
        bool(payload.proposed_name and payload.proposed_name.strip()),
    )
    if has_product == has_name:
        raise ApiError(
            status_code=422,
            code="SUBSTITUTION_PROPOSAL_INVALID",
            message="Provide exactly one proposal source.",
        )
    values = payload.model_dump(exclude={"proposed_product_id"})
    if payload.proposed_product_id:
        product = await session.scalar(
            select(HouseholdProduct).where(
                HouseholdProduct.id == payload.proposed_product_id,
                HouseholdProduct.household_id == household_id,
                HouseholdProduct.archived_at.is_(None),
            )
        )
        if not product:
            raise ApiError(
                status_code=422,
                code="SUBSTITUTION_PRODUCT_INVALID",
                message="Product is unavailable.",
            )
        values.update(
            proposed_name=product.name,
            proposed_brand=product.brand,
            proposed_variant=product.variant,
            proposed_size_value=product.size_value,
            proposed_size_unit=product.size_unit,
        )
    if await session.scalar(
        select(SubstitutionRequest.id).where(
            SubstitutionRequest.trip_item_id == trip_item_id,
            SubstitutionRequest.status == "pending",
        )
    ):
        raise ApiError(
            status_code=409,
            code="SUBSTITUTION_REQUEST_ALREADY_PENDING",
            message="A request is already pending.",
        )
    req = SubstitutionRequest(
        household_id=household_id,
        shopping_trip_id=trip_id,
        trip_item_id=trip_item_id,
        requested_by_user_id=user.id,
        proposed_product_id=payload.proposed_product_id,
        **values,
    )
    session.add(req)
    trip.version = ShoppingTrip.version + 1
    await session.commit()
    await emit("substitution.requested", req, trip, user.id)
    await notify_requested(session, push_provider, req, item)
    return view(req)


async def decide(hid, rid, user, session, status, push_provider):
    await access(session, hid, user)
    req = await session.scalar(
        select(SubstitutionRequest)
        .where(SubstitutionRequest.id == rid, SubstitutionRequest.household_id == hid)
        .with_for_update()
    )
    if not req:
        raise ApiError(
            status_code=404,
            code="SUBSTITUTION_NOT_FOUND",
            message="Substitution request not found.",
        )
    if req.status != "pending":
        raise ApiError(
            status_code=409,
            code="SUBSTITUTION_REQUEST_NOT_PENDING",
            message="Request is no longer pending.",
        )
    if status == "approved" and req.requested_by_user_id == user.id:
        raise ApiError(
            status_code=409,
            code="SUBSTITUTION_SELF_APPROVAL_NOT_ALLOWED",
            message="Another household member must approve.",
        )
    req.status = status
    req.resolved_by_user_id = user.id
    req.resolved_at = datetime.now(UTC)
    trip = await session.scalar(
        select(ShoppingTrip).where(ShoppingTrip.id == req.shopping_trip_id).with_for_update()
    )
    item = await session.scalar(
        select(TripItem).where(TripItem.id == req.trip_item_id).with_for_update()
    )
    if status == "approved":
        (
            item.purchased_name_snapshot,
            item.purchased_brand_snapshot,
            item.purchased_variant_snapshot,
        ) = req.proposed_name, req.proposed_brand, req.proposed_variant
        item.purchased_size_value_snapshot, item.purchased_size_unit_snapshot, item.substituted = (
            req.proposed_size_value,
            req.proposed_size_unit,
            True,
        )
    trip.version = ShoppingTrip.version + 1
    await session.commit()
    await emit("substitution." + status, req, trip, user.id)
    await notify_resolved(session, push_provider, req, status)
    return view(req)


@router.post("/households/{household_id}/substitutions/{substitution_id}/approve")
async def approve(
    household_id: UUID,
    substitution_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    push_provider: PushProviderDependency,
):
    return await decide(household_id, substitution_id, user, session, "approved", push_provider)


@router.post("/households/{household_id}/substitutions/{substitution_id}/reject")
async def reject(
    household_id: UUID,
    substitution_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    push_provider: PushProviderDependency,
):
    return await decide(household_id, substitution_id, user, session, "rejected", push_provider)


@router.get("/households/{household_id}/substitutions")
async def list_pending(
    household_id: UUID,
    user: CurrentUser,
    status: str = "pending",
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
):
    await access(session, household_id, user)
    rows = (
        await session.scalars(
            select(SubstitutionRequest)
            .where(
                SubstitutionRequest.household_id == household_id,
                SubstitutionRequest.status == status,
            )
            .order_by(SubstitutionRequest.created_at.desc())
        )
    ).all()
    return [view(row) for row in rows]


@router.get("/households/{household_id}/substitutions/{substitution_id}")
async def get_request(
    household_id: UUID,
    substitution_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    await access(session, household_id, user)
    row = await session.scalar(
        select(SubstitutionRequest).where(
            SubstitutionRequest.id == substitution_id,
            SubstitutionRequest.household_id == household_id,
        )
    )
    if not row:
        raise ApiError(
            status_code=404,
            code="SUBSTITUTION_NOT_FOUND",
            message="Substitution request not found.",
        )
    return view(row)


@router.post(
    "/households/{household_id}/trips/{trip_id}/items/{trip_item_id}/apply-preferred-substitute"
)
async def apply_preferred(
    household_id: UUID,
    trip_id: UUID,
    trip_item_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    await access(session, household_id, user)
    trip = await session.scalar(
        select(ShoppingTrip)
        .where(ShoppingTrip.id == trip_id, ShoppingTrip.household_id == household_id)
        .with_for_update()
    )
    item = await session.scalar(
        select(TripItem)
        .where(
            TripItem.id == trip_item_id,
            TripItem.shopping_trip_id == trip_id,
            TripItem.household_id == household_id,
        )
        .with_for_update()
    )
    if not trip or not item or trip.status != "active" or item.status is not TripItemStatus.PENDING:
        raise ApiError(
            status_code=409, code="TRIP_ITEM_NOT_PENDING", message="Trip item is not pending."
        )
    source = await session.scalar(
        select(ShoppingListItem).where(ShoppingListItem.id == item.shopping_list_item_id)
    )
    pref = (
        await session.scalar(
            select(ProductSubstitute)
            .where(
                ProductSubstitute.product_id == source.household_product_id,
                ProductSubstitute.household_id == household_id,
            )
            .order_by(ProductSubstitute.preference_rank)
        )
        if source and source.household_product_id
        else None
    )
    product = (
        await session.scalar(
            select(HouseholdProduct).where(
                HouseholdProduct.id == pref.substitute_product_id,
                HouseholdProduct.archived_at.is_(None),
            )
        )
        if pref and pref.substitute_product_id
        else None
    )
    if not pref or (pref.substitute_product_id and not product):
        raise ApiError(
            status_code=404,
            code="PREFERRED_SUBSTITUTE_NOT_FOUND",
            message="No preferred substitute is available.",
        )
    item.purchased_name_snapshot = product.name if product else pref.substitute_name
    item.purchased_brand_snapshot = product.brand if product else None
    item.purchased_variant_snapshot = product.variant if product else None
    item.purchased_size_value_snapshot = product.size_value if product else None
    item.purchased_size_unit_snapshot = product.size_unit if product else None
    item.substituted = True
    trip.version = ShoppingTrip.version + 1
    await session.commit()
    try:
        await publisher.publish(
            RealtimeEvent(
                type="substitution.applied",
                household_id=household_id,
                list_id=trip.shopping_list_id,
                trip_id=trip.id,
                resource_id=item.id,
                actor_id=user.id,
                version=trip.version,
            )
        )
    except Exception:
        pass
    return {"trip_item_id": item.id, "status": item.status, "substituted": True}


@router.post("/households/{household_id}/substitutions/{substitution_id}/image")
async def image(
    household_id: UUID,
    substitution_id: UUID,
    file: Annotated[UploadFile, File()],
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    await access(session, household_id, user)
    req = await session.scalar(
        select(SubstitutionRequest).where(
            SubstitutionRequest.id == substitution_id,
            SubstitutionRequest.household_id == household_id,
        )
    )
    if not req:
        raise ApiError(
            status_code=404,
            code="SUBSTITUTION_NOT_FOUND",
            message="Substitution request not found.",
        )
    storage = LocalObjectStorage(get_settings())
    key = f"households/{household_id}/trips/{req.shopping_trip_id}/substitutions/{req.id}/{uuid4().hex}"
    await storage.save(key, file)
    old = req.image_key
    req.image_key = key
    await session.commit()
    await storage.delete(old)
    return {"id": req.id, "image_url": storage.url_for(key)}

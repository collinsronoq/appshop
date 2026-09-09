# mypy: ignore-errors
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.core.database import get_db_session
from app.core.errors import ApiError
from app.households.repository import HouseholdRepository
from app.products.models import HouseholdProduct

from .models import ShoppingTrip, TripItem, TripItemStatus
from .substitutions import SubstitutionRequest

router = APIRouter(tags=["substitutions"])


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
    return view(req)


async def decide(hid, rid, user, session, status):
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
    return view(req)


@router.post("/households/{household_id}/substitutions/{substitution_id}/approve")
async def approve(
    household_id: UUID,
    substitution_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await decide(household_id, substitution_id, user, session, "approved")


@router.post("/households/{household_id}/substitutions/{substitution_id}/reject")
async def reject(
    household_id: UUID,
    substitution_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await decide(household_id, substitution_id, user, session, "rejected")

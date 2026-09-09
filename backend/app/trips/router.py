# mypy: ignore-errors
from uuid import UUID

from fastapi import APIRouter

from app.auth.dependencies import CurrentUser
from app.core.errors import ApiError
from app.households.dependencies import HouseholdAccessDependency

from .dependencies import TripServiceDependency
from .schemas import CollectRequest, Progress, TripItemResponse, TripResponse, TripStart

router = APIRouter(tags=["shopping-trips"])


def output(trip):
    counts = {s: 0 for s in ("pending", "collected", "skipped")}
    items = []
    for i in trip.items:
        counts[i.status] += 1
        items.append(
            TripItemResponse(
                id=i.id,
                shopping_list_item_id=i.shopping_list_item_id,
                status=i.status,
                name=i.requested_name_snapshot,
                brand=i.requested_brand_snapshot,
                variant=i.requested_variant_snapshot,
                size_value=i.requested_size_value_snapshot,
                size_unit=i.requested_size_unit_snapshot,
                requested_quantity=i.requested_quantity,
                notes=i.notes,
                purchased_quantity=i.purchased_quantity,
                collected_at=i.collected_at,
            )
        )
    return TripResponse(
        id=trip.id,
        household_id=trip.household_id,
        shopping_list_id=trip.shopping_list_id,
        store_name=trip.store_name,
        status=trip.status,
        version=trip.version,
        started_at=trip.started_at,
        cancelled_at=trip.cancelled_at,
        progress=Progress(
            total=len(items),
            pending=counts["pending"],
            collected=counts["collected"],
            skipped=counts["skipped"],
        ),
        items=items,
    )


@router.post(
    "/households/{household_id}/shopping-lists/{list_id}/trips",
    response_model=TripResponse,
    status_code=201,
)
async def start(
    household_id: UUID,
    list_id: UUID,
    payload: TripStart,
    user: CurrentUser,
    access: HouseholdAccessDependency,
    service: TripServiceDependency,
):
    return output(await service.start(household_id, list_id, user, payload.store_name))


@router.get("/households/{household_id}/trips/{trip_id}", response_model=TripResponse)
async def get(household_id: UUID, trip_id: UUID, user: CurrentUser, service: TripServiceDependency):
    await service.access(household_id, user)
    trip = await service.repo.get(household_id, trip_id)
    if not trip:
        raise ApiError(
            status_code=404, code="SHOPPING_TRIP_NOT_FOUND", message="Shopping trip not found."
        )
    return output(trip)


@router.get(
    "/households/{household_id}/shopping-lists/{list_id}/active-trip",
    response_model=TripResponse | None,
)
async def active_trip(
    household_id: UUID, list_id: UUID, user: CurrentUser, service: TripServiceDependency
):
    await service.access(household_id, user)
    trip = await service.repo.active_for_list(household_id, list_id)
    return output(trip) if trip else None


@router.post(
    "/households/{household_id}/trips/{trip_id}/items/{trip_item_id}/collect",
    response_model=TripResponse,
)
async def collect(
    household_id: UUID,
    trip_id: UUID,
    trip_item_id: UUID,
    payload: CollectRequest,
    user: CurrentUser,
    service: TripServiceDependency,
):
    await service.access(household_id, user)
    return output(
        await service.transition(
            household_id, trip_id, trip_item_id, user, "collect", payload.purchased_quantity
        )
    )


@router.post(
    "/households/{household_id}/trips/{trip_id}/items/{trip_item_id}/skip",
    response_model=TripResponse,
)
async def skip(
    household_id: UUID,
    trip_id: UUID,
    trip_item_id: UUID,
    user: CurrentUser,
    service: TripServiceDependency,
):
    await service.access(household_id, user)
    return output(await service.transition(household_id, trip_id, trip_item_id, user, "skip", None))


@router.post(
    "/households/{household_id}/trips/{trip_id}/items/{trip_item_id}/undo",
    response_model=TripResponse,
)
async def undo(
    household_id: UUID,
    trip_id: UUID,
    trip_item_id: UUID,
    user: CurrentUser,
    service: TripServiceDependency,
):
    await service.access(household_id, user)
    return output(await service.transition(household_id, trip_id, trip_item_id, user, "undo", None))


@router.post("/households/{household_id}/trips/{trip_id}/cancel", response_model=TripResponse)
async def cancel(
    household_id: UUID, trip_id: UUID, user: CurrentUser, service: TripServiceDependency
):
    await service.access(household_id, user)
    return output(await service.cancel(household_id, trip_id, user))

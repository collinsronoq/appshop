# mypy: ignore-errors
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError

from app.core.errors import ApiError
from app.households.repository import HouseholdRepository
from app.realtime.events import RealtimeEvent
from app.realtime.manager import publisher
from app.shopping.repository import ShoppingRepository

from .models import ShoppingTrip, TripItem, TripItemStatus, TripStatus
from .repository import TripRepository


class TripService:
    def __init__(self, session, event_publisher=publisher):
        self.session = session
        self.repo = TripRepository(session)
        self.households = HouseholdRepository(session)
        self.shopping = ShoppingRepository(session)
        self.publisher = event_publisher

    async def access(self, hid, user):
        access = await self.households.get_access(hid, user.id)
        if not access:
            raise ApiError(
                status_code=404, code="HOUSEHOLD_NOT_FOUND", message="Household not found."
            )
        return access

    async def _publish(self, event_type, trip, actor, resource=None, payload=None):
        try:
            await self.publisher.publish(
                RealtimeEvent(
                    type=event_type,
                    household_id=trip.household_id,
                    list_id=trip.shopping_list_id,
                    trip_id=trip.id,
                    resource_id=resource,
                    actor_id=actor,
                    version=trip.version,
                    payload=payload or {},
                )
            )
        except Exception:
            return

    async def start(self, hid, lid, user, store):
        listing = await self.shopping.get_list(hid, lid, True)
        if not listing:
            raise ApiError(
                status_code=404, code="SHOPPING_LIST_NOT_FOUND", message="Shopping list not found."
            )
        if listing.archived_at:
            raise ApiError(
                status_code=409, code="SHOPPING_LIST_ARCHIVED", message="Shopping list is archived."
            )
        if await self.repo.active_for_list(hid, lid):
            raise ApiError(
                status_code=409,
                code="SHOPPING_TRIP_ALREADY_ACTIVE",
                message="A shopping trip is already active.",
            )
        trip = ShoppingTrip(
            household_id=hid, shopping_list_id=lid, started_by_user_id=user.id, store_name=store
        )
        self.session.add(trip)
        await self.session.flush()
        for item in listing.items:
            self.session.add(self._trip_item(trip, item))
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise ApiError(
                status_code=409,
                code="SHOPPING_TRIP_ALREADY_ACTIVE",
                message="A shopping trip is already active.",
            ) from exc
        result = await self.repo.get(hid, trip.id)
        await self._publish("shopping_trip.started", result, user.id)
        return result

    def _trip_item(self, trip, item):
        return TripItem(
            household_id=trip.household_id,
            shopping_trip_id=trip.id,
            shopping_list_item_id=item.id,
            requested_name_snapshot=item.name_snapshot,
            requested_brand_snapshot=item.brand_snapshot,
            requested_variant_snapshot=item.variant_snapshot,
            requested_size_value_snapshot=item.size_value_snapshot,
            requested_size_unit_snapshot=item.size_unit_snapshot,
            requested_quantity=item.requested_quantity,
            category_id=item.category_id,
            notes=item.notes,
        )

    async def require_active(self, hid, tid):
        trip = await self.repo.get(hid, tid, True)
        if not trip:
            raise ApiError(
                status_code=404, code="SHOPPING_TRIP_NOT_FOUND", message="Shopping trip not found."
            )
        if trip.status is not TripStatus.ACTIVE:
            raise ApiError(
                status_code=409,
                code="SHOPPING_TRIP_NOT_ACTIVE",
                message="Shopping trip is not active.",
            )
        return trip

    async def transition(self, hid, tid, iid, user, action, purchased):
        trip = await self.require_active(hid, tid)
        item = next((x for x in trip.items if x.id == iid), None)
        if not item:
            raise ApiError(
                status_code=404, code="TRIP_ITEM_NOT_FOUND", message="Trip item not found."
            )
        if action == "collect":
            if item.status not in {TripItemStatus.PENDING, TripItemStatus.SKIPPED}:
                raise ApiError(
                    status_code=409,
                    code="TRIP_ITEM_INVALID_STATE",
                    message="Invalid trip item state.",
                )
            item.status = TripItemStatus.COLLECTED
            item.collected_by_user_id = user.id
            item.collected_at = datetime.now(UTC)
            item.purchased_quantity = purchased or item.requested_quantity
            event = "trip_item.collected"
        elif action == "skip":
            if item.status is not TripItemStatus.PENDING:
                raise ApiError(
                    status_code=409,
                    code="TRIP_ITEM_INVALID_STATE",
                    message="Invalid trip item state.",
                )
            item.status = TripItemStatus.SKIPPED
            event = "trip_item.skipped"
        else:
            if item.status not in {TripItemStatus.COLLECTED, TripItemStatus.SKIPPED}:
                raise ApiError(
                    status_code=409,
                    code="TRIP_ITEM_INVALID_STATE",
                    message="Invalid trip item state.",
                )
            item.status = TripItemStatus.PENDING
            item.collected_by_user_id = None
            item.collected_at = None
            item.purchased_quantity = None
            event = "trip_item.uncollected"
        trip.version = ShoppingTrip.version + 1
        await self.session.commit()
        result = await self.repo.get(hid, tid)
        await self._publish(event, result, user.id, iid)
        return result

    async def cancel(self, hid, tid, user):
        trip = await self.require_active(hid, tid)
        trip.status = TripStatus.CANCELLED
        trip.cancelled_at = datetime.now(UTC)
        trip.version = ShoppingTrip.version + 1
        await self.session.commit()
        result = await self.repo.get(hid, tid)
        await self._publish("shopping_trip.cancelled", result, user.id)
        return result

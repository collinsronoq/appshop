# mypy: ignore-errors
import logging
from datetime import UTC, datetime
from uuid import UUID

from app.auth.models import User
from app.core.errors import ApiError
from app.households.repository import HouseholdRepository
from app.products.repository import ProductRepository
from app.realtime.events import RealtimeEvent
from app.realtime.manager import publisher
from app.trips.models import ShoppingTrip, TripItem, TripItemStatus
from app.trips.repository import TripRepository

from .models import ShoppingList, ShoppingListItem, ShoppingListStatus
from .repository import ShoppingRepository

logger = logging.getLogger(__name__)


class ShoppingService:
    def __init__(self, session, event_publisher=publisher):
        self.session = session
        self.repo = ShoppingRepository(session)
        self.households = HouseholdRepository(session)
        self.products = ProductRepository(session)
        self.publisher = event_publisher
        self.trips = TripRepository(session)

    async def _publish(self, event_type, listing, actor_id, resource_id=None, payload=None):
        try:
            await self.publisher.publish(
                RealtimeEvent(
                    type=event_type,
                    household_id=listing.household_id,
                    list_id=listing.id,
                    resource_id=resource_id,
                    actor_id=actor_id,
                    version=listing.version,
                    payload=payload or {},
                )
            )
        except Exception:
            logger.warning("realtime_publish_failed", exc_info=True)
            return

    async def access(self, hid: UUID, user: User):
        access = await self.households.get_access(hid, user.id)
        if not access:
            raise ApiError(
                status_code=404, code="HOUSEHOLD_NOT_FOUND", message="Household not found."
            )
        return access

    async def require_list(self, hid, lid, lock=False):
        listing = await self.repo.get_list(hid, lid, lock)
        if not listing:
            raise ApiError(
                status_code=404, code="SHOPPING_LIST_NOT_FOUND", message="Shopping list not found."
            )
        if listing.archived_at:
            raise ApiError(
                status_code=409, code="SHOPPING_LIST_ARCHIVED", message="Shopping list is archived."
            )
        return listing

    async def create_list(self, hid, user, name):
        listing = ShoppingList(household_id=hid, created_by_user_id=user.id, name=name)
        self.repo.add_list(listing)
        await self.session.commit()
        return await self.repo.get_list(hid, listing.id)

    async def rename(self, hid, lid, name, actor_id):
        listing = await self.require_list(hid, lid, True)
        listing.name = name
        listing.version = ShoppingList.version + 1
        await self.session.commit()
        result = await self.repo.get_list(hid, lid)
        await self._publish("shopping_list.updated", result, actor_id)
        return result

    async def archive(self, hid, lid, actor_id):
        listing = await self.repo.get_list(hid, lid, True)
        if not listing:
            raise ApiError(
                status_code=404, code="SHOPPING_LIST_NOT_FOUND", message="Shopping list not found."
            )
        if await self.trips.active_for_list(hid, lid):
            raise ApiError(
                status_code=409,
                code="SHOPPING_LIST_HAS_ACTIVE_TRIP",
                message="Cancel the active trip first.",
            )
        changed = not listing.archived_at
        if changed:
            listing.archived_at = datetime.now(UTC)
            listing.status = ShoppingListStatus.ARCHIVED
            listing.version = ShoppingList.version + 1
        await self.session.commit()
        result = await self.repo.get_list(hid, lid)
        if changed:
            await self._publish("shopping_list.archived", result, actor_id)
        return result

    async def add_item(self, hid, lid, user, data):
        listing = await self.require_list(hid, lid, True)
        product = None
        if data.household_product_id:
            product = await self.products.get(hid, data.household_product_id)
            if not product:
                raise ApiError(
                    status_code=422,
                    code="SHOPPING_LIST_PRODUCT_INVALID",
                    message="Product not found in household.",
                )
            if product.archived_at:
                raise ApiError(
                    status_code=409,
                    code="SHOPPING_LIST_PRODUCT_ARCHIVED",
                    message="Archived products cannot be added.",
                )
            if any(item.household_product_id == product.id for item in listing.items):
                raise ApiError(
                    status_code=409,
                    code="SHOPPING_LIST_PRODUCT_ALREADY_PRESENT",
                    message="Product is already on this list.",
                )
            name, brand, variant, size_value, size_unit, category_id = (
                product.name,
                product.brand,
                product.variant,
                product.size_value,
                product.size_unit,
                product.category_id,
            )
        else:
            if not data.name or not data.name.strip():
                raise ApiError(
                    status_code=422,
                    code="SHOPPING_LIST_ITEM_NAME_REQUIRED",
                    message="Item name is required.",
                )
            name, brand, variant, size_value, size_unit, category_id = (
                data.name.strip(),
                data.brand,
                data.variant,
                data.size_value,
                data.size_unit,
                data.category_id,
            )
        position = max((item.position for item in listing.items), default=0) + 1
        item = ShoppingListItem(
            household_id=hid,
            shopping_list_id=lid,
            created_by_user_id=user.id,
            household_product_id=product.id if product else None,
            name_snapshot=name,
            brand_snapshot=brand,
            variant_snapshot=variant,
            size_value_snapshot=size_value,
            size_unit_snapshot=size_unit,
            requested_quantity=data.requested_quantity,
            category_id=category_id,
            notes=data.notes,
            position=position,
        )
        self.repo.add_item(item)
        await self.session.flush()
        active_trip = await self.trips.active_for_list(hid, lid)
        if active_trip:
            active_trip.version = ShoppingTrip.version + 1
            self.session.add(
                TripItem(
                    household_id=hid,
                    shopping_trip_id=active_trip.id,
                    shopping_list_item_id=item.id,
                    requested_name_snapshot=name,
                    requested_brand_snapshot=brand,
                    requested_variant_snapshot=variant,
                    requested_size_value_snapshot=size_value,
                    requested_size_unit_snapshot=size_unit,
                    requested_quantity=data.requested_quantity,
                    category_id=category_id,
                    notes=data.notes,
                )
            )
        listing.version = ShoppingList.version + 1
        await self.session.commit()
        result = await self.repo.get_list(hid, lid)
        await self._publish(
            "shopping_item.added",
            result,
            user.id,
            item.id,
            {
                "item": {
                    "id": str(item.id),
                    "name": item.name_snapshot,
                    "requested_quantity": str(item.requested_quantity),
                }
            },
        )
        if active_trip:
            try:
                await self.publisher.publish(
                    RealtimeEvent(
                        type="trip_item.added",
                        household_id=hid,
                        list_id=lid,
                        trip_id=active_trip.id,
                        resource_id=item.id,
                        actor_id=user.id,
                        version=active_trip.version,
                        payload={"name": item.name_snapshot},
                    )
                )
            except Exception:
                pass
        return result

    async def update_item(self, hid, lid, iid, data, actor_id):
        listing = await self.require_list(hid, lid, True)
        item = await self.repo.get_item(hid, lid, iid, True)
        if not item:
            raise ApiError(
                status_code=404, code="SHOPPING_LIST_ITEM_NOT_FOUND", message="List item not found."
            )
        for key, value in data.model_dump(exclude_unset=True).items():
            if key == "name":
                item.name_snapshot = value
            elif hasattr(item, key):
                setattr(item, key, value)
        active_trip = await self.trips.active_for_list(hid, lid)
        if active_trip:
            trip_item = next(
                (
                    x
                    for x in active_trip.items
                    if x.shopping_list_item_id == item.id and x.status is TripItemStatus.PENDING
                ),
                None,
            )
            if trip_item:
                trip_item.requested_quantity = item.requested_quantity
                trip_item.notes = item.notes
                active_trip.version = ShoppingTrip.version + 1
        listing.version = ShoppingList.version + 1
        await self.session.commit()
        result = await self.repo.get_list(hid, lid)
        await self._publish("shopping_item.updated", result, actor_id, iid)
        return result

    async def remove_item(self, hid, lid, iid, actor_id):
        listing = await self.require_list(hid, lid, True)
        item = await self.repo.get_item(hid, lid, iid, True)
        if not item:
            raise ApiError(
                status_code=404, code="SHOPPING_LIST_ITEM_NOT_FOUND", message="List item not found."
            )
        active_trip = await self.trips.active_for_list(hid, lid)
        if active_trip:
            trip_item = next(
                (
                    x
                    for x in active_trip.items
                    if x.shopping_list_item_id == iid and x.status is TripItemStatus.PENDING
                ),
                None,
            )
            if trip_item:
                await self.session.delete(trip_item)
                active_trip.version = ShoppingTrip.version + 1
            elif await self.trips.source_exists(iid):
                raise ApiError(
                    status_code=409,
                    code="SHOPPING_LIST_ITEM_HAS_TRIP_HISTORY",
                    message="Trip history prevents deleting this item.",
                )
        elif await self.trips.source_exists(iid):
            raise ApiError(
                status_code=409,
                code="SHOPPING_LIST_ITEM_HAS_TRIP_HISTORY",
                message="Trip history prevents deleting this item.",
            )
        await self.session.delete(item)
        listing.version = ShoppingList.version + 1
        await self.session.commit()
        result = await self.repo.get_list(hid, lid)
        await self._publish("shopping_item.removed", result, actor_id, iid, {"item_id": str(iid)})
        return result

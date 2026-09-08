# mypy: ignore-errors
from datetime import UTC, datetime
from uuid import UUID

from app.auth.models import User
from app.core.errors import ApiError
from app.households.repository import HouseholdRepository
from app.products.repository import ProductRepository

from .models import ShoppingList, ShoppingListItem, ShoppingListStatus
from .repository import ShoppingRepository


class ShoppingService:
    def __init__(self, session):
        self.session = session
        self.repo = ShoppingRepository(session)
        self.households = HouseholdRepository(session)
        self.products = ProductRepository(session)

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

    async def rename(self, hid, lid, name):
        listing = await self.require_list(hid, lid, True)
        listing.name = name
        listing.version = ShoppingList.version + 1
        await self.session.commit()
        return await self.repo.get_list(hid, lid)

    async def archive(self, hid, lid):
        listing = await self.repo.get_list(hid, lid, True)
        if not listing:
            raise ApiError(
                status_code=404, code="SHOPPING_LIST_NOT_FOUND", message="Shopping list not found."
            )
        if not listing.archived_at:
            listing.archived_at = datetime.now(UTC)
            listing.status = ShoppingListStatus.ARCHIVED
            listing.version = ShoppingList.version + 1
        await self.session.commit()
        return await self.repo.get_list(hid, lid)

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
        listing.version = ShoppingList.version + 1
        await self.session.commit()
        return await self.repo.get_list(hid, lid)

    async def update_item(self, hid, lid, iid, data):
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
        listing.version = ShoppingList.version + 1
        await self.session.commit()
        return await self.repo.get_list(hid, lid)

    async def remove_item(self, hid, lid, iid):
        listing = await self.require_list(hid, lid, True)
        item = await self.repo.get_item(hid, lid, iid, True)
        if not item:
            raise ApiError(
                status_code=404, code="SHOPPING_LIST_ITEM_NOT_FOUND", message="List item not found."
            )
        await self.session.delete(item)
        listing.version = ShoppingList.version + 1
        await self.session.commit()
        return await self.repo.get_list(hid, lid)

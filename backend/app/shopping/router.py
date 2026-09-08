# mypy: ignore-errors
from uuid import UUID

from fastapi import APIRouter, status

from app.auth.dependencies import CurrentUser
from app.households.dependencies import HouseholdAccessDependency

from .dependencies import ShoppingServiceDependency
from .schemas import (
    ItemCreate,
    ItemPatch,
    ItemResponse,
    ListCreate,
    ListDetail,
    ListPatch,
    ListSummary,
)

router = APIRouter(tags=["shopping-lists"])


def detail(x):
    return ListDetail(
        id=x.id,
        name=x.name,
        status=x.status,
        version=x.version,
        item_count=len(x.items),
        created_at=x.created_at,
        updated_at=x.updated_at,
        items=[
            ItemResponse(
                id=i.id,
                household_product_id=i.household_product_id,
                name=i.name_snapshot,
                brand=i.brand_snapshot,
                variant=i.variant_snapshot,
                size_value=i.size_value_snapshot,
                size_unit=i.size_unit_snapshot,
                requested_quantity=i.requested_quantity,
                category=i.category,
                notes=i.notes,
                position=i.position,
            )
            for i in x.items
        ],
    )


@router.get("/households/{household_id}/shopping-lists", response_model=list[ListSummary])
async def list_lists(
    household_id: UUID,
    access: HouseholdAccessDependency,
    service: ShoppingServiceDependency,
    archived: bool = False,
):
    return [
        ListSummary(
            id=x.id,
            name=x.name,
            status=x.status,
            version=x.version,
            item_count=count,
            created_at=x.created_at,
            updated_at=x.updated_at,
        )
        for x, count in await service.repo.lists(household_id, archived)
    ]


@router.post(
    "/households/{household_id}/shopping-lists",
    response_model=ListDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_list(
    household_id: UUID,
    payload: ListCreate,
    user: CurrentUser,
    access: HouseholdAccessDependency,
    service: ShoppingServiceDependency,
):
    return detail(await service.create_list(household_id, user, payload.name))


@router.get("/households/{household_id}/shopping-lists/{list_id}", response_model=ListDetail)
async def get_list(
    list_id: UUID, access: HouseholdAccessDependency, service: ShoppingServiceDependency
):
    return detail(await service.repo.get_list(access.household.id, list_id))


@router.patch("/households/{household_id}/shopping-lists/{list_id}", response_model=ListDetail)
async def rename_list(
    list_id: UUID,
    payload: ListPatch,
    access: HouseholdAccessDependency,
    service: ShoppingServiceDependency,
):
    return detail(await service.rename(access.household.id, list_id, payload.name))


@router.delete("/households/{household_id}/shopping-lists/{list_id}", response_model=ListDetail)
async def archive_list(
    list_id: UUID, access: HouseholdAccessDependency, service: ShoppingServiceDependency
):
    return detail(await service.archive(access.household.id, list_id))


@router.post(
    "/households/{household_id}/shopping-lists/{list_id}/items",
    response_model=ListDetail,
    status_code=201,
)
async def add_item(
    list_id: UUID,
    payload: ItemCreate,
    user: CurrentUser,
    access: HouseholdAccessDependency,
    service: ShoppingServiceDependency,
):
    return detail(await service.add_item(access.household.id, list_id, user, payload))


@router.patch(
    "/households/{household_id}/shopping-lists/{list_id}/items/{item_id}", response_model=ListDetail
)
async def update_item(
    list_id: UUID,
    item_id: UUID,
    payload: ItemPatch,
    access: HouseholdAccessDependency,
    service: ShoppingServiceDependency,
):
    return detail(await service.update_item(access.household.id, list_id, item_id, payload))


@router.delete(
    "/households/{household_id}/shopping-lists/{list_id}/items/{item_id}", response_model=ListDetail
)
async def remove_item(
    list_id: UUID,
    item_id: UUID,
    access: HouseholdAccessDependency,
    service: ShoppingServiceDependency,
):
    return detail(await service.remove_item(access.household.id, list_id, item_id))

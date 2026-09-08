# mypy: ignore-errors
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.auth.dependencies import CurrentUser
from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.households.dependencies import HouseholdAccessDependency

from .dependencies import ProductServiceDependency
from .models import HouseholdProduct
from .schemas import CategoryResponse, ProductPatch, ProductResponse, ProductWrite, SubstituteList

router = APIRouter(tags=["products"])


def response(product: HouseholdProduct, service) -> ProductResponse:
    return ProductResponse.model_validate(
        {
            "id": product.id,
            "household_id": product.household_id,
            "name": product.name,
            "brand": product.brand,
            "variant": product.variant,
            "size_value": product.size_value,
            "size_unit": product.size_unit,
            "usual_quantity": product.usual_quantity,
            "notes": product.notes,
            "image_url": service.storage.url_for(product.primary_image_key),
            "archived_at": product.archived_at,
            "created_at": product.created_at,
            "updated_at": product.updated_at,
            "category": product.category,
            "preferred_substitutes": product.substitutes,
        }
    )


@router.get("/product-categories", response_model=list[CategoryResponse])
async def categories(service: ProductServiceDependency):
    return await service.repo.categories()


@router.get("/households/{household_id}/products", response_model=list[ProductResponse])
async def list_products(
    household_id: UUID,
    access: HouseholdAccessDependency,
    service: ProductServiceDependency,
    query: str | None = Query(default=None, max_length=100),
    category: UUID | None = None,
    archived: bool = False,
):
    return [
        response(p, service)
        for p in await service.repo.list_products(household_id, query, category, archived)
    ]


@router.post(
    "/households/{household_id}/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_product(
    household_id: UUID,
    payload: ProductWrite,
    user: CurrentUser,
    service: ProductServiceDependency,
    access: HouseholdAccessDependency,
):
    return response(await service.create(household_id, user, payload), service)


@router.get("/households/{household_id}/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID, access: HouseholdAccessDependency, service: ProductServiceDependency
):
    product = await service.repo.get(access.household.id, product_id)
    if not product:
        raise ApiError(status_code=404, code="PRODUCT_NOT_FOUND", message="Product not found.")
    return response(product, service)


@router.patch("/households/{household_id}/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    payload: ProductPatch,
    user: CurrentUser,
    access: HouseholdAccessDependency,
    service: ProductServiceDependency,
):
    return response(await service.update(access.household.id, product_id, payload), service)


@router.delete("/households/{household_id}/products/{product_id}", response_model=ProductResponse)
async def archive_product(
    product_id: UUID, access: HouseholdAccessDependency, service: ProductServiceDependency
):
    return response(await service.archive(access.household.id, product_id), service)


@router.put(
    "/households/{household_id}/products/{product_id}/substitutes", response_model=ProductResponse
)
async def substitutes(
    product_id: UUID,
    payload: SubstituteList,
    user: CurrentUser,
    access: HouseholdAccessDependency,
    service: ProductServiceDependency,
):
    return response(
        await service.substitutes(access.household.id, product_id, user, payload.substitutes),
        service,
    )


@router.post(
    "/households/{household_id}/products/{product_id}/image", response_model=ProductResponse
)
async def image(
    product_id: UUID,
    file: Annotated[UploadFile, File()],
    user: CurrentUser,
    access: HouseholdAccessDependency,
    service: ProductServiceDependency,
    settings: Annotated[Settings, Depends(get_settings)],
):
    product = await service.repo.get(access.household.id, product_id)
    if not product:
        raise ApiError(status_code=404, code="PRODUCT_NOT_FOUND", message="Product not found.")
    key = f"households/{access.household.id}/products/{product.id}/{uuid4().hex}"
    await service.storage.save(key, file)
    old = product.primary_image_key
    product.primary_image_key = key
    await service.session.commit()
    await service.storage.delete(old)
    return response(product, service)

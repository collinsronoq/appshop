# mypy: ignore-errors
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from fastapi import UploadFile

from app.auth.models import User
from app.core.config import Settings
from app.core.errors import ApiError
from app.households.repository import HouseholdAccess, HouseholdRepository

from .models import HouseholdProduct, ProductSubstitute
from .repository import ProductRepository


class LocalObjectStorage:
    def __init__(self, settings: Settings):
        self.root = Path(settings.LOCAL_STORAGE_ROOT).resolve()

    async def save(self, key: str, upload: UploadFile, max_bytes: int = 5 * 1024 * 1024) -> None:
        if upload.content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise ApiError(
                status_code=415,
                code="PRODUCT_IMAGE_INVALID_TYPE",
                message="Unsupported image type.",
            )
        data = await upload.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise ApiError(
                status_code=413, code="PRODUCT_IMAGE_TOO_LARGE", message="Image is too large."
            )
        target = (self.root / key).resolve()
        if self.root not in target.parents:
            raise ApiError(
                status_code=400, code="PRODUCT_IMAGE_INVALID_TYPE", message="Invalid image key."
            )
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)

    async def delete(self, key: str | None) -> None:
        if key:
            target = (self.root / key).resolve()
            if self.root in target.parents and target.exists():
                target.unlink()

    def url_for(self, key: str | None) -> str | None:
        return f"/api/v1/product-images/{key}" if key else None


class ProductService:
    def __init__(self, session, settings: Settings):
        self.repo = ProductRepository(session)
        self.households = HouseholdRepository(session)
        self.session = session
        self.storage = LocalObjectStorage(settings)

    async def access(self, household_id: UUID, user: User) -> HouseholdAccess:
        access = await self.households.get_access(household_id, user.id)
        if not access:
            raise ApiError(
                status_code=404, code="HOUSEHOLD_NOT_FOUND", message="Household not found."
            )
        return access

    async def create(self, household_id, user, data):
        if data.category_id and not await self.repo.category(data.category_id):
            raise ApiError(
                status_code=422, code="PRODUCT_CATEGORY_NOT_FOUND", message="Category not found."
            )
        product = HouseholdProduct(
            household_id=household_id, created_by_user_id=user.id, **data.model_dump()
        )
        self.repo.add(product)
        await self.session.commit()
        return await self.repo.get(household_id, product.id)

    async def update(self, household_id, product_id, data):
        product = await self.repo.get(household_id, product_id)
        if not product:
            raise ApiError(status_code=404, code="PRODUCT_NOT_FOUND", message="Product not found.")
        if data.category_id and not await self.repo.category(data.category_id):
            raise ApiError(
                status_code=422, code="PRODUCT_CATEGORY_NOT_FOUND", message="Category not found."
            )
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(product, key, value)
        await self.session.commit()
        return await self.repo.get(household_id, product_id)

    async def archive(self, household_id, product_id):
        product = await self.repo.get(household_id, product_id)
        if not product:
            raise ApiError(status_code=404, code="PRODUCT_NOT_FOUND", message="Product not found.")
        product.archived_at = product.archived_at or datetime.now(UTC)
        await self.session.commit()
        return product

    async def substitutes(self, household_id, product_id, user, entries):
        await self.access(household_id, user)
        product = await self.repo.get(household_id, product_id)
        if not product:
            raise ApiError(status_code=404, code="PRODUCT_NOT_FOUND", message="Product not found.")
        ids = [x.substitute_product_id for x in entries if x.substitute_product_id]
        targets = {p.id for p in await self.repo.list_products(household_id, None, None, True)}
        if any(x == product_id for x in ids):
            raise ApiError(
                status_code=422,
                code="PRODUCT_SUBSTITUTE_SELF_REFERENCE",
                message="A product cannot substitute itself.",
            )
        if any(x not in targets for x in ids):
            raise ApiError(
                status_code=422,
                code="PRODUCT_SUBSTITUTE_INVALID",
                message="Substitute must belong to this household.",
            )
        if len(ids) != len(set(ids)):
            raise ApiError(
                status_code=409, code="PRODUCT_SUBSTITUTE_INVALID", message="Duplicate substitute."
            )
        text_targets = [x.substitute_name.strip().lower() for x in entries if x.substitute_name]
        if len(text_targets) != len(set(text_targets)):
            raise ApiError(
                status_code=409, code="PRODUCT_SUBSTITUTE_INVALID", message="Duplicate substitute."
            )
        await self.repo.replace_substitutes(
            product,
            [
                ProductSubstitute(
                    household_id=household_id, product_id=product_id, **x.model_dump()
                )
                for x in entries
            ],
        )
        await self.session.commit()
        return await self.repo.get(household_id, product_id)

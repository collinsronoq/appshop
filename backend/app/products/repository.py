# mypy: ignore-errors
from uuid import UUID

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import HouseholdProduct, ProductCategory, ProductSubstitute


class ProductRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def categories(self):
        return list(
            (
                await self.session.scalars(
                    select(ProductCategory).order_by(ProductCategory.sort_order)
                )
            ).all()
        )

    async def category(self, category_id: UUID):
        return await self.session.get(ProductCategory, category_id)

    async def list_products(
        self, household_id: UUID, query: str | None, category_id: UUID | None, archived: bool
    ):
        stmt = (
            select(HouseholdProduct)
            .options(
                selectinload(HouseholdProduct.category), selectinload(HouseholdProduct.substitutes)
            )
            .where(HouseholdProduct.household_id == household_id)
        )
        if not archived:
            stmt = stmt.where(HouseholdProduct.archived_at.is_(None))
        if category_id:
            stmt = stmt.where(HouseholdProduct.category_id == category_id)
        if query:
            term = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    HouseholdProduct.name.ilike(term),
                    HouseholdProduct.brand.ilike(term),
                    HouseholdProduct.variant.ilike(term),
                )
            )
        return list(
            (
                await self.session.scalars(
                    stmt.order_by(
                        HouseholdProduct.name.asc(),
                        HouseholdProduct.created_at.asc(),
                        HouseholdProduct.id.asc(),
                    )
                )
            )
            .unique()
            .all()
        )

    async def get(self, household_id: UUID, product_id: UUID):
        return await self.session.scalar(
            select(HouseholdProduct)
            .options(
                selectinload(HouseholdProduct.category), selectinload(HouseholdProduct.substitutes)
            )
            .where(HouseholdProduct.household_id == household_id, HouseholdProduct.id == product_id)
        )

    def add(self, product):
        self.session.add(product)

    async def replace_substitutes(
        self, product: HouseholdProduct, substitutes: list[ProductSubstitute]
    ):
        await self.session.execute(
            select(ProductSubstitute)
            .where(ProductSubstitute.product_id == product.id)
            .with_for_update()
        )
        await self.session.execute(
            delete(ProductSubstitute).where(ProductSubstitute.product_id == product.id)
        )
        self.session.add_all(substitutes)

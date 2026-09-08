# mypy: ignore-errors
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import ShoppingList, ShoppingListItem


class ShoppingRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def lists(self, household_id: UUID, include_archived: bool):
        counts = (
            select(
                ShoppingListItem.shopping_list_id, func.count(ShoppingListItem.id).label("count")
            )
            .group_by(ShoppingListItem.shopping_list_id)
            .subquery()
        )
        stmt = (
            select(ShoppingList, func.coalesce(counts.c.count, 0))
            .outerjoin(counts, counts.c.shopping_list_id == ShoppingList.id)
            .where(ShoppingList.household_id == household_id)
        )
        if not include_archived:
            stmt = stmt.where(ShoppingList.archived_at.is_(None))
        return [
            (x[0], int(x[1]))
            for x in (
                await self.session.execute(
                    stmt.order_by(ShoppingList.updated_at.desc(), ShoppingList.id)
                )
            ).all()
        ]

    async def get_list(self, hid: UUID, lid: UUID, lock=False):
        stmt = (
            select(ShoppingList)
            .options(selectinload(ShoppingList.items).selectinload(ShoppingListItem.category))
            .where(ShoppingList.household_id == hid, ShoppingList.id == lid)
            .execution_options(populate_existing=True)
        )
        if lock:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def get_item(self, hid: UUID, lid: UUID, iid: UUID, lock=False):
        stmt = (
            select(ShoppingListItem)
            .options(selectinload(ShoppingListItem.category))
            .where(
                ShoppingListItem.household_id == hid,
                ShoppingListItem.shopping_list_id == lid,
                ShoppingListItem.id == iid,
            )
        )
        if lock:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    def add_list(self, x):
        self.session.add(x)

    def add_item(self, x):
        self.session.add(x)

# mypy: ignore-errors
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import ShoppingTrip, TripItem


class TripRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, hid: UUID, tid: UUID, lock=False):
        stmt = (
            select(ShoppingTrip)
            .options(selectinload(ShoppingTrip.items).selectinload(TripItem.category))
            .where(ShoppingTrip.household_id == hid, ShoppingTrip.id == tid)
        )
        if lock:
            stmt = stmt.with_for_update()
        return await self.session.scalar(stmt)

    async def active_for_list(self, hid: UUID, lid: UUID):
        return await self.session.scalar(
            select(ShoppingTrip)
            .options(selectinload(ShoppingTrip.items))
            .where(
                ShoppingTrip.household_id == hid,
                ShoppingTrip.shopping_list_id == lid,
                ShoppingTrip.status == "active",
            )
        )

    async def source_exists(self, item_id: UUID) -> bool:
        return bool(
            await self.session.scalar(
                select(TripItem.id).where(TripItem.shopping_list_item_id == item_id).limit(1)
            )
        )

from dataclasses import dataclass
from typing import cast
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth.models import User
from app.households.models import (
    Household,
    HouseholdInvitation,
    HouseholdMembership,
    InvitationStatus,
    MembershipRole,
)


@dataclass(frozen=True, slots=True)
class HouseholdAccess:
    household: Household
    membership: HouseholdMembership


class HouseholdRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_access(self, household_id: UUID, user_id: UUID) -> HouseholdAccess | None:
        result = await self.session.execute(
            select(Household, HouseholdMembership)
            .join(HouseholdMembership, HouseholdMembership.household_id == Household.id)
            .where(
                Household.id == household_id,
                HouseholdMembership.user_id == user_id,
            )
        )
        row = result.one_or_none()
        return HouseholdAccess(household=row[0], membership=row[1]) if row else None

    async def list_for_user(self, user_id: UUID) -> list[tuple[Household, MembershipRole, int]]:
        count_subquery = (
            select(
                HouseholdMembership.household_id,
                func.count(HouseholdMembership.id).label("member_count"),
            )
            .group_by(HouseholdMembership.household_id)
            .subquery()
        )
        result = await self.session.execute(
            select(
                Household,
                HouseholdMembership.role,
                func.coalesce(count_subquery.c.member_count, 0),
            )
            .join(HouseholdMembership, HouseholdMembership.household_id == Household.id)
            .outerjoin(count_subquery, count_subquery.c.household_id == Household.id)
            .where(HouseholdMembership.user_id == user_id)
            .order_by(Household.created_at.asc(), Household.id.asc())
        )
        return [(row[0], row[1], int(row[2])) for row in result.all()]

    async def list_members(self, household_id: UUID) -> list[HouseholdMembership]:
        result = await self.session.execute(
            select(HouseholdMembership)
            .options(joinedload(HouseholdMembership.user))
            .where(HouseholdMembership.household_id == household_id)
            .order_by(HouseholdMembership.created_at.asc(), HouseholdMembership.id.asc())
        )
        return list(result.scalars().unique().all())

    async def get_membership(
        self, household_id: UUID, user_id: UUID, *, for_update: bool = False
    ) -> HouseholdMembership | None:
        statement = select(HouseholdMembership).where(
            HouseholdMembership.household_id == household_id,
            HouseholdMembership.user_id == user_id,
        )
        if for_update:
            statement = statement.with_for_update()
        return cast(HouseholdMembership | None, await self.session.scalar(statement))

    async def get_member_by_email(
        self, household_id: UUID, email: str, *, for_update: bool = False
    ) -> HouseholdMembership | None:
        statement = (
            select(HouseholdMembership)
            .join(User, User.id == HouseholdMembership.user_id)
            .where(
                HouseholdMembership.household_id == household_id,
                User.email == email,
            )
        )
        if for_update:
            statement = statement.with_for_update()
        return cast(HouseholdMembership | None, await self.session.scalar(statement))

    async def get_invitation_by_hash(
        self, token_hash: str, *, for_update: bool = False
    ) -> HouseholdInvitation | None:
        statement = select(HouseholdInvitation).where(
            HouseholdInvitation.token_hash == token_hash
        )
        if for_update:
            statement = statement.with_for_update()
        return cast(HouseholdInvitation | None, await self.session.scalar(statement))

    async def get_pending_invitation(
        self, household_id: UUID, email: str, *, for_update: bool = False
    ) -> HouseholdInvitation | None:
        statement = select(HouseholdInvitation).where(
            HouseholdInvitation.household_id == household_id,
            HouseholdInvitation.invited_email == email,
            HouseholdInvitation.status == InvitationStatus.PENDING,
        )
        if for_update:
            statement = statement.with_for_update()
        return cast(HouseholdInvitation | None, await self.session.scalar(statement))

    def add_household(self, household: Household) -> None:
        self.session.add(household)

    def add_membership(self, membership: HouseholdMembership) -> None:
        self.session.add(membership)

    def add_invitation(self, invitation: HouseholdInvitation) -> None:
        self.session.add(invitation)

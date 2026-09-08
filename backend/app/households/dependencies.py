from typing import Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.core.config import Settings, get_settings
from app.core.database import get_db_session
from app.core.errors import ApiError
from app.households.models import MembershipRole
from app.households.repository import HouseholdAccess, HouseholdRepository
from app.households.service import HouseholdService


def get_household_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> HouseholdService:
    return HouseholdService(session, settings)


async def get_household_access(
    household_id: UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> HouseholdAccess:
    access = await HouseholdRepository(session).get_access(household_id, user.id)
    if access is None:
        raise ApiError(
            status_code=404,
            code="HOUSEHOLD_NOT_FOUND",
            message="Household not found.",
        )
    return access


async def get_household_owner_access(
    access: Annotated[HouseholdAccess, Depends(get_household_access)],
) -> HouseholdAccess:
    if access.membership.role is not MembershipRole.OWNER:
        raise ApiError(
            status_code=403,
            code="HOUSEHOLD_OWNER_REQUIRED",
            message="Household owner access is required.",
        )
    return access


HouseholdAccessDependency = Annotated[HouseholdAccess, Depends(get_household_access)]
HouseholdOwnerAccessDependency = Annotated[
    HouseholdAccess, Depends(get_household_owner_access)
]
HouseholdServiceDependency = Annotated[HouseholdService, Depends(get_household_service)]


from fastapi import APIRouter, Header, status

from app.auth.dependencies import CurrentUser
from app.households.dependencies import (
    HouseholdAccessDependency,
    HouseholdOwnerAccessDependency,
    HouseholdServiceDependency,
)
from app.households.repository import HouseholdAccess
from app.households.schemas import (
    HouseholdCreateRequest,
    HouseholdDetail,
    HouseholdMemberResponse,
    HouseholdRenameRequest,
    HouseholdSummary,
    InvitationAcceptanceResponse,
    InvitationCreateRequest,
    InvitationResponse,
)

router = APIRouter(tags=["households"])


def household_detail(access: HouseholdAccess) -> HouseholdDetail:
    return HouseholdDetail(
        id=access.household.id,
        name=access.household.name,
        current_user_role=access.membership.role,
        created_at=access.household.created_at,
        updated_at=access.household.updated_at,
    )


@router.post(
    "/households",
    response_model=HouseholdDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_household(
    payload: HouseholdCreateRequest,
    user: CurrentUser,
    service: HouseholdServiceDependency,
) -> HouseholdDetail:
    return household_detail(await service.create_household(user=user, name=payload.name))


@router.get("/households", response_model=list[HouseholdSummary])
async def list_households(
    user: CurrentUser,
    service: HouseholdServiceDependency,
) -> list[HouseholdSummary]:
    rows = await service.households.list_for_user(user.id)
    return [
        HouseholdSummary(
            id=household.id,
            name=household.name,
            role=role,
            member_count=count,
            created_at=household.created_at,
        )
        for household, role, count in rows
    ]


@router.get("/households/{household_id}", response_model=HouseholdDetail)
async def get_household(access: HouseholdAccessDependency) -> HouseholdDetail:
    return household_detail(access)


@router.patch("/households/{household_id}", response_model=HouseholdDetail)
async def rename_household(
    payload: HouseholdRenameRequest,
    access: HouseholdOwnerAccessDependency,
    service: HouseholdServiceDependency,
) -> HouseholdDetail:
    return household_detail(await service.rename_household(access, payload.name))


@router.get(
    "/households/{household_id}/members",
    response_model=list[HouseholdMemberResponse],
)
async def list_members(
    access: HouseholdAccessDependency,
    service: HouseholdServiceDependency,
) -> list[HouseholdMemberResponse]:
    memberships = await service.households.list_members(access.household.id)
    return [
        HouseholdMemberResponse(
            user_id=membership.user.id,
            display_name=membership.user.display_name,
            email=membership.user.email,
            role=membership.role,
            joined_at=membership.created_at,
        )
        for membership in memberships
    ]


@router.post(
    "/households/{household_id}/invitations",
    response_model=InvitationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_invitation(
    payload: InvitationCreateRequest,
    access: HouseholdOwnerAccessDependency,
    service: HouseholdServiceDependency,
    user_agent: str | None = Header(default=None),
) -> InvitationResponse:
    created = await service.create_invitation(
        access, email=str(payload.email), user_agent=user_agent
    )
    return InvitationResponse(
        id=created.invitation.id,
        invited_email=created.invitation.invited_email,
        status=created.invitation.status,
        expires_at=created.invitation.expires_at,
        invite_token=created.raw_token,
        created_at=created.invitation.created_at,
    )


@router.post(
    "/invitations/{token}/accept",
    response_model=InvitationAcceptanceResponse,
)
async def accept_invitation(
    token: str,
    user: CurrentUser,
    service: HouseholdServiceDependency,
) -> InvitationAcceptanceResponse:
    access = await service.accept_invitation(user=user, raw_token=token)
    return InvitationAcceptanceResponse(**household_detail(access).model_dump())

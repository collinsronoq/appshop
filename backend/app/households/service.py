from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.auth.repository import UserRepository
from app.core.config import Settings
from app.core.errors import ApiError
from app.core.security import generate_refresh_token, hash_refresh_token
from app.households.models import (
    Household,
    HouseholdInvitation,
    HouseholdMembership,
    InvitationStatus,
    MembershipRole,
)
from app.households.repository import HouseholdAccess, HouseholdRepository


def normalize_email(email: str) -> str:
    return email.strip().lower()


@dataclass(frozen=True, slots=True)
class CreatedInvitation:
    invitation: HouseholdInvitation
    raw_token: str


class HouseholdService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.households = HouseholdRepository(session)
        self.users = UserRepository(session)

    async def create_household(self, *, user: User, name: str) -> HouseholdAccess:
        household = Household(name=name.strip(), created_by_user_id=user.id)
        membership = HouseholdMembership(
            household=household,
            user_id=user.id,
            role=MembershipRole.OWNER,
        )
        self.households.add_household(household)
        self.households.add_membership(membership)
        await self.session.commit()
        return HouseholdAccess(household=household, membership=membership)

    async def rename_household(self, access: HouseholdAccess, name: str) -> HouseholdAccess:
        access.household.name = name.strip()
        await self.session.commit()
        return access

    async def create_invitation(
        self, access: HouseholdAccess, *, email: str, user_agent: str | None = None
    ) -> CreatedInvitation:
        normalized_email = normalize_email(email)
        if await self.households.get_member_by_email(access.household.id, normalized_email):
            raise ApiError(
                status_code=409,
                code="HOUSEHOLD_ALREADY_MEMBER",
                message="This user is already a household member.",
            )

        now = datetime.now(UTC)
        pending = await self.households.get_pending_invitation(
            access.household.id, normalized_email, for_update=True
        )
        if pending is not None:
            if pending.expires_at > now:
                raise ApiError(
                    status_code=409,
                    code="HOUSEHOLD_INVITATION_ALREADY_PENDING",
                    message="An invitation for this email is already pending.",
                )
            pending.status = InvitationStatus.EXPIRED

        raw_token = generate_refresh_token()
        invitation = HouseholdInvitation(
            household_id=access.household.id,
            invited_email=normalized_email,
            token_hash=hash_refresh_token(raw_token),
            status=InvitationStatus.PENDING,
            expires_at=now + timedelta(days=self.settings.HOUSEHOLD_INVITE_TTL_DAYS),
            invited_by_user_id=access.membership.user_id,
        )
        self.households.add_invitation(invitation)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise ApiError(
                status_code=409,
                code="HOUSEHOLD_INVITATION_ALREADY_PENDING",
                message="An invitation for this email is already pending.",
            ) from exc
        return CreatedInvitation(invitation=invitation, raw_token=raw_token)

    async def accept_invitation(self, *, user: User, raw_token: str) -> HouseholdAccess:
        invitation = await self.households.get_invitation_by_hash(
            hash_refresh_token(raw_token), for_update=True
        )
        if invitation is None:
            raise ApiError(
                status_code=404,
                code="INVITATION_INVALID",
                message="This invitation is invalid.",
            )

        now = datetime.now(UTC)
        if invitation.status is InvitationStatus.REVOKED:
            raise ApiError(
                status_code=410,
                code="INVITATION_REVOKED",
                message="This invitation has been revoked.",
            )
        if invitation.status is InvitationStatus.ACCEPTED:
            if invitation.accepted_by_user_id == user.id:
                access = await self.households.get_access(invitation.household_id, user.id)
                if access is not None:
                    return access
            raise ApiError(
                status_code=409,
                code="INVITATION_ALREADY_ACCEPTED",
                message="This invitation has already been accepted.",
            )
        if invitation.expires_at <= now:
            invitation.status = InvitationStatus.EXPIRED
            await self.session.commit()
            raise ApiError(
                status_code=410,
                code="INVITATION_EXPIRED",
                message="This invitation has expired.",
            )
        if normalize_email(user.email) != invitation.invited_email:
            raise ApiError(
                status_code=403,
                code="INVITATION_EMAIL_MISMATCH",
                message="This invitation belongs to a different email address.",
            )

        existing_membership = await self.households.get_membership(
            invitation.household_id, user.id, for_update=True
        )
        if existing_membership is not None:
            if invitation.accepted_by_user_id == user.id:
                access = await self.households.get_access(invitation.household_id, user.id)
                if access is not None:
                    return access
            raise ApiError(
                status_code=409,
                code="HOUSEHOLD_ALREADY_MEMBER",
                message="You are already a member of this household.",
            )

        membership = HouseholdMembership(
            household_id=invitation.household_id,
            user_id=user.id,
            role=MembershipRole.MEMBER,
        )
        self.households.add_membership(membership)
        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_by_user_id = user.id
        invitation.accepted_at = now
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            access = await self.households.get_access(invitation.household_id, user.id)
            if access is not None:
                return access
            raise ApiError(
                status_code=409,
                code="HOUSEHOLD_ALREADY_MEMBER",
                message="You are already a member of this household.",
            ) from exc
        access = await self.households.get_access(invitation.household_id, user.id)
        if access is None:
            raise ApiError(
                status_code=404,
                code="HOUSEHOLD_NOT_FOUND",
                message="Household not found.",
            )
        return access

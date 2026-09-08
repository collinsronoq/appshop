from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.households.models import InvitationStatus, MembershipRole


class HouseholdCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Household name must not be blank.")
        return normalized


class HouseholdRenameRequest(HouseholdCreateRequest):
    pass


class InvitationCreateRequest(BaseModel):
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class HouseholdSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    role: MembershipRole
    member_count: int
    created_at: datetime


class HouseholdDetail(BaseModel):
    id: UUID
    name: str
    current_user_role: MembershipRole
    created_at: datetime
    updated_at: datetime


class HouseholdMemberResponse(BaseModel):
    user_id: UUID
    display_name: str
    email: str
    role: MembershipRole
    joined_at: datetime


class InvitationResponse(BaseModel):
    id: UUID
    invited_email: str
    status: InvitationStatus
    expires_at: datetime
    invite_token: str
    created_at: datetime


class InvitationAcceptanceResponse(HouseholdDetail):
    pass

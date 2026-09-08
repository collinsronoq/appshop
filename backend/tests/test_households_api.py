from datetime import UTC, datetime, timedelta
from uuid import UUID

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.security import hash_refresh_token
from app.households.models import (
    HouseholdInvitation,
    HouseholdMembership,
    InvitationStatus,
    MembershipRole,
)

pytestmark = pytest.mark.postgres

PASSWORD = "correct horse battery staple"


async def register(
    client: httpx.AsyncClient, email: str, display_name: str = "Household User"
) -> dict[str, object]:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "display_name": display_name},
    )
    assert response.status_code == 201, response.text
    return response.json()


def auth(user: dict[str, object]) -> dict[str, str]:
    return {"Authorization": f"Bearer {user['access_token']}"}


async def create_household(
    client: httpx.AsyncClient, user: dict[str, object], name: str
) -> dict[str, object]:
    response = await client.post("/api/v1/households", headers=auth(user), json={"name": name})
    assert response.status_code == 201, response.text
    return response.json()


async def test_household_creation_creates_owner_membership_atomically(
    api_client: httpx.AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user = await register(api_client, "owner@example.com", "Owner")
    household = await create_household(api_client, user, "  Rono Household  ")

    assert household["name"] == "Rono Household"
    assert household["current_user_role"] == "owner"
    async with session_factory() as session:
        membership = await session.scalar(
            select(HouseholdMembership).where(
                HouseholdMembership.household_id == UUID(str(household["id"])),
                HouseholdMembership.user_id == UUID(str(user["user"]["id"])),  # type: ignore[index]
            )
        )
        assert membership is not None
        assert membership.role is MembershipRole.OWNER


async def test_list_detail_rename_and_members_authorization(
    api_client: httpx.AsyncClient,
) -> None:
    owner = await register(api_client, "owner@example.com", "Owner")
    household = await create_household(api_client, owner, "Home")
    household_id = household["id"]

    listed = await api_client.get("/api/v1/households", headers=auth(owner))
    detail = await api_client.get(f"/api/v1/households/{household_id}", headers=auth(owner))
    members = await api_client.get(
        f"/api/v1/households/{household_id}/members", headers=auth(owner)
    )
    renamed = await api_client.patch(
        f"/api/v1/households/{household_id}",
        headers=auth(owner),
        json={"name": "  Family Home "},
    )

    assert (
        listed.status_code
        == detail.status_code
        == members.status_code
        == renamed.status_code
        == 200
    )
    assert listed.json()[0]["member_count"] == 1
    assert detail.json()["current_user_role"] == "owner"
    assert members.json() == [
        {
            "user_id": owner["user"]["id"],  # type: ignore[index]
            "display_name": "Owner",
            "email": "owner@example.com",
            "role": "owner",
            "joined_at": members.json()[0]["joined_at"],
        }
    ]
    assert renamed.json()["name"] == "Family Home"


async def test_isolation_denies_non_members_without_leaking_existence(
    api_client: httpx.AsyncClient,
) -> None:
    user_a = await register(api_client, "a@example.com", "A")
    user_b = await register(api_client, "b@example.com", "B")
    household_a = await create_household(api_client, user_a, "A Home")
    household_b = await create_household(api_client, user_b, "B Home")
    household_id = household_b["id"]

    read = await api_client.get(f"/api/v1/households/{household_id}", headers=auth(user_a))
    rename = await api_client.patch(
        f"/api/v1/households/{household_id}", headers=auth(user_a), json={"name": "Stolen"}
    )
    members = await api_client.get(
        f"/api/v1/households/{household_id}/members", headers=auth(user_a)
    )
    invite = await api_client.post(
        f"/api/v1/households/{household_id}/invitations",
        headers=auth(user_a),
        json={"email": "someone@example.com"},
    )
    own_list = await api_client.get("/api/v1/households", headers=auth(user_a))

    assert {read.status_code, rename.status_code, members.status_code, invite.status_code} == {404}
    assert own_list.json()[0]["id"] == household_a["id"]
    assert all(item["id"] != household_b["id"] for item in own_list.json())


async def test_member_can_read_but_cannot_rename_or_invite(
    api_client: httpx.AsyncClient,
) -> None:
    owner = await register(api_client, "owner@example.com", "Owner")
    member = await register(api_client, "member@example.com", "Member")
    household = await create_household(api_client, owner, "Home")
    invitation = await api_client.post(
        f"/api/v1/households/{household['id']}/invitations",
        headers=auth(owner),
        json={"email": "member@example.com"},
    )
    accepted = await api_client.post(
        f"/api/v1/invitations/{invitation.json()['invite_token']}/accept",
        headers=auth(member),
    )

    read = await api_client.get(f"/api/v1/households/{household['id']}", headers=auth(member))
    rename = await api_client.patch(
        f"/api/v1/households/{household['id']}",
        headers=auth(member),
        json={"name": "Nope"},
    )
    invite_again = await api_client.post(
        f"/api/v1/households/{household['id']}/invitations",
        headers=auth(member),
        json={"email": "other@example.com"},
    )
    members = await api_client.get(
        f"/api/v1/households/{household['id']}/members", headers=auth(member)
    )

    assert accepted.status_code == 200
    assert accepted.json()["current_user_role"] == "member"
    assert read.status_code == members.status_code == 200
    assert rename.status_code == invite_again.status_code == 403
    assert rename.json()["error"]["code"] == "HOUSEHOLD_OWNER_REQUIRED"


async def test_invitation_is_hashed_email_bound_and_idempotently_accepted(
    api_client: httpx.AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    owner = await register(api_client, "owner@example.com", "Owner")
    member = await register(api_client, "member@example.com", "Member")
    other = await register(api_client, "other@example.com", "Other")
    household = await create_household(api_client, owner, "Home")

    invitation = await api_client.post(
        f"/api/v1/households/{household['id']}/invitations",
        headers=auth(owner),
        json={"email": " MEMBER@example.com "},
    )
    duplicate = await api_client.post(
        f"/api/v1/households/{household['id']}/invitations",
        headers=auth(owner),
        json={"email": "member@example.com"},
    )
    token = invitation.json()["invite_token"]

    async with session_factory() as session:
        stored = await session.scalar(
            select(HouseholdInvitation).where(
                HouseholdInvitation.token_hash == hash_refresh_token(str(token))
            )
        )
        assert stored is not None
        assert stored.token_hash != token
        assert stored.invited_email == "member@example.com"
        assert stored.status is InvitationStatus.PENDING

    wrong_email = await api_client.post(
        f"/api/v1/invitations/{token}/accept", headers=auth(other)
    )
    accepted = await api_client.post(
        f"/api/v1/invitations/{token}/accept", headers=auth(member)
    )
    repeated = await api_client.post(
        f"/api/v1/invitations/{token}/accept", headers=auth(member)
    )
    already_member = await api_client.post(
        f"/api/v1/households/{household['id']}/invitations",
        headers=auth(owner),
        json={"email": "member@example.com"},
    )

    assert invitation.status_code == 201
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "HOUSEHOLD_INVITATION_ALREADY_PENDING"
    assert wrong_email.status_code == 403
    assert wrong_email.json()["error"]["code"] == "INVITATION_EMAIL_MISMATCH"
    assert accepted.status_code == repeated.status_code == 200
    assert accepted.json()["current_user_role"] == repeated.json()["current_user_role"] == "member"
    assert already_member.status_code == 409
    assert already_member.json()["error"]["code"] == "HOUSEHOLD_ALREADY_MEMBER"


async def test_expired_invitation_and_invalid_token_are_rejected(
    api_client: httpx.AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    owner = await register(api_client, "owner@example.com", "Owner")
    member = await register(api_client, "member@example.com", "Member")
    household = await create_household(api_client, owner, "Home")
    invitation = await api_client.post(
        f"/api/v1/households/{household['id']}/invitations",
        headers=auth(owner),
        json={"email": "member@example.com"},
    )
    token = invitation.json()["invite_token"]
    async with session_factory() as session:
        stored = await session.scalar(
            select(HouseholdInvitation).where(
                HouseholdInvitation.token_hash == hash_refresh_token(str(token))
            )
        )
        assert stored is not None
        stored.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        await session.commit()

    expired = await api_client.post(
        f"/api/v1/invitations/{token}/accept", headers=auth(member)
    )
    invalid = await api_client.post(
        "/api/v1/invitations/not-a-real-token/accept", headers=auth(member)
    )
    assert expired.status_code == 410
    assert expired.json()["error"]["code"] == "INVITATION_EXPIRED"
    assert invalid.status_code == 404
    assert invalid.json()["error"]["code"] == "INVITATION_INVALID"

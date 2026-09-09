from uuid import UUID

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from test_households_api import auth, create_household, register

from app.main import app
from app.push_notifications.dependencies import get_push_provider
from app.push_notifications.models import DevicePushToken
from app.push_notifications.provider import PushMessage, PushResult

pytestmark = pytest.mark.postgres


class FakePushProvider:
    def __init__(self) -> None:
        self.messages: list[PushMessage] = []
        self.fail = False
        self.invalid_tokens: set[str] = set()
        self.transient_tokens: set[str] = set()

    async def send(self, messages: list[PushMessage]) -> list[PushResult]:
        self.messages.extend(messages)
        if self.fail:
            raise RuntimeError("provider unavailable")
        return [
            PushResult(
                token=message.token,
                successful=message.token not in self.invalid_tokens | self.transient_tokens,
                permanently_invalid=message.token in self.invalid_tokens,
                error=(
                    "DeviceNotRegistered"
                    if message.token in self.invalid_tokens
                    else "MessageRateExceeded"
                    if message.token in self.transient_tokens
                    else None
                ),
            )
            for message in messages
        ]


def expo_token(name: str) -> str:
    return f"ExponentPushToken[{name}-0123456789]"


async def join_household(
    client: httpx.AsyncClient,
    owner: dict[str, object],
    member: dict[str, object],
    household_id: str,
) -> None:
    invitation = await client.post(
        f"/api/v1/households/{household_id}/invitations",
        headers=auth(owner),
        json={"email": member["user"]["email"]},  # type: ignore[index]
    )
    response = await client.post(
        f"/api/v1/invitations/{invitation.json()['invite_token']}/accept",
        headers=auth(member),
    )
    assert response.status_code == 200


async def register_push(
    client: httpx.AsyncClient,
    user: dict[str, object],
    token: str,
    platform: str = "android",
) -> dict[str, object]:
    response = await client.post(
        "/api/v1/push-tokens",
        headers=auth(user),
        json={"provider": "expo", "token": token, "platform": platform, "device_id": token[-12:]},
    )
    assert response.status_code == 200, response.text
    return response.json()


async def substitution_scenario(client: httpx.AsyncClient, fake: FakePushProvider):
    app.dependency_overrides[get_push_provider] = lambda: fake
    shopper = await register(client, "shopper-push@example.com", "Shopper")
    approver = await register(client, "approver-push@example.com", "Approver")
    outsider = await register(client, "outsider-push@example.com", "Outsider")
    household = await create_household(client, shopper, "Push Home")
    household_id = str(household["id"])
    await join_household(client, shopper, approver, household_id)
    approver_tokens = [expo_token("approver-phone"), expo_token("approver-tablet")]
    for token in approver_tokens:
        await register_push(client, approver, token)
    await register_push(client, shopper, expo_token("shopper-phone"))
    await register_push(client, outsider, expo_token("outsider-phone"))
    shopping_list = await client.post(
        f"/api/v1/households/{household_id}/shopping-lists",
        headers=auth(shopper),
        json={"name": "Weekly"},
    )
    list_id = shopping_list.json()["id"]
    await client.post(
        f"/api/v1/households/{household_id}/shopping-lists/{list_id}/items",
        headers=auth(shopper),
        json={"name": "Fresh Fri", "requested_quantity": 1},
    )
    trip = await client.post(
        f"/api/v1/households/{household_id}/shopping-lists/{list_id}/trips",
        headers=auth(shopper),
        json={},
    )
    trip_data = trip.json()
    return shopper, approver, outsider, household_id, trip_data, approver_tokens


async def create_substitution(client, shopper, household_id, trip):
    return await client.post(
        f"/api/v1/households/{household_id}/trips/{trip['id']}/items/{trip['items'][0]['id']}/substitutions",
        headers=auth(shopper),
        json={"proposed_name": "Golden Fry", "proposed_size_value": 5, "proposed_size_unit": "L"},
    )


async def test_registration_is_idempotent_supports_devices_and_moves_ownership(
    api_client: httpx.AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user_a = await register(api_client, "push-a@example.com")
    user_b = await register(api_client, "push-b@example.com")
    shared = expo_token("shared-device")
    first = await register_push(api_client, user_a, shared)
    repeated = await register_push(api_client, user_a, shared, "ios")
    await register_push(api_client, user_a, expo_token("second-device"))
    moved = await register_push(api_client, user_b, shared)
    assert first["id"] == repeated["id"] == moved["id"]
    assert repeated["platform"] == "ios"
    async with session_factory() as session:
        rows = list(await session.scalars(select(DevicePushToken)))
        assert len(rows) == 2
        shared_row = next(row for row in rows if row.token == shared)
        assert shared_row.user_id == UUID(str(user_b["user"]["id"]))  # type: ignore[index]


async def test_registration_validation_and_owner_only_unregister(
    api_client: httpx.AsyncClient,
) -> None:
    owner = await register(api_client, "token-owner@example.com")
    other = await register(api_client, "token-other@example.com")
    invalid_provider = await api_client.post(
        "/api/v1/push-tokens",
        headers=auth(owner),
        json={"provider": "fcm", "token": expo_token("bad-provider"), "platform": "android"},
    )
    invalid_token = await api_client.post(
        "/api/v1/push-tokens",
        headers=auth(owner),
        json={"provider": "expo", "token": "not-a-token", "platform": "android"},
    )
    registration = await register_push(api_client, owner, expo_token("owned"))
    denied = await api_client.delete(
        f"/api/v1/push-tokens/{registration['id']}", headers=auth(other)
    )
    removed = await api_client.delete(
        f"/api/v1/push-tokens/{registration['id']}", headers=auth(owner)
    )
    assert invalid_provider.status_code == invalid_token.status_code == 422
    assert denied.status_code == 404
    assert removed.status_code == 204


async def test_request_notifies_other_household_members_on_all_enabled_devices(
    api_client: httpx.AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    fake = FakePushProvider()
    shopper, _, _, household_id, trip, approver_tokens = await substitution_scenario(
        api_client, fake
    )
    async with session_factory() as session:
        disabled = await session.scalar(
            select(DevicePushToken).where(DevicePushToken.token == approver_tokens[1])
        )
        assert disabled is not None
        disabled.enabled = False
        await session.commit()
    response = await create_substitution(api_client, shopper, household_id, trip)
    assert response.status_code == 201
    assert [message.token for message in fake.messages] == [approver_tokens[0]]
    assert fake.messages[0].data == {
        "type": "substitution.requested",
        "household_id": household_id,
        "trip_id": trip["id"],
        "substitution_id": response.json()["id"],
    }
    assert "Golden Fry 5 L" in fake.messages[0].body


@pytest.mark.parametrize(
    ("decision", "event_type"),
    [("approve", "substitution.approved"), ("reject", "substitution.rejected")],
)
async def test_resolution_notifies_only_requester(
    api_client: httpx.AsyncClient, decision: str, event_type: str
) -> None:
    fake = FakePushProvider()
    shopper, approver, _, household_id, trip, _ = await substitution_scenario(api_client, fake)
    created = await create_substitution(api_client, shopper, household_id, trip)
    fake.messages.clear()
    response = await api_client.post(
        f"/api/v1/households/{household_id}/substitutions/{created.json()['id']}/{decision}",
        headers=auth(approver),
    )
    assert response.status_code == 200
    assert [message.token for message in fake.messages] == [expo_token("shopper-phone")]
    assert fake.messages[0].data["type"] == event_type


async def test_provider_failure_does_not_rollback_domain_mutation(
    api_client: httpx.AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    fake = FakePushProvider()
    shopper, _, _, household_id, trip, _ = await substitution_scenario(api_client, fake)
    fake.fail = True
    response = await create_substitution(api_client, shopper, household_id, trip)
    assert response.status_code == 201
    stored = await api_client.get(
        f"/api/v1/households/{household_id}/substitutions/{response.json()['id']}",
        headers=auth(shopper),
    )
    assert stored.status_code == 200 and stored.json()["status"] == "pending"
    async with session_factory() as session:
        recipient_tokens = list(
            await session.scalars(
                select(DevicePushToken).where(
                    DevicePushToken.token.in_(
                        [expo_token("approver-phone"), expo_token("approver-tablet")]
                    )
                )
            )
        )
        assert all(
            token.enabled and token.last_failure_at is not None for token in recipient_tokens
        )


async def test_resolution_provider_failure_does_not_rollback_decision(
    api_client: httpx.AsyncClient,
) -> None:
    fake = FakePushProvider()
    shopper, approver, _, household_id, trip, _ = await substitution_scenario(api_client, fake)
    created = await create_substitution(api_client, shopper, household_id, trip)
    fake.fail = True
    approved = await api_client.post(
        f"/api/v1/households/{household_id}/substitutions/{created.json()['id']}/approve",
        headers=auth(approver),
    )
    assert approved.status_code == 200 and approved.json()["status"] == "approved"


async def test_realtime_failure_does_not_prevent_push(
    api_client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake = FakePushProvider()
    shopper, _, _, household_id, trip, approver_tokens = await substitution_scenario(
        api_client, fake
    )

    async def fail_realtime(_event):
        raise RuntimeError("realtime unavailable")

    monkeypatch.setattr("app.trips.substitution_router.publisher.publish", fail_realtime)
    created = await create_substitution(api_client, shopper, household_id, trip)
    assert created.status_code == 201
    assert {message.token for message in fake.messages} == set(approver_tokens)


async def test_permanently_invalid_token_is_disabled(
    api_client: httpx.AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    fake = FakePushProvider()
    shopper, _, _, household_id, trip, approver_tokens = await substitution_scenario(
        api_client, fake
    )
    fake.invalid_tokens.add(approver_tokens[0])
    fake.transient_tokens.add(approver_tokens[1])
    await create_substitution(api_client, shopper, household_id, trip)
    async with session_factory() as session:
        rows = list(
            await session.scalars(
                select(DevicePushToken).where(DevicePushToken.token.in_(approver_tokens))
            )
        )
        assert {row.token: row.enabled for row in rows} == {
            approver_tokens[0]: False,
            approver_tokens[1]: True,
        }
        assert all(row.last_failure_at is not None for row in rows)

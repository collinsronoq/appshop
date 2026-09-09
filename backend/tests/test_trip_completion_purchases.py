import httpx
import pytest
from test_households_api import auth, create_household, register

pytestmark = pytest.mark.postgres


async def setup_trip(client: httpx.AsyncClient, email: str = "purchase@example.com"):
    user = await register(client, email)
    household = await create_household(client, user, "Home")
    hid = household["id"]
    listing = await client.post(
        f"/api/v1/households/{hid}/shopping-lists", headers=auth(user), json={"name": "Shop"}
    )
    lid = listing.json()["id"]
    await client.post(
        f"/api/v1/households/{hid}/shopping-lists/{lid}/items",
        headers=auth(user),
        json={"name": "Milk", "requested_quantity": 2},
    )
    await client.post(
        f"/api/v1/households/{hid}/shopping-lists/{lid}/items",
        headers=auth(user),
        json={"name": "Bread", "requested_quantity": 1},
    )
    trip = await client.post(
        f"/api/v1/households/{hid}/shopping-lists/{lid}/trips", headers=auth(user), json={}
    )
    return user, hid, trip.json()


async def test_completion_creates_collected_purchases_and_summary(api_client: httpx.AsyncClient):
    user, hid, trip = await setup_trip(api_client)
    base = f"/api/v1/households/{hid}/trips/{trip['id']}"
    items = trip["items"]
    await api_client.post(f"{base}/items/{items[0]['id']}/collect", headers=auth(user), json={})
    await api_client.post(f"{base}/items/{items[1]['id']}/skip", headers=auth(user))
    completed = await api_client.post(f"{base}/complete", headers=auth(user))
    assert completed.status_code == 200 and completed.json()["summary"] == {
        "total_items": 2,
        "purchased": 1,
        "skipped": 1,
        "substituted": 0,
        "total_amount": None,
    }
    history = await api_client.get(f"/api/v1/households/{hid}/purchases", headers=auth(user))
    assert len(history.json()) == 1 and history.json()[0]["purchased_name_snapshot"] == "Milk"


async def test_pending_item_rejects_completion_without_purchases(api_client: httpx.AsyncClient):
    user, hid, trip = await setup_trip(api_client, "pending-purchase@example.com")
    response = await api_client.post(
        f"/api/v1/households/{hid}/trips/{trip['id']}/complete", headers=auth(user)
    )
    assert (
        response.status_code == 409
        and response.json()["error"]["code"] == "SHOPPING_TRIP_HAS_PENDING_ITEMS"
    )
    assert (
        await api_client.get(f"/api/v1/households/{hid}/purchases", headers=auth(user))
    ).json() == []


async def test_duplicate_completion_does_not_duplicate_purchase(api_client: httpx.AsyncClient):
    user, hid, trip = await setup_trip(api_client, "duplicate-purchase@example.com")
    base = f"/api/v1/households/{hid}/trips/{trip['id']}"
    item = trip["items"][0]
    await api_client.post(f"{base}/items/{item['id']}/collect", headers=auth(user), json={})
    await api_client.post(f"{base}/items/{trip['items'][1]['id']}/skip", headers=auth(user))
    assert (await api_client.post(f"{base}/complete", headers=auth(user))).status_code == 200
    second = await api_client.post(f"{base}/complete", headers=auth(user))
    assert second.status_code == 409
    assert (
        len(
            (await api_client.get(f"/api/v1/households/{hid}/purchases", headers=auth(user))).json()
        )
        == 1
    )

import httpx
import pytest
from test_households_api import auth, create_household, register

pytestmark = pytest.mark.postgres


async def purchased_product(client: httpx.AsyncClient, email: str):
    user = await register(client, email)
    household = await create_household(client, user, "Home")
    hid = household["id"]
    product = await client.post(
        f"/api/v1/households/{hid}/products",
        headers=auth(user),
        json={
            "name": "Whole Milk",
            "brand": "Brookside",
            "size_value": 500,
            "size_unit": "ml",
            "usual_quantity": 2,
        },
    )
    listing = await client.post(
        f"/api/v1/households/{hid}/shopping-lists",
        headers=auth(user),
        json={"name": "Weekly"},
    )
    lid = listing.json()["id"]
    await client.post(
        f"/api/v1/households/{hid}/shopping-lists/{lid}/items",
        headers=auth(user),
        json={"household_product_id": product.json()["id"], "requested_quantity": 2},
    )
    trip = await client.post(
        f"/api/v1/households/{hid}/shopping-lists/{lid}/trips",
        headers=auth(user),
        json={},
    )
    item = trip.json()["items"][0]
    await client.post(
        f"/api/v1/households/{hid}/trips/{trip.json()['id']}/items/{item['id']}/collect",
        headers=auth(user),
        json={},
    )
    await client.post(
        f"/api/v1/households/{hid}/trips/{trip.json()['id']}/complete",
        headers=auth(user),
    )
    return user, hid, product.json(), lid


async def test_recent_frequent_and_product_summary(api_client: httpx.AsyncClient):
    user, hid, product, _ = await purchased_product(api_client, "memory@example.com")
    recent = await api_client.get(
        f"/api/v1/households/{hid}/purchasing-memory/recent", headers=auth(user)
    )
    frequent = await api_client.get(
        f"/api/v1/households/{hid}/purchasing-memory/frequent", headers=auth(user)
    )
    summary = await api_client.get(
        f"/api/v1/households/{hid}/products/{product['id']}/purchase-summary",
        headers=auth(user),
    )
    assert recent.status_code == frequent.status_code == summary.status_code == 200
    assert recent.json()["items"][0]["name"] == "Whole Milk"
    assert recent.json()["items"][0]["purchase_count"] == 1
    assert frequent.json()["items"][0]["total_purchased_quantity"] in (2, "2.000")
    assert summary.json()["purchase_count"] == 1


async def test_memory_uses_current_identity_but_history_keeps_snapshot(
    api_client: httpx.AsyncClient,
):
    user, hid, product, _ = await purchased_product(api_client, "identity@example.com")
    await api_client.patch(
        f"/api/v1/households/{hid}/products/{product['id']}",
        headers=auth(user),
        json={"name": "Whole Milk Large", "size_value": 1, "size_unit": "L"},
    )
    memory = (
        await api_client.get(
            f"/api/v1/households/{hid}/purchasing-memory/recent", headers=auth(user)
        )
    ).json()["items"][0]
    history = (
        await api_client.get(f"/api/v1/households/{hid}/purchases", headers=auth(user))
    ).json()[0]
    assert memory["name"] == "Whole Milk Large" and memory["size_unit"] == "L"
    assert history["purchased_name_snapshot"] == "Whole Milk"
    assert history["purchased_size_unit_snapshot"] == "ml"


async def test_memory_isolation_and_buy_again_active_trip(api_client: httpx.AsyncClient):
    user, hid, product, _ = await purchased_product(api_client, "buy-again@example.com")
    outsider, outsider_hid, _, _ = await purchased_product(
        api_client, "outsider-memory@example.com"
    )
    assert (
        await api_client.get(
            f"/api/v1/households/{outsider_hid}/purchasing-memory/recent", headers=auth(user)
        )
    ).status_code == 404
    listing = await api_client.post(
        f"/api/v1/households/{hid}/shopping-lists", headers=auth(user), json={"name": "Next"}
    )
    lid = listing.json()["id"]
    trip = await api_client.post(
        f"/api/v1/households/{hid}/shopping-lists/{lid}/trips", headers=auth(user), json={}
    )
    added = await api_client.post(
        f"/api/v1/households/{hid}/shopping-lists/{lid}/items",
        headers=auth(user),
        json={
            "household_product_id": product["id"],
            "requested_quantity": product["usual_quantity"],
        },
    )
    refreshed = await api_client.get(
        f"/api/v1/households/{hid}/trips/{trip.json()['id']}", headers=auth(user)
    )
    assert added.status_code == 201 and len(refreshed.json()["items"]) == 1

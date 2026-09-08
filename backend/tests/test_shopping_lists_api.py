import httpx
import pytest
from test_households_api import auth, create_household, register

pytestmark = pytest.mark.postgres


async def test_list_lifecycle_and_versioning(api_client: httpx.AsyncClient) -> None:
    user = await register(api_client, "lists@example.com")
    household = await create_household(api_client, user, "Home")
    base = f"/api/v1/households/{household['id']}/shopping-lists"
    created = await api_client.post(base, headers=auth(user), json={"name": "Weekend"})
    assert created.status_code == 201 and created.json()["version"] == 1
    renamed = await api_client.patch(
        f"{base}/{created.json()['id']}", headers=auth(user), json={"name": "Weekend shop"}
    )
    assert renamed.json()["version"] == 2
    archived = await api_client.delete(f"{base}/{created.json()['id']}", headers=auth(user))
    assert archived.json()["status"] == "archived" and archived.json()["version"] == 3
    assert (await api_client.get(base, headers=auth(user))).json() == []


async def test_product_item_snapshots_survive_product_edit(api_client: httpx.AsyncClient) -> None:
    user = await register(api_client, "snapshot@example.com")
    household = await create_household(api_client, user, "Home")
    hid = household["id"]
    product = await api_client.post(
        f"/api/v1/households/{hid}/products",
        headers=auth(user),
        json={
            "name": "Cooking Oil",
            "brand": "Fresh Fri",
            "size_value": 5,
            "size_unit": "L",
            "usual_quantity": 1,
        },
    )
    listing = await api_client.post(
        f"/api/v1/households/{hid}/shopping-lists", headers=auth(user), json={"name": "Shop"}
    )
    added = await api_client.post(
        f"/api/v1/households/{hid}/shopping-lists/{listing.json()['id']}/items",
        headers=auth(user),
        json={"household_product_id": product.json()["id"], "requested_quantity": 2},
    )
    assert added.json()["items"][0]["brand"] == "Fresh Fri"
    await api_client.patch(
        f"/api/v1/households/{hid}/products/{product.json()['id']}",
        headers=auth(user),
        json={"brand": "Golden Fry", "size_value": 3},
    )
    detail = await api_client.get(
        f"/api/v1/households/{hid}/shopping-lists/{listing.json()['id']}", headers=auth(user)
    )
    assert (
        detail.json()["items"][0]["brand"] == "Fresh Fri"
        and detail.json()["items"][0]["size_value"] in (5, "5", "5.000")
    )


async def test_ad_hoc_item_and_duplicate_product_conflict(api_client: httpx.AsyncClient) -> None:
    user = await register(api_client, "adhoc@example.com")
    household = await create_household(api_client, user, "Home")
    hid = household["id"]
    listing = await api_client.post(
        f"/api/v1/households/{hid}/shopping-lists", headers=auth(user), json={"name": "Shop"}
    )
    base = f"/api/v1/households/{hid}/shopping-lists/{listing.json()['id']}/items"
    custom = await api_client.post(
        base, headers=auth(user), json={"name": "Tomatoes", "requested_quantity": 6}
    )
    assert custom.status_code == 201 and custom.json()["items"][0]["name"] == "Tomatoes"

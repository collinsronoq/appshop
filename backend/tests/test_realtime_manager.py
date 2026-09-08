import pytest

from app.realtime.events import RealtimeEvent
from app.realtime.manager import RealtimeConnectionManager


class FakeSocket:
    def __init__(self):
        self.accepted = False
        self.messages = []

    async def accept(self):
        self.accepted = True

    async def send_json(self, payload):
        self.messages.append(payload)


@pytest.mark.asyncio
async def test_manager_subscribe_publish_and_disconnect_cleanup():
    manager = RealtimeConnectionManager()
    socket = FakeSocket()
    await manager.connect(socket)
    await manager.subscribe(
        socket, "shopping-list:00000000-0000-0000-0000-000000000002"
    )
    event = RealtimeEvent(
        type="shopping_list.updated",
        household_id="00000000-0000-0000-0000-000000000001",
        list_id="00000000-0000-0000-0000-000000000002",
        actor_id="00000000-0000-0000-0000-000000000003",
        version=2,
    )
    await manager.publish(event)
    assert socket.accepted and socket.messages[0]["version"] == 2
    await manager.disconnect(socket)
    await manager.disconnect(socket)
    assert socket not in manager.connections

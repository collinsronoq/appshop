# mypy: ignore-errors
from collections import defaultdict

from fastapi import WebSocket

from .events import RealtimeEvent


class RealtimeConnectionManager:
    def __init__(self):
        self.channels: dict[str, set[WebSocket]] = defaultdict(set)
        self.connections: dict[WebSocket, set[str]] = defaultdict(set)

    async def connect(self, socket: WebSocket) -> None:
        await socket.accept()

    async def disconnect(self, socket: WebSocket) -> None:
        for channel in self.connections.pop(socket, set()):
            self.channels[channel].discard(socket)

    async def subscribe(self, socket: WebSocket, channel: str) -> None:
        self.channels[channel].add(socket)
        self.connections[socket].add(channel)

    async def unsubscribe(self, socket: WebSocket, channel: str) -> None:
        self.channels[channel].discard(socket)
        self.connections[socket].discard(channel)

    async def publish(self, event: RealtimeEvent) -> None:
        for socket in list(self.channels.get(f"shopping-list:{event.list_id}", set())):
            try:
                await socket.send_json(event.model_dump(mode="json"))
            except Exception:
                await self.disconnect(socket)


manager = RealtimeConnectionManager()


class InProcessRealtimePublisher:
    async def publish(self, event: RealtimeEvent) -> None:
        await manager.publish(event)


publisher = InProcessRealtimePublisher()

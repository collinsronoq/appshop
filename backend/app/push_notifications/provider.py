from dataclasses import dataclass
from typing import Protocol

import httpx


@dataclass(frozen=True, slots=True)
class PushMessage:
    token: str
    title: str
    body: str
    data: dict[str, str]


@dataclass(frozen=True, slots=True)
class PushResult:
    token: str
    successful: bool
    permanently_invalid: bool = False
    error: str | None = None


class PushNotificationProvider(Protocol):
    async def send(self, messages: list[PushMessage]) -> list[PushResult]: ...


class ExpoPushNotificationProvider:
    def __init__(self, endpoint: str = "https://exp.host/--/api/v2/push/send") -> None:
        self.endpoint = endpoint

    async def send(self, messages: list[PushMessage]) -> list[PushResult]:
        results: list[PushResult] = []
        async with httpx.AsyncClient(timeout=10) as client:
            for start in range(0, len(messages), 100):
                chunk = messages[start : start + 100]
                response = await client.post(
                    self.endpoint,
                    headers={"Accept": "application/json", "Accept-Encoding": "gzip, deflate"},
                    json=[
                        {
                            "to": message.token,
                            "title": message.title,
                            "body": message.body,
                            "data": message.data,
                        }
                        for message in chunk
                    ],
                )
                response.raise_for_status()
                tickets = response.json().get("data", [])
                if not isinstance(tickets, list) or len(tickets) != len(chunk):
                    raise RuntimeError("Expo returned an unexpected ticket response")
                for message, ticket in zip(chunk, tickets, strict=True):
                    details = ticket.get("details") or {}
                    error = details.get("error") or ticket.get("message")
                    results.append(
                        PushResult(
                            token=message.token,
                            successful=ticket.get("status") == "ok",
                            permanently_invalid=error == "DeviceNotRegistered",
                            error=error,
                        )
                    )
        return results


class NoOpPushNotificationProvider:
    async def send(self, messages: list[PushMessage]) -> list[PushResult]:
        return [PushResult(token=message.token, successful=True) for message in messages]

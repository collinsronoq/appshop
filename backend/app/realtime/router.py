# mypy: ignore-errors
import json
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.auth.models import UserStatus
from app.auth.repository import UserRepository
from app.core.config import get_settings
from app.core.database import get_session_factory
from app.core.security import AccessTokenExpiredError, AccessTokenInvalidError, decode_access_token
from app.households.repository import HouseholdRepository
from app.shopping.models import ShoppingList

from .manager import manager

router = APIRouter()


@router.websocket("/realtime")
async def realtime(socket: WebSocket, access_token: str | None = None):
    await manager.connect(socket)
    try:
        if not access_token:
            await socket.close(code=4401)
            return
        try:
            claims = decode_access_token(access_token, get_settings())
        except (AccessTokenExpiredError, AccessTokenInvalidError):
            await socket.close(code=4401)
            return
        async with get_session_factory()() as session:
            user = await UserRepository(session).get_by_id(claims.user_id)
            if not user or user.status is UserStatus.DISABLED:
                await socket.close(code=4403)
                return
            while True:
                raw = await socket.receive_text()
                if len(raw) > 4096:
                    await socket.send_json(
                        {
                            "type": "error",
                            "code": "REALTIME_INVALID_MESSAGE",
                            "message": "Invalid message.",
                        }
                    )
                    continue
                try:
                    message = json.loads(raw)
                except json.JSONDecodeError:
                    await socket.send_json(
                        {
                            "type": "error",
                            "code": "REALTIME_INVALID_MESSAGE",
                            "message": "Invalid message.",
                        }
                    )
                    continue
                action = message.get("action")
                list_id = message.get("list_id")
                try:
                    parsed = UUID(str(list_id))
                except (ValueError, TypeError):
                    await socket.send_json(
                        {
                            "type": "error",
                            "code": "REALTIME_INVALID_MESSAGE",
                            "message": "Invalid message.",
                        }
                    )
                    continue
                listing = await session.scalar(
                    select(ShoppingList).where(ShoppingList.id == parsed)
                )
                allowed = False
                if listing:
                    membership = await HouseholdRepository(session).get_access(
                        listing.household_id, user.id
                    )
                    allowed = membership is not None
                if not allowed:
                    await socket.send_json(
                        {
                            "type": "error",
                            "code": "REALTIME_SUBSCRIPTION_DENIED",
                            "message": "Unable to subscribe to this resource.",
                        }
                    )
                    continue
                channel = f"shopping-list:{parsed}"
                if action == "subscribe":
                    await manager.subscribe(socket, channel)
                    await socket.send_json(
                        {"type": "subscription.confirmed", "list_id": str(parsed)}
                    )
                elif action == "unsubscribe":
                    await manager.unsubscribe(socket, channel)
                    await socket.send_json({"type": "subscription.removed", "list_id": str(parsed)})
                else:
                    await socket.send_json(
                        {
                            "type": "error",
                            "code": "REALTIME_INVALID_MESSAGE",
                            "message": "Invalid message.",
                        }
                    )
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(socket)

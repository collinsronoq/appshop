import logging
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.households.models import HouseholdMembership

from .models import DevicePushToken
from .provider import PushMessage, PushNotificationProvider

logger = logging.getLogger(__name__)


class PushNotificationService:
    def __init__(self, session: AsyncSession, provider: PushNotificationProvider) -> None:
        self.session = session
        self.provider = provider

    async def notify_substitution_requested(
        self,
        *,
        household_id: UUID,
        requester_id: UUID,
        trip_id: UUID,
        substitution_id: UUID,
        proposed_label: str,
        requested_label: str,
    ) -> None:
        recipients = list(
            await self.session.scalars(
                select(HouseholdMembership.user_id).where(
                    HouseholdMembership.household_id == household_id,
                    HouseholdMembership.user_id != requester_id,
                )
            )
        )
        await self._send(
            notification_type="substitution.requested",
            recipient_ids=recipients,
            title="Replacement approval needed",
            body=f"{proposed_label} was proposed instead of {requested_label}.",
            household_id=household_id,
            trip_id=trip_id,
            substitution_id=substitution_id,
        )

    async def notify_substitution_resolved(
        self,
        *,
        status: str,
        household_id: UUID,
        requester_id: UUID,
        trip_id: UUID,
        substitution_id: UUID,
        proposed_label: str,
    ) -> None:
        approved = status == "approved"
        requester_is_member = await self.session.scalar(
            select(HouseholdMembership.id).where(
                HouseholdMembership.household_id == household_id,
                HouseholdMembership.user_id == requester_id,
            )
        )
        await self._send(
            notification_type=f"substitution.{status}",
            recipient_ids=[requester_id] if requester_is_member else [],
            title="Replacement approved" if approved else "Replacement rejected",
            body=f"{proposed_label} was approved."
            if approved
            else "Choose another replacement or skip the item.",
            household_id=household_id,
            trip_id=trip_id,
            substitution_id=substitution_id,
        )

    async def _send(
        self,
        *,
        notification_type: str,
        recipient_ids: list[UUID],
        title: str,
        body: str,
        household_id: UUID,
        trip_id: UUID,
        substitution_id: UUID,
    ) -> None:
        tokens = (
            list(
                await self.session.scalars(
                    select(DevicePushToken).where(
                        DevicePushToken.user_id.in_(recipient_ids),
                        DevicePushToken.enabled.is_(True),
                    )
                )
            )
            if recipient_ids
            else []
        )
        logger.info(
            "push notification=%s recipients=%d tokens=%d",
            notification_type,
            len(set(recipient_ids)),
            len(tokens),
        )
        if not tokens:
            return
        data = {
            "type": notification_type,
            "household_id": str(household_id),
            "trip_id": str(trip_id),
            "substitution_id": str(substitution_id),
        }
        try:
            results = await self.provider.send(
                [
                    PushMessage(token=token.token, title=title, body=body, data=data)
                    for token in tokens
                ]
            )
        except Exception:
            logger.exception(
                "push provider failure notification=%s tokens=%d", notification_type, len(tokens)
            )
            failed_at = datetime.now(UTC)
            for token in tokens:
                token.last_failure_at = failed_at
            await self.session.commit()
            return
        by_token = {token.token: token for token in tokens}
        now = datetime.now(UTC)
        successful = invalid = failed = 0
        for result in results:
            matched_token = by_token.get(result.token)
            if matched_token is None:
                continue
            if result.successful:
                matched_token.last_success_at = now
                successful += 1
            else:
                matched_token.last_failure_at = now
                failed += 1
                if result.permanently_invalid:
                    matched_token.enabled = False
                    invalid += 1
        await self.session.commit()
        logger.info(
            "push outcome notification=%s successful=%d failed=%d disabled=%d",
            notification_type,
            successful,
            failed,
            invalid,
        )


def product_label(
    name: str, size_value: Decimal | float | int | None, size_unit: str | None
) -> str:
    if size_value is None or not size_unit:
        return name
    number = f"{float(size_value):g}"
    return f"{name} {number} {size_unit}"

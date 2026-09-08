from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.auth.models import User
from app.households.models import Household, HouseholdInvitation, HouseholdMembership

pytestmark = pytest.mark.postgres


async def test_membership_unique_foreign_keys_and_role_constraint(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async with session_factory() as session:
        user = User(email="user@example.com", password_hash="hash", display_name="User")
        session.add(user)
        await session.flush()
        household = Household(name="Home", created_by_user_id=user.id)
        session.add(household)
        await session.flush()
        session.add_all(
            [
                HouseholdMembership(household_id=household.id, user_id=user.id, role="owner"),
                HouseholdMembership(household_id=household.id, user_id=user.id, role="owner"),
            ]
        )
        with pytest.raises(IntegrityError):
            await session.commit()

    async with session_factory() as session:
        session.add(
            HouseholdMembership(
                household_id=uuid4(), user_id=uuid4(), role="member"
            )
        )
        with pytest.raises(IntegrityError):
            await session.commit()


async def test_invitation_foreign_keys_and_status_constraint(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async with session_factory() as session:
        user = User(email="owner@example.com", password_hash="hash", display_name="Owner")
        session.add(user)
        await session.flush()
        household = Household(name="Home", created_by_user_id=user.id)
        session.add(household)
        await session.flush()
        session.add(
            HouseholdInvitation(
                household_id=household.id,
                invited_email="member@example.com",
                token_hash="c" * 64,
                status="pending",
                expires_at=datetime.now(UTC) + timedelta(days=1),
                invited_by_user_id=user.id,
            )
        )
        await session.commit()

    async with session_factory() as session:
        invitation = await session.scalar(
            select(HouseholdInvitation).where(
                HouseholdInvitation.invited_email == "member@example.com"
            )
        )
        assert invitation is not None
        assert invitation.accepted_by_user_id is None

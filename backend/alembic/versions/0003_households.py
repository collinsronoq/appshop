"""households, memberships, and invitations

Revision ID: 0003_households
Revises: 0002_authentication
Create Date: 2026-09-08
"""

import sqlalchemy as sa

from alembic import op

revision: str = "0003_households"
down_revision: str | None = "0002_authentication"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "households",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_households_created_by_user_id", "households", ["created_by_user_id"])

    op.create_table(
        "household_memberships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=6), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("role IN ('owner', 'member')", name="ck_household_memberships_role"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "household_id", "user_id", name="uq_household_memberships_household_user"
        ),
    )
    op.create_index(
        "ix_household_memberships_household_id", "household_memberships", ["household_id"]
    )
    op.create_index("ix_household_memberships_user_id", "household_memberships", ["user_id"])

    op.create_table(
        "household_invitations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("invited_email", sa.String(length=320), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=8), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("invited_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("accepted_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'accepted', 'expired', 'revoked')",
            name="ck_household_invitations_status",
        ),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["invited_by_user_id"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["accepted_by_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_household_invitations_token_hash"),
    )
    op.create_index(
        "ix_household_invitations_household_email",
        "household_invitations",
        ["household_id", "invited_email"],
    )
    op.create_index(
        "ix_household_invitations_expires_at", "household_invitations", ["expires_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_household_invitations_expires_at", table_name="household_invitations")
    op.drop_index(
        "ix_household_invitations_household_email", table_name="household_invitations"
    )
    op.drop_table("household_invitations")
    op.drop_index("ix_household_memberships_user_id", table_name="household_memberships")
    op.drop_index("ix_household_memberships_household_id", table_name="household_memberships")
    op.drop_table("household_memberships")
    op.drop_index("ix_households_created_by_user_id", table_name="households")
    op.drop_table("households")

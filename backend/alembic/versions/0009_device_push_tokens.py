"""device push tokens"""

import sqlalchemy as sa

from alembic import op

revision = "0009_device_push_tokens"
down_revision = "0008_purchases"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "device_push_tokens",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("provider", sa.String(4), nullable=False),
        sa.Column("token", sa.String(255), nullable=False),
        sa.Column("device_id", sa.String(255)),
        sa.Column("platform", sa.String(7), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "last_registered_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("last_success_at", sa.DateTime(timezone=True)),
        sa.Column("last_failure_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint("provider IN ('expo')", name="ck_device_push_tokens_provider"),
        sa.CheckConstraint("platform IN ('ios','android')", name="ck_device_push_tokens_platform"),
        sa.UniqueConstraint("provider", "token", name="uq_device_push_tokens_provider_token"),
    )
    op.create_index(
        "ix_device_push_tokens_user_enabled", "device_push_tokens", ["user_id", "enabled"]
    )


def downgrade() -> None:
    op.drop_table("device_push_tokens")

"""shopping trips and execution items

Revision ID: 0006_shopping_trips
Revises: 0005_shopping_lists
"""

import sqlalchemy as sa

from alembic import op

revision = "0006_shopping_trips"
down_revision = "0005_shopping_lists"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "shopping_trips",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "household_id",
            sa.Uuid(),
            sa.ForeignKey("households.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "shopping_list_id",
            sa.Uuid(),
            sa.ForeignKey("shopping_lists.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "started_by_user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("store_name", sa.String(160)),
        sa.Column("status", sa.String(9), nullable=False, server_default="active"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("cancelled_at", sa.DateTime(timezone=True)),
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
        sa.CheckConstraint("status IN ('active','cancelled')", name="ck_shopping_trips_status"),
        sa.CheckConstraint("version >= 0", name="ck_shopping_trips_version_nonnegative"),
    )
    op.create_index("ix_shopping_trips_household", "shopping_trips", ["household_id"])
    op.create_index(
        "ix_shopping_trips_list_status", "shopping_trips", ["shopping_list_id", "status"]
    )
    op.create_index(
        "uq_shopping_trips_active_list",
        "shopping_trips",
        ["shopping_list_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )
    op.create_table(
        "trip_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "household_id",
            sa.Uuid(),
            sa.ForeignKey("households.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "shopping_trip_id",
            sa.Uuid(),
            sa.ForeignKey("shopping_trips.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "shopping_list_item_id",
            sa.Uuid(),
            sa.ForeignKey("shopping_list_items.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("status", sa.String(9), nullable=False, server_default="pending"),
        sa.Column("requested_name_snapshot", sa.String(160), nullable=False),
        sa.Column("requested_brand_snapshot", sa.String(120)),
        sa.Column("requested_variant_snapshot", sa.String(160)),
        sa.Column("requested_size_value_snapshot", sa.Numeric(12, 3)),
        sa.Column("requested_size_unit_snapshot", sa.String(24)),
        sa.Column("requested_quantity", sa.Numeric(12, 3), nullable=False),
        sa.Column(
            "category_id", sa.Uuid(), sa.ForeignKey("product_categories.id", ondelete="SET NULL")
        ),
        sa.Column("notes", sa.Text()),
        sa.Column(
            "collected_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")
        ),
        sa.Column("collected_at", sa.DateTime(timezone=True)),
        sa.Column("purchased_quantity", sa.Numeric(12, 3)),
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
        sa.UniqueConstraint(
            "shopping_trip_id", "shopping_list_item_id", name="uq_trip_items_trip_source"
        ),
        sa.CheckConstraint(
            "status IN ('pending','collected','skipped')", name="ck_trip_items_status"
        ),
        sa.CheckConstraint("requested_quantity > 0", name="ck_trip_items_positive_quantity"),
        sa.CheckConstraint(
            "purchased_quantity IS NULL OR purchased_quantity > 0",
            name="ck_trip_items_positive_purchased_quantity",
        ),
    )
    op.create_index("ix_trip_items_trip_status", "trip_items", ["shopping_trip_id", "status"])
    op.create_index("ix_trip_items_household", "trip_items", ["household_id"])


def downgrade() -> None:
    op.drop_table("trip_items")
    op.drop_index("uq_shopping_trips_active_list", table_name="shopping_trips")
    op.drop_index("ix_shopping_trips_list_status", table_name="shopping_trips")
    op.drop_index("ix_shopping_trips_household", table_name="shopping_trips")
    op.drop_table("shopping_trips")

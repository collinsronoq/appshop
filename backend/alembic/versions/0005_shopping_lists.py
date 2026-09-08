"""shopping lists and list item snapshots

Revision ID: 0005_shopping_lists
Revises: 0004_household_products
"""

import sqlalchemy as sa

from alembic import op

revision = "0005_shopping_lists"
down_revision = "0004_household_products"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "shopping_lists",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "household_id",
            sa.Uuid(),
            sa.ForeignKey("households.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("status", sa.String(8), nullable=False, server_default="active"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_by_user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
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
        sa.Column("archived_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("status IN ('active','archived')", name="ck_shopping_lists_status"),
        sa.CheckConstraint("version >= 0", name="ck_shopping_lists_version_nonnegative"),
    )
    op.create_index(
        "ix_shopping_lists_household_status", "shopping_lists", ["household_id", "status"]
    )
    op.create_table(
        "shopping_list_items",
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
            "household_product_id",
            sa.Uuid(),
            sa.ForeignKey("household_products.id", ondelete="SET NULL"),
        ),
        sa.Column("name_snapshot", sa.String(160), nullable=False),
        sa.Column("brand_snapshot", sa.String(120)),
        sa.Column("variant_snapshot", sa.String(160)),
        sa.Column("size_value_snapshot", sa.Numeric(12, 3)),
        sa.Column("size_unit_snapshot", sa.String(24)),
        sa.Column("requested_quantity", sa.Numeric(12, 3), nullable=False),
        sa.Column(
            "category_id", sa.Uuid(), sa.ForeignKey("product_categories.id", ondelete="SET NULL")
        ),
        sa.Column("notes", sa.Text()),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column(
            "created_by_user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
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
        sa.CheckConstraint(
            "requested_quantity > 0", name="ck_shopping_list_items_positive_quantity"
        ),
    )
    op.create_index(
        "ix_shopping_list_items_list_position",
        "shopping_list_items",
        ["shopping_list_id", "position"],
    )
    op.create_index("ix_shopping_list_items_household", "shopping_list_items", ["household_id"])
    op.create_index(
        "ix_shopping_list_items_product", "shopping_list_items", ["household_product_id"]
    )


def downgrade() -> None:
    op.drop_table("shopping_list_items")
    op.drop_index("ix_shopping_lists_household_status", table_name="shopping_lists")
    op.drop_table("shopping_lists")

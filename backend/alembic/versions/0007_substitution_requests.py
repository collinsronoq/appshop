"""substitution requests"""

import sqlalchemy as sa

from alembic import op

revision = "0007_substitution_requests"
down_revision = "0006_shopping_trips"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for name, column in [
        ("purchased_name_snapshot", sa.String(160)),
        ("purchased_brand_snapshot", sa.String(120)),
        ("purchased_variant_snapshot", sa.String(160)),
        ("purchased_size_value_snapshot", sa.Numeric(12, 3)),
        ("purchased_size_unit_snapshot", sa.String(24)),
        (
            "substituted",
            sa.Boolean(),
        ),
    ]:
        op.add_column(
            "trip_items",
            sa.Column(
                name,
                column,
                nullable=False if name == "substituted" else True,
                server_default="false" if name == "substituted" else None,
            ),
        )
    op.create_table(
        "substitution_requests",
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
            "trip_item_id",
            sa.Uuid(),
            sa.ForeignKey("trip_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "requested_by_user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "proposed_product_id",
            sa.Uuid(),
            sa.ForeignKey("household_products.id", ondelete="SET NULL"),
        ),
        sa.Column("proposed_name", sa.String(160), nullable=False),
        sa.Column("proposed_brand", sa.String(120)),
        sa.Column("proposed_variant", sa.String(160)),
        sa.Column("proposed_size_value", sa.Numeric(12, 3)),
        sa.Column("proposed_size_unit", sa.String(24)),
        sa.Column("image_key", sa.String(512)),
        sa.Column("status", sa.String(9), nullable=False, server_default="pending"),
        sa.Column("resolved_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.CheckConstraint(
            "status IN ('pending','approved','rejected','cancelled')", name="ck_substitution_status"
        ),
        sa.CheckConstraint(
            "proposed_product_id IS NOT NULL OR length(trim(proposed_name)) > 0",
            name="ck_substitution_proposal",
        ),
    )
    op.create_index(
        "ix_substitution_requests_household_status",
        "substitution_requests",
        ["household_id", "status"],
    )
    op.create_index(
        "uq_substitution_pending_item",
        "substitution_requests",
        ["trip_item_id"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )


def downgrade() -> None:
    op.drop_table("substitution_requests")
    for name in (
        "substituted",
        "purchased_size_unit_snapshot",
        "purchased_size_value_snapshot",
        "purchased_variant_snapshot",
        "purchased_brand_snapshot",
        "purchased_name_snapshot",
    ):
        op.drop_column("trip_items", name)

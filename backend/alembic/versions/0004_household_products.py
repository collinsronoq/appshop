"""household product catalogue

Revision ID: 0004_household_products
Revises: 0003_households
"""

import uuid

import sqlalchemy as sa

from alembic import op

revision = "0004_household_products"
down_revision = "0003_households"
branch_labels = None
depends_on = None

CATEGORIES = [
    ("produce", "Produce"),
    ("dairy", "Dairy"),
    ("bakery", "Bakery"),
    ("meat", "Meat"),
    ("pantry", "Pantry"),
    ("beverages", "Beverages"),
    ("frozen", "Frozen"),
    ("household-cleaning", "Household Cleaning"),
    ("laundry", "Laundry"),
    ("bathroom", "Bathroom"),
    ("personal-care", "Personal Care"),
    ("baby", "Baby"),
    ("pet", "Pet"),
    ("other", "Other"),
]


def upgrade() -> None:
    op.create_table(
        "product_categories",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("slug", sa.String(64), nullable=False, unique=True),
        sa.Column("display_name", sa.String(120), nullable=False, unique=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_product_categories_sort_order", "product_categories", ["sort_order"])
    op.create_table(
        "household_products",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "household_id",
            sa.Uuid(),
            sa.ForeignKey("households.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("brand", sa.String(120)),
        sa.Column("variant", sa.String(160)),
        sa.Column("size_value", sa.Numeric(12, 3)),
        sa.Column("size_unit", sa.String(24)),
        sa.Column("usual_quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "category_id", sa.Uuid(), sa.ForeignKey("product_categories.id", ondelete="SET NULL")
        ),
        sa.Column("notes", sa.Text()),
        sa.Column("primary_image_key", sa.String(512)),
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
        sa.CheckConstraint("usual_quantity > 0", name="ck_household_products_positive_quantity"),
        sa.CheckConstraint(
            "size_value IS NULL OR size_value > 0", name="ck_household_products_positive_size"
        ),
    )
    op.create_index(
        "ix_household_products_household_archived",
        "household_products",
        ["household_id", "archived_at"],
    )
    op.create_index(
        "ix_household_products_household_category",
        "household_products",
        ["household_id", "category_id"],
    )
    op.create_table(
        "product_substitutes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "household_id",
            sa.Uuid(),
            sa.ForeignKey("households.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            sa.Uuid(),
            sa.ForeignKey("household_products.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "substitute_product_id",
            sa.Uuid(),
            sa.ForeignKey("household_products.id", ondelete="RESTRICT"),
        ),
        sa.Column("substitute_name", sa.String(200)),
        sa.Column("preference_rank", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("notes", sa.Text()),
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
            "substitute_product_id IS NOT NULL OR substitute_name IS NOT NULL",
            name="ck_product_substitutes_target",
        ),
        sa.CheckConstraint("preference_rank > 0", name="ck_product_substitutes_positive_rank"),
        sa.CheckConstraint(
            "substitute_product_id IS NULL OR substitute_product_id <> product_id",
            name="ck_product_substitutes_not_self",
        ),
    )
    op.create_index(
        "ix_product_substitutes_product_rank",
        "product_substitutes",
        ["product_id", "preference_rank"],
    )
    op.create_index("ix_product_substitutes_household", "product_substitutes", ["household_id"])
    connection = op.get_bind()
    for order, (slug, display) in enumerate(CATEGORIES):
        connection.execute(
            sa.text(
                "INSERT INTO product_categories "
                "(id, slug, display_name, sort_order) "
                "VALUES (:id, :slug, :display, :order)"
            ),
            {"id": str(uuid.uuid4()), "slug": slug, "display": display, "order": order},
        )


def downgrade() -> None:
    op.drop_table("product_substitutes")
    op.drop_table("household_products")
    op.drop_index("ix_product_categories_sort_order", table_name="product_categories")
    op.drop_table("product_categories")

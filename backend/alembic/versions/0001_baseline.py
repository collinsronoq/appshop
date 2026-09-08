"""baseline

Revision ID: 0001_baseline
Revises:
Create Date: 2026-09-08
"""

revision: str = "0001_baseline"
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Establish the migration head without business-domain tables."""


def downgrade() -> None:
    """Remove the baseline revision."""

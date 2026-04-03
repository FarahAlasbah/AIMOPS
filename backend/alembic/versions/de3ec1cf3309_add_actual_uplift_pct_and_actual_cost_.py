"""Add actual_uplift_pct and actual_cost to campaigns

Revision ID: de3ec1cf3309
Revises: c3d4e5f6a7b8
Create Date: 2026-04-03 16:35:03.050942

WHAT THIS DOES:
Adds actual_uplift_pct to campaigns table.
actual_cost already existed from the initial migration.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'de3ec1cf3309'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('campaigns', sa.Column(
        'actual_uplift_pct', sa.DECIMAL(6, 2), nullable=True
    ))


def downgrade() -> None:
    op.drop_column('campaigns', 'actual_uplift_pct')
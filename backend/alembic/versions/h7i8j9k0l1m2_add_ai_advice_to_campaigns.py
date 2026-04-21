"""add ai advice columns to campaigns

Revision ID: h7i8j9k0l1m2
Revises: g6h7i8j9k0l1
Create Date: 2026-04-21
"""
from alembic import op
import sqlalchemy as sa

revision = 'h7i8j9k0l1m2'
down_revision = 'g6h7i8j9k0l1'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('campaigns', sa.Column('ai_advice', sa.Text(), nullable=True))
    op.add_column('campaigns', sa.Column('ai_recommendations', sa.JSON(), nullable=True))
    op.add_column('campaigns', sa.Column('ai_risk_level', sa.String(20), nullable=True))

def downgrade():
    op.drop_column('campaigns', 'ai_advice')
    op.drop_column('campaigns', 'ai_recommendations')
    op.drop_column('campaigns', 'ai_risk_level')
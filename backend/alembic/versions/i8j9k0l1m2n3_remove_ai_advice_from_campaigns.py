"""remove ai advice columns from campaigns

Revision ID: i8j9k0l1m2n3
Revises: h7i8j9k0l1m2
Create Date: 2026-04-21
"""
from alembic import op
import sqlalchemy as sa

revision = 'i8j9k0l1m2n3'
down_revision = 'h7i8j9k0l1m2'
branch_labels = None
depends_on = None

def upgrade():
    op.drop_column('campaigns', 'ai_advice')
    op.drop_column('campaigns', 'ai_recommendations')
    op.drop_column('campaigns', 'ai_risk_level')

def downgrade():
    op.add_column('campaigns', sa.Column('ai_advice', sa.Text(), nullable=True))
    op.add_column('campaigns', sa.Column('ai_recommendations', sa.JSON(), nullable=True))
    op.add_column('campaigns', sa.Column('ai_risk_level', sa.String(20), nullable=True))
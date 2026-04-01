"""Add forecast tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-13 12:00:00.000000

WHAT THIS ADDS:
- forecast_models: one row per product, stores training metadata and model tier
- forecast_results: daily forecast rows (90 days per product)
- forecast_explanations: cached Claude-generated explanations per product
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # ── forecast_models ──
    op.create_table(
        'forecast_models',
        sa.Column('model_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('model_tier', sa.Enum(
            'xgboost_full',
            'xgboost_reduced',
            'simple_average',
            name='model_tier_enum'
        ), nullable=False),
        sa.Column('training_rows', sa.Integer(), nullable=False),
        sa.Column('training_date_start', sa.Date(), nullable=False),
        sa.Column('training_date_end', sa.Date(), nullable=False),
        sa.Column('trained_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('mae', sa.DECIMAL(10, 4), nullable=True),
        sa.Column('rmse', sa.DECIMAL(10, 4), nullable=True),
        sa.Column('r2', sa.DECIMAL(6, 4), nullable=True),
        sa.Column('status', sa.Enum(
            'training',
            'ready',
            'failed',
            name='forecast_model_status_enum'
        ), nullable=False, server_default='training'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.product_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('model_id'),
        sa.UniqueConstraint('product_id')
    )
    op.create_index('ix_forecast_models_product_id', 'forecast_models', ['product_id'])

    # ── forecast_results ──
    op.create_table(
        'forecast_results',
        sa.Column('forecast_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('model_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('forecast_date', sa.Date(), nullable=False),
        sa.Column('predicted_quantity', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('predicted_revenue', sa.DECIMAL(12, 2), nullable=True),
        sa.Column('quantity_lower', sa.DECIMAL(10, 2), nullable=True),
        sa.Column('quantity_upper', sa.DECIMAL(10, 2), nullable=True),
        sa.Column('confidence', sa.Enum(
            'high',
            'medium',
            'low',
            name='forecast_confidence_enum'
        ), nullable=False),
        sa.Column('has_event_boost', sa.Boolean(), server_default=sa.text('0'), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=True),
        sa.Column('event_multiplier', sa.DECIMAL(6, 4), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['model_id'], ['forecast_models.model_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.product_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['event_id'], ['events.event_id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('forecast_id')
    )
    op.create_index('ix_forecast_results_product_id', 'forecast_results', ['product_id'])
    op.create_index('ix_forecast_results_forecast_date', 'forecast_results', ['forecast_date'])
    op.create_index('ix_forecast_results_model_id', 'forecast_results', ['model_id'])

    # ── forecast_explanations ──
    op.create_table(
        'forecast_explanations',
        sa.Column('explanation_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('model_id', sa.Integer(), nullable=False),
        sa.Column('explanation_text', sa.Text(), nullable=False),
        sa.Column('key_drivers', sa.JSON(), nullable=True),
        sa.Column('horizon_days', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('forecast_start', sa.Date(), nullable=False),
        sa.Column('forecast_end', sa.Date(), nullable=False),
        sa.Column('generated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.product_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['model_id'], ['forecast_models.model_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('explanation_id'),
        sa.UniqueConstraint('product_id')
    )
    op.create_index('ix_forecast_explanations_product_id', 'forecast_explanations', ['product_id'])


def downgrade() -> None:
    op.drop_table('forecast_explanations')
    op.drop_table('forecast_results')
    op.drop_table('forecast_models')
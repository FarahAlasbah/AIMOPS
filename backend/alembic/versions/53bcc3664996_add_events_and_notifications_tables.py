"""Add events and notifications tables

Revision ID: 53bcc3664996
Revises: deedd5d5a93b
Create Date: 2026-02-16 21:26:03.694811

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '53bcc3664996'
down_revision: Union[str, Sequence[str], None] = 'deedd5d5a93b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Create events table ──
    op.create_table('events',
        sa.Column('event_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('event_name', sa.String(length=200), nullable=False),
        sa.Column('event_name_ar', sa.String(length=200), nullable=True),
        sa.Column('event_type', sa.Enum(
            'religious', 'national', 'seasonal', 'local',
            'business', 'promotional', 'custom',
            name='event_type_enum'
        ), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_recurring', sa.Boolean(), nullable=True),
        sa.Column('recurrence_type', sa.Enum(
            'yearly', 'monthly', 'one_time',
            name='recurrence_type_enum'
        ), nullable=True),
        sa.Column('status', sa.Enum(
            'draft', 'confirmed',
            name='event_status_enum'
        ), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('deleted_at', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.user_id']),
        sa.ForeignKeyConstraint(['updated_by'], ['users.user_id']),
        sa.PrimaryKeyConstraint('event_id')
    )

    # ── Create notifications table ──
    op.create_table('notifications',
        sa.Column('notification_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('notification_type', sa.Enum(
            'event_reminder', 'import_complete', 'import_failed',
            'forecast_ready', 'system',
            name='notification_type_enum'
        ), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('read_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('related_id', sa.Integer(), nullable=True),
        sa.Column('related_type', sa.Enum(
            'event', 'batch', 'forecast', 'system',
            name='notification_related_type_enum'
        ), nullable=True),
        sa.Column('email_sent', sa.Boolean(), nullable=False),
        sa.Column('email_sent_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('notification_id')
    )
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)

    # ── Create event_impact_results table ──
    op.create_table('event_impact_results',
        sa.Column('impact_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('baseline_period_start', sa.Date(), nullable=False),
        sa.Column('baseline_period_end', sa.Date(), nullable=False),
        sa.Column('baseline_daily_avg', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('during_daily_avg', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('change_percentage', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('impact_level', sa.Enum(
            'low', 'medium', 'high', 'very_high',
            name='impact_level_enum'
        ), nullable=False),
        sa.Column('calculated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['events.event_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.product_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('impact_id')
    )
    op.create_index(op.f('ix_event_impact_results_event_id'), 'event_impact_results', ['event_id'], unique=False)
    op.create_index(op.f('ix_event_impact_results_product_id'), 'event_impact_results', ['product_id'], unique=False)


def downgrade() -> None:
    # ── Drop in reverse order (foreign keys first) ──
    op.drop_index(op.f('ix_event_impact_results_product_id'), table_name='event_impact_results')
    op.drop_index(op.f('ix_event_impact_results_event_id'), table_name='event_impact_results')
    op.drop_table('event_impact_results')

    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_table('notifications')

    op.drop_table('events')
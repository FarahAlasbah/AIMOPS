"""Add campaign planning columns

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-03 12:00:00.000000

WHAT THIS ADDS:
Five new columns to the campaigns table to support the full
campaign planning, forecasting, and results tracking workflow.

WHY EACH COLUMN:
- campaign_type: drives multiplier selection (discount vs bundle behave differently)
- notes: passed to Claude API for context-aware business advice
- forecast_uplift_pct: store prediction at creation time for later comparison
- forecast_additional_revenue: store predicted revenue gain for ROI calculation
- linked_event_id: after campaign runs, link to the confirmed spike event
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # ── campaign_type ──
    # Drives which historical events we use as reference for multiplier.
    # A 'discount' campaign references past promotional events.
    # A 'seasonal' campaign references past seasonal events.
    op.add_column('campaigns', sa.Column(
        'campaign_type',
        sa.Enum(
            'discount',     # Price reduction (10%, 20%, etc.)
            'bundle',       # Buy X get Y
            'flash_sale',   # Short burst, high urgency
            'seasonal',     # Tied to a season or holiday
            'loyalty',      # Rewards program promotion
            'other',        # Anything else
            name='campaign_type_enum'
        ),
        nullable=True
    ))

    # ── notes ──
    # Free text from marketing user.
    # Passed to Claude API as context so advice is specific.
    # Example: "Targeting Ramadan shoppers, promoting premium dates"
    op.add_column('campaigns', sa.Column(
        'notes',
        sa.Text(),
        nullable=True
    ))

    # ── forecast_uplift_pct ──
    # What AIMOPS predicted at campaign creation time.
    # Stored so we can compare predicted vs actual after campaign runs.
    # Example: 155.0 means AIMOPS predicted +155% sales uplift.
    op.add_column('campaigns', sa.Column(
        'forecast_uplift_pct',
        sa.DECIMAL(6, 2),
        nullable=True
    ))

    # ── forecast_additional_revenue ──
    # Predicted additional revenue from the campaign.
    # Used to calculate predicted ROI at creation time.
    # Example: 8594.00 ILS predicted additional revenue.
    op.add_column('campaigns', sa.Column(
        'forecast_additional_revenue',
        sa.DECIMAL(12, 2),
        nullable=True
    ))

    # ── linked_event_id ──
    # After campaign runs and spike is detected in new data,
    # the confirmed event gets linked here.
    # This closes the loop: campaign → spike → event → future forecast.
    # Nullable because at creation time no event exists yet.
    op.add_column('campaigns', sa.Column(
        'linked_event_id',
        sa.Integer(),
        sa.ForeignKey('events.event_id', ondelete='SET NULL'),
        nullable=True
    ))


def downgrade() -> None:
    op.drop_column('campaigns', 'linked_event_id')
    op.drop_column('campaigns', 'forecast_additional_revenue')
    op.drop_column('campaigns', 'forecast_uplift_pct')
    op.drop_column('campaigns', 'notes')
    op.drop_column('campaigns', 'campaign_type')
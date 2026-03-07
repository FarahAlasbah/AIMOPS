"""Add event_detection notification type

Revision ID: a1b2c3d4e5f6
Revises: 53bcc3664996
Create Date: 2026-03-07 12:00:00.000000

WHAT THIS DOES:
Adds 'event_detection' to notification_type_enum.

The campaign detection background task creates notifications when it finds
sales spikes in imported data. These need their own type so the frontend
can route the user to the draft events review screen when they click it.

NOTE on baseline_data_quality:
That column already exists in the DB (MySQL created it even though it
wasn't visible in migration 53bcc3664996). Removed from this migration
to fix the "Duplicate column name" error.

MYSQL ENUM EXTENSION:
MySQL doesn't support ALTER TYPE (PostgreSQL syntax).
We use MODIFY COLUMN with the full new enum list instead.
Existing data is preserved automatically.
"""
from typing import Sequence, Union
from alembic import op


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '53bcc3664996'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE notifications
        MODIFY COLUMN notification_type ENUM(
            'event_reminder',
            'import_complete',
            'import_failed',
            'forecast_ready',
            'system',
            'event_detection'
        ) NOT NULL
    """)


def downgrade() -> None:
    # WARNING: Will fail if any rows have notification_type='event_detection'.
    # Delete those rows first before running downgrade.
    op.execute("""
        ALTER TABLE notifications
        MODIFY COLUMN notification_type ENUM(
            'event_reminder',
            'import_complete',
            'import_failed',
            'forecast_ready',
            'system'
        ) NOT NULL
    """)
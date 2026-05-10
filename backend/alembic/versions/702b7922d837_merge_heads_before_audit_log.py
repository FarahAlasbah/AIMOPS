"""merge heads before audit log

Revision ID: 702b7922d837
Revises: add_reports_and_campaign_notif, i8j9k0l1m2n3
Create Date: 2026-05-10 21:23:26.887200

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '702b7922d837'
down_revision: Union[str, Sequence[str], None] = ('add_reports_and_campaign_notif', 'i8j9k0l1m2n3')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

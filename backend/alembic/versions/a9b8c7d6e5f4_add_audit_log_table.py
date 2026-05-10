"""Add audit log table

Revision ID: a9b8c7d6e5f4
Revises: 702b7922d837
Create Date: 2026-05-10 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a9b8c7d6e5f4'
down_revision: Union[str, Sequence[str], None] = '702b7922d837'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'audit_logs',
        sa.Column('log_id', sa.Integer(), primary_key=True, autoincrement=True),

        # Who did the action
        sa.Column('performed_by_id', sa.Integer(),
                  sa.ForeignKey('users.user_id', ondelete='SET NULL'),
                  nullable=True),

        # Who it happened to (null for non-user actions in the future)
        sa.Column('target_user_id', sa.Integer(),
                  sa.ForeignKey('users.user_id', ondelete='SET NULL'),
                  nullable=True),

        # What happened
        sa.Column('action', sa.Enum(
            'user_created',
            'user_updated',
            'user_deleted',
            'user_reactivated',
            'password_changed',
            name='audit_action_enum'
        ), nullable=False),

        # What field changed (e.g. 'role', 'status', 'email')
        sa.Column('field_changed', sa.String(100), nullable=True),

        # Old and new values as strings
        sa.Column('old_value', sa.String(255), nullable=True),
        sa.Column('new_value', sa.String(255), nullable=True),

        # Extra context (e.g. username of created user)
        sa.Column('note', sa.String(500), nullable=True),

        # When
        sa.Column('created_at', sa.TIMESTAMP(),
                  server_default=sa.func.current_timestamp()),
    )


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.execute("DROP TYPE IF EXISTS audit_action_enum")
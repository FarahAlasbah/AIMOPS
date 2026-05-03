"""add campaign notification type and reports view permission

Revision ID: add_reports_and_campaign_notif
Revises: de3ec1cf3309
Create Date: 2026-05-03

WHAT THIS MIGRATION DOES:
1. Adds 'campaign' to the notification related_type enum
   (needed by campaign_scheduler.py when sending campaign-end notifications)

2. Inserts reports.view permission into the permissions table

3. Assigns reports.view to admin and business_owner roles
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_reports_and_campaign_notif'
down_revision = 'de3ec1cf3309'
branch_labels = None
depends_on = None


def upgrade():

    # ── 1. Add 'campaign' to notification related_type enum ──
    # MySQL requires recreating the enum column to add a new value.
    # We use MODIFY COLUMN with the full new enum definition.
    op.execute("""
        ALTER TABLE notifications
        MODIFY COLUMN related_type ENUM(
            'event',
            'batch',
            'forecast',
            'system',
            'campaign'
        ) NULL
    """)

    # ── 2. Insert reports.view permission ──
    op.execute("""
        INSERT IGNORE INTO permissions (permission_name, display_name, description, resource, action)
        VALUES (
            'reports.view',
            'View Reports',
            'Access the business performance reports dashboard',
            'reports',
            'view'
        )
    """)

    # ── 3. Assign reports.view to admin and business_owner roles ──
    # We use a subquery to get the permission_id and role_ids
    # so this works regardless of what IDs were auto-assigned.
    op.execute("""
        INSERT IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.role_id, p.permission_id
        FROM roles r, permissions p
        WHERE r.role_name IN ('admin', 'business_owner')
        AND p.permission_name = 'reports.view'
    """)


def downgrade():

    # ── 3. Remove reports.view from role_permissions ──
    op.execute("""
        DELETE rp FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE p.permission_name = 'reports.view'
    """)

    # ── 2. Remove reports.view permission ──
    op.execute("""
        DELETE FROM permissions
        WHERE permission_name = 'reports.view'
    """)

    # ── 1. Remove 'campaign' from related_type enum ──
    op.execute("""
        ALTER TABLE notifications
        MODIFY COLUMN related_type ENUM(
            'event',
            'batch',
            'forecast',
            'system'
        ) NULL
    """)
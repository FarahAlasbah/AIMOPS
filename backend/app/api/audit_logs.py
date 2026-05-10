"""
File: app/api/audit_logs.py
Purpose: Audit log viewing for admins
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.api.dependencies import get_current_active_admin
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter(prefix="/api/audit-logs", tags=["Audit Logs"])


@router.get("")
def get_audit_logs(
    target_user_id: Optional[int] = None,   # Filter by who was affected
    performed_by_id: Optional[int] = None,  # Filter by who did the action
    action: Optional[str] = None,           # Filter by action type
    limit: int = Query(default=50, le=200), # Max 200 per page
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    query = db.query(AuditLog)

    if target_user_id:
        query = query.filter(AuditLog.target_user_id == target_user_id)
    if performed_by_id:
        query = query.filter(AuditLog.performed_by_id == performed_by_id)
    if action:
        query = query.filter(AuditLog.action == action)

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    # Fetch performer and target usernames in one query each
    user_ids = set()
    for log in logs:
        if log.performed_by_id:
            user_ids.add(log.performed_by_id)
        if log.target_user_id:
            user_ids.add(log.target_user_id)

    users = db.query(User.user_id, User.username).filter(
        User.user_id.in_(user_ids)
    ).all()
    username_map = {u.user_id: u.username for u in users}

    return {
        "success": True,
        "total": total,
        "offset": offset,
        "limit": limit,
        "logs": [
            {
                "log_id": log.log_id,
                "action": log.action,
                "performed_by": username_map.get(log.performed_by_id, "deleted_user"),
                "target_user": username_map.get(log.target_user_id, "deleted_user"),
                "field_changed": log.field_changed,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "note": log.note,
                "created_at": log.created_at.isoformat()
            }
            for log in logs
        ]
    }
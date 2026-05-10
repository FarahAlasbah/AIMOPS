"""
File: app/models/audit_log.py
Purpose: Audit trail for all admin actions on users
"""
from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)

    # Who performed the action
    performed_by_id = Column(
        Integer,
        ForeignKey('users.user_id', ondelete='SET NULL'),
        nullable=True
    )

    # Who the action was performed on
    target_user_id = Column(
        Integer,
        ForeignKey('users.user_id', ondelete='SET NULL'),
        nullable=True
    )

    # What action was taken
    action = Column(
        Enum(
            'user_created',
            'user_updated',
            'user_deleted',
            'user_reactivated',
            'password_changed',
            name='audit_action_enum'
        ),
        nullable=False
    )

    # For updates: which field changed
    field_changed = Column(String(100), nullable=True)

    # Before and after values
    old_value = Column(String(255), nullable=True)
    new_value = Column(String(255), nullable=True)

    # Extra context
    note = Column(String(500), nullable=True)

    # Timestamp
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    # Relationships
    performed_by = relationship("User", foreign_keys=[performed_by_id])
    target_user = relationship("User", foreign_keys=[target_user_id])

    def __repr__(self):
        return f"<AuditLog {self.action} by user {self.performed_by_id} on user {self.target_user_id}>"
"""
File: backend/app/models/notification.py
Purpose: In-app notification system
"""
from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    #   Primary Key  
    notification_id = Column(Integer, primary_key=True, autoincrement=True)

    #   Who sees this  
    user_id = Column(
        Integer,
        ForeignKey('users.user_id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    #   Content  
    title = Column(String(200), nullable=False)

    message = Column(Text, nullable=False)

    #   Type  
    notification_type = Column(
        Enum(
            'event_reminder',    # Recurring event coming up
            'import_complete',   # File imported successfully
            'import_failed',     # File import failed
            'forecast_ready',    # Forecast calculation done
            'system',            # General system message
            'event_detection',
            name='notification_type_enum'
        ),
        nullable=False
    )
    # Frontend can show different icons per type

    #   Read Status  
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(TIMESTAMP, nullable=True)
    # WHY TWO FIELDS:
    # is_read: fast filtering "show unread only"
    # read_at: audit trail "when did user read this"

    #   Related Entity  
    related_id = Column(Integer, nullable=True)
    related_type = Column(
        Enum(
            'event',
            'batch',
            'forecast',
            'system',
            name='notification_related_type_enum'
        ),
        nullable=True
    )
    # WHY: Frontend can make notification clickable
    # "Ramadan reminder" → click → goes to event page
    # "Import complete" → click → goes to batch details
    # related_id + related_type tells frontend where to navigate

    #   Email Support (future)  
    email_sent = Column(Boolean, default=False, nullable=False)
    email_sent_at = Column(TIMESTAMP, nullable=True)

    #   Timestamps  
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    #   Relationships  
    user = relationship("User")

    def __repr__(self):
        return f"<Notification {self.notification_id}: {self.title} ({'read' if self.is_read else 'unread'})>"
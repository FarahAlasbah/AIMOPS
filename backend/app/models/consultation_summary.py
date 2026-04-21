# backend/app/models/consultation_summary.py
"""
File: backend/app/models/consultation_summary.py
Purpose: Stores user-saved summaries of consultation conversations.

WHY SEPARATE FROM MESSAGES:
Summaries are standalone business records — not part of the chat flow.
They are never sent to Claude, never affect forecasting.
They exist purely as human-readable notes the marketing team saves
when a conversation contains decisions worth keeping.

One user can have many summaries.
Summaries are never auto-deleted — only the user can remove them.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class ConsultationSummary(Base):
    __tablename__ = "consultation_summaries"

    summary_id = Column(Integer, primary_key=True, autoincrement=True)

    # Who saved this summary
    user_id = Column(
        Integer,
        ForeignKey('users.user_id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    # User-provided name for this summary
    # Example: "Ramadan 2026 strategy discussion"
    title = Column(String(200), nullable=False)

    # Claude-generated summary content
    content = Column(Text, nullable=False)

    created_at = Column(DateTime, server_default=func.now())

    # Relationship back to user
    user = relationship("User", backref="consultation_summaries")

    def __repr__(self):
        return f"<ConsultationSummary {self.summary_id}: {self.title}>"
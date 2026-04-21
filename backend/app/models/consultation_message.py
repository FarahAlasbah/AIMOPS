# backend/app/models/consultation_message.py
"""
File: backend/app/models/consultation_message.py
Purpose: Stores the chat history between marketing users and Claude.

One row = one message (either user or assistant).
All messages for a user form their continuous consultation thread.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class ConsultationMessage(Base):
    __tablename__ = "consultation_messages"

    message_id = Column(Integer, primary_key=True, autoincrement=True)

    # Who sent/received this message
    user_id = Column(
        Integer,
        ForeignKey('users.user_id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    # 'user' or 'assistant'
    role = Column(String(20), nullable=False)

    # The message content
    content = Column(Text, nullable=False)

    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", backref="consultation_messages")

    def __repr__(self):
        return f"<ConsultationMessage {self.message_id} role:{self.role}>"
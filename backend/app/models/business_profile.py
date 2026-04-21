from sqlalchemy import Column, Integer, String, DateTime, func
from app.core.database import Base

class BusinessProfile(Base):
    __tablename__ = "business_profile"

    profile_id = Column(Integer, primary_key=True, autoincrement=True)
    business_name = Column(String(100), nullable=False)
    industry = Column(String(50), nullable=True)
    city = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
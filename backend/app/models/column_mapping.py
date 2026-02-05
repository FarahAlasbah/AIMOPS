"""
File: backend/app/models/column_mapping.py

Database model for storing user's column mapping decisions
"""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, TIMESTAMP, Enum, DECIMAL, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class ColumnMapping(Base):
    """
    Stores user's confirmed column mappings
    """
    
    __tablename__ = "column_mappings"
    
    mapping_id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(Integer, ForeignKey('ingestion_batches.batch_id'), nullable=False)
    
    # The actual column name from the uploaded file
    source_column_name = Column(String(200), nullable=False)
    source_column_index = Column(Integer, nullable=False)
    
    # Language detection
    detected_language = Column(
        Enum('english', 'arabic', 'mixed', 'unknown'),
        default='english'
    )
    
    # What role this column maps to
    target_field = Column(
        Enum('date', 'product_code', 'product_name', 'category', 'quantity',
             'unit_price', 'total_amount', 'discount', 'customer_id', 
             'location', 'payment_method', 'other'),
        nullable=False
    )
    
    # Confidence score
    confidence_score = Column(DECIMAL(3, 2), nullable=True)
    
    # User confirmation
    is_confirmed = Column(Boolean, default=False)
    confirmed_by = Column(Integer, ForeignKey('users.user_id'), nullable=True)
    confirmed_at = Column(TIMESTAMP, nullable=True)
    
    # Additional metadata
    detected_data_type = Column(String(50), nullable=True)
    sample_values = Column(JSON, nullable=True)
    transformation_applied = Column(String(100), nullable=True)
"""
Sales Record Model - Stores individual sales transactions

File: backend/app/models/sales_record.py

Provides normalized data for time-series forecasting algorithms.
Enables fast aggregation queries for dashboards and analytics.

DATA FLOW:
Raw Upload → Column Mapping → Product Extraction → User Confirmation → SalesRecord creation
"""
from sqlalchemy import Column, Integer, String, Date, DECIMAL, ForeignKey, TIMESTAMP, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class SalesRecord(Base):
    """
    Individual sales transaction record
    
    """
    __tablename__ = "sales_records"
    
    # ============================================
    # Primary Key
    # ============================================
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    
    # ============================================
    # Foreign Keys - The Links
    # ============================================
    batch_id = Column(
        Integer, 
        ForeignKey('ingestion_batches.batch_id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    # TECHNICAL: ondelete='CASCADE'
    # If batch deleted → all its sales deleted automatically
    
    product_id = Column(
        Integer,
        ForeignKey('products.product_id', ondelete='RESTRICT'),
        nullable=False,
        index=True
    )
    # TECHNICAL: ondelete='RESTRICT'
    # Cannot delete product if it has sales
    
    # ============================================
    # Sales Data - The Facts
    # ============================================
    sale_date = Column(Date, nullable=False, index=True)
    # TECHNICAL: Indexed for time-series queries
    # WHY: Forecasting queries always filter by date range
    # QUERY: SELECT * FROM sales_records WHERE sale_date BETWEEN '2024-01-01' AND '2024-12-31'
    
    quantity = Column(DECIMAL(10, 2), nullable=False)
    # DECIMAL(10, 2) = max 99,999,999.99
    # WHY: Support fractional quantities (2.5kg, 0.75L)
    
    unit_price = Column(DECIMAL(10, 2), nullable=True)
    # Optional: Can calculate from total_amount / quantity
    
    total_amount = Column(DECIMAL(10, 2), nullable=True)
    # Optional: Can calculate from unit_price * quantity
    # We allow either approach depending on user's data
    
    discount = Column(DECIMAL(10, 2), nullable=True, default=0)
    # Track promotional discounts for campaign analysis
    
    # ============================================
    # Optional Beneficial Fields
    # ============================================
    category = Column(String(100), nullable=True)
    # If user's file has category, we store it
    # Enables category-level forecasting
    
    channel = Column(String(100), nullable=True)
    # Sales channel: "Instagram", "In-Store", "Website"
    # Enables channel performance analysis
    
    customer_id = Column(String(100), nullable=True)
    # For customer segmentation analysis
    
    product_code = Column(String(50), nullable=True)
    # SKU/barcode if provided in user's file
    
    # ============================================
    # Metadata
    # ============================================
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    # Audit trail: when was this record created
    
    # ============================================
    # Relationships - ORM Magic
    # ============================================
    batch = relationship("IngestionBatch", backref="sales_records")
    # TECHNICAL: SQLAlchemy relationship
    # Enables: batch.sales_records → get all sales from this upload
    # Also: sale.batch → get batch info from a sale
    # NO extra queries needed - ORM handles joins
    
    product = relationship("Product", backref="sales_records")
    # TECHNICAL: Lazy loading by default
    # When you access sale.product, SQLAlchemy fetches product data
    # Can configure eager loading for performance if needed
    
    # ============================================
    # Composite Indexes - Performance Optimization
    # ============================================
    __table_args__ = (
        Index('idx_date_product', 'sale_date', 'product_id'),
        # TECHNICAL: Composite index on (date, product)
        # WHY: Forecasting queries always filter by BOTH
        # QUERY: SELECT * FROM sales_records 
        #        WHERE sale_date > '2024-01-01' AND product_id = 5
        # WITHOUT INDEX: Scans entire table (slow)
        # WITH INDEX: Jumps directly to matching rows (fast)
        # PERFORMANCE: 1,000,000 rows = 5 seconds → 0.02 seconds
        
        Index('idx_batch_product', 'batch_id', 'product_id'),
        # WHY: Check for duplicate imports
        # QUERY: SELECT COUNT(*) FROM sales_records 
        #        WHERE batch_id = 10 AND product_id = 5
    )
    
    def __repr__(self):
        return f"<SalesRecord {self.record_id}: Product {self.product_id} on {self.sale_date}>"
    
    def to_dict(self):
        """
        Convert to dictionary for JSON API responses
        
        TECHNICAL: Pydantic alternative
            - Pydantic models are great for request/response validation
            - But for internal use, a simple to_dict can be more flexible
            - Avoids overhead of defining separate Pydantic models for every case
        """
        return {
            "record_id": self.record_id,
            "batch_id": self.batch_id,
            "product_id": self.product_id,
            "sale_date": self.sale_date.isoformat() if self.sale_date else None,
            "quantity": float(self.quantity) if self.quantity else None,
            "unit_price": float(self.unit_price) if self.unit_price else None,
            "total_amount": float(self.total_amount) if self.total_amount else None,
            "discount": float(self.discount) if self.discount else None,
            "category": self.category,
            "channel": self.channel,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
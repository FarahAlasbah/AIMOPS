"""
File: backend/app/models/ingestion_batch.py

Purpose: Represents an uploaded sales file
Matches your existing database schema EXACTLY

"""
from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class IngestionBatch(Base):
    """
    Represents one uploaded sales file
    
    Status Flow:
    pending → User just uploaded
       ↓
    mapping → User reviewing column mappings (YOUR ADDITION - SMART!)
       ↓
    processing → Import in progress
       ↓
    completed → Import succeeded ✅
       OR
    failed → Import failed ❌
    
    Example:
        batch = IngestionBatch(
            file_name="sales_2024.xlsx",
            file_type="xlsx",
            file_size_kb=2560,  # 2.5 MB
            uploaded_by=1,
            status="pending"
        )
    """
    __tablename__ = "ingestion_batches"
    
    # ============================================
    # Primary Key
    # ============================================
    batch_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    
    # ============================================
    # File Information
    # ============================================
    
    file_name = Column(String(255), nullable=False)
    # What: Original filename from user
    # Example: "sales_2024.xlsx"
    
    file_type = Column(
        Enum('csv', 'xlsx', 'xls', name='file_type_enum'),
        nullable=False
    )
    # What: File format
    # Why: Validate before processing, use correct parser
    
    file_size_kb = Column(Integer, nullable=True)
    # What: File size in kilobytes
    # Why: Show "2.5 MB", prevent huge files
    
    file_checksum = Column(String(64), nullable=True, index=True)
    # What: MD5 or SHA hash of file content
   
    # ============================================
    # User Tracking
    # ============================================
    
    uploaded_by = Column(
        Integer, 
        ForeignKey('users.user_id', ondelete='RESTRICT'),
        nullable=False,
        index=True
    )
    # What: Which user uploaded this
    # Why: Track ownership, permissions
    # ondelete='RESTRICT': Can't delete user if they have uploads
    # Your naming 'uploaded_by': More descriptive than 'user_id'!
    
    
    # ============================================
    # Status Tracking
    # ============================================
    
    status = Column(
        Enum('pending', 'mapping', 'processing', 'completed', 'failed', 
             name='batch_status_enum'),
        default='pending',
        nullable=False,
        index=True
    )
    # What: Current state of this upload
    # Your addition of 'mapping': Perfect for column confirmation step!
    # Flow: pending → mapping → processing → completed/failed
    
    
    # ============================================
    # Row Statistics
    # ============================================
    
    total_rows = Column(Integer, default=0)
    # What: Total rows in file (including header)
    
    valid_rows = Column(Integer, default=0)
    # What: Rows successfully imported
    
    rejected_rows = Column(Integer, default=0)
    # What: Rows skipped due to errors
    
    
    # ============================================
    # Data Range
    # ============================================
    
    date_range_start = Column(Date, nullable=True)
    # What: Earliest date in the sales data
        
    date_range_end = Column(Date, nullable=True)
    # What: Latest date in the sales data
    
    
    # ============================================
    # Timestamps
    # ============================================
    
    uploaded_at = Column(
        DateTime,
        default=datetime.utcnow,
        index=True
    )
    # What: When user uploaded file
    # Why: Sort by recent, show "2 hours ago"
    
    processing_started_at = Column(DateTime, nullable=True)
    # What: When import started
    # Why: Calculate duration
    
    processing_completed_at = Column(DateTime, nullable=True)
    # What: When import finished (success or fail)
    # Why: Calculate duration, show completion time
    
    processing_duration_seconds = Column(Integer, nullable=True)
    # What: How long import took
    # Why: Performance monitoring, show "Import took 30 seconds"
    # Your addition: Great for performance tracking!
    
    
    # ============================================
    # Error Handling
    # ============================================
    
    error_message = Column(Text, nullable=True)
    # What: Error details if status = 'failed'
    # Why: Show user "Import failed: Invalid date format in row 15"
    
    
    # ============================================
    # Soft Delete
    # ============================================
    
    deleted_at = Column(DateTime, nullable=True, index=True)
    # What: When batch was deleted (NULL if not deleted)
    # Why: Soft delete - can restore if deleted by mistake
 
    # ============================================
    # Helper Methods
    # ============================================
    
    def __repr__(self):
        """For debugging"""
        return f"<IngestionBatch {self.batch_id}: {self.file_name} ({self.status})>"
    
    
    def to_dict(self):
        """
        Convert to dictionary for JSON responses
        
        Returns all fields that frontend needs
        """
        return {
            "batch_id": self.batch_id,
            "file_name": self.file_name,
            "file_type": self.file_type,
            "file_size_kb": self.file_size_kb,
            "uploaded_by": self.uploaded_by,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "status": self.status,
            "total_rows": self.total_rows,
            "valid_rows": self.valid_rows,
            "rejected_rows": self.rejected_rows,
            "date_range_start": self.date_range_start.isoformat() if self.date_range_start else None,
            "date_range_end": self.date_range_end.isoformat() if self.date_range_end else None,
            "processing_completed_at": self.processing_completed_at.isoformat() if self.processing_completed_at else None,
            "processing_duration_seconds": self.processing_duration_seconds,
            "error_message": self.error_message
        }
    
    
    def is_deleted(self):
        """Check if batch is soft-deleted"""
        return self.deleted_at is not None
    
    
    def mark_deleted(self):
        """Soft delete this batch"""
        self.deleted_at = datetime.utcnow()
    
    
    def restore(self):
        """Restore soft-deleted batch"""
        self.deleted_at = None
    
    
    def calculate_duration(self):
        """
        Calculate processing duration
        
        Returns: Duration in seconds, or None if not completed
        """
        if self.processing_started_at and self.processing_completed_at:
            delta = self.processing_completed_at - self.processing_started_at
            return int(delta.total_seconds())
        return None
    
    
    def get_success_rate(self):
        """
        Calculate import success rate
        
        Returns: Percentage of rows successfully imported
        """
        if self.total_rows and self.total_rows > 0:
            return (self.valid_rows / self.total_rows) * 100
        return 0.0


# 1. file_checksum:
#    Prevents duplicate uploads
#    "You already uploaded this file on Jan 15"
#    Saves processing time, prevents duplicate data

# 2. file_type enum:
#    Validates before processing
#    Can't upload PDF, Word docs
#    Uses correct parser (CSV vs Excel)

# 3. Row statistics:
#    User sees "1230/1250 rows imported, 20 rejected"
#    Data quality visibility
#    Can review rejected rows

# 4. Date range:
#    User sees "This file contains Jan-Dec 2024"
#    Helps identify gaps in data
#    Shows data coverage

# 5. mapping status:
#    Extra state for column confirmation
#    Perfect for your preview-confirm flow!
#    pending → upload
#    mapping → user reviewing columns
#    processing → importing

# 6. processing_duration_seconds:
#    Performance monitoring
#    "Import took 45 seconds"
#    Can optimize slow imports

# 7. Soft delete:
#    Can restore deleted batches
#    Audit trail preserved
#    "Undo delete" feature

# 8. Indexes:
#    Fast queries on status, uploaded_at, checksum
#    Efficient database operations
#    Production-ready!

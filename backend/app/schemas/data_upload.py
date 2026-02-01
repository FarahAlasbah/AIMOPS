"""
File: backend/app/schemas/data_upload.py

Purpose: Request/response schemas for data upload endpoints
Why: Validate responses, auto-generate API docs

"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


# ============================================
# Response Schemas (What API Returns)
# ============================================

class UploadInitiateResponse(BaseModel):
    """
    Response after file upload (before user confirms)
    
    This is returned immediately after user uploads file
    Shows user: "We received your file, analyzing..."
    
    Example response:
    {
        "batch_id": 1,
        "file_name": "sales_2024.xlsx",
        "file_type": "xlsx",
        "file_size_kb": 2560,
        "status": "pending",
        "message": "File uploaded successfully. Analyzing..."
    }
    """
    batch_id: int = Field(..., description="Unique batch ID for this upload")
    file_name: str = Field(..., description="Original filename")
    file_type: str = Field(..., description="File format (csv, xlsx, xls)")
    file_size_kb: int = Field(..., description="File size in kilobytes")
    status: str = Field(..., description="Current status (pending)")
    message: str = Field(..., description="Success message")
    uploaded_at: datetime = Field(..., description="When file was uploaded")
    
    class Config:
        # Example for API docs
        json_schema_extra = {
            "example": {
                "batch_id": 1,
                "file_name": "sales_2024.xlsx",
                "file_type": "xlsx",
                "file_size_kb": 2560,
                "status": "pending",
                "message": "File uploaded successfully. Analyzing...",
                "uploaded_at": "2026-01-27T15:30:00"
            }
        }


class BatchInfoResponse(BaseModel):
    """
    Detailed information about an upload batch
    
    Used for:
    - GET /api/data/uploads/{batch_id}
    - After processing completes
    
    Shows everything about the upload
    """
    batch_id: int
    file_name: str
    file_type: str
    file_size_kb: int
    uploaded_by: int
    uploaded_at: datetime
    status: str
    
    # Row statistics (after processing)
    total_rows: int = 0
    valid_rows: int = 0
    rejected_rows: int = 0
    
    # Date range (after processing)
    date_range_start: Optional[date] = None
    date_range_end: Optional[date] = None
    
    # Processing info
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    processing_duration_seconds: Optional[int] = None
    
    # Error info (if failed)
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True  # Allow creating from SQLAlchemy model
        json_schema_extra = {
            "example": {
                "batch_id": 1,
                "file_name": "sales_2024.xlsx",
                "file_type": "xlsx",
                "file_size_kb": 2560,
                "uploaded_by": 1,
                "uploaded_at": "2026-01-27T15:30:00",
                "status": "completed",
                "total_rows": 1250,
                "valid_rows": 1230,
                "rejected_rows": 20,
                "date_range_start": "2024-01-01",
                "date_range_end": "2024-12-31",
                "processing_completed_at": "2026-01-27T15:31:00",
                "processing_duration_seconds": 45,
                "error_message": None
            }
        }


class BatchListResponse(BaseModel):
    """
    Simplified batch info for list view
    
    Used for: GET /api/data/uploads
    Shows: List of all uploads with basic info
    
    Why simpler than BatchInfoResponse?
    - List might have 100+ items
    - Don't need all details in list
    - Performance: less data to transfer
    """
    batch_id: int
    file_name: str
    file_type: str
    file_size_kb: int
    status: str
    uploaded_at: datetime
    valid_rows: int = 0
    rejected_rows: int = 0
    
    class Config:
        from_attributes = True


# ============================================
# Why These Schemas?
# ============================================

# Q: Why different schemas for same data?
# A: Different use cases need different levels of detail
#
# UploadInitiateResponse:
#   - Immediate response after upload
#   - Just confirms "We got your file"
#   - Minimal info
#
# BatchInfoResponse:
#   - After processing completes
#   - Shows everything (stats, duration, errors)
#   - Full detail
#
# BatchListResponse:
#   - For listing many uploads
#   - Only essential info
#   - Performance optimized

# Q: Why use Pydantic for responses?
# A: 
# 1. Auto-generates API documentation
# 2. FastAPI validates response matches schema
# 3. Type hints help IDEs
# 4. Example values for Swagger UI
"""
File: backend/app/schemas/data_upload.py

Purpose: Request/response schemas for data upload endpoints
Why: Validate responses, auto-generate API docs

"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


# ============================================
# Request Schemas (What User Sends)
# ============================================

class ColumnMappingRequest(BaseModel):
    """
    User's column mapping choices for data import
    
    Sent when user confirms column mappings and clicks "Import"
    
    Example request:
    {
        "date_column": "sale_date",
        "product_column": "product_name", 
        "quantity_column": "qty",
        "price_column": "unit_price",
        "total_amount_column": "total",
        "category_column": "category",
        "skip_columns": ["employee_id", "invoice_number"]
    }
    """
    # Required mappings
    date_column: str = Field(..., description="Column containing sale dates")
    product_column: str = Field(..., description="Column containing product names")
    quantity_column: str = Field(..., description="Column containing quantities sold")
    
    # Optional but beneficial
    price_column: Optional[str] = Field(None, description="Column containing unit prices")
    total_amount_column: Optional[str] = Field(None, description="Column containing total amounts")
    category_column: Optional[str] = Field(None, description="Column containing product categories")
    brand_column: Optional[str] = Field(None, description="Column containing brands")
    channel_column: Optional[str] = Field(None, description="Column containing sales channels")
    customer_id_column: Optional[str] = Field(None, description="Column containing customer IDs")
    product_code_column: Optional[str] = Field(None, description="Column containing product codes/SKUs")
    discount_column: Optional[str] = Field(None, description="Column containing discount amounts")
    
    # Columns to skip
    skip_columns: List[str] = Field(default=[], description="Columns to ignore during import")
    
    class Config:
        json_schema_extra = {
            "example": {
                "date_column": "sale_date",
                "product_column": "product_name",
                "quantity_column": "qty",
                "price_column": "unit_price",
                "category_column": "category",
                "skip_columns": ["employee_id", "invoice_number"]
            }
        }


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


class ProcessingResponse(BaseModel):
    """
    Response after processing/importing data
    
    Returns statistics about the import
    """
    success: bool
    message: str
    batch_id: int
    status: str
    statistics: dict
    date_range: dict
    processing_time_seconds: Optional[int] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "File processed successfully",
                "batch_id": 1,
                "status": "completed",
                "statistics": {
                    "total_rows": 1250,
                    "valid_rows": 1230,
                    "rejected_rows": 20,
                    "success_rate": 98.4
                },
                "date_range": {
                    "start": "2024-01-01",
                    "end": "2024-12-31"
                },
                "processing_time_seconds": 45
            }
        }


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
#
# ColumnMappingRequest:
#   - User's confirmed column choices
#   - Validates required fields present
#   - Documents what columns mean

# Q: Why use Pydantic for responses?
# A: 
# 1. Auto-generates API documentation
# 2. FastAPI validates response matches schema
# 3. Type hints help IDEs
# 4. Example values for Swagger UI
"""
File: backend/app/schemas/data_upload.py
Purpose: Request/response schemas for data upload endpoints
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum


# ============================================
# Request Schemas
# ============================================

class ColumnMappingRequest(BaseModel):
    """Legacy schema — kept for compatibility."""
    date_column: str
    product_column: str
    quantity_column: str
    price_column: Optional[str] = None
    total_amount_column: Optional[str] = None
    category_column: Optional[str] = None
    brand_column: Optional[str] = None
    channel_column: Optional[str] = None
    customer_id_column: Optional[str] = None
    product_code_column: Optional[str] = None
    discount_column: Optional[str] = None
    skip_columns: List[str] = Field(default=[])


class TargetField(str, Enum):
    date = "date"
    product_code = "product_code"
    product_name = "product_name"
    category = "category"
    quantity = "quantity"
    unit_price = "unit_price"
    total_amount = "total_amount"
    discount = "discount"
    customer_id = "customer_id"
    location = "location"
    payment_method = "payment_method"
    other = "other"
    skip = "skip"


class ColumnMappingConfirm(BaseModel):
    """Single column mapping confirmation from user."""
    original_name: str
    role: str   # TargetField value or "skip"


class MappingConfirmation(BaseModel):
    """
    Full mapping confirmation submitted by user.

    WHAT THE USER SENDS:
    ALL columns from the file — including the ones AIMOPS already detected
    with high confidence. The user reviewed everything on screen and this
    is their final answer for every column.
    """
    mappings: List[ColumnMappingConfirm]

    class Config:
        json_schema_extra = {
            "example": {
                "mappings": [
                    {"original_name": "Sale DT", "role": "date"},
                    {"original_name": "Item Description", "role": "product_name"},
                    {"original_name": "Qty Sold", "role": "quantity"},
                    {"original_name": "Unit Price", "role": "unit_price"},
                    {"original_name": "Notes", "role": "skip"}
                ]
            }
        }


# ============================================
# Column Info for Frontend
# ============================================

class ColumnForReview(BaseModel):
    """
    One column's detection result, formatted for the UI confirmation screen.

    confidence_level drives how the frontend displays the column:
    - "high"   → green checkmark, pre-selected, user can still change
    - "medium" → yellow warning, pre-selected but flagged for attention
    - "low"    → red/empty, user must assign a role
    - "skip"   → pre-checked as skip (probably_not_useful columns)
    """
    name: str
    index: int
    suggested_role: str                         # AIMOPS's best guess
    confidence: float
    confidence_level: str                       # "high" / "medium" / "low" / "skip"
    alternative_roles: List[str] = []           # Dropdown options
    samples: List[Any] = []                     # First 5 real values from file
    display_hint: str = ""                      # Human-readable explanation
    classification: Optional[str] = None        # "required" / "beneficial" / etc.
    completeness: Optional[float] = None        # % of non-null values
    why: Optional[str] = None                   # Why this field matters

    @validator("alternative_roles", pre=True, always=True)
    def coerce_alternative_roles(cls, v):
        return v if v is not None else []

    @validator("samples", pre=True, always=True)
    def coerce_samples(cls, v):
        return v if v is not None else []


# ============================================
# Upload Response (NEW)
# ============================================

class UploadWithAnalysisResponse(BaseModel):
    """
    Response after POST /upload-sales.

    WHAT CHANGED:
    Old UploadInitiateResponse only returned batch_id and a status message.
    This response includes the full column analysis so the frontend can
    immediately render the mapping confirmation screen without a second API call.

    columns: ALL columns from the file, each tagged with confidence level.
             Frontend shows all of them — high-confidence ones are pre-filled,
             low-confidence ones need user input.

    required_missing: Required fields (date, product, quantity) that we
                      couldn't detect at all. Frontend must highlight these
                      and force the user to assign them before proceeding.

    analysis_error: If file analysis crashed, this is set and columns is empty.
                    Frontend should show a warning and allow manual mapping,
                    or prompt the user to call GET /analyze/{batch_id} to retry.
    """
    batch_id: int
    file_name: str
    file_type: str
    file_size_kb: int
    status: str
    uploaded_at: datetime
    columns: List[ColumnForReview]
    required_missing: List[Dict[str, Any]] = []
    sample_data: List[Dict[str, Any]] = []
    file_info: Dict[str, Any] = {}
    analysis_error: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "batch_id": 42,
                "file_name": "sales_q1.xlsx",
                "file_type": "xlsx",
                "file_size_kb": 1024,
                "status": "mapping",
                "uploaded_at": "2026-03-07T10:00:00",
                "columns": [
                    {
                        "name": "Sale Date",
                        "index": 0,
                        "suggested_role": "date",
                        "confidence": 0.95,
                        "confidence_level": "high",
                        "alternative_roles": ["skip"],
                        "samples": ["2024-01-15", "2024-01-16"],
                        "display_hint": "We're confident this is 'Date'",
                        "why": "Required for time-series forecasting"
                    },
                    {
                        "name": "Notes",
                        "index": 5,
                        "suggested_role": "skip",
                        "confidence": 0.8,
                        "confidence_level": "skip",
                        "alternative_roles": ["include_anyway"],
                        "samples": ["N/A", "bulk order"],
                        "display_hint": "This column is likely not needed for analysis"
                    }
                ],
                "required_missing": [],
                "analysis_error": None
            }
        }


# ============================================
# Mapping Confirmation Response
# ============================================

class ConfirmedMapping(BaseModel):
    original_name: str
    role: str
    was_changed: bool
    confidence: Optional[float] = None


class MappingConfirmationResponse(BaseModel):
    """
    Response after POST /confirm-mappings/{batch_id}.

    Now includes extracted products directly (no separate /extract-products call).

    flow: "single_product" or "multiple_products"
    - single_product: frontend skips product review, goes straight to import
    - multiple_products: frontend shows product review screen using `products`
    """
    success: bool
    batch_id: int
    mappings_saved: int
    confirmed_mappings: List[ConfirmedMapping]
    flow: str
    single_product_info: Optional[Dict[str, Any]] = None
    products: Optional[Dict[str, Any]] = None   # extraction_result if multiple_products
    next_step: str


# ============================================
# Other Response Schemas (unchanged)
# ============================================

class UploadInitiateResponse(BaseModel):
    """Kept for compatibility — new code uses UploadWithAnalysisResponse."""
    batch_id: int
    file_name: str
    file_type: str
    file_size_kb: int
    status: str
    message: str
    uploaded_at: datetime


class BatchInfoResponse(BaseModel):
    batch_id: int
    file_name: str
    file_type: str
    file_size_kb: int
    uploaded_by: int
    uploaded_at: datetime
    status: str
    total_rows: int = 0
    valid_rows: int = 0
    rejected_rows: int = 0
    date_range_start: Optional[date] = None
    date_range_end: Optional[date] = None
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    processing_duration_seconds: Optional[int] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class BatchListResponse(BaseModel):
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
    success: bool
    message: str
    batch_id: int
    status: str
    statistics: dict
    date_range: dict
    processing_time_seconds: Optional[int] = None
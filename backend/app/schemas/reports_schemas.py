# backend/app/schemas/reports_schemas.py
"""
File: backend/app/schemas/reports_schemas.py
Purpose: Pydantic response models for all reports endpoints.

WHY PYDANTIC SCHEMAS HERE:
Reports return complex nested structures.
Schemas enforce the contract between backend and frontend —
if a field is missing or wrong type, it fails loudly at the service layer,
not silently in the frontend.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import date


# ============================================
# Shared
# ============================================

class DateRange(BaseModel):
    start_date: date
    end_date: date


# ============================================
# Summary
# ============================================

class ReportSummary(BaseModel):
    total_revenue: float
    total_quantity_sold: float
    sales_record_count: int
    average_daily_revenue: float

    products_sold_count: int

    campaign_count: int
    active_campaign_count: int

    forecast_models_total: int
    forecast_models_ready: int
    forecast_models_training: int
    forecast_models_failed: int
    forecast_models_idle: int

    uploads_count: int
    processed_uploads_count: int
    failed_uploads_count: int


# ============================================
# Sales Trend
# ============================================

class SalesTrendItem(BaseModel):
    period: str           # "2026-05-01" for day, week start date for week, "2026-05" for month
    total_revenue: float
    total_quantity_sold: float
    sales_record_count: int


# ============================================
# Top Products
# ============================================

class TopProductItem(BaseModel):
    product_id: int
    product_name: str
    normalized_name: Optional[str]
    category: Optional[str]

    total_revenue: float
    total_quantity_sold: float
    sales_record_count: int
    average_daily_quantity: float

    last_sale_date: Optional[date]

    forecast_status: Optional[str]
    forecast_next_30_days_quantity: Optional[float]
    forecast_next_30_days_revenue: Optional[float]


# ============================================
# Campaign Performance
# ============================================

class CampaignPerformanceItem(BaseModel):
    campaign_id: int
    campaign_name: str
    campaign_type: Optional[str]
    status: str

    start_date: date
    end_date: date
    budget: Optional[float]

    product_count: int

    # Actual sales queried from SalesRecord during campaign window
    campaign_revenue: Optional[float]

    # Sales in equal window before campaign (baseline)
    base_revenue: Optional[float]

    # campaign_revenue - base_revenue
    additional_revenue: Optional[float]

    # Predicted by AIMOPS at creation time
    forecast_uplift_pct: Optional[float]
    predicted_roi: Optional[float]

    # Calculated from SalesRecord after campaign ends — null if no data yet
    actual_roi: Optional[float]
    actual_available: bool

    confidence: Optional[str]


# ============================================
# Forecast Health
# ============================================

class ForecastHealthSummary(BaseModel):
    total: int
    ready: int
    training: int
    failed: int
    idle: int


class ForecastHealthModel(BaseModel):
    product_id: int
    product_name: str
    category: Optional[str]
    status: str
    trained_at: Optional[str]
    error: Optional[str]


# ============================================
# Upload Activity
# ============================================

class UploadActivitySummary(BaseModel):
    total: int
    processed: int
    mapping: int
    pending: int
    failed: int


class RecentUploadItem(BaseModel):
    batch_id: int
    file_name: str
    status: str
    uploaded_at: str
    rows_count: Optional[int]
    error: Optional[str]


# ============================================
# Dashboard (main endpoint — everything in one)
# ============================================

class DashboardResponse(BaseModel):
    success: bool
    date_range: DateRange
    summary: ReportSummary
    sales_trend: list[SalesTrendItem]
    top_products: list[TopProductItem]
    campaign_performance: list[CampaignPerformanceItem]
    forecast_health: ForecastHealthSummary
    upload_activity: UploadActivitySummary
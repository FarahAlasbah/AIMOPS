# backend/app/api/reports.py
"""
File: backend/app/api/reports.py
Purpose: Reports endpoints for the business performance dashboard.

ENDPOINTS:
- GET /api/reports/dashboard   → full dashboard (primary, used by frontend)
- GET /api/reports/summary     → KPI cards only
- GET /api/reports/sales-trend → revenue/quantity over time
- GET /api/reports/top-products → ranked product performance
- GET /api/reports/campaign-performance → campaign results
- GET /api/reports/forecast-health → model status overview
- GET /api/reports/uploads → upload activity

PERMISSION:
All endpoints require reports.view permission.
Only admin and business_owner roles have this permission.

DATE VALIDATION:
All endpoints require start_date and end_date as YYYY-MM-DD.
end_date must be >= start_date.
Empty results return success with zeros/empty arrays — never 404.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, date

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.services import reports_service

router = APIRouter(prefix="/api/reports", tags=["Reports"])


# ============================================
# HELPERS
# ============================================

def _parse_dates(start_date: str, end_date: str) -> tuple[date, date]:
    """
    Parse and validate date range strings.
    Raises 400 if format is wrong or end < start.
    """
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Dates must be in YYYY-MM-DD format."
        )

    if end < start:
        raise HTTPException(
            status_code=400,
            detail="Invalid date range. end_date must be after start_date."
        )

    return start, end


def _require_reports_permission(current_user: User):
    """
    Checks that the user has reports.view permission.
    Raises 403 if not.
    """
    if not current_user.has_permission("reports.view"):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view reports."
        )


# ============================================
# ENDPOINT 1: Dashboard (primary endpoint)
# ============================================

@router.get("/dashboard")
async def get_dashboard(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Full reports dashboard — everything in one request.

    This is the primary endpoint. Frontend calls this once
    and gets all sections: summary, sales trend, top products,
    campaign performance, forecast health, upload activity.

    Returns empty arrays and zeros for sections with no data —
    never returns 404 for an empty date range.

    PERMISSION: reports.view (admin, business_owner)
    """
    _require_reports_permission(current_user)
    start, end = _parse_dates(start_date, end_date)
    return reports_service.get_dashboard(db, start, end)


# ============================================
# ENDPOINT 2: Summary KPIs only
# ============================================

@router.get("/summary")
async def get_summary(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    KPI cards only — revenue, quantity, campaign count, forecast health.
    Lighter than /dashboard if frontend only needs the top section.

    PERMISSION: reports.view
    """
    _require_reports_permission(current_user)
    start, end = _parse_dates(start_date, end_date)
    days_in_range = (end - start).days + 1
    summary = reports_service._get_summary(db, start, end, days_in_range)

    return {
        "success": True,
        "date_range": {
            "start_date": start_date,
            "end_date": end_date
        },
        "summary": summary
    }


# ============================================
# ENDPOINT 3: Sales Trend
# ============================================

@router.get("/sales-trend")
async def get_sales_trend(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    group_by: str = Query("day", description="day | week | month"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Revenue and quantity grouped over time.
    Used for the sales trend chart.

    group_by options:
    - day (default): one row per day
    - week: one row per week (period = Monday of that week)
    - month: one row per month (period = YYYY-MM)

    PERMISSION: reports.view
    """
    _require_reports_permission(current_user)

    if group_by not in ("day", "week", "month"):
        raise HTTPException(
            status_code=400,
            detail="group_by must be one of: day, week, month"
        )

    start, end = _parse_dates(start_date, end_date)
    items = reports_service._get_sales_trend(db, start, end, group_by)

    return {
        "success": True,
        "group_by": group_by,
        "items": items
    }


# ============================================
# ENDPOINT 4: Top Products
# ============================================

@router.get("/top-products")
async def get_top_products(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    limit: int = Query(10, ge=1, le=50),
    sort_by: str = Query("revenue", description="revenue | quantity | sales_count"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Top products ranked by revenue, quantity, or sales count
    within the selected date range.

    Includes next-30-days forecast data if available.

    PERMISSION: reports.view
    """
    _require_reports_permission(current_user)

    if sort_by not in ("revenue", "quantity", "sales_count"):
        raise HTTPException(
            status_code=400,
            detail="sort_by must be one of: revenue, quantity, sales_count"
        )

    start, end = _parse_dates(start_date, end_date)
    products = reports_service._get_top_products(db, start, end, limit, sort_by)

    return {
        "success": True,
        "products": products
    }


# ============================================
# ENDPOINT 5: Campaign Performance
# ============================================

@router.get("/campaign-performance")
async def get_campaign_performance(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Performance data for all campaigns overlapping the date range.

    actual_roi is calculated from SalesRecord — no manual entry.
    If sales data hasn't been uploaded for the campaign period yet,
    actual_roi will be null and actual_available will be false.

    PERMISSION: reports.view
    """
    _require_reports_permission(current_user)
    start, end = _parse_dates(start_date, end_date)
    campaigns = reports_service._get_campaign_performance(db, start, end)

    return {
        "success": True,
        "campaigns": campaigns
    }


# ============================================
# ENDPOINT 6: Forecast Health
# ============================================

@router.get("/forecast-health")
async def get_forecast_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Current status of all forecast models.
    Not date-scoped — reflects overall system health.

    PERMISSION: reports.view
    """
    _require_reports_permission(current_user)
    summary = reports_service._get_forecast_health_summary(db)

    return {
        "success": True,
        "summary": summary
    }


# ============================================
# ENDPOINT 7: Upload Activity
# ============================================

@router.get("/uploads")
async def get_upload_activity(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload counts for the selected date range.

    PERMISSION: reports.view
    """
    _require_reports_permission(current_user)
    start, end = _parse_dates(start_date, end_date)
    activity = reports_service._get_upload_activity_summary(db, start, end)

    return {
        "success": True,
        "summary": activity
    }
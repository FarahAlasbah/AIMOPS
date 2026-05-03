# backend/app/services/reports_service.py
"""
File: backend/app/services/reports_service.py
Purpose: All database query logic for the reports dashboard.

STRUCTURE:
Each section of the dashboard has its own function.
get_dashboard() calls them all and assembles the final response.

WHY ONE MASTER FUNCTION:
Frontend makes one call to /api/reports/dashboard.
All sections share the same date range and same db session.
Cleaner than the frontend making 5-6 separate calls.

PERFORMANCE NOTE:
All queries use indexed columns:
- SalesRecord: sale_date (indexed), product_id (indexed)
- Campaign: start_date, end_date, status
- ForecastModel: status
- IngestionBatch: uploaded_at, status
No N+1 queries — aggregations are done at the DB level.
"""

from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, and_, case

from app.models.sales_record import SalesRecord
from app.models.campaign import Campaign, CampaignProduct
from app.models.forecast import ForecastModel, ForecastResult
from app.models.ingestion_batch import IngestionBatch
from app.models.campaign import Product

# ============================================
# MASTER FUNCTION
# ============================================

def get_dashboard(
    db: Session,
    start_date: date,
    end_date: date
) -> dict:
    """
    Assembles the full dashboard response in one call.
    Each section is built by its own function below.
    """
    days_in_range = (end_date - start_date).days + 1

    summary = _get_summary(db, start_date, end_date, days_in_range)
    sales_trend = _get_sales_trend(db, start_date, end_date, group_by="day")
    top_products = _get_top_products(db, start_date, end_date, limit=10, sort_by="revenue")
    campaign_performance = _get_campaign_performance(db, start_date, end_date)
    forecast_health = _get_forecast_health_summary(db)
    upload_activity = _get_upload_activity_summary(db, start_date, end_date)

    return {
        "success": True,
        "date_range": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "summary": summary,
        "sales_trend": sales_trend,
        "top_products": top_products,
        "campaign_performance": campaign_performance,
        "forecast_health": forecast_health,
        "upload_activity": upload_activity
    }


# ============================================
# SECTION 1: Summary KPIs
# ============================================

def _get_summary(
    db: Session,
    start_date: date,
    end_date: date,
    days_in_range: int
) -> dict:
    """
    Calculates all KPI cards for the top of the reports page.

    Sales figures are scoped strictly to the selected date range.
    Campaign, forecast, and upload counts are also date-scoped
    where relevant (campaigns overlapping range, uploads in range).
    """

    # ── Sales aggregation (date-scoped) ──
    sales_agg = db.query(
        func.coalesce(func.sum(SalesRecord.total_amount), 0).label('total_revenue'),
        func.coalesce(func.sum(SalesRecord.quantity), 0).label('total_quantity'),
        func.count(SalesRecord.record_id).label('record_count'),
        func.count(distinct(SalesRecord.product_id)).label('products_sold_count')
    ).filter(
        SalesRecord.sale_date >= start_date,
        SalesRecord.sale_date <= end_date
    ).first()

    total_revenue = float(sales_agg.total_revenue)
    total_quantity = float(sales_agg.total_quantity)
    record_count = sales_agg.record_count
    products_sold_count = sales_agg.products_sold_count
    average_daily_revenue = round(total_revenue / days_in_range, 2) if days_in_range > 0 else 0

    # ── Campaign counts (campaigns overlapping the date range) ──
    campaign_agg = db.query(
        func.count(Campaign.campaign_id).label('total'),
        func.sum(
            case((Campaign.status == 'active', 1), else_=0)
        ).label('active_count')
    ).filter(
        Campaign.deleted_at.is_(None),
        Campaign.start_date <= end_date,
        Campaign.end_date >= start_date
    ).first()

    campaign_count = campaign_agg.total or 0
    active_campaign_count = int(campaign_agg.active_count or 0)

    # ── Forecast model status counts (all-time, not date-scoped) ──
    # Forecast health reflects current state of all models,
    # not just models trained in the selected period.
    forecast_agg = db.query(
        func.count(ForecastModel.model_id).label('total'),
        func.sum(case((ForecastModel.status == 'ready', 1), else_=0)).label('ready'),
        func.sum(case((ForecastModel.status == 'training', 1), else_=0)).label('training'),
        func.sum(case((ForecastModel.status == 'failed', 1), else_=0)).label('failed'),
    ).first()

    forecast_total = forecast_agg.total or 0
    forecast_ready = int(forecast_agg.ready or 0)
    forecast_training = int(forecast_agg.training or 0)
    forecast_failed = int(forecast_agg.failed or 0)
    # idle = models that exist but aren't training, ready, or failed
    # In this project 'idle' means products with no model at all,
    # calculated as active products minus total models
    active_product_count = db.query(func.count(Product.product_id)).filter(
        Product.is_active == True,
        Product.deleted_at.is_(None)
    ).scalar() or 0
    forecast_idle = max(0, active_product_count - forecast_total)

    # ── Upload counts (date-scoped by uploaded_at) ──
    upload_agg = db.query(
        func.count(IngestionBatch.batch_id).label('total'),
        func.sum(
            case((IngestionBatch.status == 'completed', 1), else_=0)
        ).label('processed'),
        func.sum(
            case((IngestionBatch.status == 'failed', 1), else_=0)
        ).label('failed')
    ).filter(
        IngestionBatch.deleted_at.is_(None),
        func.date(IngestionBatch.uploaded_at) >= start_date,
        func.date(IngestionBatch.uploaded_at) <= end_date
    ).first()

    uploads_count = upload_agg.total or 0
    processed_uploads_count = int(upload_agg.processed or 0)
    failed_uploads_count = int(upload_agg.failed or 0)

    return {
        "total_revenue": round(total_revenue, 2),
        "total_quantity_sold": round(total_quantity, 2),
        "sales_record_count": record_count,
        "average_daily_revenue": average_daily_revenue,
        "products_sold_count": products_sold_count,
        "campaign_count": campaign_count,
        "active_campaign_count": active_campaign_count,
        "forecast_models_total": forecast_total,
        "forecast_models_ready": forecast_ready,
        "forecast_models_training": forecast_training,
        "forecast_models_failed": forecast_failed,
        "forecast_models_idle": forecast_idle,
        "uploads_count": uploads_count,
        "processed_uploads_count": processed_uploads_count,
        "failed_uploads_count": failed_uploads_count
    }


# ============================================
# SECTION 2: Sales Trend
# ============================================

def _get_sales_trend(
    db: Session,
    start_date: date,
    end_date: date,
    group_by: str = "day"
) -> list:
    """
    Returns revenue and quantity grouped by day, week, or month.

    GROUPING LOGIC:
    - day:   period = sale_date as string "YYYY-MM-DD"
    - week:  period = Monday of that week "YYYY-MM-DD"
    - month: period = "YYYY-MM"

    MySQL DATE_FORMAT is used for grouping.
    The composite index idx_date_product makes this fast.
    """

    if group_by == "month":
        period_expr = func.date_format(SalesRecord.sale_date, '%Y-%m')
    elif group_by == "week":
        # DATE_SUB to get Monday of the week
        period_expr = func.date_format(
            func.date_sub(
                SalesRecord.sale_date,
                func.interval(func.weekday(SalesRecord.sale_date), 'DAY')
            ),
            '%Y-%m-%d'
        )
    else:
        # Default: day
        period_expr = func.date_format(SalesRecord.sale_date, '%Y-%m-%d')

    rows = db.query(
        period_expr.label('period'),
        func.coalesce(func.sum(SalesRecord.total_amount), 0).label('total_revenue'),
        func.coalesce(func.sum(SalesRecord.quantity), 0).label('total_quantity'),
        func.count(SalesRecord.record_id).label('record_count')
    ).filter(
        SalesRecord.sale_date >= start_date,
        SalesRecord.sale_date <= end_date
    ).group_by('period').order_by('period').all()

    return [
        {
            "period": row.period,
            "total_revenue": round(float(row.total_revenue), 2),
            "total_quantity_sold": round(float(row.total_quantity), 2),
            "sales_record_count": row.record_count
        }
        for row in rows
    ]


# ============================================
# SECTION 3: Top Products
# ============================================

def _get_top_products(
    db: Session,
    start_date: date,
    end_date: date,
    limit: int = 10,
    sort_by: str = "revenue"
) -> list:
    """
    Returns top products by revenue, quantity, or sales count
    within the selected date range.

    Joins ForecastModel to attach current forecast status.
    Joins ForecastResult to sum next-30-days predicted quantity and revenue.
    """
    days_in_range = (end_date - start_date).days + 1

    # Sort column mapping
    sort_column = {
        "revenue": func.sum(SalesRecord.total_amount),
        "quantity": func.sum(SalesRecord.quantity),
        "sales_count": func.count(SalesRecord.record_id)
    }.get(sort_by, func.sum(SalesRecord.total_amount))

    # Base product aggregation query
    rows = db.query(
        SalesRecord.product_id,
        func.coalesce(func.sum(SalesRecord.total_amount), 0).label('total_revenue'),
        func.coalesce(func.sum(SalesRecord.quantity), 0).label('total_quantity'),
        func.count(SalesRecord.record_id).label('sales_count'),
        func.max(SalesRecord.sale_date).label('last_sale_date')
    ).filter(
        SalesRecord.sale_date >= start_date,
        SalesRecord.sale_date <= end_date
    ).group_by(
        SalesRecord.product_id
    ).order_by(
        sort_column.desc()
    ).limit(limit).all()

    if not rows:
        return []

    product_ids = [r.product_id for r in rows]

    # Fetch product details
    products = db.query(Product).filter(
        Product.product_id.in_(product_ids)
    ).all()
    product_map = {p.product_id: p for p in products}

    # Fetch forecast model status per product
    models = db.query(ForecastModel).filter(
        ForecastModel.product_id.in_(product_ids)
    ).all()
    model_map = {m.product_id: m for m in models}

    # Fetch next 30 days forecast totals per product
    forecast_start = date.today()
    forecast_end = forecast_start + timedelta(days=29)

    forecast_rows = db.query(
        ForecastResult.product_id,
        func.coalesce(func.sum(ForecastResult.predicted_quantity), 0).label('qty_30'),
        func.coalesce(func.sum(ForecastResult.predicted_revenue), 0).label('rev_30')
    ).filter(
        ForecastResult.product_id.in_(product_ids),
        ForecastResult.forecast_date >= forecast_start,
        ForecastResult.forecast_date <= forecast_end
    ).group_by(ForecastResult.product_id).all()

    forecast_map = {
        r.product_id: {
            "qty_30": float(r.qty_30),
            "rev_30": float(r.rev_30)
        }
        for r in forecast_rows
    }

    result = []
    for row in rows:
        product = product_map.get(row.product_id)
        model = model_map.get(row.product_id)
        forecast = forecast_map.get(row.product_id)

        total_qty = float(row.total_quantity)
        avg_daily_qty = round(total_qty / days_in_range, 2) if days_in_range > 0 else 0

        result.append({
            "product_id": row.product_id,
            "product_name": product.product_name if product else f"Product {row.product_id}",
            "normalized_name": product.normalized_name if product else None,
            "category": product.category if product else None,
            "total_revenue": round(float(row.total_revenue), 2),
            "total_quantity_sold": round(total_qty, 2),
            "sales_record_count": row.sales_count,
            "average_daily_quantity": avg_daily_qty,
            "last_sale_date": row.last_sale_date.isoformat() if row.last_sale_date else None,
            "forecast_status": model.status if model else None,
            "forecast_next_30_days_quantity": round(forecast["qty_30"], 1) if forecast else None,
            "forecast_next_30_days_revenue": round(forecast["rev_30"], 2) if forecast and forecast["rev_30"] > 0 else None
        })

    return result


# ============================================
# SECTION 4: Campaign Performance
# ============================================

def _get_campaign_performance(
    db: Session,
    start_date: date,
    end_date: date
) -> list:
    """
    Returns performance data for all campaigns that overlap
    the selected date range.

    ACTUAL ROI LOGIC:
    - Pulled from SalesRecord for the campaign's product set
      during the campaign date window (no manual entry)
    - base_revenue: same products, equal-length window before campaign
    - actual_roi = ((campaign_revenue - budget) / budget) * 100
    - If no SalesRecord data exists for the campaign window → actual_roi: null

    PREDICTED ROI:
    - Calculated from forecast_additional_revenue and budget
      stored at campaign creation time
    """

    campaigns = db.query(Campaign).filter(
        Campaign.deleted_at.is_(None),
        Campaign.start_date <= end_date,
        Campaign.end_date >= start_date
    ).all()

    if not campaigns:
        return []

    result = []

    for campaign in campaigns:
        product_ids = [cp.product_id for cp in campaign.products]
        product_count = len(product_ids)
        duration = (campaign.end_date - campaign.start_date).days + 1

        # ── Campaign window sales (actual) ──
        campaign_revenue = None
        base_revenue = None
        additional_revenue = None
        actual_roi = None
        actual_available = False

        if product_ids:
            campaign_sales = db.query(
                func.sum(SalesRecord.total_amount).label('revenue')
            ).filter(
                SalesRecord.product_id.in_(product_ids),
                SalesRecord.sale_date >= campaign.start_date,
                SalesRecord.sale_date <= campaign.end_date
            ).first()

            if campaign_sales and campaign_sales.revenue:
                campaign_revenue = round(float(campaign_sales.revenue), 2)
                actual_available = True

                # ── Pre-campaign baseline (equal-length window before start) ──
                baseline_start = campaign.start_date - timedelta(days=duration)
                baseline_end = campaign.start_date - timedelta(days=1)

                baseline_sales = db.query(
                    func.sum(SalesRecord.total_amount).label('revenue')
                ).filter(
                    SalesRecord.product_id.in_(product_ids),
                    SalesRecord.sale_date >= baseline_start,
                    SalesRecord.sale_date <= baseline_end
                ).first()

                if baseline_sales and baseline_sales.revenue:
                    base_revenue = round(float(baseline_sales.revenue), 2)
                    additional_revenue = round(campaign_revenue - base_revenue, 2)

                # ── Actual ROI ──
                if campaign.budget and float(campaign.budget) > 0:
                    actual_roi = round(
                        ((campaign_revenue - float(campaign.budget)) / float(campaign.budget)) * 100,
                        1
                    )

        # ── Predicted ROI (from forecast data stored at creation) ──
        predicted_roi = campaign.predicted_roi()

        # ── Confidence from forecast_uplift_pct ──
        confidence = None
        if campaign.forecast_uplift_pct:
            uplift = float(campaign.forecast_uplift_pct)
            confidence = "high" if uplift > 30 else "medium" if uplift > 10 else "low"

        result.append({
            "campaign_id": campaign.campaign_id,
            "campaign_name": campaign.campaign_name,
            "campaign_type": campaign.campaign_type,
            "status": campaign.status,
            "start_date": campaign.start_date.isoformat(),
            "end_date": campaign.end_date.isoformat(),
            "budget": float(campaign.budget) if campaign.budget else None,
            "product_count": product_count,
            "base_revenue": base_revenue,
            "campaign_revenue": campaign_revenue,
            "additional_revenue": additional_revenue,
            "forecast_uplift_pct": float(campaign.forecast_uplift_pct) if campaign.forecast_uplift_pct else None,
            "predicted_roi": predicted_roi,
            "actual_roi": actual_roi,
            "actual_available": actual_available,
            "confidence": confidence
        })

    return result


# ============================================
# SECTION 5: Forecast Health
# ============================================

def _get_forecast_health_summary(db: Session) -> dict:
    """
    Returns current status counts across all forecast models.
    Not date-scoped — reflects the current health of all models.

    idle = active products that have no model at all.
    """
    agg = db.query(
        func.count(ForecastModel.model_id).label('total'),
        func.sum(case((ForecastModel.status == 'ready', 1), else_=0)).label('ready'),
        func.sum(case((ForecastModel.status == 'training', 1), else_=0)).label('training'),
        func.sum(case((ForecastModel.status == 'failed', 1), else_=0)).label('failed'),
    ).first()

    total = agg.total or 0
    ready = int(agg.ready or 0)
    training = int(agg.training or 0)
    failed = int(agg.failed or 0)

    active_products = db.query(func.count(Product.product_id)).filter(
        Product.is_active == True,
        Product.deleted_at.is_(None)
    ).scalar() or 0

    idle = max(0, active_products - total)

    return {
        "total": total,
        "ready": ready,
        "training": training,
        "failed": failed,
        "idle": idle
    }


# ============================================
# SECTION 6: Upload Activity
# ============================================

def _get_upload_activity_summary(
    db: Session,
    start_date: date,
    end_date: date
) -> dict:
    """
    Returns upload counts for the selected date range.
    Filtered by uploaded_at date.
    """
    agg = db.query(
        func.count(IngestionBatch.batch_id).label('total'),
        func.sum(case((IngestionBatch.status == 'completed', 1), else_=0)).label('processed'),
        func.sum(case((IngestionBatch.status == 'mapping', 1), else_=0)).label('mapping'),
        func.sum(case((IngestionBatch.status == 'pending', 1), else_=0)).label('pending'),
        func.sum(case((IngestionBatch.status == 'failed', 1), else_=0)).label('failed'),
    ).filter(
        IngestionBatch.deleted_at.is_(None),
        func.date(IngestionBatch.uploaded_at) >= start_date,
        func.date(IngestionBatch.uploaded_at) <= end_date
    ).first()

    return {
        "total": agg.total or 0,
        "processed": int(agg.processed or 0),
        "mapping": int(agg.mapping or 0),
        "pending": int(agg.pending or 0),
        "failed": int(agg.failed or 0)
    }
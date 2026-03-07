"""
File: backend/app/api/draft_events.py

PURPOSE:
Endpoints for reviewing, confirming, and dismissing draft events that were
auto-detected from imported sales data.

CONTEXT:
After a user imports sales data, campaign_detection_service runs in the
background and creates Event records with status='draft'. These draft events
represent periods of unusual sales activity (likely promotions or seasonal
events) that the user never logged in the calendar.

This file handles what happens when the user clicks the notification and
reviews those draft events.

ENDPOINTS:
GET  /api/events/drafts              → List all draft events pending review
GET  /api/events/drafts/{event_id}   → Full detail for one draft event
POST /api/events/drafts/{event_id}/confirm  → Confirm + name the event
POST /api/events/drafts/{event_id}/dismiss  → Dismiss as false positive

WHAT CONFIRMING DOES:
1. Updates event_name, event_type, is_recurring with user's input
2. Sets status = 'confirmed'
3. The EventImpactResult already exists and is now "live" — XGBoost
   will use it as a feature in future forecasts for this product

WHAT DISMISSING DOES:
Soft-deletes the Event (sets deleted_at). EventImpactResult is cascade-
deleted. The spike still happened in the sales data but is no longer
treated as a meaningful event.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.event import Event, EventImpactResult
from app.models.campaign import Product

router = APIRouter(prefix="/api/events", tags=["Draft Events"])


# ============================================
# Request Schemas
# ============================================

class ConfirmDraftEventRequest(BaseModel):
    """
    What the user submits when confirming a draft event.

    They provide the meaningful context — name, type, whether it recurs.
    Everything else (dates, impact metrics) was already calculated from
    the sales data and doesn't need to change.
    """
    event_name: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Human-readable name, e.g. 'Ramadan 2024' or 'Flash Sale Feb'"
    )
    event_type: str = Field(
        ...,
        description="One of: religious, national, seasonal, local, business, promotional, custom"
    )
    is_recurring: bool = Field(
        default=False,
        description="Does this event happen again next year?"
    )
    recurrence_type: Optional[str] = Field(
        default='one_time',
        description="yearly / monthly / one_time"
    )
    description: Optional[str] = Field(
        default=None,
        description="Optional notes about this event"
    )
    # User can optionally adjust the date range if detection was slightly off
    start_date: Optional[date] = Field(
        default=None,
        description="Override detected start date (optional)"
    )
    end_date: Optional[date] = Field(
        default=None,
        description="Override detected end date (optional)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "event_name": "Ramadan 2024",
                "event_type": "religious",
                "is_recurring": True,
                "recurrence_type": "yearly",
                "description": "Annual Ramadan promotion — dates bundle deals"
            }
        }


class DismissDraftEventRequest(BaseModel):
    """Optional reason for dismissal — helps improve future detection."""
    reason: Optional[str] = Field(
        default=None,
        description="Why is this a false positive? (optional, helps tune detection)"
    )


# ============================================
# ENDPOINT: List Draft Events
# ============================================

@router.get("/drafts")
async def list_draft_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all draft events pending user review.

    Returns each draft event enriched with its impact results and
    product names — everything the frontend needs to render the
    review screen without additional queries.

    SORTED BY: start_date descending (most recent first)
    WHY: Most recent spikes are most relevant to the user right now.
    """

    draft_events = db.query(Event).filter(
        Event.status == 'draft',
        Event.deleted_at.is_(None),
        Event.created_by == current_user.user_id
    ).order_by(Event.start_date.desc()).all()

    result = []
    for event in draft_events:
        result.append(_format_draft_event(event, db))

    return {
        "success": True,
        "total": len(result),
        "draft_events": result
    }


# ============================================
# ENDPOINT: Get Single Draft Event Detail
# ============================================

@router.get("/drafts/{event_id}")
async def get_draft_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get full details for one draft event including all product impacts.

    Used when user clicks on a specific draft event to review before
    deciding to confirm or dismiss.
    """
    event = db.query(Event).filter(
        Event.event_id == event_id,
        Event.status == 'draft',
        Event.deleted_at.is_(None),
        Event.created_by == current_user.user_id
    ).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail=f"Draft event {event_id} not found"
        )

    return {
        "success": True,
        "event": _format_draft_event(event, db)
    }


# ============================================
# ENDPOINT: Confirm Draft Event
# ============================================

@router.post("/drafts/{event_id}/confirm")
async def confirm_draft_event(
    event_id: int,
    request: ConfirmDraftEventRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Confirm a draft event — add it to the calendar as a real event.

    WHAT HAPPENS:
    1. Updates event with user-provided name, type, recurrence
    2. Sets status = 'confirmed'
    3. EventImpactResult is already saved and now "live"
       → XGBoost uses it as a labeled feature for future forecasts
       → "This product spiked +83% during Ramadan 2024"

    IF USER ADJUSTS DATES:
    If start_date or end_date is provided, we recalculate the
    EventImpactResult metrics to match the corrected window.
    The user knows their own promotion dates better than our algorithm.

    RESULT:
    Event appears in the calendar as confirmed.
    Future forecasts for affected products will incorporate this event.
    """

    # Validate event type
    valid_event_types = {
        'religious', 'national', 'seasonal', 'local',
        'business', 'promotional', 'custom'
    }
    if request.event_type not in valid_event_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event_type. Must be one of: {', '.join(valid_event_types)}"
        )

    # Validate recurrence type
    valid_recurrence = {'yearly', 'monthly', 'one_time'}
    if request.recurrence_type and request.recurrence_type not in valid_recurrence:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid recurrence_type. Must be one of: {', '.join(valid_recurrence)}"
        )

    event = db.query(Event).filter(
        Event.event_id == event_id,
        Event.status == 'draft',
        Event.deleted_at.is_(None),
        Event.created_by == current_user.user_id
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail=f"Draft event {event_id} not found")

    # ── Apply User's Date Corrections (if provided) ──
    date_was_adjusted = False
    if request.start_date and request.start_date != event.start_date:
        event.start_date = request.start_date
        date_was_adjusted = True
    if request.end_date and request.end_date != event.end_date:
        event.end_date = request.end_date
        date_was_adjusted = True

    # ── Confirm the Event ──
    event.event_name = request.event_name
    event.event_type = request.event_type
    event.is_recurring = request.is_recurring
    event.recurrence_type = request.recurrence_type or 'one_time'
    event.description = request.description or event.description
    event.status = 'confirmed'
    event.updated_by = current_user.user_id
    event.updated_at = datetime.utcnow()

    # ── Recalculate Impact if Dates Changed ──
    # If user corrected the date range, our pre-calculated metrics
    # are now inaccurate — we need to recalculate them.
    if date_was_adjusted:
        _recalculate_impact_results(db, event)

    db.commit()

    return {
        "success": True,
        "message": f"'{event.event_name}' confirmed and added to your events calendar.",
        "event_id": event.event_id,
        "event_name": event.event_name,
        "event_type": event.event_type,
        "start_date": event.start_date.isoformat(),
        "end_date": event.end_date.isoformat(),
        "is_recurring": event.is_recurring,
        "status": "confirmed",
        "forecast_impact": (
            "This event will be used to improve sales forecasts for affected products. "
            "You can view the full impact analysis in your Events Calendar."
        )
    }


# ============================================
# ENDPOINT: Dismiss Draft Event
# ============================================

@router.post("/drafts/{event_id}/dismiss")
async def dismiss_draft_event(
    event_id: int,
    request: DismissDraftEventRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Dismiss a draft event as a false positive.

    WHAT HAPPENS:
    Soft-deletes the Event (sets deleted_at).
    EventImpactResult is cascade-deleted automatically.
    The spike still exists in the raw sales data but is no longer
    treated as a meaningful event — forecasts won't use it.

    OPTIONAL REASON:
    If the user says why (e.g. "stock delivery, not a promotion"),
    we log it in description. This data could be used in future
    to improve detection thresholds.
    """
    event = db.query(Event).filter(
        Event.event_id == event_id,
        Event.status == 'draft',
        Event.deleted_at.is_(None),
        Event.created_by == current_user.user_id
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail=f"Draft event {event_id} not found")

    # Soft delete — cascade handles EventImpactResult
    event.deleted_at = datetime.utcnow()
    event.updated_by = current_user.user_id

    # Log dismissal reason in description for future reference
    if request.reason:
        event.description = f"[Dismissed: {request.reason}] " + (event.description or "")

    db.commit()

    return {
        "success": True,
        "message": "Event dismissed. It won't affect your forecasts.",
        "event_id": event_id
    }


# ============================================
# Helper: Format Draft Event for Response
# ============================================

def _format_draft_event(event: Event, db: Session) -> dict:
    """
    Format a draft event with all its impact results for the frontend.

    Each impact result includes the product name (fetched once per product)
    so the frontend can display "Product: Premium Dates 500g — sales +83%"
    without additional queries.
    """
    impacts = db.query(EventImpactResult).filter(
        EventImpactResult.event_id == event.event_id
    ).all()

    # Fetch product names in one query
    product_ids = [i.product_id for i in impacts]
    products = {}
    if product_ids:
        product_records = db.query(Product).filter(
            Product.product_id.in_(product_ids)
        ).all()
        products = {p.product_id: p.product_name for p in product_records}

    impact_details = [
        {
            "product_id": imp.product_id,
            "product_name": products.get(imp.product_id, f"Product {imp.product_id}"),
            "baseline_daily_avg": float(imp.baseline_daily_avg),
            "during_daily_avg": float(imp.during_daily_avg),
            "change_percentage": float(imp.change_percentage),
            "impact_level": imp.impact_level,
            "baseline_data_quality": imp.baseline_data_quality,
            # Human readable summary for UI
            "summary": (
                f"Sales were {imp.change_percentage:+.1f}% vs normal "
                f"({float(imp.during_daily_avg):.1f} vs {float(imp.baseline_daily_avg):.1f} units/day)"
            )
        }
        for imp in impacts
    ]

    # Determine the strongest impact level across all products
    # (used to sort/highlight in the UI)
    level_order = {"very_high": 4, "high": 3, "medium": 2, "low": 1}
    max_impact = max(
        (level_order.get(i["impact_level"], 0) for i in impact_details),
        default=0
    )
    impact_labels = {4: "very_high", 3: "high", 2: "medium", 1: "low", 0: "low"}

    duration_days = (event.end_date - event.start_date).days + 1

    return {
        "event_id": event.event_id,
        "event_name": event.event_name,
        "start_date": event.start_date.isoformat(),
        "end_date": event.end_date.isoformat(),
        "duration_days": duration_days,
        "status": event.status,
        "suggested_event_type": event.event_type,
        "created_at": event.created_at.isoformat() if event.created_at else None,
        "description": event.description,
        "products_affected": len(impact_details),
        "max_impact_level": impact_labels[max_impact],
        "impacts": impact_details,
        # Pre-filled values for the confirm form
        "confirm_form_defaults": {
            "event_name": "",               # User must enter — no default name
            "event_type": event.event_type, # Our guess (promotional)
            "is_recurring": False,
            "recurrence_type": "one_time",
            "start_date": event.start_date.isoformat(),
            "end_date": event.end_date.isoformat(),
        }
    }


# ============================================
# Helper: Recalculate Impact When Dates Change
# ============================================

def _recalculate_impact_results(db: Session, event: Event) -> None:
    """
    When a user corrects the event date range, recalculate the impact
    metrics for all affected products using the corrected window.

    WHY:
    If detection said "Mar 1–Mar 21" but the user knows the promotion
    was actually "Mar 10–Mar 24", the baseline/during averages are wrong.
    We reload the sales data for each product and recalculate.

    NOTE: This runs synchronously inside the confirm endpoint.
    For large datasets it could be slow — acceptable for now given
    that date corrections are rare and the data is already in DB.
    """
    impacts = db.query(EventImpactResult).filter(
        EventImpactResult.event_id == event.event_id
    ).all()

    for impact in impacts:
        records = db.query(SalesRecord).filter(
            SalesRecord.product_id == impact.product_id,
            SalesRecord.sale_date >= event.start_date,
            SalesRecord.sale_date <= event.end_date
        ).all()

        if not records:
            continue

        from datetime import timedelta
        duration_days = (event.end_date - event.start_date).days + 1
        total_qty = sum(float(r.quantity) for r in records if r.quantity)
        during_daily_avg = round(total_qty / duration_days, 2)

        # Baseline: 4 weeks before the corrected start date
        baseline_start = event.start_date - timedelta(weeks=4)
        baseline_end = event.start_date - timedelta(days=1)

        baseline_records = db.query(SalesRecord).filter(
            SalesRecord.product_id == impact.product_id,
            SalesRecord.sale_date >= baseline_start,
            SalesRecord.sale_date <= baseline_end
        ).all()

        if not baseline_records:
            continue

        baseline_days = (baseline_end - baseline_start).days + 1
        baseline_total = sum(float(r.quantity) for r in baseline_records if r.quantity)
        baseline_daily_avg = round(baseline_total / baseline_days, 2)

        if baseline_daily_avg <= 0:
            continue

        change_pct = round(
            ((during_daily_avg - baseline_daily_avg) / baseline_daily_avg) * 100, 2
        )

        if change_pct >= 50:
            impact_level = 'very_high'
        elif change_pct >= 30:
            impact_level = 'high'
        elif change_pct >= 15:
            impact_level = 'medium'
        else:
            impact_level = 'low'

        impact.baseline_period_start = baseline_start
        impact.baseline_period_end = baseline_end
        impact.baseline_daily_avg = baseline_daily_avg
        impact.during_daily_avg = during_daily_avg
        impact.change_percentage = change_pct
        impact.impact_level = impact_level
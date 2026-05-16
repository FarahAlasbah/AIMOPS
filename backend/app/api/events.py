"""
File: backend/app/api/events.py
Purpose: Event management and impact analysis endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta
import os

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.event import Event, EventImpactResult
from app.models.sales_record import SalesRecord
from app.models.campaign import Product
from app.services.consultation_service import invalidate_consultation_cache


router = APIRouter(prefix="/api/events", tags=["Events"])


# ============================================
# HELPER FUNCTIONS
# ============================================

def get_impact_level(change_pct: float) -> str | None:
    """
    Convert a percentage change into an impact level.
    Returns None if below threshold (not meaningful enough to store).

    Think of it like a thermometer:
    Below 10°  → not hot enough to matter
    10-15°     → low
    15-30°     → medium
    30-50°     → high
    50°+       → very high
    """
    abs_change = abs(change_pct)
    if abs_change >= 50:
        return "very_high"
    elif abs_change >= 30:
        return "high"
    elif abs_change >= 15:
        return "medium"
    elif abs_change >= 10:
        return "low"
    else:
        return None  # Below threshold → don't store


def calculate_overall_impact(results: list) -> str:
    """
    Calculate overall event impact from per-product results.
    Combines HOW MANY products affected + HOW MUCH they were affected.

    """
    if not results:
        return "none"

    level_scores = {
        "low": 1,
        "medium": 2,
        "high": 3,
        "very_high": 4
    }

    total_score = sum(level_scores[r.impact_level] for r in results)
    avg_score = total_score / len(results)
    products_count = len(results)

    if avg_score >= 3.5 and products_count >= 3:
        return "very_high"
    elif avg_score >= 3 and products_count >= 2:
        return "high"
    elif avg_score >= 2 or products_count >= 3:
        return "medium"
    else:
        return "low"


# ============================================
# ENDPOINT 1: Create Event
# ============================================

@router.post("")
async def create_event(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # ── Permission Check ──
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Not authorized")

    # ── Get Request Data ──
    event_name = request.get("event_name", "").strip()
    event_name_ar = request.get("event_name_ar", "").strip() or None
    event_type = request.get("event_type", "custom")
    start_date_str = request.get("start_date")
    end_date_str = request.get("end_date")
    description = request.get("description", "").strip() or None
    is_recurring = request.get("is_recurring", False)
    recurrence_type = request.get("recurrence_type", "one_time")
    status = request.get("status", "confirmed")

    # ── Validate Required Fields ──
    if not event_name:
        raise HTTPException(status_code=400, detail="event_name is required")
    if not start_date_str:
        raise HTTPException(status_code=400, detail="start_date is required")
    if not end_date_str:
        raise HTTPException(status_code=400, detail="end_date is required")

    # ── Validate Event Type ──
    valid_types = ['religious', 'national', 'seasonal', 'local', 'business', 'promotional', 'custom']
    if event_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"event_type must be one of: {valid_types}")

    # ── Parse Dates ──
    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be in format YYYY-MM-DD")

    # ── Validate Date Logic ──
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date cannot be before start_date")

    # ── Validate Recurrence ──
    if is_recurring and recurrence_type == "one_time":
        raise HTTPException(
            status_code=400,
            detail="Recurring events cannot have recurrence_type 'one_time'. Use 'yearly' or 'monthly'."
        )

    # ── Create Event ──
    new_event = Event(
        event_name=event_name,
        event_name_ar=event_name_ar,
        event_type=event_type,
        start_date=start_date,
        end_date=end_date,
        description=description,
        is_recurring=is_recurring,
        recurrence_type=recurrence_type if is_recurring else "one_time",
        status=status,
        created_by=current_user.user_id
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    
    invalidate_consultation_cache()

    # ── Calculate duration in days ──
    duration_days = (end_date - start_date).days + 1

    return {
        "success": True,
        "message": f"Event '{event_name}' created successfully",
        "event": {
            "event_id": new_event.event_id,
            "event_name": new_event.event_name,
            "event_name_ar": new_event.event_name_ar,
            "event_type": new_event.event_type,
            "start_date": new_event.start_date.isoformat(),
            "end_date": new_event.end_date.isoformat(),
            "duration_days": duration_days,
            "description": new_event.description,
            "is_recurring": new_event.is_recurring,
            "recurrence_type": new_event.recurrence_type,
            "status": new_event.status,
            "created_at": new_event.created_at.isoformat() if new_event.created_at else None
        }
    }


# ============================================
# ENDPOINT 2: Get All Events
# ============================================

@router.get("")
async def get_all_events(
    event_type: str = None,   # Filter by type
    status: str = None,       # Filter by status
    upcoming: bool = False,   # Only future events
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # ── Build Query ──
    query = db.query(Event).filter(Event.deleted_at.is_(None))

    # ── Apply Filters ──
    if event_type:
        query = query.filter(Event.event_type == event_type)

    if status:
        query = query.filter(Event.status == status)

    if upcoming:
        # Only events that haven't ended yet
        query = query.filter(Event.end_date >= date.today())

    # ── Sort by start_date descending (most recent first) ──
    events = query.order_by(Event.start_date.desc()).all()

    # ── Get impact results for all events in ONE query ──
    # Instead of querying impact for each event separately
    # Think of it like: fetch all receipts at once, then sort by order
    event_ids = [e.event_id for e in events]

    impact_counts = {}
    overall_impacts = {}

    if event_ids:
        # Count how many products were affected per event
        impact_results = db.query(
            EventImpactResult.event_id,
            func.count(EventImpactResult.impact_id).label('affected_count')
        ).filter(
            EventImpactResult.event_id.in_(event_ids)
        ).group_by(EventImpactResult.event_id).all()

        impact_counts = {r.event_id: r.affected_count for r in impact_results}

    # ── Build Response ──
    today = date.today()
    events_list = []

    for event in events:
        # Calculate event status based on dates
        if event.start_date > today:
            date_status = "upcoming"
        elif event.end_date < today:
            date_status = "past"
        else:
            date_status = "active"

        duration_days = (event.end_date - event.start_date).days + 1
        affected_products = impact_counts.get(event.event_id, 0)

        events_list.append({
            "event_id": event.event_id,
            "event_name": event.event_name,
            "event_name_ar": event.event_name_ar,
            "event_type": event.event_type,
            "start_date": event.start_date.isoformat(),
            "end_date": event.end_date.isoformat(),
            "duration_days": duration_days,
            "description": event.description,
            "is_recurring": event.is_recurring,
            "recurrence_type": event.recurrence_type,
            "status": event.status,
            "date_status": date_status,        # upcoming/active/past
            "is_analyzed": affected_products > 0,
            "affected_products_count": affected_products,
            "created_at": event.created_at.isoformat() if event.created_at else None
        })

    return {
        "success": True,
        "total_events": len(events_list),
        "events": events_list
    }


# ============================================
# ENDPOINT 3: Get Single Event
# ============================================

@router.get("/{event_id}")
async def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # ── Get Event ──
    event = db.query(Event).filter(
        Event.event_id == event_id,
        Event.deleted_at.is_(None)
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    # ── Get Impact Results if analyzed ──
    impact_results = db.query(
        EventImpactResult,
        Product.product_name
    ).join(
        Product, EventImpactResult.product_id == Product.product_id
    ).filter(
        EventImpactResult.event_id == event_id
    ).order_by(
        EventImpactResult.change_percentage.desc()  # Highest impact first
    ).all()

    # ── Build impact list ──
    impacts = [
        {
            "product_id": r.EventImpactResult.product_id,
            "product_name": r.product_name,
            "baseline_daily_avg": float(r.EventImpactResult.baseline_daily_avg),
            "during_daily_avg": float(r.EventImpactResult.during_daily_avg),
            "change_percentage": float(r.EventImpactResult.change_percentage),
            "impact_level": r.EventImpactResult.impact_level,
            "baseline_period_start": r.EventImpactResult.baseline_period_start.isoformat(),
            "baseline_period_end": r.EventImpactResult.baseline_period_end.isoformat(),
            "calculated_at": r.EventImpactResult.calculated_at.isoformat() if r.EventImpactResult.calculated_at else None
        }
        for r in impact_results
    ]

    # ── Calculate overall impact ──
    overall = calculate_overall_impact([r.EventImpactResult for r in impact_results])

    # ── Date status ──
    today = date.today()
    if event.start_date > today:
        date_status = "upcoming"
    elif event.end_date < today:
        date_status = "past"
    else:
        date_status = "active"

    duration_days = (event.end_date - event.start_date).days + 1

    return {
        "success": True,
        "event": {
            "event_id": event.event_id,
            "event_name": event.event_name,
            "event_name_ar": event.event_name_ar,
            "event_type": event.event_type,
            "start_date": event.start_date.isoformat(),
            "end_date": event.end_date.isoformat(),
            "duration_days": duration_days,
            "description": event.description,
            "is_recurring": event.is_recurring,
            "recurrence_type": event.recurrence_type,
            "status": event.status,
            "date_status": date_status,
            "created_at": event.created_at.isoformat() if event.created_at else None,
            "updated_at": event.updated_at.isoformat() if event.updated_at else None
        },
        "impact_analysis": {
            "is_analyzed": len(impacts) > 0,
            "overall_impact": overall,
            "affected_products_count": len(impacts),
            "last_calculated": impacts[0]["calculated_at"] if impacts else None,
            "products": impacts
        }
    }


# ============================================
# ENDPOINT 4: Update Event
# ============================================

@router.put("/{event_id}")
async def update_event(
    event_id: int,
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # ── Permission Check ──
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Not authorized")

    # ── Get Event ──
    event = db.query(Event).filter(
        Event.event_id == event_id,
        Event.deleted_at.is_(None)
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    # ── Update Only Provided Fields ──
    # WHY: User might only want to change dates, not the name
    # So we only update what they actually sent
    # Think of it like: editing a form, only changed fields get saved
    if "event_name" in request:
        event.event_name = request["event_name"].strip()
    if "event_name_ar" in request:
        event.event_name_ar = request["event_name_ar"].strip() or None
    if "event_type" in request:
        valid_types = ['religious', 'national', 'seasonal', 'local', 'business', 'promotional', 'custom']
        if request["event_type"] not in valid_types:
            raise HTTPException(status_code=400, detail=f"event_type must be one of: {valid_types}")
        event.event_type = request["event_type"]
    if "description" in request:
        event.description = request["description"].strip() or None
    if "is_recurring" in request:
        event.is_recurring = request["is_recurring"]
    if "recurrence_type" in request:
        event.recurrence_type = request["recurrence_type"]
    if "status" in request:
        event.status = request["status"]

    # ── Handle Date Updates ──
    new_start = event.start_date
    new_end = event.end_date

    if "start_date" in request:
        try:
            new_start = datetime.strptime(request["start_date"], "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="start_date must be YYYY-MM-DD")

    if "end_date" in request:
        try:
            new_end = datetime.strptime(request["end_date"], "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="end_date must be YYYY-MM-DD")

    if new_end < new_start:
        raise HTTPException(status_code=400, detail="end_date cannot be before start_date")

    # ── If dates changed → delete old impact results ──
    dates_changed = (new_start != event.start_date or new_end != event.end_date)

    if dates_changed:
        db.query(EventImpactResult).filter(
            EventImpactResult.event_id == event_id
        ).delete()
        # Tell user analysis was cleared

    event.start_date = new_start
    event.end_date = new_end
    event.updated_by = current_user.user_id
    event.updated_at = datetime.utcnow()

    db.commit()
    invalidate_consultation_cache()

    return {
        "success": True,
        "message": f"Event '{event.event_name}' updated successfully",
        "analysis_cleared": dates_changed,
        "note": "Dates changed - please re-run impact analysis" if dates_changed else None,
        "event": {
            "event_id": event.event_id,
            "event_name": event.event_name,
            "event_name_ar": event.event_name_ar,
            "event_type": event.event_type,
            "start_date": event.start_date.isoformat(),
            "end_date": event.end_date.isoformat(),
            "duration_days": (event.end_date - event.start_date).days + 1,
            "description": event.description,
            "is_recurring": event.is_recurring,
            "recurrence_type": event.recurrence_type,
            "status": event.status,
        }
    }


# ============================================
# ENDPOINT 5: Delete Event
# ============================================

@router.delete("/{event_id}")
async def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # ── Permission Check ──
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Not authorized")

    # ── Get Event ──
    event = db.query(Event).filter(
        Event.event_id == event_id,
        Event.deleted_at.is_(None)
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    # ── Soft Delete ──
    # Impact results are cascade deleted automatically
    # because of ondelete='CASCADE' on event_impact_results.event_id
    event.deleted_at = datetime.utcnow()
    event.updated_by = current_user.user_id
    db.commit()
    invalidate_consultation_cache()
    
    return {
        "success": True,
        "message": f"Event '{event.event_name}' deleted successfully",
        "event_id": event_id
    }


# ============================================
# ENDPOINT 6: Analyze Event Impact
# ============================================

@router.post("/{event_id}/analyze")
async def analyze_event_impact(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze how an event affected product sales.
    
    METHODOLOGY:
    1. Check data availability (do we have the required date ranges?)
    2. Calculate baseline (30 days before event)
    3. Calculate event period averages
    4. Compare and categorize impact
    
    DATA QUALITY LEVELS:
    - high_confidence: Product existed throughout baseline
    - low_confidence: Product existed partially in baseline  
    - event_only: Product only appeared during event
    """
    from app.models.ingestion_batch import IngestionBatch
    
    # ── Get Event ──
    event = db.query(Event).filter(
        Event.event_id == event_id,
        Event.deleted_at.is_(None)
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    # ── Define Required Periods ──
    baseline_end = event.start_date - timedelta(days=1)
    baseline_start = baseline_end - timedelta(days=29)  # 30 days total
    event_duration = (event.end_date - event.start_date).days + 1
    baseline_duration = 30

    # ── STEP 1: Check Data Availability ──
    # Get all completed batches with their date ranges
    available_batches = db.query(
        IngestionBatch.batch_id,
        IngestionBatch.file_name,
        IngestionBatch.date_range_start,
        IngestionBatch.date_range_end
    ).filter(
        IngestionBatch.status == 'completed',
        IngestionBatch.deleted_at.is_(None)
    ).all()

    if not available_batches:
        raise HTTPException(
            status_code=400,
            detail="No sales data found. Upload sales data before analyzing events."
        )

    # ── Check Coverage ──
    # We need pieces covering BOTH baseline AND event period
    
    earliest_available = min(b.date_range_start for b in available_batches if b.date_range_start)
    latest_available = max(b.date_range_end for b in available_batches if b.date_range_end)

    # Check baseline coverage
    if earliest_available > baseline_start:
        missing_days = (earliest_available - baseline_start).days
        raise HTTPException(
            status_code=400,
            detail={
                "error": "insufficient_baseline_data",
                "message": f"Cannot analyze - missing {missing_days} days of baseline data",
                "required_baseline_period": f"{baseline_start} to {baseline_end}",
                "available_data_starts": earliest_available.isoformat(),
                "missing_period": f"{baseline_start} to {earliest_available - timedelta(days=1)}",
                "hint": f"Upload sales data from {baseline_start} onwards to establish baseline"
            }
        )

    # Check event coverage  
    if latest_available < event.end_date:
        missing_days = (event.end_date - latest_available).days
        raise HTTPException(
            status_code=400,
            detail={
                "error": "insufficient_event_data",
                "message": f"Cannot analyze - missing {missing_days} days of event data",
                "required_event_period": f"{event.start_date} to {event.end_date}",
                "available_data_ends": latest_available.isoformat(),
                "missing_period": f"{latest_available + timedelta(days=1)} to {event.end_date}",
                "hint": f"Upload sales data through {event.end_date} to complete analysis"
            }
        )

    # ── STEP 2: Get Product Coverage Info ──
    # For each product, when did it first/last appear in our data?
    # This tells us data quality per product
    product_coverage = db.query(
        SalesRecord.product_id,
        func.min(SalesRecord.sale_date).label('first_sale_date'),
        func.max(SalesRecord.sale_date).label('last_sale_date'),
        func.count(func.distinct(SalesRecord.batch_id)).label('batch_count')
    ).group_by(SalesRecord.product_id).all()

    product_coverage_map = {
        p.product_id: {
            'first_sale': p.first_sale_date,
            'last_sale': p.last_sale_date,
            'batch_count': p.batch_count
        }
        for p in product_coverage
    }

    # ── STEP 3: Calculate Baseline Averages ──
    baseline_data = db.query(
        SalesRecord.product_id,
        func.sum(SalesRecord.quantity).label('total_qty'),
        func.count(func.distinct(SalesRecord.sale_date)).label('days_with_sales')
    ).filter(
        SalesRecord.sale_date >= baseline_start,
        SalesRecord.sale_date <= baseline_end
    ).group_by(SalesRecord.product_id).all()

    # ── STEP 4: Calculate Event Period Averages ──
    event_data = db.query(
        SalesRecord.product_id,
        func.sum(SalesRecord.quantity).label('total_qty'),
        func.count(func.distinct(SalesRecord.sale_date)).label('days_with_sales')
    ).filter(
        SalesRecord.sale_date >= event.start_date,
        SalesRecord.sale_date <= event.end_date
    ).group_by(SalesRecord.product_id).all()

    # ── Build Lookup Maps ──
    baseline_map = {
        r.product_id: {
            'daily_avg': float(r.total_qty) / baseline_duration,
            'days_with_sales': r.days_with_sales,
            'total_qty': float(r.total_qty)
        }
        for r in baseline_data
    }

    event_map = {
        r.product_id: {
            'daily_avg': float(r.total_qty) / event_duration,
            'days_with_sales': r.days_with_sales,
            'total_qty': float(r.total_qty)
        }
        for r in event_data
    }

    # ── STEP 5: Analyze Each Product ──
    new_results = []
    quality_breakdown = {
        'high_confidence': 0,
        'low_confidence': 0,
        'event_only': 0,
        'below_threshold': 0  # Products with < 10% change
    }

    for product_id, event_stats in event_map.items():
        baseline_stats = baseline_map.get(product_id)
        coverage = product_coverage_map.get(product_id)
        
        during_avg = event_stats['daily_avg']
        baseline_avg = baseline_stats['daily_avg'] if baseline_stats else 0

        # ── Determine Data Quality ──
        # Based on when product first appeared in our data
        
        if not baseline_stats or baseline_avg == 0:
            # Product has NO baseline sales
            # Either: truly event-only OR appeared just before event
            
            if coverage['first_sale'] >= event.start_date:
                # Product's first sale was during the event
                data_quality = "event_only"
                quality_breakdown['event_only'] += 1
                
                # For event-only products:
                # - baseline = 0
                # - change = "infinite" (we use 999.99 as marker)
                # - impact = very_high (by definition)
                change_pct = 999.99
                impact_level = "very_high"
                
            elif coverage['first_sale'] > baseline_start:
                # Product appeared AFTER baseline started but BEFORE event
                # Example: baseline Jan 29 - Feb 27, product first sale Feb 20
                # We have SOME baseline but not complete
                data_quality = "low_confidence"
                quality_breakdown['low_confidence'] += 1
                
                # Can't calculate reliable change % with partial baseline
                # Skip this product
                continue
            else:
                # Product existed before baseline but had 0 sales during baseline
                # Very unusual - skip
                continue
                
        else:
            # Product HAS baseline sales
            
            if coverage['first_sale'] <= baseline_start:
                # Product existed before/at baseline start
                # Full baseline coverage = high confidence
                data_quality = "high_confidence"
                quality_breakdown['high_confidence'] += 1
            else:
                # Product appeared partway through baseline
                # Partial baseline coverage = low confidence
                data_quality = "low_confidence"
                quality_breakdown['low_confidence'] += 1
            
            # Calculate change percentage
            change_pct = ((during_avg - baseline_avg) / baseline_avg) * 100
            
            # Get impact level
            impact_level = get_impact_level(change_pct)
            
            # Skip if below 10% threshold (not meaningful)
            if impact_level is None:
                quality_breakdown['below_threshold'] += 1
                continue

        # ── Store Result ──
        new_results.append({
            "event_id": event_id,
            "product_id": product_id,
            "baseline_period_start": baseline_start,
            "baseline_period_end": baseline_end,
            "baseline_daily_avg": round(baseline_avg, 2),
            "during_daily_avg": round(during_avg, 2),
            "change_percentage": round(change_pct, 2),
            "impact_level": impact_level,
            "baseline_data_quality": data_quality,
            "calculated_at": datetime.utcnow()
        })

    # ── STEP 6: Validate Results ──
    if not new_results:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "no_significant_impact",
                "message": "No products showed significant impact (>10% change)",
                "data_quality_breakdown": quality_breakdown,
                "hint": "Try analyzing a different event period or check if sales data is complete"
            }
        )

    # ── STEP 7: Save Results ──
    # Delete old analysis first (user might re-run after uploading more data)
    db.query(EventImpactResult).filter(
        EventImpactResult.event_id == event_id
    ).delete()

    # Bulk insert new results
    db.execute(EventImpactResult.__table__.insert(), new_results)
    db.commit()

    # ── STEP 8: Build Response ──
    # Fetch results with product names
    results_with_names = db.query(
        EventImpactResult,
        Product.product_name
    ).join(
        Product, EventImpactResult.product_id == Product.product_id
    ).filter(
        EventImpactResult.event_id == event_id
    ).order_by(
        EventImpactResult.change_percentage.desc()
    ).all()

    # Group by data quality for clear presentation
    high_confidence_products = []
    low_confidence_products = []
    event_only_products = []

    for r in results_with_names:
        # Calculate confidence metrics
        baseline_days = 30  # We always want 30 days
        
        # Get actual coverage for this product
        coverage = product_coverage_map.get(r.EventImpactResult.product_id)
        
        if r.EventImpactResult.baseline_data_quality == "high_confidence":
            baseline_coverage_pct = 100
            confidence_improves_after = None
        elif r.EventImpactResult.baseline_data_quality == "low_confidence":
            # Calculate how many days of baseline we actually have
            days_available = (baseline_end - coverage['first_sale']).days + 1
            baseline_coverage_pct = round((days_available / baseline_days) * 100, 0)
            
            # When will we have 30 full days?
            # 30 days after product first appeared
            confidence_improves_after = (coverage['first_sale'] + timedelta(days=30)).isoformat()
        else:  # event_only
            baseline_coverage_pct = 0
            confidence_improves_after = None
        
        product_info = {
            "product_id": r.EventImpactResult.product_id,
            "product_name": r.product_name,
            "baseline_daily_avg": float(r.EventImpactResult.baseline_daily_avg),
            "during_daily_avg": float(r.EventImpactResult.during_daily_avg),
            "change_percentage": float(r.EventImpactResult.change_percentage) if r.EventImpactResult.change_percentage != 999.99 else None,
            "impact_level": r.EventImpactResult.impact_level,
            "baseline_data_quality": r.EventImpactResult.baseline_data_quality,
            "baseline_coverage_pct": baseline_coverage_pct,
            "confidence_improves_after": confidence_improves_after
        }

        if r.EventImpactResult.baseline_data_quality == "high_confidence":
            high_confidence_products.append(product_info)
        elif r.EventImpactResult.baseline_data_quality == "low_confidence":
            low_confidence_products.append({
                **product_info, 
                "note": f"Limited baseline data ({int(baseline_coverage_pct)}% coverage). "
                    f"Re-analyze after {confidence_improves_after} for reliable results."
            })
        else:  # event_only
            event_only_products.append({
                **product_info, 
                "note": "Product only sells during this event"
            })
        
    
    # Calculate overall impact
    overall = calculate_overall_impact([r.EventImpactResult for r in results_with_names])

    return {
        "success": True,
        "message": f"Impact analysis complete for '{event.event_name}'",
        "event_id": event_id,
        "analysis": {
            "event_period": {
                "start": event.start_date.isoformat(),
                "end": event.end_date.isoformat(),
                "duration_days": event_duration
            },
            "baseline_period": {
                "start": baseline_start.isoformat(),
                "end": baseline_end.isoformat(),
                "duration_days": baseline_duration
            },
            "data_coverage": {
                "earliest_data": earliest_available.isoformat(),
                "latest_data": latest_available.isoformat(),
                "batches_analyzed": len(available_batches),
                "coverage_complete": True
            },
            "overall_impact": overall,
            "affected_products_count": len(results_with_names),
            "data_quality_breakdown": quality_breakdown,
            "products": {
                "high_confidence": high_confidence_products,
                "low_confidence": low_confidence_products,
                "event_only": event_only_products
            }
        }
    }

# ============================================
# ENDPOINT 7: Get Upcoming Recurring Reminders
# ============================================

@router.get("/reminders/upcoming")
async def get_upcoming_reminders(
    create_notifications: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check for recurring events from last year that are
    coming up in the next  30 days.
    System suggests creating new instances for this year.
    
    **Parameters:**
    - create_notifications: If true, creates notifications for reminders (default: true)
    
    **Use Cases:**
    - User opens app → system checks for upcoming events → creates notifications
    - Background job runs daily → creates reminders automatically
    """
    from app.models.notification import Notification
    
    today = date.today()
    sixty_days_later = today + timedelta(days= 30)

    # ── Find recurring events from last year ──
    # that fall in the same calendar period this year
    recurring_events = db.query(Event).filter(
        Event.is_recurring == True,
        Event.deleted_at.is_(None),
        Event.status == 'confirmed'
    ).all()

    reminders = []
    notifications_created = 0

    for event in recurring_events:
        # Calculate what the dates would be this year
        try:
            this_year_start = event.start_date.replace(year=today.year)
            this_year_end = event.end_date.replace(year=today.year)
        except ValueError:
            # Handles Feb 29 edge case (leap year)
            this_year_start = event.start_date.replace(year=today.year, day=28)
            this_year_end = event.end_date.replace(year=today.year, day=28)

        # Check if this year's version falls in the next  30 days
        if today <= this_year_start <= sixty_days_later:
            # Check if this year's event already exists
            already_exists = db.query(Event).filter(
                Event.event_name == f"{event.event_name.rsplit(' ', 1)[0]} {today.year}",
                Event.deleted_at.is_(None)
            ).first()

            if not already_exists:
                days_until = (this_year_start - today).days
                event_name_base = event.event_name.rsplit(' ', 1)[0]  # Remove year from name
                
                reminder_info = {
                    "original_event_id": event.event_id,
                    "event_name": event.event_name,
                    "event_type": event.event_type,
                    "last_year_dates": {
                        "start": event.start_date.isoformat(),
                        "end": event.end_date.isoformat()
                    },
                    "suggested_dates": {
                        "start": this_year_start.isoformat(),
                        "end": this_year_end.isoformat()
                    },
                    "days_until": days_until,
                    "message": f"'{event_name_base}' is coming up in {days_until} days. "
                               f"Last year it was {event.start_date} to {event.end_date}. "
                               f"Review and confirm dates for this year."
                }
                reminders.append(reminder_info)
                
                # ── Create Notification ──
                if create_notifications:
                    # Check if we already created a notification for this event this year
                    # WHY: Don't spam user with same notification every time they check
                    # Only create if no notification exists for this event in the last  30 days
                    existing_notification = db.query(Notification).filter(
                        Notification.user_id == current_user.user_id,
                        Notification.notification_type == "event_reminder",
                        Notification.related_id == event.event_id,
                        Notification.created_at >= datetime.utcnow() - timedelta(days=30)
                    ).first()
                    
                    if not existing_notification:
                        notification = Notification(
                            user_id=current_user.user_id,
                            title=f"{event_name_base} {today.year} is coming up",
                            message=f"Coming in {days_until} days. "
                                   f"Last year: {event.start_date} to {event.end_date}. "
                                   f"Suggested dates: {this_year_start} to {this_year_end}. "
                                   f"Review and confirm.",
                            notification_type="event_reminder",
                            related_id=event.event_id,
                            related_type="event",
                            is_read=False
                        )
                        db.add(notification)
                        notifications_created += 1

    # ── Commit Notifications ──
    if create_notifications and notifications_created > 0:
        db.commit()

    return {
        "success": True,
        "reminders_count": len(reminders),
        "notifications_created": notifications_created,
        "reminders": reminders
    }
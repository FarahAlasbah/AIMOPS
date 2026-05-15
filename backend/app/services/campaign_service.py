"""
File: backend/app/services/campaign_service.py
Purpose: Full campaign business logic — planning, forecasting, matching, results.
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from fastapi import HTTPException
from datetime import date, timedelta
from typing import Optional
import numpy as np

from app.models.campaign import Campaign, Product, CampaignProduct, CampaignChannel
from app.models.event import Event, EventImpactResult
from app.models.forecast import ForecastResult, ForecastModel
from app.services.campaign_suggestion_service import generate_campaign_suggestion


# ============================================
# READ
# ============================================

def get_all_campaigns(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    include_deleted: bool = False
) -> list:
    query = db.query(Campaign)

    if not include_deleted:
        query = query.filter(Campaign.deleted_at.is_(None))

    if status:
        query = query.filter(Campaign.status == status)

    return query.order_by(Campaign.created_at.desc()).offset(skip).limit(limit).all()


def get_campaign_by_id(db: Session, campaign_id: int) -> Campaign:
    campaign = (
        db.query(Campaign)
        .options(
            joinedload(Campaign.products).joinedload(CampaignProduct.product),
            joinedload(Campaign.channels),
        )
        .filter(
            Campaign.campaign_id == campaign_id,
            Campaign.deleted_at.is_(None)
        )
        .first()
    )

    if not campaign:
        raise HTTPException(status_code=404, detail=f"Campaign {campaign_id} not found")

    return campaign


def get_campaigns_in_range(
    db: Session,
    start_date: date,
    end_date: date
) -> list:
    """
    Get all campaigns that overlap a date range.
    Used for calendar view and spike-to-campaign matching.

    OVERLAP LOGIC:
    A campaign overlaps if it starts before the range ends
    AND ends after the range starts.
    This catches all 4 overlap cases:
      - Campaign fully inside range
      - Campaign fully covers range
      - Campaign starts before, ends inside
      - Campaign starts inside, ends after
    """
    return db.query(Campaign).filter(
        Campaign.deleted_at.is_(None),
        Campaign.start_date <= end_date,
        Campaign.end_date >= start_date
    ).all()


# ============================================
# CREATE — Full Planning Flow
# ============================================

def create_campaign(
    db: Session,
    request: dict,
    current_user_id: int
) -> dict:
    """
    Create a campaign and run the full planning analysis.

    RETURNS a rich response dict (not just the Campaign object)
    because we attach forecast impact, calendar events,
    date suggestions, and consultation advice.

    STEPS:
    1. Validate input
    2. Check event calendar for overlaps
    3. Run forecast impact per product
    4. Generate date suggestions
    5. Get consultation advice
    6. Save campaign with forecast data
    7. Return full response
    """
    from app.services.campaign_consultation_service import (
        get_consultation, build_consultation_context
    )

    # ── Extract Request Data ──
    campaign_name = request.get("campaign_name", "").strip()
    campaign_type = request.get("campaign_type", "discount")
    start_date_str = request.get("start_date")
    end_date_str = request.get("end_date")
    products_input = request.get("products", [])
    channels_input = request.get("channels", [])
    budget = request.get("budget")
    notes = request.get("notes", "")
    target_audience = request.get("target_audience", "")
    description = request.get("description", "")

    # ── Validate Required Fields ──
    if not campaign_name:
        raise HTTPException(status_code=400, detail="campaign_name is required")
    if not start_date_str or not end_date_str:
        raise HTTPException(status_code=400, detail="start_date and end_date are required")
    if not products_input:
        raise HTTPException(status_code=400, detail="At least one product is required")

    # ── Parse Dates ──
    try:
        from datetime import datetime
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be YYYY-MM-DD format")

    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date cannot be before start_date")

    # ── Validate Campaign Type ──
    valid_types = ['discount', 'bundle', 'flash_sale', 'seasonal', 'loyalty', 'other']
    if campaign_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"campaign_type must be one of: {valid_types}"
        )

    # ── Validate Products Exist ──
    product_ids = [p["product_id"] for p in products_input]
    existing_products = db.query(Product).filter(
        Product.product_id.in_(product_ids),
        Product.is_active == True,
        Product.deleted_at.is_(None)
    ).all()

    existing_ids = {p.product_id for p in existing_products}
    missing = set(product_ids) - existing_ids
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Products not found or inactive: {list(missing)}"
        )

    product_map = {p.product_id: p for p in existing_products}

    # ── STEP 1: Check Event Calendar for Overlaps ──
    calendar_events = _check_calendar_overlap(db, start_date, end_date, product_ids)

    # ── STEP 2: Run Forecast Impact Per Product ──
    from app.services.forecasting_service import forecast_with_campaign

    forecast_products = []
    total_additional_units = 0
    total_base_revenue = 0
    total_additional_revenue = 0
    all_multiplier_sources = []
    all_confidences = []

    for p_input in products_input:
        product_id = p_input["product_id"]
        discount_pct = p_input.get("discount_pct") or p_input.get("discount_percentage")
        product = product_map[product_id]

        result = forecast_with_campaign(
            db=db,
            product_id=product_id,
            campaign_start=start_date,
            campaign_end=end_date,
            expected_uplift_pct=None
        )

        if "error" not in result:
            forecast_products.append({
                "product_id": product_id,
                "product_name": product.product_name,
                "category": product.category,
                "discount_pct": discount_pct,
                "base_quantity": result["totals"]["base_quantity"],
                "adjusted_quantity": result["totals"]["adjusted_quantity"],
                "additional_units": result["totals"]["additional_units"],
                "base_revenue": result["totals"].get("base_revenue"),
                "adjusted_revenue": result["totals"].get("adjusted_revenue"),
                "additional_revenue": result["totals"].get("additional_revenue"),
                "multiplier": result["multiplier"],
                "expected_uplift_pct": result["expected_uplift_pct"],
                "multiplier_source": result["multiplier_source"],
                "confidence": result["confidence"],
                "daily_breakdown": result["daily_breakdown"]
            })

            total_additional_units += result["totals"]["additional_units"]
            if result["totals"].get("additional_revenue"):
                total_additional_revenue += result["totals"]["additional_revenue"]
            if result["totals"].get("base_revenue"):
                total_base_revenue += result["totals"]["base_revenue"]
            all_multiplier_sources.append(result["multiplier_source"])
            all_confidences.append(result["confidence"])

    # Determine overall confidence and multiplier source
    dominant_source = _dominant_value(all_multiplier_sources) or "default"
    overall_confidence = _dominant_value(all_confidences) or "medium"

    forecast_totals = {
        "additional_units": round(total_additional_units, 1),
        "base_revenue": round(total_base_revenue, 2) if total_base_revenue else None,
        "additional_revenue": round(total_additional_revenue, 2) if total_additional_revenue else None,
        "estimated_roi": _calculate_roi(budget, total_additional_revenue) if budget else None
    }

    # ── STEP 3: Generate Date Suggestions ──
    date_suggestions = _generate_date_suggestions(
        db, product_ids, start_date, end_date, campaign_type
    )

    # ── STEP 4: Get Consultation Advice ──
    consultation_context = build_consultation_context(
        campaign_name=campaign_name,
        campaign_type=campaign_type,
        start_date=start_date_str,
        end_date=end_date_str,
        budget=float(budget) if budget else None,
        notes=notes,
        products=[{
            "product_name": p["product_name"],
            "discount_pct": p.get("discount_pct"),
            "additional_revenue": p.get("additional_revenue")
        } for p in forecast_products],
        channels=channels_input,
        calendar_events=calendar_events,
        date_suggestions=date_suggestions,
        forecast_totals=forecast_totals,
        multiplier_source=dominant_source,
        forecast_confidence=overall_confidence
    )

    consultation = get_consultation(consultation_context)

    # ── STEP 5: Save Campaign ──
    avg_uplift = None
    if forecast_products:
        uplifts = [p["expected_uplift_pct"] for p in forecast_products if p.get("expected_uplift_pct")]
        if uplifts:
            avg_uplift = round(sum(uplifts) / len(uplifts), 2)

    campaign = Campaign(
        campaign_name=campaign_name,
        campaign_type=campaign_type,
        description=description,
        notes=notes,
        start_date=start_date,
        end_date=end_date,
        budget=budget,
        target_audience=target_audience,
        status='planned',
        forecast_uplift_pct=avg_uplift,
        forecast_additional_revenue=round(total_additional_revenue, 2) if total_additional_revenue else None,
        created_by=current_user_id,
        updated_by=current_user_id
    )
    db.add(campaign)
    db.flush()

    # ── Save Products ──
    for p_input in products_input:
        db.add(CampaignProduct(
            campaign_id=campaign.campaign_id,
            product_id=p_input["product_id"],
            discount_percentage=p_input.get("discount_pct") or p_input.get("discount_percentage"),
            target_quantity=p_input.get("target_quantity")
        ))

    # ── Save Channels ──
    for channel in channels_input:
        channel_name = channel if isinstance(channel, str) else channel.get("channel_name")
        budget_allocated = channel.get("budget_allocated") if isinstance(channel, dict) else None
        if channel_name:
            db.add(CampaignChannel(
                campaign_id=campaign.campaign_id,
                channel_name=channel_name,
                budget_allocated=budget_allocated
            ))

    db.commit()

    # ── Build Response ──
    return {
        "campaign_id": campaign.campaign_id,
        "campaign_name": campaign_name,
        "campaign_type": campaign_type,
        "start_date": start_date_str,
        "end_date": end_date_str,
        "duration_days": (end_date - start_date).days + 1,
        "status": "planned",
        "budget": float(budget) if budget else None,
        "calendar_events": calendar_events,
        "date_suggestions": date_suggestions,
        "forecast_impact": {
            "products": forecast_products,
            "totals": forecast_totals,
            "multiplier_source": dominant_source,
            "confidence": overall_confidence
        },
        "consultation": consultation,
        "products_saved": len(products_input),
        "channels_saved": len(channels_input)
    }


# ============================================
# UPDATE
# ============================================

def update_campaign(
    db: Session,
    campaign_id: int,
    request: dict,
    current_user_id: int
) -> Campaign:
    from datetime import datetime
    campaign = get_campaign_by_id(db, campaign_id)

    updatable = [
        'campaign_name', 'description', 'notes', 'campaign_type',
        'budget', 'target_audience', 'status'
    ]

    for field in updatable:
        if field in request:
            setattr(campaign, field, request[field])

    if 'start_date' in request:
        campaign.start_date = datetime.strptime(request['start_date'], "%Y-%m-%d").date()
    if 'end_date' in request:
        campaign.end_date = datetime.strptime(request['end_date'], "%Y-%m-%d").date()

    campaign.updated_by = current_user_id
    campaign.updated_at = datetime.utcnow()

    db.commit()
    return get_campaign_by_id(db, campaign_id)


# ============================================
# DELETE
# ============================================

def delete_campaign(db: Session, campaign_id: int, current_user_id: int) -> dict:
    from datetime import datetime
    campaign = get_campaign_by_id(db, campaign_id)
    campaign.deleted_at = datetime.utcnow()
    campaign.updated_by = current_user_id
    db.commit()
    return {"success": True, "message": f"Campaign '{campaign.campaign_name}' deleted"}


# ============================================
# RECORD RESULTS (after campaign runs)
# ============================================

def record_results(
    db: Session,
    campaign_id: int,
    linked_event_id: Optional[int],
    current_user_id: int
) -> dict:
    """
    Record actual campaign results from sales data already in DB.
    Called when a spike is linked to a campaign (confirm or silent).

    ALWAYS runs regardless of whether user confirmed the link.
    Numbers come from SalesRecord — no manual entry needed.

    Also runs post-campaign baseline analysis to detect
    permanent demand shifts caused by the campaign.
    """
    from datetime import datetime
    from app.models.sales_record import SalesRecord
    from sqlalchemy import func

    campaign = get_campaign_by_id(db, campaign_id)
    product_ids = [cp.product_id for cp in campaign.products]

    if not product_ids:
        return {"error": "No products found for this campaign"}

    # ── Pull actual results from SalesRecord ──
    actual_records = db.query(
        func.sum(SalesRecord.quantity).label('total_qty'),
        func.sum(SalesRecord.total_amount).label('total_revenue')
    ).filter(
        SalesRecord.product_id.in_(product_ids),
        SalesRecord.sale_date >= campaign.start_date,
        SalesRecord.sale_date <= campaign.end_date
    ).first()

    actual_units = float(actual_records.total_qty) if actual_records.total_qty else 0
    actual_revenue = float(actual_records.total_revenue) if actual_records.total_revenue else 0

    duration = (campaign.end_date - campaign.start_date).days + 1
    actual_daily = actual_units / duration if duration > 0 else 0

    # ── Get pre-campaign baseline (30 days before) ──
    baseline_start = campaign.start_date - timedelta(days=30)
    baseline_end = campaign.start_date - timedelta(days=1)

    baseline_records = db.query(
        func.sum(SalesRecord.quantity).label('total_qty')
    ).filter(
        SalesRecord.product_id.in_(product_ids),
        SalesRecord.sale_date >= baseline_start,
        SalesRecord.sale_date <= baseline_end
    ).first()

    baseline_qty = float(baseline_records.total_qty) if baseline_records and baseline_records.total_qty else 0
    baseline_daily = baseline_qty / 30 if baseline_qty > 0 else 0

    # ── Calculate actual uplift ──
    actual_uplift = None
    if baseline_daily > 0:
        actual_uplift = round(
            ((actual_daily - baseline_daily) / baseline_daily) * 100, 2
        )

    # ── Calculate ROI ──
    roi = None
    if campaign.budget and float(campaign.budget) > 0 and actual_revenue > 0:
        roi = round(
            ((actual_revenue - float(campaign.budget)) / float(campaign.budget)) * 100,
            2
        )

    # ── Save results ──
    campaign.actual_revenue = actual_revenue
    campaign.actual_uplift_pct = actual_uplift
    campaign.roi = roi
    campaign.status = 'completed'
    campaign.updated_by = current_user_id
    campaign.updated_at = datetime.utcnow()

    if linked_event_id:
        campaign.linked_event_id = linked_event_id

    db.commit()

    # ── Post-campaign baseline analysis ──
    baseline_shift = _analyze_baseline_shift(
        db, product_ids,
        campaign.end_date,
        baseline_daily
    )

    # ── Flag products for retraining if baseline shifted ──
    if baseline_shift["shift_detected"]:
        _flag_for_retraining(db, product_ids)

    # ── Build forecast vs actual comparison ──
    comparison = None
    if campaign.forecast_uplift_pct and actual_uplift:
        comparison = {
            "predicted_uplift_pct": float(campaign.forecast_uplift_pct),
            "actual_uplift_pct": actual_uplift,
            "accuracy_pct": round(
                (actual_uplift / float(campaign.forecast_uplift_pct)) * 100, 1
            ) if float(campaign.forecast_uplift_pct) > 0 else None,
            "over_under": "over" if actual_uplift > float(campaign.forecast_uplift_pct) else "under"
        }

    return {
        "success": True,
        "campaign_id": campaign_id,
        "campaign_name": campaign.campaign_name,
        "status": "completed",
        "actual_units": round(actual_units, 1),
        "actual_revenue": round(actual_revenue, 2),
        "actual_uplift_pct": actual_uplift,
        "roi": roi,
        "baseline_shift": baseline_shift,
        "forecast_vs_actual": comparison,
        "retraining_flagged": baseline_shift["shift_detected"]
    }


def _analyze_baseline_shift(
    db,
    product_ids: list,
    campaign_end: date,
    pre_campaign_daily: float
) -> dict:
    """
    Compare post-campaign sales to pre-campaign baseline.
    Detects whether the campaign caused a permanent demand shift.

    THREE OUTCOMES:
    - spike_only: sales returned to pre-campaign baseline (±15%)
    - partial_lift: sales settled higher than before but lower than during
    - full_lift: sales maintained near campaign levels

    WHY 30 DAYS POST:
    Enough time for the initial excitement to settle
    and see what the new normal actually is.
    """
    from app.models.sales_record import SalesRecord
    from sqlalchemy import func

    post_start = campaign_end + timedelta(days=1)
    post_end = campaign_end + timedelta(days=30)

    # Check if we have enough post-campaign data
    post_records = db.query(
        func.sum(SalesRecord.quantity).label('total_qty'),
        func.count(SalesRecord.sale_date.distinct()).label('days_count')
    ).filter(
        SalesRecord.product_id.in_(product_ids),
        SalesRecord.sale_date >= post_start,
        SalesRecord.sale_date <= post_end
    ).first()

    if not post_records or not post_records.total_qty or post_records.days_count < 7:
        return {
            "shift_detected": False,
            "outcome": "insufficient_data",
            "message": "Not enough post-campaign data yet. Check back in 30 days.",
            "post_campaign_daily": None,
            "pre_campaign_daily": round(pre_campaign_daily, 2)
        }

    post_daily = float(post_records.total_qty) / 30

    if pre_campaign_daily <= 0:
        return {
            "shift_detected": False,
            "outcome": "no_baseline",
            "message": "No pre-campaign baseline available for comparison.",
            "post_campaign_daily": round(post_daily, 2),
            "pre_campaign_daily": 0
        }

    change_pct = ((post_daily - pre_campaign_daily) / pre_campaign_daily) * 100

    if abs(change_pct) <= 15:
        outcome = "spike_only"
        shift_detected = False
        message = (
            f"Sales returned to pre-campaign levels "
            f"({round(post_daily, 1)} vs {round(pre_campaign_daily, 1)} units/day). "
            f"The uplift was temporary."
        )
    elif change_pct > 15:
        outcome = "partial_lift" if change_pct < 50 else "full_lift"
        shift_detected = True
        message = (
            f"Sales settled at a new baseline of {round(post_daily, 1)} units/day — "
            f"{round(change_pct, 1)}% higher than before the campaign. "
            f"The campaign attracted new recurring customers. "
            f"Forecasts will be updated to reflect this new baseline."
        )
    else:
        outcome = "decline"
        shift_detected = False
        message = (
            f"Sales dropped below pre-campaign levels after the campaign ended "
            f"({round(post_daily, 1)} vs {round(pre_campaign_daily, 1)} units/day). "
            f"This may indicate demand was pulled forward during the campaign."
        )

    return {
        "shift_detected": shift_detected,
        "outcome": outcome,
        "message": message,
        "post_campaign_daily": round(post_daily, 2),
        "pre_campaign_daily": round(pre_campaign_daily, 2),
        "change_pct": round(change_pct, 1)
    }


def _flag_for_retraining(db, product_ids: list):
    """
    Mark forecast models for retraining when baseline shifts detected.
    Sets status back to 'training' so the status endpoint
    shows the user that forecasts need updating.
    """
    from app.models.forecast import ForecastModel
    db.query(ForecastModel).filter(
        ForecastModel.product_id.in_(product_ids),
        ForecastModel.status == 'ready'
    ).update(
        {"status": "training"},
        synchronize_session=False
    )
    db.commit()

# ============================================
# SPIKE-TO-CAMPAIGN MATCHING
# ============================================

def find_matching_campaign(
    db: Session,
    spike_start: date,
    spike_end: date,
    product_id: int
) -> Optional[dict]:
    """
    Called by campaign_detection_service when a spike is detected.
    Checks if any stored campaign overlaps the spike date range
    for this product.

    OVERLAP LOGIC:
    Campaign overlaps spike if campaign starts before spike ends
    AND campaign ends after spike starts.

    RETURNS:
    The best matching campaign (most overlap) or None.
    """
    # Find campaigns that overlap and include this product
    matching = db.query(Campaign).join(
        CampaignProduct,
        CampaignProduct.campaign_id == Campaign.campaign_id
    ).filter(
        Campaign.deleted_at.is_(None),
        CampaignProduct.product_id == product_id,
        Campaign.start_date <= spike_end,
        Campaign.end_date >= spike_start
    ).all()

    if not matching:
        return None

    # Pick the one with the most overlap days
    best = None
    best_overlap = 0

    for campaign in matching:
        overlap_start = max(campaign.start_date, spike_start)
        overlap_end = min(campaign.end_date, spike_end)
        overlap_days = (overlap_end - overlap_start).days + 1

        if overlap_days > best_overlap:
            best_overlap = overlap_days
            best = campaign

    if not best:
        return None

    return {
        "campaign_id": best.campaign_id,
        "campaign_name": best.campaign_name,
        "campaign_type": best.campaign_type,
        "start_date": best.start_date.isoformat(),
        "end_date": best.end_date.isoformat(),
        "overlap_days": best_overlap,
        "budget": float(best.budget) if best.budget else None
    }


# ============================================
# PRIVATE HELPERS
# ============================================

def _check_calendar_overlap(
    db: Session,
    start_date: date,
    end_date: date,
    product_ids: list
) -> list:
    """
    Find confirmed events that overlap the campaign date range.
    For each event, attach historical impact for these products.

    WHY ONLY CONFIRMED EVENTS:
    Draft events haven't been validated by the user yet.
    Only confirmed events have reliable impact data.
    """
    overlapping_events = db.query(Event).filter(
        Event.deleted_at.is_(None),
        Event.status == 'confirmed',
        Event.start_date <= end_date,
        Event.end_date >= start_date
    ).all()

    result = []
    for event in overlapping_events:
        # Get impact for these specific products
        impacts = db.query(EventImpactResult).filter(
            EventImpactResult.event_id == event.event_id,
            EventImpactResult.product_id.in_(product_ids)
        ).all()

        if impacts:
            avg_impact = sum(
                float(i.change_percentage)
                for i in impacts
                if float(i.change_percentage) < 999
            ) / len(impacts)
            max_impact_level = max(
                impacts, key=lambda i: float(i.change_percentage)
            ).impact_level
        else:
            avg_impact = None
            max_impact_level = None

        # Determine overlap type
        if event.start_date >= start_date and event.end_date <= end_date:
            overlap = "full"
        elif event.start_date < start_date and event.end_date > end_date:
            overlap = "contains"
        else:
            overlap = "partial"

        result.append({
            "event_id": event.event_id,
            "event_name": event.event_name,
            "event_type": event.event_type,
            "start_date": event.start_date.isoformat(),
            "end_date": event.end_date.isoformat(),
            "overlap": overlap,
            "historical_impact_pct": round(avg_impact, 1) if avg_impact else None,
            "impact_level": max_impact_level,
            "note": _event_overlap_note(event.event_name, avg_impact, overlap)
        })

    return result


def _event_overlap_note(event_name: str, impact_pct: float, overlap: str) -> str:
    """Generate a human-readable note about the event overlap."""
    if impact_pct and impact_pct > 50:
        return f"{event_name} historically drives strong sales — timing is favorable"
    elif impact_pct and impact_pct > 15:
        return f"{event_name} has moderate historical impact on these products"
    elif impact_pct:
        return f"{event_name} has minor historical impact on these products"
    else:
        return f"{event_name} overlaps your campaign dates"


def _generate_date_suggestions(
    db: Session,
    product_ids: list,
    proposed_start: date,
    proposed_end: date,
    campaign_type: str
) -> list:
    """
    Find 2 alternative date windows in the 90-day forecast horizon
    and compare them to the user's proposed dates.

    HOW WE FIND ALTERNATIVES:
    We look at the stored forecast data for these products across
    the 90-day window. We split it into weekly buckets and find:
    1. The week with the highest forecast quantity (peak opportunity)
    2. The week with the lowest forecast quantity (clearance opportunity)

    WHY WEEKLY:
    Daily data is too noisy for suggesting date ranges.
    Weekly gives clean, actionable suggestions.
    """
    today = date.today()
    horizon_end = today + timedelta(days=90)
    duration = (proposed_end - proposed_start).days + 1

    # Get forecast data for all products across the 90-day window
    forecasts = db.query(ForecastResult).filter(
        ForecastResult.product_id.in_(product_ids),
        ForecastResult.forecast_date >= today,
        ForecastResult.forecast_date <= horizon_end
    ).all()

    if not forecasts:
        # No forecast data — return only proposed dates
        return [{
            "start_date": proposed_start.isoformat(),
            "end_date": proposed_end.isoformat(),
            "label": "Your proposed dates",
            "forecast_uplift_pct": None,
            "note": "No forecast data available — generate forecasts first"
        }]

    # Build weekly aggregates
    from collections import defaultdict
    weekly = defaultdict(float)
    for f in forecasts:
        # Bucket by week start (Monday)
        week_start = f.forecast_date - timedelta(days=f.forecast_date.weekday())
        weekly[week_start] += float(f.predicted_quantity)

    # Sort weeks by total quantity
    sorted_weeks = sorted(weekly.items(), key=lambda x: x[1])

    suggestions = []

    # Always include proposed dates first
    proposed_qty = sum(
        float(f.predicted_quantity)
        for f in forecasts
        if proposed_start <= f.forecast_date <= proposed_end
    )
    proposed_uplift = _estimate_uplift_for_window(
        proposed_qty, sorted_weeks, duration, len(product_ids)
    )

    suggestions.append({
        "start_date": proposed_start.isoformat(),
        "end_date": proposed_end.isoformat(),
        "label": "Your proposed dates",
        "forecast_quantity": round(proposed_qty, 1),
        "forecast_uplift_pct": proposed_uplift,
        "note": _date_suggestion_note(proposed_uplift, "proposed")
    })

    # Find peak opportunity window (highest demand)
    if sorted_weeks:
        peak_week_start = sorted_weeks[-1][0]
        peak_end = peak_week_start + timedelta(days=duration - 1)
        peak_end = min(peak_end, horizon_end)

        # Don't suggest same as proposed
        if abs((peak_week_start - proposed_start).days) > 7:
            peak_qty = sum(
                float(f.predicted_quantity)
                for f in forecasts
                if peak_week_start <= f.forecast_date <= peak_end
            )
            peak_uplift = _estimate_uplift_for_window(
                peak_qty, sorted_weeks, duration, len(product_ids)
            )
            suggestions.append({
                "start_date": peak_week_start.isoformat(),
                "end_date": peak_end.isoformat(),
                "label": "Peak demand window",
                "forecast_quantity": round(peak_qty, 1),
                "forecast_uplift_pct": peak_uplift,
                "note": _date_suggestion_note(peak_uplift, "peak")
            })

    # Find clearance window (lowest demand) — good for moving stock
    if len(sorted_weeks) > 2:
        low_week_start = sorted_weeks[0][0]
        low_end = low_week_start + timedelta(days=duration - 1)
        low_end = min(low_end, horizon_end)

        if abs((low_week_start - proposed_start).days) > 7:
            low_qty = sum(
                float(f.predicted_quantity)
                for f in forecasts
                if low_week_start <= f.forecast_date <= low_end
            )
            low_uplift = _estimate_uplift_for_window(
                low_qty, sorted_weeks, duration, len(product_ids)
            )
            suggestions.append({
                "start_date": low_week_start.isoformat(),
                "end_date": low_end.isoformat(),
                "label": "Low demand window — good for clearance",
                "forecast_quantity": round(low_qty, 1),
                "forecast_uplift_pct": low_uplift,
                "note": _date_suggestion_note(low_uplift, "low")
            })

    return suggestions


def _estimate_uplift_for_window(
    window_qty: float,
    sorted_weeks: list,
    duration: int,
    product_count: int
) -> Optional[float]:
    """
    Estimate uplift percentage for a date window.
    Compares window quantity to the median weekly quantity.
    """
    if not sorted_weeks or product_count == 0:
        return None

    weekly_quantities = [qty for _, qty in sorted_weeks]
    median_qty = sorted(weekly_quantities)[len(weekly_quantities) // 2]

    # Scale median to match window duration (weeks are 7 days)
    scaled_median = median_qty * (duration / 7) * product_count

    if scaled_median <= 0:
        return None

    uplift = ((window_qty - scaled_median) / scaled_median) * 100
    return round(uplift, 1)


def _date_suggestion_note(uplift: Optional[float], window_type: str) -> str:
    """Human-readable note for a date suggestion."""
    if window_type == "proposed":
        if uplift and uplift > 50:
            return "High demand period — strong campaign opportunity"
        elif uplift and uplift > 0:
            return "Moderate demand period"
        elif uplift and uplift < 0:
            return "Below-average demand period — consider alternative dates"
        return "Your proposed dates"

    elif window_type == "peak":
        return "Highest forecast demand in the next 90 days — maximize sales volume"

    elif window_type == "low":
        return "Quieter period — ideal for clearance or attracting new customers"

    return ""


def _calculate_uplift_from_discount(
    campaign_type: str,
    discount_pct: Optional[float],
    calendar_events: list
) -> Optional[float]:
    """
    Estimate uplift percentage from discount size and campaign type.
    Used when no historical data exists for this product.

    LOGIC:
    Base uplift comes from discount size (price elasticity approximation).
    Multiplied by campaign type factor.
    Further multiplied if high-impact events overlap.

    THIS IS A ROUGH ESTIMATE — historical data always wins.
    When forecast_with_campaign finds historical promo impacts,
    it uses those instead of this estimate.
    """
    if not discount_pct:
        return None

    # Base: roughly 2x the discount percentage as uplift
    # (10% discount → ~20% uplift — conservative estimate)
    base_uplift = float(discount_pct) * 2.0

    # Campaign type multiplier
    type_multipliers = {
        'flash_sale': 1.5,   # Urgency drives higher response
        'bundle': 1.2,       # Higher basket value
        'discount': 1.0,     # Baseline
        'seasonal': 1.3,     # Season context helps
        'loyalty': 0.8,      # Smaller but more loyal audience
        'other': 1.0
    }
    base_uplift *= type_multipliers.get(campaign_type, 1.0)

    # Event overlap bonus
    high_impact = any(
        e.get("impact_level") in ("high", "very_high")
        for e in calendar_events
    )
    if high_impact:
        base_uplift *= 1.3  # 30% bonus during high-impact events

    return round(base_uplift, 1)


def _calculate_roi(budget: float, additional_revenue: float) -> Optional[str]:
    """Calculate predicted ROI as a percentage string."""
    if not budget or not additional_revenue or float(budget) == 0:
        return None
    roi = ((float(additional_revenue) - float(budget)) / float(budget)) * 100
    return f"{round(roi, 1)}%"


def _dominant_value(values: list) -> Optional[str]:
    """Return the most common value in a list."""
    if not values:
        return None
    return max(set(values), key=values.count)
"""
File: backend/app/services/campaign_suggestion_service.py
Purpose: AI-powered campaign suggestion generator.

MODES:
- full: AIMOPS decides everything — returns opportunity + clearance suggestions
- products_given: user provided products, suggest everything else
- event_given: user picked an event, suggest products + everything else
- clearance: find slow stock and build a clearance campaign

HOW IT WORKS:
1. Analyze business data (events, sales, forecasts)
2. Build structured suggestion (dates, products, type, channels, budget)
3. Enrich text fields (name, notes, description) with Claude API
4. Return suggestion(s) matching POST /api/campaigns request body exactly

CLAUDE INTEGRATION:
Only enriches text fields — campaign_name, notes, description.
Structured fields (products, dates, budget, channels) are always data-driven.
If Claude fails, hardcoded text is used as fallback silently.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from datetime import date, timedelta
from typing import Optional

from app.models.campaign import Campaign, Product
from app.models.event import Event, EventImpactResult
from app.models.forecast import ForecastResult
from app.models.sales_record import SalesRecord


# ============================================
# MAIN ENTRY POINT
# ============================================

def generate_campaign_suggestion(
    db: Session,
    mode: str = "full",
    product_ids: list = None,
    event_id: int = None,
    start_date: date = None,
    end_date: date = None
) -> dict:
    """
    Generate campaign suggestion(s) based on mode.

    MODES:
    - full: AIMOPS decides everything — returns opportunity + clearance
    - products_given: user provided products, suggest everything else
    - event_given: user picked an event, suggest products + everything else
    - clearance: find slow stock and build clearance campaign

    RETURNS:
    {
        "success": True,
        "mode": "full",
        "suggestions": [...]   # 1 or 2 suggestions
    }

    Each suggestion matches POST /api/campaigns request body exactly.
    Frontend populates the form — nothing is saved by this endpoint.
    """
    from app.services.campaign_consultation_service import enrich_suggestion_with_claude
    from app.models.business_profile import BusinessProfile

    # ── Get business profile for Claude context ──
    business_profile = db.query(BusinessProfile).first()
    bp_dict = None
    if business_profile:
        bp_dict = {
            "business_name": business_profile.business_name,
            "industry": business_profile.industry
        }

    today = date.today()
    suggestions = []

    if mode == "full":
        opportunity = _build_opportunity_suggestion(db, today)
        opportunity = enrich_suggestion_with_claude(opportunity, bp_dict)
        suggestions.append(opportunity)

        clearance = _build_clearance_suggestion(db, today)
        clearance = enrich_suggestion_with_claude(clearance, bp_dict)
        suggestions.append(clearance)

    elif mode == "products_given":
        if not product_ids:
            raise HTTPException(
                status_code=400,
                detail="product_ids is required for products_given mode"
            )
        suggestion = _build_suggestion_from_products(
            db, product_ids, today, start_date, end_date
        )
        suggestion = enrich_suggestion_with_claude(suggestion, bp_dict)
        suggestions.append(suggestion)

    elif mode == "event_given":
        if not event_id:
            raise HTTPException(
                status_code=400,
                detail="event_id is required for event_given mode"
            )
        event = db.query(Event).filter(
            Event.event_id == event_id,
            Event.deleted_at.is_(None)
        ).first()
        if not event:
            raise HTTPException(
                status_code=404,
                detail=f"Event {event_id} not found"
            )
        suggestion = _suggest_from_event(db, event, today)
        suggestion = enrich_suggestion_with_claude(suggestion, bp_dict)
        suggestions.append(suggestion)

    elif mode == "clearance":
        suggestion = _build_clearance_suggestion(db, today)
        suggestion = enrich_suggestion_with_claude(suggestion, bp_dict)
        suggestions.append(suggestion)

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode '{mode}'. Must be: full, products_given, event_given, clearance"
        )

    return {
        "success": True,
        "mode": mode,
        "suggestions": suggestions
    }


# ============================================
# SUGGESTION BUILDERS
# ============================================

def _build_opportunity_suggestion(db: Session, today: date) -> dict:
    """
    Build the opportunity suggestion.
    Capitalizes on upcoming events or top-performing products.

    PRIORITY:
    1. Upcoming confirmed recurring events in next 30 days
    2. This year's equivalent of past recurring events
    3. Fallback to top revenue products
    """
    thirty_days = today + timedelta(days=30)

    # Check for upcoming recurring events with actual future dates
    upcoming_events = db.query(Event).filter(
        Event.deleted_at.is_(None),
        Event.status == 'confirmed',
        Event.is_recurring == True,
        Event.start_date >= today,
        Event.start_date <= thirty_days
    ).order_by(Event.start_date.asc()).all()

    # Try this year's equivalent of past recurring events
    if not upcoming_events:
        recurring = db.query(Event).filter(
            Event.deleted_at.is_(None),
            Event.status == 'confirmed',
            Event.is_recurring == True
        ).all()

        for event in recurring:
            try:
                this_year_start = event.start_date.replace(year=today.year)
            except ValueError:
                this_year_start = event.start_date.replace(
                    year=today.year, day=28
                )

            if today <= this_year_start <= thirty_days:
                upcoming_events.append(event)

    if upcoming_events:
        suggestion = _suggest_from_event(db, upcoming_events[0], today)
        suggestion["label"] = "Capitalize on upcoming opportunity"
        suggestion["strategy"] = "opportunity"
        return suggestion

    suggestion = _suggest_from_top_products(db, today)
    suggestion["label"] = "Drive sales with top products"
    suggestion["strategy"] = "opportunity"
    return suggestion


def _build_clearance_suggestion(db: Session, today: date) -> dict:
    """
    Build a clearance suggestion for slow-moving products.

    SLOW STOCK DETECTION:
    Compare each product's sales in the last 30 days vs the 30 days before.
    A product is flagged if:
    - Sales declined by 30%+ compared to the previous period
    - OR no sales recorded in the last 14 days despite having history
    """
    thirty_days_ago = today - timedelta(days=30)
    sixty_days_ago = today - timedelta(days=60)
    fourteen_days_ago = today - timedelta(days=14)

    # Sales in last 30 days per product
    recent = db.query(
        SalesRecord.product_id,
        func.sum(SalesRecord.quantity).label('recent_qty'),
        func.max(SalesRecord.sale_date).label('last_sale')
    ).filter(
        SalesRecord.sale_date >= thirty_days_ago,
        SalesRecord.sale_date <= today
    ).group_by(SalesRecord.product_id).all()

    recent_map = {
        r.product_id: {
            'qty': float(r.recent_qty),
            'last_sale': r.last_sale
        }
        for r in recent
    }

    # Sales in the 30 days before that
    previous = db.query(
        SalesRecord.product_id,
        func.sum(SalesRecord.quantity).label('prev_qty')
    ).filter(
        SalesRecord.sale_date >= sixty_days_ago,
        SalesRecord.sale_date < thirty_days_ago
    ).group_by(SalesRecord.product_id).all()

    previous_map = {r.product_id: float(r.prev_qty) for r in previous}

    # Identify slow-moving products
    slow_products = []

    for product_id, recent_data in recent_map.items():
        prev_qty = previous_map.get(product_id, 0)
        recent_qty = recent_data['qty']
        last_sale = recent_data['last_sale']

        if prev_qty > 0:
            decline_pct = ((recent_qty - prev_qty) / prev_qty) * 100
            is_declining = decline_pct <= -30
        else:
            is_declining = False

        no_recent_sales = (
            last_sale is not None and
            last_sale < fourteen_days_ago
        )

        if is_declining or no_recent_sales:
            slow_products.append({
                'product_id': product_id,
                'recent_qty': recent_qty,
                'prev_qty': prev_qty,
                'decline_pct': round(
                    ((recent_qty - prev_qty) / prev_qty) * 100, 1
                ) if prev_qty > 0 else None,
                'last_sale': last_sale
            })

    # Sort by worst decline first
    slow_products.sort(key=lambda x: x.get('decline_pct') or 0)
    top_slow = slow_products[:5]

    if not top_slow:
        return {
            "label": "Move slow-moving stock",
            "strategy": "clearance",
            "campaign_name": "Inventory Clearance",
            "campaign_name_ar": None,
            "campaign_type": "flash_sale",
            "start_date": (today + timedelta(days=3)).isoformat(),
            "end_date": (today + timedelta(days=5)).isoformat(),
            "products": [],
            "channels": ["in_store", "sms"],
            "budget": _estimate_budget(db),
            "notes": "No slow-moving products detected. All products are selling well.",
            "target_audience": "All customers",
            "description": "Inventory clearance campaign.",
            "suggestion_reason": {
                "type": "clearance",
                "message": "No significantly slow-moving products found in the last 60 days."
            }
        }

    # Get product details for slow products
    slow_product_ids = [p['product_id'] for p in top_slow]
    product_map = {
        p.product_id: p
        for p in db.query(Product).filter(
            Product.product_id.in_(slow_product_ids),
            Product.is_active == True,
            Product.deleted_at.is_(None)
        ).all()
    }

    products = []
    for slow in top_slow:
        product = product_map.get(slow['product_id'])
        if not product:
            continue
        products.append({
            "product_id": slow['product_id'],
            "product_name": product.product_name,
            "discount_pct": 25,
            "target_quantity": None,
            "decline_pct": slow.get('decline_pct')
        })

    start_date = today + timedelta(days=3)
    end_date = start_date + timedelta(days=4)

    return {
        "label": "Move slow-moving stock",
        "strategy": "clearance",
        "campaign_name": "Flash Clearance Sale",
        "campaign_name_ar": None,
        "campaign_type": "flash_sale",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "products": products,
        "channels": ["in_store", "sms", "instagram"],
        "budget": _estimate_budget(db),
        "notes": (
            f"These {len(products)} products have shown declining sales. "
            f"A short flash sale with aggressive discounting can quickly "
            f"move inventory and free up cash."
        ),
        "target_audience": "All customers",
        "description": f"Flash sale to clear {len(products)} slow-moving products.",
        "suggestion_reason": {
            "type": "clearance",
            "slow_products_found": len(top_slow),
            "products_selected_by": "sales_decline_last_60_days",
            "message": f"Found {len(top_slow)} products with declining or stalled sales."
        }
    }


def _build_suggestion_from_products(
    db: Session,
    product_ids: list,
    today: date,
    start_date: date = None,
    end_date: date = None
) -> dict:
    """
    User provided products — suggest everything else around them.

    LOGIC:
    1. Check if upcoming events historically impact these specific products
    2. If yes → align dates and type with that event
    3. If no → use provided dates or default to next 7 days
    """
    products_db = db.query(Product).filter(
        Product.product_id.in_(product_ids),
        Product.is_active == True,
        Product.deleted_at.is_(None)
    ).all()

    if not products_db:
        raise HTTPException(
            status_code=400,
            detail="None of the provided product_ids are valid active products"
        )

    product_map = {p.product_id: p for p in products_db}
    thirty_days = today + timedelta(days=30)

    # Check upcoming events for impact on these products
    upcoming_events = db.query(Event).filter(
        Event.deleted_at.is_(None),
        Event.status == 'confirmed',
        Event.start_date >= today,
        Event.start_date <= thirty_days
    ).all()

    best_event = None
    best_impact = 0

    for event in upcoming_events:
        impacts = db.query(EventImpactResult).filter(
            EventImpactResult.event_id == event.event_id,
            EventImpactResult.product_id.in_(product_ids)
        ).all()

        if impacts:
            avg = sum(
                float(i.change_percentage)
                for i in impacts
                if float(i.change_percentage) < 999
            ) / len(impacts)

            if avg > best_impact:
                best_impact = avg
                best_event = event

    # Build products list
    products_out = []
    for pid in product_ids:
        product = product_map.get(pid)
        if not product:
            continue
        products_out.append({
            "product_id": pid,
            "product_name": product.product_name,
            "discount_pct": 15,
            "target_quantity": None
        })

    if best_event and not start_date:
        try:
            suggested_start = best_event.start_date.replace(year=today.year)
            suggested_end = best_event.end_date.replace(year=today.year)
        except ValueError:
            suggested_start = best_event.start_date.replace(
                year=today.year, day=28
            )
            suggested_end = best_event.end_date.replace(
                year=today.year, day=28
            )

        type_map = {
            'religious': 'seasonal', 'national': 'seasonal',
            'seasonal': 'seasonal', 'promotional': 'discount',
            'local': 'discount', 'business': 'bundle', 'custom': 'discount'
        }
        campaign_type = type_map.get(best_event.event_type, 'discount')
        reason = {
            "type": "event_given",
            "event_id": best_event.event_id,
            "event_name": best_event.event_name,
            "historical_impact_pct": round(best_impact, 1),
            "message": (
                f"Your products historically perform well "
                f"during {best_event.event_name}"
            )
        }
        note = (
            f"These products historically show +{best_impact:.0f}% sales during "
            f"{best_event.event_name}. Timing this campaign with the event "
            f"maximizes your opportunity."
        )
    else:
        suggested_start = start_date or (today + timedelta(days=7))
        suggested_end = end_date or (suggested_start + timedelta(days=6))
        campaign_type = "discount"
        reason = {
            "type": "products_given",
            "message": "Dates and type suggested based on product sales history."
        }
        note = (
            "Campaign built around your selected products. "
            "Consider running this during a high-traffic period for best results."
        )

    return {
        "label": "Campaign around your products",
        "strategy": "products_given",
        "campaign_name": "Product Campaign",
        "campaign_name_ar": None,
        "campaign_type": campaign_type,
        "start_date": suggested_start.isoformat(),
        "end_date": suggested_end.isoformat(),
        "products": products_out,
        "channels": _suggest_channels(campaign_type),
        "budget": _estimate_budget(db),
        "notes": note,
        "target_audience": "Existing customers",
        "description": "",
        "suggestion_reason": reason
    }


def _suggest_from_event(db: Session, event: Event, today: date) -> dict:
    """
    Build a campaign suggestion around a specific event.
    Finds products most historically impacted by this event.
    Falls back to top products if no impact data exists.
    """
    try:
        start_date = event.start_date.replace(year=today.year)
        end_date = event.end_date.replace(year=today.year)
    except ValueError:
        start_date = event.start_date.replace(year=today.year, day=28)
        end_date = event.end_date.replace(year=today.year, day=28)

    # Find products with high historical impact for this event
    impact_results = db.query(EventImpactResult).filter(
        EventImpactResult.event_id == event.event_id,
        EventImpactResult.impact_level.in_(['high', 'very_high', 'medium']),
        EventImpactResult.baseline_data_quality == 'high_confidence'
    ).order_by(
        EventImpactResult.change_percentage.desc()
    ).limit(5).all()

    products = []
    if impact_results:
        product_ids = [r.product_id for r in impact_results]
        product_map = {
            p.product_id: p
            for p in db.query(Product).filter(
                Product.product_id.in_(product_ids),
                Product.is_active == True,
                Product.deleted_at.is_(None)
            ).all()
        }

        for impact in impact_results:
            product = product_map.get(impact.product_id)
            if not product:
                continue
            discount = {
                'very_high': 20,
                'high': 15,
                'medium': 10
            }.get(impact.impact_level, 10)

            products.append({
                "product_id": impact.product_id,
                "product_name": product.product_name,
                "discount_pct": discount,
                "target_quantity": None
            })

    # Fallback to top products if no impact data
    if not products:
        return _suggest_from_top_products(db, today, event=event)

    type_map = {
        'religious': 'seasonal', 'national': 'seasonal',
        'seasonal': 'seasonal', 'promotional': 'discount',
        'local': 'discount', 'business': 'bundle', 'custom': 'discount'
    }
    campaign_type = type_map.get(event.event_type, 'discount')
    event_name_base = event.event_name.rsplit(' ', 1)[0]

    return {
        "campaign_name": f"{event_name_base} {today.year} Campaign",
        "campaign_name_ar": None,
        "campaign_type": campaign_type,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "products": products,
        "channels": _suggest_channels(campaign_type),
        "budget": _estimate_budget(db),
        "notes": (
            f"Auto-suggested based on upcoming {event.event_name}. "
            f"Products selected based on historical event impact."
        ),
        "target_audience": "Existing customers",
        "description": f"Campaign aligned with {event.event_name}.",
        "suggestion_reason": {
            "type": "upcoming_event",
            "event_id": event.event_id,
            "event_name": event.event_name,
            "event_type": event.event_type,
            "days_until": (start_date - today).days,
            "products_selected_by": "historical_event_impact"
        }
    }


def _suggest_from_top_products(
    db: Session,
    today: date,
    event: Event = None
) -> dict:
    """
    Fallback: suggest top 5 revenue products from the last 30 days.
    Used when no event impact data is available.
    """
    thirty_days_ago = today - timedelta(days=30)

    top_products = db.query(
        SalesRecord.product_id,
        func.sum(SalesRecord.total_amount).label('revenue')
    ).filter(
        SalesRecord.sale_date >= thirty_days_ago,
        SalesRecord.sale_date <= today
    ).group_by(
        SalesRecord.product_id
    ).order_by(
        func.sum(SalesRecord.total_amount).desc()
    ).limit(5).all()

    if not top_products:
        return {
            "campaign_name": "New Campaign",
            "campaign_name_ar": None,
            "campaign_type": "discount",
            "start_date": (today + timedelta(days=7)).isoformat(),
            "end_date": (today + timedelta(days=14)).isoformat(),
            "products": [],
            "channels": ["in_store", "instagram"],
            "budget": None,
            "notes": "",
            "target_audience": "",
            "description": "",
            "suggestion_reason": {
                "type": "no_data",
                "message": (
                    "No sales data or upcoming events found. "
                    "Please fill in the campaign details manually."
                )
            }
        }

    product_ids = [r.product_id for r in top_products]
    product_map = {
        p.product_id: p
        for p in db.query(Product).filter(
            Product.product_id.in_(product_ids),
            Product.is_active == True,
            Product.deleted_at.is_(None)
        ).all()
    }

    products = []
    for row in top_products:
        product = product_map.get(row.product_id)
        if not product:
            continue
        products.append({
            "product_id": row.product_id,
            "product_name": product.product_name,
            "discount_pct": 10,
            "target_quantity": None
        })

    start_date = today + timedelta(days=7)
    end_date = start_date + timedelta(days=6)

    reason = {
        "type": "top_products",
        "products_selected_by": "revenue_last_30_days",
        "message": "No upcoming events found. Suggested your top-selling products."
    }

    if event:
        reason = {
            "type": "upcoming_event_no_impact_data",
            "event_id": event.event_id,
            "event_name": event.event_name,
            "message": (
                f"Found upcoming event '{event.event_name}' but no historical "
                f"impact data exists yet. Using top products instead."
            )
        }

    return {
        "campaign_name": f"Campaign {today.strftime('%B %Y')}",
        "campaign_name_ar": None,
        "campaign_type": "discount",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "products": products,
        "channels": _suggest_channels("discount"),
        "budget": _estimate_budget(db),
        "notes": "Auto-suggested based on top-selling products in the last 30 days.",
        "target_audience": "Existing customers",
        "description": "",
        "suggestion_reason": reason
    }


# ============================================
# PRIVATE HELPERS
# ============================================

def _suggest_channels(campaign_type: str) -> list:
    """Suggest marketing channels based on campaign type."""
    channel_map = {
        'seasonal': ['in_store', 'instagram', 'facebook'],
        'discount': ['in_store', 'instagram', 'sms'],
        'flash_sale': ['sms', 'instagram', 'in_store'],
        'bundle': ['in_store', 'facebook'],
        'loyalty': ['sms', 'email'],
        'other': ['in_store', 'instagram']
    }
    return channel_map.get(campaign_type, ['in_store', 'instagram'])


def _estimate_budget(db: Session) -> Optional[float]:
    """
    Estimate budget from average of past campaigns.
    Returns None if no past campaigns with budgets exist.
    """
    result = db.query(
        func.avg(Campaign.budget).label('avg_budget')
    ).filter(
        Campaign.deleted_at.is_(None),
        Campaign.budget.isnot(None)
    ).first()

    if result and result.avg_budget:
        return round(float(result.avg_budget), 2)

    return None
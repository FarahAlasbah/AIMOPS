"""
File: backend/app/api/campaigns.py
Purpose: Campaign management endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.campaign import Campaign, CampaignProduct, CampaignChannel
from app.services import campaign_service
from app.services.campaign_suggestion_service import generate_campaign_suggestion as _generate_suggestion

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns"])


# ============================================
# ENDPOINT 1: Create Campaign
# ============================================

@router.post("")
async def create_campaign(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a campaign and get the full planning analysis.

    WHAT THIS RETURNS:
    Not just the saved campaign — a full response including:
    - calendar_events: confirmed events overlapping your dates
    - date_suggestions: your dates vs 2 alternatives with projected uplifts
    - forecast_impact: predicted units and revenue per product
    - consultation: business advice based on all of the above

    REQUEST BODY:
    {
        "campaign_name": "Ramadan Dates Sale",
        "campaign_type": "discount",           # discount/bundle/flash_sale/seasonal/loyalty/other
        "start_date": "2026-04-01",
        "end_date": "2026-04-07",
        "products": [
            {
                "product_id": 384,
                "discount_pct": 20,
                "target_quantity": 500
            }
        ],
        "channels": ["in_store", "instagram"],  # simple list of strings
        "budget": 5000,
        "notes": "Targeting Ramadan shoppers",
        "target_audience": "Existing customers",
        "description": "Optional long description"
    }

    PERMISSIONS: Admin or marketing_user only.
    """
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Not authorized")

    return campaign_service.create_campaign(
        db=db,
        request=request,
        current_user_id=current_user.user_id
    )


# ============================================
# ENDPOINT 2: List Campaigns
# ============================================

@router.get("")
async def list_campaigns(
    status: Optional[str] = Query(None, description="Filter by status: planned/active/completed/cancelled"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    include_deleted: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all campaigns with optional filters.
    All authenticated users can view.
    """
    campaigns = campaign_service.get_all_campaigns(
        db=db,
        skip=skip,
        limit=limit,
        status=status,
        include_deleted=include_deleted
    )

    return {
        "success": True,
        "total": len(campaigns),
        "campaigns": [
            _build_campaign_summary(c)
            for c in campaigns
        ]
    }


# ============================================
# ENDPOINT 3: Calendar View
# ============================================

@router.get("/calendar")
async def get_campaign_calendar(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all campaigns that overlap a date range.
    Used by the frontend calendar component.

    Example:
    GET /api/campaigns/calendar?start_date=2026-04-01&end_date=2026-06-30
    Returns all campaigns active during Q2 2026.
    """
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be YYYY-MM-DD")

    if end < start:
        raise HTTPException(status_code=400, detail="end_date cannot be before start_date")

    campaigns = campaign_service.get_campaigns_in_range(db, start, end)

    return {
        "success": True,
        "period": {
            "start": start_date,
            "end": end_date
        },
        "total": len(campaigns),
        "campaigns": [
            {
                **_build_campaign_summary(c),
                "products": [
                    {
                        "product_id": cp.product_id,
                        "product_name": cp.product.product_name if cp.product else None,
                        "discount_pct": float(cp.discount_percentage) if cp.discount_percentage else None
                    }
                    for cp in c.products
                ]
            }
            for c in campaigns
        ]
    }



# ============================================
# ENDPOINT: Generate Campaign Suggestion
# ============================================

@router.post("/generate-suggestion")
async def generate_campaign_suggestion(
    request: dict = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate AI-powered campaign suggestion(s).

    REQUEST BODY (all optional):
    {
        "mode": "full",           # full / products_given / event_given / clearance
        "product_ids": [1, 2],   # required for products_given mode
        "event_id": 5,           # required for event_given mode
        "start_date": "2026-06-01",  # optional — user already set dates
        "end_date": "2026-06-07"     # optional
    }

    RETURNS:
    {
        "success": true,
        "mode": "full",
        "suggestions": [
            { ...opportunity suggestion... },
            { ...clearance suggestion... }
        ]
    }

    Each suggestion matches POST /api/campaigns request body exactly.
    Frontend populates the form — nothing is saved by this endpoint.

    PERMISSIONS: Admin or marketing_user only.
    """
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Not authorized")

    if request is None:
        request = {}

    # ── Parse request ──
    mode = request.get("mode", "full")
    product_ids = request.get("product_ids", None)
    event_id = request.get("event_id", None)
    start_date_str = request.get("start_date", None)
    end_date_str = request.get("end_date", None)

    start_date = None
    end_date = None

    if start_date_str:
        try:
            from datetime import datetime
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="start_date must be YYYY-MM-DD")

    if end_date_str:
        try:
            from datetime import datetime
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="end_date must be YYYY-MM-DD")

    return _generate_suggestion(
        db=db,
        mode=mode,
        product_ids=product_ids,
        event_id=event_id,
        start_date=start_date,
        end_date=end_date
    )
    
    
    
# ============================================
# ENDPOINT 4: Get Single Campaign
# ============================================

@router.get("/{campaign_id}")
async def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get full campaign detail including products, channels,
    forecast data, and actual results if available.
    """
    campaign = campaign_service.get_campaign_by_id(db, campaign_id)

    return {
        "success": True,
        "campaign": _build_campaign_detail(campaign)
    }


# ============================================
# ENDPOINT 5: Update Campaign
# ============================================

@router.patch("/{campaign_id}")
async def update_campaign(
    campaign_id: int,
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update campaign fields.
    Only provided fields are updated — omitted fields stay unchanged.

    Updatable fields:
    campaign_name, description, notes, campaign_type,
    budget, target_audience, status, start_date, end_date

    PERMISSIONS: Admin or marketing_user only.
    """
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Not authorized")

    campaign = campaign_service.update_campaign(
        db=db,
        campaign_id=campaign_id,
        request=request,
        current_user_id=current_user.user_id
    )

    return {
        "success": True,
        "message": f"Campaign '{campaign.campaign_name}' updated",
        "campaign": _build_campaign_detail(campaign)
    }


# ============================================
# ENDPOINT 6: Delete Campaign
# ============================================

@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Soft delete a campaign.
    Data is retained for historical analysis and forecasting.

    PERMISSIONS: Admin or marketing_user only.
    """
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Not authorized")

    return campaign_service.delete_campaign(
        db=db,
        campaign_id=campaign_id,
        current_user_id=current_user.user_id
    )


# ============================================
# ENDPOINT 7: Predicted vs Actual Comparison
# ============================================

@router.get("/{campaign_id}/comparison")
async def get_campaign_comparison(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Compare what AIMOPS predicted vs what actually happened.
    Only available after campaign is completed and results recorded.

    WHAT THIS SHOWS:
    - Predicted uplift % vs actual uplift %
    - Predicted revenue vs actual revenue
    - Forecast accuracy score
    - Baseline shift analysis (did the campaign change long-term demand?)
    - ROI

    Business owner and marketing can both view this.
    """
    campaign = campaign_service.get_campaign_by_id(db, campaign_id)

    if campaign.status != 'completed':
        return {
            "success": False,
            "message": "Comparison is only available after the campaign is completed.",
            "campaign_id": campaign_id,
            "status": campaign.status
        }

    # Build comparison
    comparison = {
        "campaign_id": campaign_id,
        "campaign_name": campaign.campaign_name,
        "campaign_type": campaign.campaign_type,
        "period": {
            "start": campaign.start_date.isoformat(),
            "end": campaign.end_date.isoformat(),
            "duration_days": (campaign.end_date - campaign.start_date).days + 1
        },
        "forecast": {
            "uplift_pct": float(campaign.forecast_uplift_pct) if campaign.forecast_uplift_pct else None,
            "additional_revenue": float(campaign.forecast_additional_revenue) if campaign.forecast_additional_revenue else None,
        },
        "actual": {
            "uplift_pct": float(campaign.actual_uplift_pct) if campaign.actual_uplift_pct else None,
            "revenue": float(campaign.actual_revenue) if campaign.actual_revenue else None,
            "cost": float(campaign.actual_cost) if campaign.actual_cost else None,
            "roi": float(campaign.roi) if campaign.roi else None
        },
        "accuracy": None,
        "linked_event_id": campaign.linked_event_id
    }

    # Calculate accuracy if both predicted and actual uplift exist
    if campaign.forecast_uplift_pct and campaign.actual_uplift_pct:
        predicted = float(campaign.forecast_uplift_pct)
        actual = float(campaign.actual_uplift_pct)
        if predicted > 0:
            accuracy = (actual / predicted) * 100
            comparison["accuracy"] = {
                "score_pct": round(accuracy, 1),
                "verdict": (
                    "AIMOPS overestimated" if accuracy < 80
                    else "AIMOPS underestimated" if accuracy > 120
                    else "Accurate forecast"
                ),
                "note": (
                    "Upload more campaign data to improve future accuracy."
                    if accuracy < 80 or accuracy > 120
                    else "Good forecast accuracy — historical data is a reliable reference."
                )
            }

    return {"success": True, **comparison}


# ============================================
# HELPERS
# ============================================

def _build_campaign_summary(campaign: Campaign) -> dict:
    """Minimal campaign info for list and calendar views."""
    return {
        "campaign_id": campaign.campaign_id,
        "campaign_name": campaign.campaign_name,
        "campaign_type": campaign.campaign_type,
        "start_date": campaign.start_date.isoformat(),
        "end_date": campaign.end_date.isoformat(),
        "duration_days": (campaign.end_date - campaign.start_date).days + 1,
        "status": campaign.status,
        "budget": float(campaign.budget) if campaign.budget else None,
        "forecast_uplift_pct": float(campaign.forecast_uplift_pct) if campaign.forecast_uplift_pct else None,
        "forecast_additional_revenue": float(campaign.forecast_additional_revenue) if campaign.forecast_additional_revenue else None,
        "actual_revenue": float(campaign.actual_revenue) if campaign.actual_revenue else None,
        "roi": float(campaign.roi) if campaign.roi else None,
        "product_count": len(campaign.products),
        "has_results": campaign.actual_revenue is not None,
        "linked_event_id": campaign.linked_event_id,
        "created_at": campaign.created_at.isoformat() if campaign.created_at else None
    }


def _build_campaign_detail(campaign: Campaign) -> dict:
    """Full campaign detail including products and channels."""
    summary = _build_campaign_summary(campaign)

    summary["description"] = campaign.description
    summary["notes"] = campaign.notes
    summary["target_audience"] = campaign.target_audience
    summary["actual_uplift_pct"] = float(campaign.actual_uplift_pct) if campaign.actual_uplift_pct else None
    summary["actual_cost"] = float(campaign.actual_cost) if campaign.actual_cost else None
    summary["predicted_roi"] = campaign.predicted_roi()

    summary["products"] = [
        {
            "product_id": cp.product_id,
            "product_name": cp.product.product_name if cp.product else None,
            "category": cp.product.category if cp.product else None,
            "discount_pct": float(cp.discount_percentage) if cp.discount_percentage else None,
            "target_quantity": cp.target_quantity
        }
        for cp in campaign.products
    ]

    summary["channels"] = [
        {
            "channel_name": ch.channel_name,
            "budget_allocated": float(ch.budget_allocated) if ch.budget_allocated else None
        }
        for ch in campaign.channels
    ]

    return summary



"""
File: backend/app/api/forecasts.py
Purpose: Forecast generation and retrieval endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta
from typing import Optional

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.forecast import ForecastModel, ForecastResult, ForecastExplanation
from app.models.campaign import Product
from app.services.forecasting_service import train_all_products, train_single_product, forecast_with_campaign

router = APIRouter(prefix="/api/forecasts", tags=["Forecasts"])


# ============================================
# ENDPOINT 1: Trigger Forecast Generation
# ============================================

@router.post("/generate")
async def generate_forecasts(
    request: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trigger forecast training for all products or a specific one.
    Runs as a background task — returns immediately.

    Body (optional):
    - product_id: int  → train only this product
    - retrain: bool    → force retrain even if model exists (default: false)
    """
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Not authorized")

    product_id = request.get("product_id")
    retrain = request.get("retrain", False)

    from app.core.database import SessionLocal

    if product_id:
        # Single product
        product = db.query(Product).filter(Product.product_id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

        # Check if already trained and retrain not requested
        existing = db.query(ForecastModel).filter(
            ForecastModel.product_id == product_id,
            ForecastModel.status == 'ready'
        ).first()

        if existing and not retrain:
            return {
                "success": True,
                "message": f"Forecast for '{product.product_name}' already exists. Pass retrain=true to force retrain.",
                "model_status": "ready",
                "trained_at": existing.trained_at.isoformat()
            }

        def run_single():
            bg_db = SessionLocal()
            try:
                train_single_product(bg_db, product_id)
            finally:
                bg_db.close()

        background_tasks.add_task(run_single)

        return {
            "success": True,
            "message": f"Forecast training started for '{product.product_name}'.",
            "product_id": product_id,
            "check_status": f"GET /api/forecasts/status/{product_id}"
        }

    else:
        # All products
        total_products = db.query(Product).count()

        def run_all():
            bg_db = SessionLocal()
            try:
                train_all_products(bg_db, current_user.user_id)
            finally:
                bg_db.close()

        background_tasks.add_task(run_all)

        return {
            "success": True,
            "message": f"Forecast training started for all {total_products} products.",
            "total_products": total_products,
            "check_status": "GET /api/forecasts/status"
        }


# ============================================
# ENDPOINT 2: Training Status
# ============================================

@router.get("/status")
async def get_forecast_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Overview of all forecast model statuses.
    Use this to check if training is complete.
    """
    models = db.query(ForecastModel, Product).join(
        Product, ForecastModel.product_id == Product.product_id
    ).all()

    total = len(models)
    ready = sum(1 for m, _ in models if m.status == 'ready')
    training = sum(1 for m, _ in models if m.status == 'training')
    failed = sum(1 for m, _ in models if m.status == 'failed')

    return {
        "success": True,
        "summary": {
            "total_products": total,
            "ready": ready,
            "training": training,
            "failed": failed,
            "all_ready": ready == total and total > 0
        },
        "models": [
            {
                "product_id": m.product_id,
                "product_name": p.product_name,
                "status": m.status,
                "model_tier": m.model_tier,
                "trained_at": m.trained_at.isoformat() if m.trained_at else None,
                "r2": float(m.r2) if m.r2 else None,
                "error": m.error_message if m.status == 'failed' else None
            }
            for m, p in models
        ]
    }


@router.get("/status/{product_id}")
async def get_product_forecast_status(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    model = db.query(ForecastModel).filter(
        ForecastModel.product_id == product_id
    ).first()

    if not model:
        return {"product_id": product_id, "status": "not_trained"}

    return {
        "product_id": product_id,
        "status": model.status,
        "model_tier": model.model_tier,
        "training_rows": model.training_rows,
        "trained_at": model.trained_at.isoformat() if model.trained_at else None,
        "metrics": {
            "r2": float(model.r2) if model.r2 else None,
            "mae": float(model.mae) if model.mae else None,
            "rmse": float(model.rmse) if model.rmse else None,
        },
        "error": model.error_message if model.status == 'failed' else None
    }


# ============================================
# ENDPOINT 3: Get Forecast for a Product
# ============================================

@router.get("/{product_id}")
async def get_product_forecast(
    product_id: int,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the pre-computed forecast for a product.

    Query params:
    - days: how many days ahead (default 30, max 90)
    """
    if days > 90:
        days = 90
    if days < 1:
        days = 7

    # Check model exists
    model = db.query(ForecastModel).filter(
        ForecastModel.product_id == product_id
    ).first()

    if not model:
        raise HTTPException(
            status_code=404,
            detail="No forecast model found for this product. Run POST /api/forecasts/generate first."
        )

    if model.status == 'training':
        return {
            "product_id": product_id,
            "status": "training",
            "message": "Forecast is being generated. Check back in a moment."
        }

    if model.status == 'failed':
        return {
            "product_id": product_id,
            "status": "failed",
            "error": model.error_message
        }

    # Get product info
    product = db.query(Product).filter(Product.product_id == product_id).first()

    # Get forecast results
    today = date.today()
    end_date = today + timedelta(days=days)

    forecasts = db.query(ForecastResult).filter(
        ForecastResult.product_id == product_id,
        ForecastResult.forecast_date >= today,
        ForecastResult.forecast_date <= end_date
    ).order_by(ForecastResult.forecast_date).all()

    if not forecasts:
        raise HTTPException(
            status_code=404,
            detail="Forecast results not found. The model may need retraining."
        )

    # Aggregate summaries
    quantities = [float(f.predicted_quantity) for f in forecasts]
    revenues = [float(f.predicted_revenue) for f in forecasts if f.predicted_revenue]

    # Weekly aggregation for chart display
    weekly = {}
    for f in forecasts:
        week_start = f.forecast_date - timedelta(days=f.forecast_date.weekday())
        key = week_start.isoformat()
        if key not in weekly:
            weekly[key] = {'week_start': key, 'quantity': 0, 'revenue': 0, 'days': 0}
        weekly[key]['quantity'] += float(f.predicted_quantity)
        weekly[key]['revenue'] += float(f.predicted_revenue) if f.predicted_revenue else 0
        weekly[key]['days'] += 1

    return {
        "success": True,
        "product_id": product_id,
        "product_name": product.product_name if product else None,
        "category": product.category if product else None,
        "model": {
            "tier": model.model_tier,
            "trained_at": model.trained_at.isoformat() if model.trained_at else None,
            "training_period": f"{model.training_date_start} to {model.training_date_end}",
            "r2": float(model.r2) if model.r2 else None,
            "mae": float(model.mae) if model.mae else None,
        },
        "forecast_period": {
            "start": today.isoformat(),
            "end": end_date.isoformat(),
            "days": days
        },
        "summary": {
            "total_quantity": round(sum(quantities), 1),
            "avg_daily_quantity": round(sum(quantities) / len(quantities), 1),
            "peak_quantity": round(max(quantities), 1),
            "peak_date": forecasts[quantities.index(max(quantities))].forecast_date.isoformat(),
            "total_revenue": round(sum(revenues), 2) if revenues else None,
            "confidence": forecasts[0].confidence,
            "has_event_boosts": any(f.has_event_boost for f in forecasts)
        },
        "weekly_summary": list(weekly.values()),
        "daily": [
            {
                "date": f.forecast_date.isoformat(),
                "predicted_quantity": round(float(f.predicted_quantity), 1),
                "quantity_lower": round(float(f.quantity_lower), 1) if f.quantity_lower else None,
                "quantity_upper": round(float(f.quantity_upper), 1) if f.quantity_upper else None,
                "predicted_revenue": round(float(f.predicted_revenue), 2) if f.predicted_revenue else None,
                "confidence": f.confidence,
                "has_event_boost": f.has_event_boost,
                "event_multiplier": float(f.event_multiplier) if f.event_multiplier else None
            }
            for f in forecasts
        ]
    }


# ============================================
# ENDPOINT 4: Forecast Summary (All Products)
# ============================================

@router.get("")
async def get_forecast_summary(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Dashboard summary: forecast totals for all products.
    Numbers only — no Claude explanations (for performance).
    """
    if days > 90:
        days = 90

    today = date.today()
    end_date = today + timedelta(days=days)

    # Aggregate forecast per product in one query
    results = db.query(
        ForecastResult.product_id,
        func.sum(ForecastResult.predicted_quantity).label('total_quantity'),
        func.sum(ForecastResult.predicted_revenue).label('total_revenue'),
        func.avg(ForecastResult.predicted_quantity).label('avg_daily'),
        func.max(ForecastResult.predicted_quantity).label('peak_quantity'),
        ForecastResult.confidence
    ).filter(
        ForecastResult.forecast_date >= today,
        ForecastResult.forecast_date <= end_date
    ).group_by(
        ForecastResult.product_id,
        ForecastResult.confidence
    ).all()

    # Get product names
    product_ids = [r.product_id for r in results]
    products = db.query(Product).filter(Product.product_id.in_(product_ids)).all()
    product_map = {p.product_id: p for p in products}

    # Get model tiers
    models = db.query(ForecastModel).filter(
        ForecastModel.product_id.in_(product_ids)
    ).all()
    model_map = {m.product_id: m for m in models}

    summary = []
    for r in results:
        product = product_map.get(r.product_id)
        model = model_map.get(r.product_id)
        summary.append({
            "product_id": r.product_id,
            "product_name": product.product_name if product else None,
            "category": product.category if product else None,
            "total_quantity": round(float(r.total_quantity), 1),
            "avg_daily_quantity": round(float(r.avg_daily), 1),
            "total_revenue": round(float(r.total_revenue), 2) if r.total_revenue else None,
            "confidence": r.confidence,
            "model_tier": model.model_tier if model else None,
        })

    # Sort by total quantity descending
    summary.sort(key=lambda x: x['total_quantity'], reverse=True)

    return {
        "success": True,
        "forecast_period": {
            "start": today.isoformat(),
            "end": end_date.isoformat(),
            "days": days
        },
        "total_products_forecasted": len(summary),
        "products": summary
    }


# ============================================
# ENDPOINT 5: Campaign Impact Forecast
# ============================================

@router.post("/campaign-impact")
async def get_campaign_impact(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Predict the impact of a planned campaign on a product's sales.

    Body:
    - product_id: int (required)
    - start_date: str YYYY-MM-DD (required)
    - end_date: str YYYY-MM-DD (required)
    - expected_uplift_pct: float (optional — if user wants to specify their own estimate)
    """
    product_id = request.get("product_id")
    start_date_str = request.get("start_date")
    end_date_str = request.get("end_date")
    expected_uplift_pct = request.get("expected_uplift_pct")

    if not all([product_id, start_date_str, end_date_str]):
        raise HTTPException(status_code=400, detail="product_id, start_date, end_date are required")

    try:
        start_date = date.fromisoformat(start_date_str)
        end_date = date.fromisoformat(end_date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format")

    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date cannot be before start_date")

    result = forecast_with_campaign(db, product_id, start_date, end_date, expected_uplift_pct)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {"success": True, **result}


# ============================================
@router.get("/{product_id}/explanation/status")
async def get_explanation_status(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if a cached explanation exists for this product.
    Returns the explanation if yes, {"exists": false} if no.
    Never triggers generation — safe to call on every page load.
    """
    from app.services.forecast_explanation_service import get_cached_explanation

    result = await get_cached_explanation(db, product_id)
    return {"success": True, **result}


# ============================================
# ENDPOINT 6: Get Explanation (Claude)
# ============================================

@router.get("/{product_id}/explanation")
async def get_forecast_explanation(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a natural language explanation of why AIMOPS is forecasting
    what it's forecasting for this product.

    Generated by Claude API on first request, cached after that.
    """
    from app.services.forecast_explanation_service import get_or_generate_explanation

    result = await get_or_generate_explanation(db, product_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return {"success": True, **result}


# ============================================
# ENDPOINT 7: delete Explanation 
# ============================================


@router.delete("/{product_id}/explanation")
async def delete_explanation_cache(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete cached explanation to force regeneration."""
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.query(ForecastExplanation).filter(
        ForecastExplanation.product_id == product_id
    ).delete()
    db.commit()

    return {"success": True, "message": f"Explanation cache cleared for product {product_id}."}
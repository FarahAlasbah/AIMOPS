"""
File: backend/app/services/forecast_explanation_service.py
Purpose: Generate natural language explanations for forecasts.

CURRENT VERSION: Hardcoded logic (no Claude API call)
FUTURE VERSION: Replace _generate_explanation_text() with Claude API call.
Nothing else in this file needs to change when we make that switch.
"""

from datetime import date, timedelta
from sqlalchemy.orm import Session
import httpx
import json

from app.core.config import settings
from app.models.forecast import ForecastModel, ForecastResult, ForecastExplanation
from app.models.event import Event, EventImpactResult
from app.models.campaign import Product


# ============================================
# MAIN ENTRY POINT
# ============================================

async def get_or_generate_explanation(db: Session, product_id: int) -> dict:
    """
    Return cached explanation if it exists, otherwise generate a new one.

    CACHING LOGIC:
    - Explanation is tied to a specific model_id.
    - When the model is retrained (new data uploaded), model_id changes.
    - Old explanation is deleted, new one generated.
    - This means we never show a stale explanation for fresh data.
    """
    model = db.query(ForecastModel).filter(
        ForecastModel.product_id == product_id,
        ForecastModel.status == 'ready'
    ).first()

    if not model:
        return {"error": "No forecast available for this product yet."}

    cached = db.query(ForecastExplanation).filter(
        ForecastExplanation.product_id == product_id,
        ForecastExplanation.model_id == model.model_id
    ).first()

    if cached:
        return {
            "product_id": product_id,
            "explanation": cached.explanation_text,
            "key_drivers": cached.key_drivers,
            "forecast_period": {
                "start": cached.forecast_start.isoformat(),
                "end": cached.forecast_end.isoformat()
            },
            "generated_at": cached.generated_at.isoformat(),
            "cached": True
        }

    return await _generate_explanation(db, product_id, model)


# ============================================
# EXPLANATION GENERATION
# ============================================

async def _generate_explanation(db: Session, product_id: int, model: ForecastModel) -> dict:
    """
    Gather forecast data, build context, generate explanation text.
    """
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        return {"error": "Product not found"}

    today = date.today()
    forecasts = db.query(ForecastResult).filter(
        ForecastResult.product_id == product_id,
        ForecastResult.forecast_date >= today
    ).order_by(ForecastResult.forecast_date).limit(30).all()

    if not forecasts:
        return {"error": "No forecast data available"}

    # Get event boosts in this window
    boosted_days = [f for f in forecasts if f.has_event_boost]
    boosted_event_names = []
    if boosted_days:
        event_ids = list({f.event_id for f in boosted_days if f.event_id})
        events = db.query(Event).filter(Event.event_id.in_(event_ids)).all()
        boosted_event_names = [e.event_name for e in events]

    # Get historical impacts
    impacts = db.query(EventImpactResult, Event).join(
        Event, EventImpactResult.event_id == Event.event_id
    ).filter(
        EventImpactResult.product_id == product_id,
        Event.status == 'confirmed'
    ).all()

    # Summary stats
    quantities = [float(f.predicted_quantity) for f in forecasts]
    avg_daily = sum(quantities) / len(quantities)
    total_30d = sum(quantities)
    revenues = [float(f.predicted_revenue) for f in forecasts if f.predicted_revenue]
    total_revenue_30d = sum(revenues) if revenues else None
    peak_forecast = max(forecasts, key=lambda f: float(f.predicted_quantity))
    low_forecast = min(forecasts, key=lambda f: float(f.predicted_quantity))
    trend_direction = _detect_trend(db, product_id)

    context = {
        "product_name": product.product_name,
        "category": product.category,
        "model_tier": model.model_tier,
        "training_rows": model.training_rows,
        "training_start": model.training_date_start,
        "training_end": model.training_date_end,
        "r2": float(model.r2) if model.r2 else None,
        "mae": float(model.mae) if model.mae else None,
        "avg_daily_qty": round(avg_daily, 1),
        "total_30d_qty": round(total_30d, 1),
        "total_30d_revenue": round(total_revenue_30d, 2) if total_revenue_30d else None,
        "peak_date": peak_forecast.forecast_date.isoformat(),
        "peak_qty": round(float(peak_forecast.predicted_quantity), 1),
        "low_date": low_forecast.forecast_date.isoformat(),
        "low_qty": round(float(low_forecast.predicted_quantity), 1),
        "confidence": forecasts[0].confidence,
        "boosted_event_names": boosted_event_names,
        "trend_direction": trend_direction,
        "historical_impacts": [
            {
                "event": e.event_name,
                "change_pct": round(float(i.change_percentage), 1),
                "impact_level": i.impact_level
            }
            for i, e in impacts
            if float(i.change_percentage) < 999
        ]
    }

    # THIS IS THE ONLY FUNCTION THAT CHANGES WHEN WE ADD CLAUDE API
    explanation_text, key_drivers = await _generate_explanation_text(context)

    # Cache it
    db.query(ForecastExplanation).filter(
        ForecastExplanation.product_id == product_id
    ).delete()

    cached = ForecastExplanation(
        product_id=product_id,
        model_id=model.model_id,
        explanation_text=explanation_text,
        key_drivers=key_drivers,
        horizon_days=30,
        forecast_start=forecasts[0].forecast_date,
        forecast_end=forecasts[-1].forecast_date
    )
    db.add(cached)
    db.commit()

    return {
        "product_id": product_id,
        "explanation": explanation_text,
        "key_drivers": key_drivers,
        "forecast_period": {
            "start": forecasts[0].forecast_date.isoformat(),
            "end": forecasts[-1].forecast_date.isoformat()
        },
        "generated_at": cached.generated_at.isoformat(),
        "cached": False
    }


# ============================================
# EXPLANATION TEXT GENERATOR
# ============================================

async def _generate_explanation_text(ctx: dict) -> tuple:
    """
    Generate explanation using Claude API.

    Input:  context dict with all forecast stats
    Output: (explanation_text: str, key_drivers: list)
    """
    from app.core.config import settings
    import httpx
    import json

    prompt = f"""You are an AI analyst for a retail business. 
Based on the following forecast data, write a clear natural language explanation 
of what the forecast shows and why.

FORECAST DATA:
- Product: {ctx['product_name']} ({ctx.get('category', 'N/A')})
- Forecast period: next 30 days
- Average daily quantity: {ctx['avg_daily_qty']} units/day
- Total 30-day quantity: {ctx['total_30d_qty']} units
- Total 30-day revenue: {f"{ctx['total_30d_revenue']:,.0f} ILS" if ctx['total_30d_revenue'] else 'N/A'}
- Peak date: {ctx['peak_date']} ({ctx['peak_qty']} units)
- Low date: {ctx['low_date']} ({ctx['low_qty']} units)
- Confidence level: {ctx['confidence']}
- Model tier: {ctx['model_tier']}
- Training rows: {ctx['training_rows']}
- R² score: {ctx['r2']}
- MAE: {ctx['mae']} units/day
- Trend direction: {ctx['trend_direction']}
- Active event boosts: {', '.join(ctx['boosted_event_names']) if ctx['boosted_event_names'] else 'None'}
- Historical event impacts: {ctx['historical_impacts'] if ctx['historical_impacts'] else 'None'}

Respond ONLY with a JSON object in this exact format, no markdown, no extra text:
{{
    "explanation": "2-4 sentence paragraph explaining the forecast in plain business language",
    "key_drivers": ["driver 1", "driver 2", "driver 3"]
}}

Rules:
- Explanation must be 2-4 sentences, plain English, no jargon
- key_drivers must be 2-4 short phrases (max 6 words each)
- Always mention the revenue figure if available
- Always mention confidence level and why
- If there are event boosts, explain their impact
- If trend is declining, suggest action"""

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            json={
                "model": "claude-opus-4-5",
                "max_tokens": 512,
                "messages": [{"role": "user", "content": prompt}]
            }
        )

    if response.status_code != 200:
        raise Exception(f"Claude API error {response.status_code}: {response.text}")

    raw = response.json()["content"][0]["text"].strip()

    try:
        parsed = json.loads(raw)
        explanation_text = parsed.get("explanation", "")
        key_drivers = parsed.get("key_drivers", [])
    except json.JSONDecodeError:
        # Fallback if Claude returns malformed JSON
        explanation_text = raw
        key_drivers = ["Forecast generated by AI"]

    return explanation_text, key_drivers


# ============================================
# TREND DETECTION HELPER
# ============================================

def _detect_trend(db: Session, product_id: int) -> str:
    """
    Compare first half vs second half of sales history.
    Returns: "growing", "declining", or "stable"

    A 10% difference threshold avoids calling normal fluctuation a trend.
    """
    from app.models.sales_record import SalesRecord
    from sqlalchemy import func

    daily = db.query(
        SalesRecord.sale_date,
        func.sum(SalesRecord.quantity).label('qty')
    ).filter(
        SalesRecord.product_id == product_id
    ).group_by(SalesRecord.sale_date).order_by(SalesRecord.sale_date).all()

    if len(daily) < 14:
        return "stable"

    mid = len(daily) // 2
    first_half_avg = sum(float(d.qty) for d in daily[:mid]) / mid
    second_half_avg = sum(float(d.qty) for d in daily[mid:]) / (len(daily) - mid)

    if first_half_avg == 0:
        return "stable"

    change_pct = ((second_half_avg - first_half_avg) / first_half_avg) * 100

    if change_pct >= 10:
        return "growing"
    elif change_pct <= -10:
        return "declining"
    else:
        return "stable"
    
    
async def get_cached_explanation(db: Session, product_id: int) -> dict:
    """
    Only checks if a cached explanation exists. Never generates one.
    Called on page load to decide whether to show explanation or the button.
    """
    model = db.query(ForecastModel).filter(
        ForecastModel.product_id == product_id,
        ForecastModel.status == 'ready'
    ).first()

    if not model:
        return {"exists": False}

    cached = db.query(ForecastExplanation).filter(
        ForecastExplanation.product_id == product_id,
        ForecastExplanation.model_id == model.model_id
    ).first()

    if not cached:
        return {"exists": False}

    return {
        "exists": True,
        "explanation": cached.explanation_text,
        "key_drivers": cached.key_drivers,
        "forecast_period": {
            "start": cached.forecast_start.isoformat(),
            "end": cached.forecast_end.isoformat()
        },
        "generated_at": cached.generated_at.isoformat()
    }
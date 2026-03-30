"""
File: backend/app/services/forecast_explanation_service.py
Purpose: Generate natural language explanations for forecasts.

CURRENT VERSION: Hardcoded logic (no Claude API call)
FUTURE VERSION: Replace _generate_explanation_text() with Claude API call.
Nothing else in this file needs to change when we make that switch.
"""
from datetime import date, timedelta
from sqlalchemy.orm import Session

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
    explanation_text, key_drivers = _generate_explanation_text(context)

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

def _generate_explanation_text(ctx: dict) -> tuple:
    """
    Generate explanation from forecast context using if/else logic.

    THIS IS THE ONLY FUNCTION TO REPLACE WITH CLAUDE API LATER.
    Input:  context dict with all forecast stats
    Output: (explanation_text: str, key_drivers: list)
    """
    product = ctx["product_name"]
    avg_daily = ctx["avg_daily_qty"]
    total_30d = ctx["total_30d_qty"]
    confidence = ctx["confidence"]
    events = ctx["boosted_event_names"]
    trend = ctx["trend_direction"]
    impacts = ctx["historical_impacts"]
    mae = ctx["mae"]
    r2 = ctx["r2"]
    tier = ctx["model_tier"]
    training_rows = ctx["training_rows"]
    peak_date = ctx["peak_date"]
    peak_qty = ctx["peak_qty"]
    revenue = ctx["total_30d_revenue"]

    sentences = []
    key_drivers = []

    # ── Sentence 1: What the forecast predicts ──
    revenue_text = f", generating an estimated {revenue:,.0f} ILS in revenue" if revenue else ""
    sentences.append(
        f"Over the next 30 days, {product} is forecast to sell an average of "
        f"{avg_daily:.1f} units per day — approximately {total_30d:.0f} units total{revenue_text}."
    )

    # ── Sentence 2: Main driver ──
    if events:
        event_names = " and ".join(events)
        matching = [i for i in impacts if any(e in i["event"] for e in events)]
        if matching:
            avg_boost = sum(i["change_pct"] for i in matching) / len(matching)
            sentences.append(
                f"Sales are expected to peak around {peak_date} ({peak_qty:.0f} units) "
                f"due to {event_names}, which historically drives a "
                f"+{avg_boost:.0f}% increase in {product} sales based on last year's data."
            )
        else:
            sentences.append(
                f"Sales are expected to peak around {peak_date} ({peak_qty:.0f} units) "
                f"due to the upcoming {event_names} period."
            )
        key_drivers.append(f"{event_names} seasonal boost")

    elif trend == "growing":
        sentences.append(
            f"Sales show an upward trend over recent months, "
            f"which is reflected in the forecast as a gradual increase over the period."
        )
        key_drivers.append("Upward sales trend")

    elif trend == "declining":
        sentences.append(
            f"Sales have been declining in recent months. "
            f"The forecast reflects this pattern — consider a promotional campaign to reverse the trend."
        )
        key_drivers.append("Declining sales trend")

    else:
        sentences.append(
            f"Sales follow a stable pattern with no strong seasonal spikes expected. "
            f"The forecast is based on the product's consistent historical rhythm."
        )
        key_drivers.append("Stable sales pattern")

    # ── Sentence 3: Confidence ──
    if confidence == "high" and r2 is not None:
        sentences.append(
            f"Confidence is high — the model was trained on {training_rows} days of data "
            f"and explains {int(r2 * 100)}% of historical sales variation "
            f"(average error: ±{mae:.1f} units/day)."
        )
        key_drivers.append("Strong historical data")

    elif confidence == "medium":
        if tier == "xgboost_reduced":
            sentences.append(
                f"Confidence is medium — the model has limited history ({training_rows} days). "
                f"Forecasts will improve as more data is uploaded."
            )
        else:
            sentences.append(
                f"Confidence is medium — the model captures most patterns "
                f"but some variation remains unexplained (average error: ±{mae:.1f} units/day)."
            )
        key_drivers.append("Moderate data confidence")

    else:
        sentences.append(
            f"Confidence is low — this product has limited sales history ({training_rows} records). "
            f"Treat this as a rough estimate and upload more data to improve accuracy."
        )
        key_drivers.append("Limited historical data")

    # ── Sentence 4: Historical event context (only if no current boost) ──
    if not events and impacts:
        top_impact = max(impacts, key=lambda x: abs(x["change_pct"]))
        sign = "+" if top_impact["change_pct"] > 0 else ""
        sentences.append(
            f"Note: historically, {product} was significantly affected by "
            f"{top_impact['event']} ({sign}{top_impact['change_pct']:.0f}%). "
            f"If a similar event is planned, expect a notable sales change."
        )
        key_drivers.append(f"Past {top_impact['event']} impact")

    explanation_text = " ".join(sentences)
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
    
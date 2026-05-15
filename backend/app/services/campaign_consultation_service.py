"""
File: backend/app/services/campaign_consultation_service.py
Purpose: Generate business advice for campaign planning.

CURRENT VERSION: Hardcoded rule-based logic
FUTURE VERSION: Replace _generate_hardcoded_advice() with Claude API call.
Everything else in this file stays the same when we make that switch.

HOW IT WORKS:
1. Receives a context dict built by campaign_service.py
2. Generates advice in layers (event overlap → campaign type → ROI → dates)
3. Returns advice text + key recommendations list

The context dict contains everything needed:
- campaign details (type, dates, budget, products, channels)
- overlapping calendar events and their historical impacts
- forecast impact per product
- date suggestions with alternative windows
- multiplier source and confidence
"""
from typing import Optional


# ============================================
# MAIN ENTRY POINT
# ============================================

def get_consultation(context: dict) -> dict:
    """
    Generate business advice for a campaign.

    THIS FUNCTION STAYS THE SAME when we add Claude API.
    Only _generate_hardcoded_advice() gets replaced.

    Args:
        context: dict built by campaign_service._build_consultation_context()

    Returns:
        {
            "advice": str,           # Full advice paragraph
            "recommendations": list, # 2-4 bullet point actions
            "risk_level": str,       # low / medium / high
            "confidence": str        # how reliable is this advice
        }
    """
    advice, recommendations, risk_level = _generate_hardcoded_advice(context)

    return {
        "advice": advice,
        "recommendations": recommendations,
        "risk_level": risk_level,
        "confidence": context.get("forecast_confidence", "medium")
    }


# ============================================
# HARDCODED ADVICE GENERATOR
# ============================================
# THIS IS THE FUNCTION TO REPLACE WITH CLAUDE API LATER.
# Input and output contract must stay the same.

def _generate_hardcoded_advice(context: dict) -> tuple:
    """
    Generate advice using rule-based logic.

    LAYERS:
    1. Event overlap — most important context
    2. Campaign type specific advice
    3. ROI assessment
    4. Date suggestion if better window found
    5. Channel advice if budget is specified

    Returns: (advice_text, recommendations_list, risk_level)
    """
    campaign_name = context.get("campaign_name", "this campaign")
    campaign_type = context.get("campaign_type", "discount")
    start_date = context.get("start_date")
    end_date = context.get("end_date")
    budget = context.get("budget")
    notes = context.get("notes")
    products = context.get("products", [])
    calendar_events = context.get("calendar_events", [])
    date_suggestions = context.get("date_suggestions", [])
    totals = context.get("forecast_totals", {})
    multiplier_source = context.get("multiplier_source", "default")
    channels = context.get("channels", [])

    additional_revenue = totals.get("additional_revenue", 0)
    additional_units = totals.get("additional_units", 0)

    sentences = []
    recommendations = []
    risk_level = "medium"

    # ── Layer 1: Event overlap assessment ──
    # Most important — tells user if timing is smart or not
    high_impact_events = [
        e for e in calendar_events
        if e.get("impact_level") in ("high", "very_high")
    ]
    low_period_events = [
        e for e in calendar_events
        if e.get("impact_level") in ("low", None)
    ]

    if high_impact_events:
        event_names = " and ".join([e["event_name"] for e in high_impact_events])
        avg_impact = sum(
            float(e.get("historical_impact_pct", 50))
            for e in high_impact_events
        ) / len(high_impact_events)

        sentences.append(
            f"Your proposed dates overlap with {event_names}, "
            f"a period when your products historically sell "
            f"{avg_impact:.0f}% above normal."
        )

        # During high-demand events, deep discounts waste margin
        if campaign_type == "discount":
            discount_pcts = [
                float(p.get("discount_pct", 0))
                for p in products
                if p.get("discount_pct")
            ]
            avg_discount = sum(discount_pcts) / len(discount_pcts) if discount_pcts else 0

            if avg_discount >= 20:
                sentences.append(
                    f"Since demand is already elevated during this period, "
                    f"a {avg_discount:.0f}% discount may be unnecessary — "
                    f"customers are already motivated to buy. "
                    f"Consider reducing to 10% to protect your margins "
                    f"while still rewarding loyal customers."
                )
                recommendations.append(
                    f"Consider reducing discount to 10% — demand is already high during {event_names}"
                )
                risk_level = "low"
            else:
                sentences.append(
                    f"A modest discount during this high-demand period "
                    f"is a smart move — it rewards customers without "
                    f"giving away margin you don't need to sacrifice."
                )
                risk_level = "low"

        elif campaign_type == "bundle":
            sentences.append(
                f"Bundle deals work especially well during high-traffic periods "
                f"like {event_names} — customers are already in a buying mindset "
                f"and bundles increase average order value."
            )
            risk_level = "low"

        elif campaign_type == "flash_sale":
            sentences.append(
                f"A flash sale during {event_names} can create strong urgency "
                f"on top of already-high demand. Keep it short (24-48 hours) "
                f"for maximum impact."
            )
            risk_level = "low"

    elif not calendar_events:
        # No events overlapping — quiet period
        sentences.append(
            f"Your proposed dates fall in a period with no known seasonal events. "
            f"This is a good opportunity to drive sales during a quieter time."
        )

        if campaign_type == "discount":
            sentences.append(
                f"A discount campaign during a low-demand period is an effective "
                f"way to move stock and attract price-sensitive customers."
            )
            risk_level = "medium"

        elif campaign_type == "flash_sale":
            sentences.append(
                f"Flash sales work best when there is a reason for urgency. "
                f"Consider pairing this with a clear message — "
                f"'End of season clearance' or 'Limited stock' — "
                f"to drive the urgency that makes flash sales effective."
            )
            risk_level = "medium"

    # ── Layer 2: ROI assessment ──
    if budget and additional_revenue:
        predicted_roi = ((additional_revenue - budget) / budget) * 100

        if predicted_roi >= 100:
            sentences.append(
                f"With a budget of {budget:,.0f} ILS against a projected "
                f"{additional_revenue:,.0f} ILS in additional revenue, "
                f"this campaign has a strong predicted ROI of {predicted_roi:.0f}%."
            )
            recommendations.append(
                f"Strong ROI projected ({predicted_roi:.0f}%) — proceed with confidence"
            )
            risk_level = "low"

        elif predicted_roi >= 30:
            sentences.append(
                f"The predicted ROI of {predicted_roi:.0f}% is reasonable. "
                f"Monitor results closely during the first 2 days and "
                f"adjust if sales are not meeting expectations."
            )
            recommendations.append(
                f"Monitor daily sales during campaign — adjust if below forecast"
            )

        else:
            sentences.append(
                f"The predicted ROI of {predicted_roi:.0f}% is modest. "
                f"Consider reducing the budget or increasing the discount "
                f"to drive more volume, or target a higher-demand period."
            )
            recommendations.append(
                f"Low predicted ROI ({predicted_roi:.0f}%) — consider adjusting budget or timing"
            )
            risk_level = "high"

    elif additional_revenue and not budget:
        sentences.append(
            f"This campaign is projected to generate {additional_revenue:,.0f} ILS "
            f"in additional revenue across {additional_units:.0f} extra units. "
            f"Add a budget to get a full ROI estimate."
        )
        recommendations.append("Add a budget to calculate predicted ROI")

    # ── Layer 3: Date suggestions ──
    # If we found a significantly better window, mention it
    if len(date_suggestions) > 1:
        best_alternative = None
        current_uplift = date_suggestions[0].get("forecast_uplift_pct", 0)

        for suggestion in date_suggestions[1:]:
            alt_uplift = suggestion.get("forecast_uplift_pct", 0)
            if alt_uplift > current_uplift * 1.2:  # 20% better
                best_alternative = suggestion
                break

        if best_alternative:
            sentences.append(
                f"We also found a stronger opportunity: "
                f"{best_alternative['start_date']} to {best_alternative['end_date']} "
                f"shows a projected {best_alternative['forecast_uplift_pct']:.0f}% uplift "
                f"vs {current_uplift:.0f}% for your proposed dates. "
                f"{best_alternative.get('note', '')}"
            )
            recommendations.append(
                f"Consider {best_alternative['start_date']} to {best_alternative['end_date']} "
                f"for {best_alternative['forecast_uplift_pct']:.0f}% projected uplift"
            )

    # ── Layer 4: Channel advice ──
    if channels and budget:
        if "social_media" in channels or "instagram" in channels or "facebook" in channels:
            recommendations.append(
                "Post 3-5 days before campaign start on social media to build anticipation"
            )
        if "sms" in channels:
            recommendations.append(
                "Send SMS on campaign launch day for highest open rates"
            )
        if "in_store" in channels:
            recommendations.append(
                "Update in-store signage at least 1 day before campaign starts"
            )

    # ── Layer 5: Multiplier source transparency ──
    # Tell user how confident we are and why
    if multiplier_source == "historical_promotions":
        sentences.append(
            "This forecast is based on your own past promotional campaigns "
            "for these products — high confidence."
        )
    elif multiplier_source == "all_events_average":
        sentences.append(
            "This forecast uses your historical event data as a reference. "
            "Confidence will improve as you run more campaigns and record results."
        )
    elif multiplier_source == "default":
        sentences.append(
            "We have limited historical campaign data for these products, "
            "so the forecast uses a conservative default estimate. "
            "Record your campaign results afterwards to improve future forecasts."
        )
        recommendations.append(
            "Upload sales data after this campaign to record real results "
            "and improve future forecast accuracy"
        )

    # ── Layer 6: Notes context ──
    if notes:
        sentences.append(
            f"Note for context: \"{notes}\""
        )

    # ── Fallback if no sentences generated ──
    if not sentences:
        sentences.append(
            f"Based on available data, {campaign_name} is projected to generate "
            f"{additional_units:.0f} additional units and "
            f"{additional_revenue:,.0f} ILS in additional revenue. "
            f"Upload post-campaign sales data to record actual results "
            f"and improve future forecasts."
        )

    # ── Default recommendations if none generated ──
    if not recommendations:
        recommendations.append("Monitor daily sales during the campaign")
        recommendations.append(
            "Upload sales data after campaign ends to record results"
        )

    advice_text = " ".join(sentences)
    return advice_text, recommendations, risk_level


# ============================================
# CONTEXT BUILDER HELPER
# ============================================

def build_consultation_context(
    campaign_name: str,
    campaign_type: str,
    start_date: str,
    end_date: str,
    budget: float,
    notes: str,
    products: list,
    channels: list,
    calendar_events: list,
    date_suggestions: list,
    forecast_totals: dict,
    multiplier_source: str,
    forecast_confidence: str
) -> dict:
    """
    Build the context dict passed to get_consultation().

    WHEN WE ADD CLAUDE API:
    This same context dict gets serialized and sent as the prompt.
    Claude sees all the same information the hardcoded logic uses.
    """
    return {
        "campaign_name": campaign_name,
        "campaign_type": campaign_type,
        "start_date": start_date,
        "end_date": end_date,
        "budget": budget,
        "notes": notes,
        "products": products,
        "channels": channels,
        "calendar_events": calendar_events,
        "date_suggestions": date_suggestions,
        "forecast_totals": forecast_totals,
        "multiplier_source": multiplier_source,
        "forecast_confidence": forecast_confidence
    }
    

# ============================================
# CAMPAIGN SUGGESTION ENRICHER (Claude API)
# ============================================

def enrich_suggestion_with_claude(
    suggestion: dict,
    business_profile: dict = None
) -> dict:
    import json
    import httpx
    from app.core.config import settings

    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        return suggestion

    strategy = suggestion.get("suggestion_reason", {}).get("type", "")
    event_name = suggestion.get("suggestion_reason", {}).get("event_name", "")
    campaign_type = suggestion.get("campaign_type", "discount")
    products = suggestion.get("products", [])
    start_date = suggestion.get("start_date", "")
    end_date = suggestion.get("end_date", "")
    budget = suggestion.get("budget")
    business_name = business_profile.get("business_name", "the business") if business_profile else "the business"
    industry = business_profile.get("industry", "retail") if business_profile else "retail"

    product_names = [p.get("product_name", "") for p in products if p.get("product_name")]
    product_list = ", ".join(product_names[:5]) if product_names else "selected products"

    strategy_context = {
        "upcoming_event": f"capitalize on the upcoming {event_name}",
        "clearance": "move slow-moving inventory through a clearance campaign",
        "top_products": "drive sales during a regular period using top-performing products",
        "event_given": f"build a campaign around {event_name}",
        "products_given": "build the best campaign around the user's selected products",
        "upcoming_event_no_impact_data": f"prepare for the upcoming {event_name} using top products",
        "no_data": "create a general campaign"
    }.get(strategy, "create a targeted sales campaign")

    prompt = f"""You are a retail business consultant helping a small {industry} business called "{business_name}" in the Arabic-speaking market.

Generate campaign text for a {campaign_type} campaign designed to {strategy_context}.

Campaign details:
- Products: {product_list}
- Dates: {start_date} to {end_date}
- Budget: {f"{budget:,.0f} ILS" if budget else "not set"}
- Campaign type: {campaign_type}

Return ONLY a JSON object with exactly these four fields, nothing else:
{{
  "campaign_name": "A short professional campaign name in English (max 8 words)",
  "campaign_name_ar": "نفس الاسم باللغة العربية",
  "notes": "2-3 sentences explaining the campaign strategy and what the business should focus on",
  "description": "One sentence summary of the campaign goal"
}}

Rules:
- campaign_name must be specific and professional, not generic
- notes must be practical business advice, not marketing fluff
- Write as if advising a real shop owner
- Arabic name should be a natural translation, not word-for-word"""

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-opus-4-5",
                    "max_tokens": 400,
                    "messages": [{"role": "user", "content": prompt}]
                }
            )

        if response.status_code != 200:
            print(f"Claude API error {response.status_code}: {response.text}")
            return suggestion

        text = response.json()["content"][0]["text"].strip()

        # Strip markdown fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        generated = json.loads(text)

        if generated.get("campaign_name"):
            suggestion["campaign_name"] = generated["campaign_name"]
        if generated.get("campaign_name_ar"):
            suggestion["campaign_name_ar"] = generated["campaign_name_ar"]
        if generated.get("notes"):
            suggestion["notes"] = generated["notes"]
        if generated.get("description"):
            suggestion["description"] = generated["description"]

    except Exception as e:
        print(f"Claude enrichment failed: {e}")

    return suggestion
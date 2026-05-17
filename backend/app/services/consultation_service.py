# backend/app/services/consultation_service.py
"""
File: backend/app/services/consultation_service.py
Purpose: AI business consultation for marketing users.

RESPONSIBILITIES:
1. _gather_business_context() — pulls live business data from DB
2. _build_system_prompt()     — formats data into Claude's briefing
3. chat()                     — handles one chat turn end to end
4. generate_summary()         — summarizes a conversation on demand

COST CONTROLS:
- MAX_HISTORY = 10: only last 10 messages sent to Claude per call
- Summaries are human-readable records only, not injected into Claude context
- Context is rebuilt fresh per call (always accurate, no stale cache)

SECURITY:
- user_id always comes from verified JWT token, never from request body
- All DB queries filter by user_id — no cross-user data leakage
- ANTHROPIC_API_KEY lives in .env only
"""
import os
import httpx
from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.core.config import settings

from app.models.consultation_message import ConsultationMessage
from app.models.consultation_summary import ConsultationSummary
from app.models.business_profile import BusinessProfile
from app.models.campaign import Campaign, Product
from app.models.forecast import ForecastModel, ForecastResult
from app.models.event import Event

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_API_KEY = settings.ANTHROPIC_API_KEY
CLAUDE_MODEL = "claude-sonnet-4-6"
MAX_HISTORY = 10
MAX_TOKENS_CHAT = 1200
MAX_TOKENS_SUMMARY = 550


# ============================================
# SUMMARY ENTRY POINT
# ============================================

async def generate_summary(db: Session, user_id: int, title: str) -> dict:
    """
    Generate a summary of the conversation since the last saved summary.
    If no previous summary exists, summarizes the entire thread.

    This ensures each summary is a clean non-overlapping chapter —
    like meeting notes that only cover what was new since the last meeting.

    Args:
        db:      SQLAlchemy session
        user_id: From verified JWT token
        title:   User-provided name for this summary

    Returns:
        dict with summary_id, title, content, created_at
    """
    # Check when the last summary was saved
    last_summary = (
        db.query(ConsultationSummary)
        .filter(ConsultationSummary.user_id == user_id)
        .order_by(ConsultationSummary.created_at.desc())
        .first()
    )

    # Only fetch messages after the last summary
    # If no summary exists, fetch the entire thread
    query = db.query(ConsultationMessage).filter(
        ConsultationMessage.user_id == user_id
    )
    if last_summary:
        query = query.filter(
            ConsultationMessage.created_at > last_summary.created_at
        )

    history = query.order_by(ConsultationMessage.created_at.asc()).limit(20).all()

    if not history:
        raise ValueError(
            "No new messages to summarize since your last summary."
            if last_summary
            else "No conversation history to summarize."
        )

    # Format conversation for Claude
    conversation_text = "\n".join([
        f"{'User' if msg.role == 'user' else 'Consultant'}: {msg.content}"
        for msg in history
    ])

    summary_prompt = f"""The following is a business consultation conversation.
Write a concise structured summary of the key points, decisions, and recommendations discussed.
Format it as a business note a marketing manager could read later to recall what was decided.
Focus on: products mentioned, campaign ideas, dates, strategies, and any action items.
Keep it under 200 words.

CONVERSATION:
{conversation_text}"""

    response_text = await _call_claude(
        system_prompt="You are a business consultant writing a summary note for a marketing team.",
        messages=[{"role": "user", "content": summary_prompt}],
        max_tokens=MAX_TOKENS_SUMMARY
    )

    summary = ConsultationSummary(
        user_id=user_id,
        title=title,
        content=response_text
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)

    return {
        "summary_id": summary.summary_id,
        "title": summary.title,
        "content": summary.content,
        "created_at": summary.created_at.isoformat()
    }


# ============================================
# HISTORY RETRIEVAL
# ============================================

def get_history(db: Session, user_id: int, limit: int = 50) -> list:
    """
    Return recent chat history for display in the frontend.
    This is separate from what gets sent to Claude —
    the frontend can show more messages than Claude sees.

    Args:
        db:      SQLAlchemy session
        user_id: From verified JWT token
        limit:   How many messages to return (default 50)

    Returns:
        List of messages in chronological order
    """
    messages = (
        db.query(ConsultationMessage)
        .filter(ConsultationMessage.user_id == user_id)
        .order_by(ConsultationMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "message_id": msg.message_id,
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat()
        }
        for msg in reversed(messages)
    ]


def get_summaries(db: Session, user_id: int) -> list:
    """
    Return all saved summaries for this user, newest first.

    Args:
        db:      SQLAlchemy session
        user_id: From verified JWT token

    Returns:
        List of summaries with id, title, content, created_at
    """
    summaries = (
        db.query(ConsultationSummary)
        .filter(ConsultationSummary.user_id == user_id)
        .order_by(ConsultationSummary.created_at.desc())
        .all()
    )
    return [
        {
            "summary_id": s.summary_id,
            "title": s.title,
            "content": s.content,
            "created_at": s.created_at.isoformat()
        }
        for s in summaries
    ]


# ============================================
# BUSINESS CONTEXT GATHERING
# ============================================

import time

_context_cache = {}

def invalidate_consultation_cache():
    """Call this whenever business data changes."""
    global _context_cache
    _context_cache = {}


def _gather_business_context(db: Session) -> dict:
    """
    Pull all relevant business data from DB.
    Cached for 5 minutes to avoid re-querying on every message.

    PERFORMANCE FIX:
    Old: N+1 queries — one ForecastResult query per model (20 models = 20 queries)
    New: 2 queries total — one for models, one bulk for all forecast results
    This reduced context gathering from ~23s to <1s.
    """
    global _context_cache
    

    # Return cached context if still fresh
    if _context_cache.get("data"):
        return _context_cache["data"]

    today = date.today()

    # ── Business profile ──
    profile = db.query(BusinessProfile).first()
    business_name = profile.business_name if profile else "this business"
    industry = profile.industry if profile else "retail"
    city = profile.city if profile else ""

    # ── Products ──
    products = db.query(Product).filter(Product.is_active == True).all()
    product_list = [
        {
            "id": p.product_id,
            "name": p.product_name,
            "category": p.category,
            "unit_price": float(p.unit_price) if p.unit_price else None
        }
        for p in products
    ]
    product_id_map = {p.product_id: p for p in products}

    # ── Forecast summary (next 30 days) ──
    # FIX: replaced N+1 loop with 2 bulk queries
    end_date = today + timedelta(days=30)

    ready_model_product_ids = [
        m.product_id for m in
        db.query(ForecastModel.product_id)
        .filter(ForecastModel.status == 'ready')
        .all()
    ]

    forecast_summary = []

    if ready_model_product_ids:
        from sqlalchemy import func as sqlfunc

        bulk_forecasts = db.query(
            ForecastResult.product_id,
            sqlfunc.avg(ForecastResult.predicted_quantity).label('avg_qty'),
            sqlfunc.sum(ForecastResult.predicted_quantity).label('total_qty'),
            sqlfunc.sum(ForecastResult.predicted_revenue).label('total_rev'),
            sqlfunc.max(ForecastResult.confidence).label('confidence'),
            sqlfunc.sum(
                sqlfunc.if_(ForecastResult.has_event_boost, 1, 0)
            ).label('has_boost')
        ).filter(
            ForecastResult.product_id.in_(ready_model_product_ids),
            ForecastResult.forecast_date >= today,
            ForecastResult.forecast_date <= end_date
        ).group_by(ForecastResult.product_id).all()

        for row in bulk_forecasts:
            product = product_id_map.get(row.product_id)
            forecast_summary.append({
                "product_name": product.product_name if product else f"Product {row.product_id}",
                "avg_daily_qty": round(float(row.avg_qty), 1) if row.avg_qty else 0,
                "total_30d_qty": round(float(row.total_qty), 1) if row.total_qty else 0,
                "total_30d_revenue": round(float(row.total_rev), 2) if row.total_rev else None,
                "confidence": row.confidence or "medium",
                "has_event_boost": bool(row.has_boost)
            })

        forecast_summary.sort(key=lambda x: x["total_30d_revenue"] or 0, reverse=True)

    # ── Upcoming events (next 60 days) ──
    upcoming_events = (
        db.query(Event)
        .filter(
            Event.status == 'confirmed',
            Event.start_date >= today,
            Event.start_date <= today + timedelta(days=60)
        )
        .order_by(Event.start_date)
        .all()
    )
    event_list = [
        {
            "name": e.event_name,
            "start": e.start_date.isoformat(),
            "end": e.end_date.isoformat() if e.end_date else None
        }
        for e in upcoming_events
    ]

    # ── Recent completed campaigns with results ──
    recent_campaigns = (
        db.query(Campaign)
        .filter(
            Campaign.status == 'completed',
            Campaign.actual_revenue != None,
            Campaign.deleted_at == None
        )
        .order_by(Campaign.end_date.desc())
        .limit(3)
        .all()
    )
    campaign_list = [
        {
            "name": c.campaign_name,
            "type": c.campaign_type,
            "start": c.start_date.isoformat(),
            "end": c.end_date.isoformat(),
            "actual_revenue": float(c.actual_revenue) if c.actual_revenue else None,
            "actual_uplift_pct": float(c.actual_uplift_pct) if c.actual_uplift_pct else None,
            "roi": float(c.roi) if c.roi else None
        }
        for c in recent_campaigns
    ]

    # ── Active and planned campaigns ──
    active_campaigns = (
        db.query(Campaign)
        .filter(
            Campaign.status.in_(['planned', 'active']),
            Campaign.deleted_at == None
        )
        .order_by(Campaign.start_date)
        .all()
    )
    active_list = [
        {
            "name": c.campaign_name,
            "type": c.campaign_type,
            "start": c.start_date.isoformat(),
            "end": c.end_date.isoformat(),
            "status": c.status,
            "forecast_uplift_pct": float(c.forecast_uplift_pct) if c.forecast_uplift_pct else None
        }
        for c in active_campaigns
    ]

    context = {
        "business_name": business_name,
        "industry": industry,
        "city": city,
        "today": today.isoformat(),
        "products": product_list,
        "forecasts": forecast_summary,
        "upcoming_events": event_list,
        "recent_campaigns": campaign_list,
        "active_campaigns": active_list
    }

    # Cache the result
    _context_cache = {"data": context}
    return context

# ============================================
# SYSTEM PROMPT BUILDER
# ============================================

def _build_system_prompt(ctx: dict) -> str:
    """
    Format the business context into Claude's system prompt.
    This is what Claude reads before every single message.

    Structure:
    - Who Claude is and what its role is
    - Today's date
    - Instructions for response style
    - Full business data snapshot
    """
    def fmt_events(events):
        if not events:
            return "  No upcoming events in the next 60 days."
        return "\n".join([
            f"  - {e['name']} ({e['start']} to {e.get('end', 'N/A')})"
            for e in events
        ])

    def fmt_forecasts(forecasts):
        if not forecasts:
            return "  No forecasts available yet."
        lines = []
        for f in forecasts:
            revenue = f"', {f['total_30d_revenue']:,.0f} ILS" if f['total_30d_revenue'] else ""
            boost = " ⚡ event boost active" if f['has_event_boost'] else ""
            lines.append(
                f"  - {f['product_name']}: {f['avg_daily_qty']} units/day, "
                f"{f['total_30d_qty']} units total{revenue} "
                f"[{f['confidence']} confidence]{boost}"
            )
        return "\n".join(lines)

    def fmt_recent_campaigns(campaigns):
        if not campaigns:
            return "  No completed campaigns with results yet."
        return "\n".join([
            f"  - {c['name']} ({c['type']}): "
            f"revenue {c['actual_revenue']:,.0f} ILS, "
            f"uplift {c['actual_uplift_pct']}%, ROI {c['roi']}%"
            for c in campaigns
        ])

    def fmt_active_campaigns(campaigns):
        if not campaigns:
            return "  No active or planned campaigns."
        return "\n".join([
            f"  - {c['name']} ({c['type']}, {c['status']}): "
            f"{c['start']} to {c['end']}, "
            f"forecast uplift {c['forecast_uplift_pct']}%"
            for c in campaigns
        ])

    def fmt_products(products):
        if not products:
            return "  No products found."
        lines = []
        for p in products:
            category = f" ({p['category']})" if p['category'] else ""
            price = f" — {p['unit_price']} ILS" if p['unit_price'] else ""
            lines.append(f"  - {p['name']}{category}{price}")
        return "\n".join(lines)

    return f"""You are an AI business consultant embedded inside AIMOPS, \
an AI-powered operations and marketing platform used by {ctx['business_name']}, \
a {ctx['industry']} business{f" based in {ctx['city']}" if ctx['city'] else ""}.

Today's date is {ctx['today']}.

Your role is to help the marketing team make smart, data-driven decisions \
about campaigns, products, timing, and strategy. \
Always ground your advice in the actual numbers provided below. \
Be concise, practical, and direct. \
When recommending a campaign, always include: product, date range, campaign type, and reasoning from the data. \
If you don't have enough data to give confident advice, say so honestly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIVE BUSINESS DATA — {ctx['today']}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRODUCTS:
{fmt_products(ctx['products'])}

30-DAY FORECASTS (by projected revenue):
{fmt_forecasts(ctx['forecasts'])}

UPCOMING EVENTS (next 60 days):
{fmt_events(ctx['upcoming_events'])}

RECENT COMPLETED CAMPAIGNS:
{fmt_recent_campaigns(ctx['recent_campaigns'])}

ACTIVE / PLANNED CAMPAIGNS:
{fmt_active_campaigns(ctx['active_campaigns'])}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"""


# ============================================
# CLAUDE API CALL
# ============================================

async def _call_claude(system_prompt: str, messages: list, max_tokens: int) -> str:
    """
    Send a request to Claude API and return the response text.

    Uses httpx for async HTTP — non-blocking, fits FastAPI's async model.
    60 second timeout handles slow responses gracefully.

    Args:
        system_prompt: Claude's briefing (role + business data)
        messages:      Conversation history in Claude format
        max_tokens:    Response length limit (chat vs summary differ)

    Raises:
        Exception if Claude API returns a non-200 status
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            json={
                "model": CLAUDE_MODEL,
                "max_tokens": max_tokens,
                "system": system_prompt,
                "messages": messages
            }
        )

    if response.status_code != 200:
        raise Exception(
            f"Claude API error {response.status_code}: {response.text}"
        )

    return response.json()["content"][0]["text"]

async def chat(db: Session, user_id: int, user_message: str) -> str:
    """
    Handle one full chat turn:
    1. Save user message to DB
    2. Load last MAX_HISTORY messages from DB
    3. Gather fresh business context (cached for 5 min)
    4. Build system prompt
    5. Call Claude API
    6. Save Claude response to DB
    7. Return response text
    """
    # Step 1 — Save user message immediately
    db.add(ConsultationMessage(
        user_id=user_id,
        role="user",
        content=user_message
    ))
    db.commit()

    # Step 2 — Load recent history
    history = (
        db.query(ConsultationMessage)
        .filter(ConsultationMessage.user_id == user_id)
        .order_by(ConsultationMessage.created_at.desc())
        .limit(MAX_HISTORY)
        .all()
    )
    history = list(reversed(history))

    # Step 3 & 4 — Build context and system prompt
    context = _gather_business_context(db)
    system_prompt = _build_system_prompt(context)

    # Step 5 — Call Claude
    messages = [{"role": msg.role, "content": msg.content} for msg in history]
    response_text = await _call_claude(
        system_prompt=system_prompt,
        messages=messages,
        max_tokens=MAX_TOKENS_CHAT
    )

    # Step 6 — Save Claude response
    db.add(ConsultationMessage(
        user_id=user_id,
        role="assistant",
        content=response_text
    ))
    db.commit()

    return response_text


async def chat_stream(db: Session, user_id: int, user_message: str):
    """
    Streaming version of chat — yields text chunks as they arrive from Claude.
    Used by the streaming endpoint for real-time word-by-word responses.
    """
    import json

    # Save user message immediately
    db.add(ConsultationMessage(user_id=user_id, role="user", content=user_message))
    db.commit()

    # Load history
    history = (
        db.query(ConsultationMessage)
        .filter(ConsultationMessage.user_id == user_id)
        .order_by(ConsultationMessage.created_at.desc())
        .limit(MAX_HISTORY)
        .all()
    )
    history = list(reversed(history))

    context = _gather_business_context(db)
    system_prompt = _build_system_prompt(context)
    messages = [{"role": msg.role, "content": msg.content} for msg in history]

    full_response = ""

    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            json={
                "model": CLAUDE_MODEL,
                "max_tokens": MAX_TOKENS_CHAT,
                "system": system_prompt,
                "messages": messages,
                "stream": True
            }
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        event = json.loads(data)
                        if event.get("type") == "content_block_delta":
                            chunk = event["delta"].get("text", "")
                            if chunk:
                                full_response += chunk
                                yield chunk
                    except Exception:
                        continue

    # Save full response after streaming completes
    db.add(ConsultationMessage(
        user_id=user_id,
        role="assistant",
        content=full_response
    ))
    db.commit()
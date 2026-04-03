"""
File: backend/app/services/campaign_detection_service.py

PURPOSE:
Detect probable promotional or seasonal events from imported sales data.
Runs as a BackgroundTask after confirm-products completes.

WHAT THIS CREATES:
- Event records with status='draft' (user must confirm before they count)
- EventImpactResult records pre-filled from the spike data
  (baseline_daily_avg, during_daily_avg, change_percentage, impact_level)

WHY DRAFT EVENTS INSTEAD OF A SEPARATE TABLE:
The Event model already has status='draft' designed exactly for
"auto-created, needs confirmation." We don't need a new table —
we just use the existing flow. Draft events show up in the user's
events calendar as unconfirmed, and the review endpoints let them
confirm or dismiss each one.

ALGORITHM:
1. Load all sales records for this batch, grouped by product
2. Aggregate to weekly totals (daily is too noisy)
3. Calculate rolling median baseline (resistant to the spikes we're detecting)
4. Flag weeks where actual > baseline * 1.5 (50% above normal)
5. Merge adjacent flagged weeks into continuous event windows
6. For each window, calculate EventImpactResult metrics
7. Save as draft Event + EventImpactResult
8. Notify the uploader

WHY MEDIAN NOT MEAN FOR BASELINE:
If a product has a huge Ramadan spike, the yearly mean is pulled upward,
making other spikes look smaller than they are. Median is resistant to
outliers — it gives a stable "normal" to compare against.

WHY WEEKLY AGGREGATION:
Daily sales have too much noise (closed days, irregular orders).
Weekly totals smooth this while still being granular enough to catch
short promotions (1-2 week flash sales).
"""

import pandas as pd
from datetime import date, timedelta
from typing import List, Dict, Any, Optional

from app.core.database import SessionLocal
from app.models.sales_record import SalesRecord
from app.models.event import Event, EventImpactResult


# ============================================
# Configuration
# ============================================

SPIKE_THRESHOLD = 1.5       # Sales must be 1.5x baseline to flag
ROLLING_WINDOW_WEEKS = 4    # Weeks used to calculate rolling baseline
MIN_DATA_WEEKS = 3          # Minimum weeks of data needed to detect anything
MIN_CHANGE_PCT = 15.0       # Ignore changes below 15% — too weak to matter


# ============================================
# Entry Point (called as BackgroundTask)
# ============================================

def detect_campaigns_for_batch(batch_id: int, uploaded_by: int) -> None:
    """
    Entry point called by FastAPI BackgroundTasks after confirm-products.

    WHY A NEW DB SESSION:
    Background tasks run after the request/response cycle ends.
    The request's DB session is closed by then — we need our own.
    This is the standard FastAPI pattern for background tasks.

    FAILURE HANDLING:
    Any exception is caught and logged. We never re-raise — the user
    already received their import success response. Detection is
    best-effort enrichment, not a critical path.
    """
    db = SessionLocal()
    try:
        draft_events = _run_detection(db, batch_id, uploaded_by)
        db.commit()
        _send_notification(db, batch_id, uploaded_by, draft_events)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[EventDetection] Error for batch {batch_id}: {str(e)}")
    finally:
        db.close()


# ============================================
# Core Detection
# ============================================

def _run_detection(db, batch_id: int, uploaded_by: int) -> List[Dict]:
    """
    Load sales records, detect spikes per product, save draft events.
    Returns list of summary dicts for the notification message.
    """

    # ── Load This Batch's Sales Records ──
    records = db.query(SalesRecord).filter(
        SalesRecord.batch_id == batch_id
    ).all()

    if not records:
        return []

    # ── Convert to DataFrame ──
    df = pd.DataFrame([
        {
            "product_id": r.product_id,
            "sale_date": r.sale_date,
            "quantity": float(r.quantity) if r.quantity else 0.0,
            "total_amount": float(r.total_amount) if r.total_amount else 0.0,
        }
        for r in records
    ])
    df['sale_date'] = pd.to_datetime(df['sale_date'])
    df['week'] = df['sale_date'].dt.to_period('W')  # ISO Mon-Sun weeks

    all_draft_events = []

    # ── Analyze Each Product Independently ──
    # WHY PER PRODUCT:
    # A Ramadan spike affects Product A but not Product B.
    # Aggregating across products would hide product-specific signals.
    for product_id, product_df in df.groupby('product_id'):

        weekly = (
            product_df.groupby('week')
            .agg(quantity=('quantity', 'sum'), revenue=('total_amount', 'sum'))
            .reset_index()
            .sort_values('week')
        )

        if len(weekly) < MIN_DATA_WEEKS:
            continue

        # ── Rolling Median Baseline ──
        # center=True: uses weeks before AND after, giving more stable baseline
        # min_periods=1: works at data edges where full window isn't available
        weekly['baseline'] = (
            weekly['quantity']
            .rolling(window=ROLLING_WINDOW_WEEKS, center=True, min_periods=1)
            .median()
        )

        # ── Flag Spike Weeks ──
        weekly['is_spike'] = (
            (weekly['baseline'] > 0) &
            (weekly['quantity'] > weekly['baseline'] * SPIKE_THRESHOLD)
        )

        spike_weeks = weekly[weekly['is_spike']]
        if spike_weeks.empty:
            continue

        # ── Merge Adjacent Spikes into Windows ──
        windows = _merge_spike_weeks(weekly, spike_weeks)

        for window in windows:
            draft = _save_draft_event(
                db, window, product_id, batch_id, uploaded_by, weekly
            )
            if draft:
                all_draft_events.append(draft)

    return all_draft_events


def _merge_spike_weeks(weekly: pd.DataFrame, spike_weeks: pd.DataFrame) -> List[Dict]:
    """
    Merge consecutive spike weeks into single event windows.

    EXAMPLE:
    Spike weeks: [W5, W6, W7, W12]
    → Window 1: W5–W7  (3 consecutive weeks — likely one event)
    → Window 2: W12    (isolated spike)

    HOW IT WORKS:
    Walk spike weeks in order. If current week ordinal is exactly 1 more
    than the previous, extend the current window. Otherwise close it and
    start a new one.
    """
    windows = []
    window_start = None
    window_end = None
    prev_ordinal = None

    for _, row in spike_weeks.iterrows():
        week = row['week']

        if prev_ordinal is None:
            window_start = week
            window_end = week
        elif week.ordinal - prev_ordinal <= 1:
            window_end = week
        else:
            windows.append({"start": window_start, "end": window_end})
            window_start = week
            window_end = week

        prev_ordinal = week.ordinal

    if window_start is not None:
        windows.append({"start": window_start, "end": window_end})

    # Attach weekly rows to each window for metric calculation
    result = []
    for w in windows:
        w["rows"] = weekly[
            (weekly['week'] >= w["start"]) &
            (weekly['week'] <= w["end"])
        ]
        result.append(w)

    return result


def _save_draft_event(
    db,
    window: Dict,
    product_id: int,
    batch_id: int,
    uploaded_by: int,
    all_weekly: pd.DataFrame
) -> Optional[Dict]:
    """
    Calculate impact metrics and save a draft Event + EventImpactResult.

    METRICS (match EventImpactResult schema exactly):
    - baseline_daily_avg  → median of non-spike weeks / 7
    - during_daily_avg    → window total qty / window days
    - change_percentage   → ((during - baseline) / baseline) * 100
    - impact_level        → low / medium / high / very_high

    BASELINE PERIOD DATES:
    4 weeks immediately before the event window start.
    Matches how EventImpactResult defines "the period before."

    DATA QUALITY:
    - high_confidence: product had sales before the event (reliable baseline)
    - event_only: product only appears during the spike (no baseline to compare)
    """
    window_rows = window["rows"]
    start_period = window["start"]
    end_period = window["end"]

    event_start = start_period.start_time.date()
    event_end = end_period.end_time.date()
    duration_days = (event_end - event_start).days + 1

    # During-event daily average
    total_qty = float(window_rows['quantity'].sum())
    during_daily_avg = round(total_qty / duration_days, 2)

    # Baseline: median of all NON-spike weeks / 7
    # Using all non-spike weeks (not just prior 4) is more reliable
    # when we have a full year of data
    non_spike = all_weekly[~all_weekly['is_spike']]
    if non_spike.empty:
        return None

    baseline_weekly_median = float(non_spike['quantity'].median())
    baseline_daily_avg = round(baseline_weekly_median / 7, 2)

    if baseline_daily_avg <= 0:
        return None

    change_pct = round(
        ((during_daily_avg - baseline_daily_avg) / baseline_daily_avg) * 100,
        2
    )

    # Skip weak signals — not worth showing to user
    if change_pct < MIN_CHANGE_PCT:
        return None

    # Impact level (matches EventImpactResult enum)
    if change_pct >= 50:
        impact_level = 'very_high'
    elif change_pct >= 30:
        impact_level = 'high'
    elif change_pct >= 15:
        impact_level = 'medium'
    else:
        impact_level = 'low'

    # Baseline period dates (4 weeks before event)
    baseline_end = event_start - timedelta(days=1)
    baseline_start = baseline_end - timedelta(weeks=4)

    baseline_quality = 'high_confidence' if not non_spike.empty else 'event_only'

    # ── Check for matching campaign ──
    from app.services.campaign_service import find_matching_campaign

    matching_campaign = find_matching_campaign(
        db=db,
        spike_start=event_start,
        spike_end=event_end,
        product_id=product_id
    )

    # ── Save Draft Event ──
    draft_event = Event(
        event_name=f"Detected: {event_start.strftime('%b %d')}–{event_end.strftime('%b %d, %Y')}",
        event_type='promotional',
        start_date=event_start,
        end_date=event_end,
        description=(
            f"Auto-detected from imported data (batch {batch_id}). "
            f"Sales were {change_pct:+.1f}% vs normal during this period. "
            f"Confirm this event and give it a name to improve future forecasts."
        ),
        is_recurring=False,
        recurrence_type='one_time',
        status='draft',
        created_by=uploaded_by,
    )
    db.add(draft_event)
    db.flush()

    # ── Save EventImpactResult (always — regardless of campaign match) ──
    impact = EventImpactResult(
        event_id=draft_event.event_id,
        product_id=product_id,
        baseline_period_start=baseline_start,
        baseline_period_end=baseline_end,
        baseline_daily_avg=baseline_daily_avg,
        during_daily_avg=during_daily_avg,
        change_percentage=change_pct,
        impact_level=impact_level,
        baseline_data_quality=baseline_quality,
    )
    db.add(impact)

    # ── If campaign matches, silently record results against it ──
    # We do this regardless of user answer — data doesn't lie.
    if matching_campaign:
        try:
            from app.services.campaign_service import record_results
            record_results(
                db=db,
                campaign_id=matching_campaign["campaign_id"],
                linked_event_id=draft_event.event_id,
                current_user_id=uploaded_by
            )
        except Exception as e:
            print(f"[EventDetection] Campaign result recording failed: {str(e)}")

    return {
        "event_id": draft_event.event_id,
        "product_id": product_id,
        "start_date": event_start.isoformat(),
        "end_date": event_end.isoformat(),
        "change_pct": change_pct,
        "impact_level": impact_level,
        "matching_campaign": matching_campaign,
    }


# ============================================
# Notification
# ============================================

def _send_notification(db, batch_id: int, uploaded_by: int, draft_events: List[Dict]) -> None:
    """
    Notify the uploader about what was detected.
    Differentiates between generic spikes and campaign matches.
    """
    try:
        from app.models.notification import Notification

        if not draft_events:
            title = "Import Complete"
            message = (
                "Your sales data was imported successfully. "
                "No unusual sales periods were detected in this batch."
            )
        else:
            count = len(draft_events)
            campaign_matches = [e for e in draft_events if e.get("matching_campaign")]
            match_count = len(campaign_matches)
            high_count = sum(
                1 for e in draft_events
                if e["impact_level"] in ("high", "very_high")
            )

            if campaign_matches:
                title = f"{count} Sales Spike{'s' if count != 1 else ''} Detected"
                message = (
                    f"AIMOPS found {count} period{'s' if count != 1 else ''} of unusual "
                    f"sales activity in your imported data. "
                    f"{match_count} overlap{'s' if match_count != 1 else ''} with a "
                    f"campaign you planned — open the Events Calendar to review and confirm."
                )
            else:
                title = f"{count} Possible Event{'s' if count != 1 else ''} Detected"
                message = (
                    f"AIMOPS found {count} period{'s' if count != 1 else ''} of unusual "
                    f"sales activity in your imported data"
                    f"{f' — {high_count} with high impact' if high_count else ''}. "
                    f"Open your Events Calendar to review and confirm them. "
                    f"Confirmed events improve your sales forecasts."
                )

        db.add(Notification(
            user_id=uploaded_by,
            notification_type='event_detection',
            title=title,
            message=message,
            related_id=batch_id,
            related_type='batch',
            is_read=False,
            email_sent=False,
        ))

    except Exception as e:
        print(f"[EventDetection] Notification failed: {str(e)}")
"""
File: backend/app/services/forecasting_service.py
Purpose: XGBoost training and forecast generation per product
"""
import pandas as pd
import numpy as np
from datetime import date, timedelta, datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional
import traceback

from app.models.forecast import ForecastModel, ForecastResult
from app.models.sales_record import SalesRecord
from app.models.event import Event, EventImpactResult
from app.models.campaign import Product

# ── XGBoost import with fallback ──
try:
    import xgboost as xgb
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

# ── Constants ──
FORECAST_HORIZON_DAYS = 90       # How far ahead we forecast
TIER1_MIN_DAYS = 60              # Minimum days for full XGBoost
TIER2_MIN_DAYS = 30              # Minimum days for reduced XGBoost
MAX_WORKERS = 4                  # Parallel training threads


# ============================================
# MAIN ENTRY POINT
# ============================================

def train_all_products(db: Session, user_id: int, product_ids: list = None):
    """
    Train forecasts for all products (or a subset).
    Runs in parallel — one thread per product.

    Called as a background task after data import.

    HOW PARALLELISM WORKS HERE:
    Think of it like a kitchen with 4 chefs.
    Each chef trains one product's model independently.
    All 4 work at the same time → 4x faster than sequential.
    """
    # Get all products if not specified
    if product_ids is None:
        products = db.query(Product).filter(
            Product.deleted_at.is_(None) if hasattr(Product, 'deleted_at') else True
        ).all()
        product_ids = [p.product_id for p in products]

    if not product_ids:
        return {"trained": 0, "failed": 0}

    results = {"trained": 0, "failed": 0, "details": []}

    # ── Create placeholder models (status: training) ──
    # So the API can immediately return "training in progress"
    for product_id in product_ids:
        existing = db.query(ForecastModel).filter(
            ForecastModel.product_id == product_id
        ).first()

        if existing:
            existing.status = 'training'
            existing.error_message = None
        else:
            placeholder = ForecastModel(
                product_id=product_id,
                model_tier='simple_average',
                training_rows=0,
                training_date_start=date.today(),
                training_date_end=date.today(),
                status='training'
            )
            db.add(placeholder)

    db.commit()

    # ── Train in parallel ──
    # Each thread gets its own DB session to avoid conflicts
    from app.core.database import SessionLocal

    def train_one(product_id):
        thread_db = SessionLocal()
        try:
            result = _train_product(thread_db, product_id)
            return product_id, True, result
        except Exception as e:
            return product_id, False, str(e)
        finally:
            thread_db.close()

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(train_one, pid): pid for pid in product_ids}
        for future in as_completed(futures):
            product_id, success, detail = future.result()
            if success:
                results["trained"] += 1
            else:
                results["failed"] += 1
            results["details"].append({
                "product_id": product_id,
                "success": success,
                "detail": detail
            })

    # ── Send forecast_ready notification ──
    from app.models.notification import Notification
    from app.core.database import SessionLocal

    notif_db = SessionLocal()
    try:
        ready_count = results["trained"]
        notif_db.add(Notification(
            user_id=user_id,
            title=f"Forecasts ready — {ready_count} products trained",
            message=(
                f"Training complete. Forecasts are now available for {ready_count} products. "
                f"Head to the forecast dashboard to view predictions and simulate campaigns."
            ),
            notification_type='forecast_ready',
            is_read=False,
            email_sent=False,
            related_id=None,
            related_type=None,
        ))
        notif_db.commit()
    except Exception as e:
        print(f"[Forecasting] Notification failed: {str(e)}")
    finally:
        notif_db.close()

    return results


def train_single_product(db: Session, product_id: int) -> dict:
    """
    Train forecast for one product. Used for on-demand retraining.
    """
    # Mark as training
    existing = db.query(ForecastModel).filter(
        ForecastModel.product_id == product_id
    ).first()

    if existing:
        existing.status = 'training'
        existing.error_message = None
        db.commit()

    return _train_product(db, product_id)


# ============================================
# CORE TRAINING LOGIC
# ============================================

def _train_product(db: Session, product_id: int) -> dict:
    """
    Full training pipeline for one product:
    1. Load sales data
    2. Pick tier based on data volume
    3. Build features
    4. Train model
    5. Generate 90-day forecast
    6. Save results
    """
    try:
        # ── Load Sales Data ──
        sales = db.query(SalesRecord).filter(
            SalesRecord.product_id == product_id
        ).order_by(SalesRecord.sale_date).all()

        if not sales:
            _mark_failed(db, product_id, "No sales data found for this product")
            return {"status": "failed", "reason": "no_data"}

        # ── Build Daily DataFrame ──
        # Aggregate to daily totals (file might have multiple rows per day)
        df = pd.DataFrame([{
            'date': s.sale_date,
            'quantity': float(s.quantity),
            'revenue': float(s.total_amount) if s.total_amount else None
        } for s in sales])

        df = df.groupby('date').agg({
            'quantity': 'sum',
            'revenue': 'sum'
        }).reset_index()

        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date').reset_index(drop=True)

        # Fill missing dates with 0 (product not sold that day)
        full_range = pd.date_range(df['date'].min(), df['date'].max(), freq='D')
        df = df.set_index('date').reindex(full_range, fill_value=0).reset_index()
        df.rename(columns={'index': 'date'}, inplace=True)

        total_days = len(df)
        training_start = df['date'].min().date()
        training_end = df['date'].max().date()

        # ── Pick Tier ──
        if not XGBOOST_AVAILABLE or total_days < TIER2_MIN_DAYS:
            tier = 'simple_average'
        elif total_days < TIER1_MIN_DAYS:
            tier = 'xgboost_reduced'
        else:
            tier = 'xgboost_full'

        # ── Load Events for this product ──
        event_impacts = _load_event_impacts(db, product_id)

        # ── Train and Forecast ──
        if tier == 'simple_average':
            forecast_df, metrics = _simple_average_forecast(df, event_impacts)
            confidence = 'low'
        else:
            forecast_df, metrics = _xgboost_forecast(df, event_impacts, tier)
            # Confidence based on R²
            r2 = metrics.get('r2', 0)
            if r2 >= 0.7 and tier == 'xgboost_full':
                confidence = 'high'
            else:
                confidence = 'medium'

        # ── Save Model Record ──
        existing_model = db.query(ForecastModel).filter(
            ForecastModel.product_id == product_id
        ).first()

        if existing_model:
            existing_model.model_tier = tier
            existing_model.training_rows = len(sales)
            existing_model.training_date_start = training_start
            existing_model.training_date_end = training_end
            existing_model.mae = metrics.get('mae')
            existing_model.rmse = metrics.get('rmse')
            existing_model.r2 = metrics.get('r2')
            existing_model.status = 'ready'
            existing_model.error_message = None
            existing_model.trained_at = datetime.utcnow()
            model = existing_model
        else:
            model = ForecastModel(
                product_id=product_id,
                model_tier=tier,
                training_rows=len(sales),
                training_date_start=training_start,
                training_date_end=training_end,
                mae=metrics.get('mae'),
                rmse=metrics.get('rmse'),
                r2=metrics.get('r2'),
                status='ready'
            )
            db.add(model)

        db.flush()

        # ── Delete old forecasts ──
        db.query(ForecastResult).filter(
            ForecastResult.product_id == product_id
        ).delete()

        # ── Save Forecast Results ──
        rows = []
        for _, row in forecast_df.iterrows():
            # Find event for this date if any
            event_id = None
            event_multiplier = None
            has_boost = False

            for impact in event_impacts:
                if impact['start_date'] <= row['date'].date() <= impact['end_date']:
                    event_id = impact['event_id']
                    event_multiplier = impact['multiplier']
                    has_boost = True
                    break

            rows.append({
                'model_id': model.model_id,
                'product_id': product_id,
                'forecast_date': row['date'].date(),
                'predicted_quantity': max(0, round(float(row['predicted_quantity']), 2)),
                'predicted_revenue': max(0, round(float(row['predicted_revenue']), 2)) if row.get('predicted_revenue') is not None else None,
                'quantity_lower': max(0, round(float(row['quantity_lower']), 2)) if row.get('quantity_lower') is not None else None,
                'quantity_upper': max(0, round(float(row['quantity_upper']), 2)) if row.get('quantity_upper') is not None else None,
                'confidence': confidence,
                'has_event_boost': has_boost,
                'event_id': event_id,
                'event_multiplier': event_multiplier
            })

        db.execute(ForecastResult.__table__.insert(), rows)
        db.commit()

        return {
            "status": "success",
            "product_id": product_id,
            "tier": tier,
            "training_rows": len(sales),
            "forecast_days": len(rows),
            "metrics": metrics
        }

    except Exception as e:
        tb = traceback.format_exc()
        _mark_failed(db, product_id, f"{str(e)}\n{tb}")
        return {"status": "failed", "product_id": product_id, "error": str(e)}


# ============================================
# FEATURE ENGINEERING
# ============================================

def _build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build time-series features from a daily sales DataFrame.

    WHAT EACH FEATURE DOES:
    - day_of_week: captures weekly patterns (Fri spike in Arab markets)
    - month: captures seasonal patterns (Ramadan month)
    - is_weekend: Fri/Sat in Palestinian calendar
    - lag_7: what sold 1 week ago (strong predictor)
    - lag_14: what sold 2 weeks ago
    - lag_30: what sold 1 month ago
    - rolling_7: average of last 7 days (smooths noise)
    - rolling_30: average of last 30 days (baseline trend)
    - trend: days since first sale (captures growth/decline)
    """
    df = df.copy()

    df['day_of_week'] = df['date'].dt.dayofweek      # 0=Mon, 6=Sun
    df['month'] = df['date'].dt.month
    df['week_of_year'] = df['date'].dt.isocalendar().week.astype(int)
    df['is_weekend'] = df['day_of_week'].isin([4, 5]).astype(int)  # Fri=4, Sat=5
    df['day_of_month'] = df['date'].dt.day
    df['quarter'] = df['date'].dt.quarter
    df['trend'] = (df['date'] - df['date'].min()).dt.days

    # Lag features
    df['lag_7'] = df['quantity'].shift(7)
    df['lag_14'] = df['quantity'].shift(14)
    df['lag_30'] = df['quantity'].shift(30)

    # Rolling averages
    df['rolling_7'] = df['quantity'].shift(1).rolling(7, min_periods=1).mean()
    df['rolling_30'] = df['quantity'].shift(1).rolling(30, min_periods=1).mean()
    df['rolling_7_std'] = df['quantity'].shift(1).rolling(7, min_periods=1).std().fillna(0)

    # Fill NaN lags with rolling mean (for early rows without enough history)
    df['lag_7'] = df['lag_7'].fillna(df['rolling_7'])
    df['lag_14'] = df['lag_14'].fillna(df['rolling_7'])
    df['lag_30'] = df['lag_30'].fillna(df['rolling_30'])

    return df


def _get_feature_cols(tier: str) -> list:
    """Return feature columns based on tier."""
    base = ['day_of_week', 'month', 'is_weekend', 'trend', 'rolling_7', 'rolling_30']

    if tier == 'xgboost_full':
        return base + ['week_of_year', 'day_of_month', 'quarter',
                       'lag_7', 'lag_14', 'lag_30', 'rolling_7_std']
    else:  # xgboost_reduced
        return base + ['lag_7', 'lag_14']


# ============================================
# XGBOOST TRAINING
# ============================================

def _xgboost_forecast(df: pd.DataFrame, event_impacts: list, tier: str) -> tuple:
    """
    Train XGBoost and generate 90-day forecast.

    TRAIN/TEST SPLIT:
    We use the last 20% of dates as test set.
    This is time-aware — we never test on data before training data.
    (Normal random split would be cheating for time series.)
    """
    df = _build_features(df)
    feature_cols = _get_feature_cols(tier)

    # Drop rows where features are NaN (early rows with no lag history)
    df_clean = df.dropna(subset=feature_cols).copy()

    X = df_clean[feature_cols]
    y = df_clean['quantity']

    # Time-aware split (last 20% = test)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    # ── Train Model ──
    model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        verbosity=0
    )
    model.fit(X_train, y_train,
              eval_set=[(X_test, y_test)],
              verbose=False)

    # ── Evaluate ──
    y_pred = model.predict(X_test)
    metrics = {
        'mae': round(float(mean_absolute_error(y_test, y_pred)), 4),
        'rmse': round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
        'r2': round(float(r2_score(y_test, y_pred)), 4)
    }

    # ── Generate Future Forecast ──
    forecast_rows = _generate_future(df, model, feature_cols, event_impacts, tier)

    # ── Estimate Revenue ──
    # Use average unit price from historical data if available
    if 'revenue' in df.columns and df['revenue'].sum() > 0:
        avg_price = df[df['quantity'] > 0]['revenue'].sum() / df[df['quantity'] > 0]['quantity'].sum()
        for row in forecast_rows:
            row['predicted_revenue'] = row['predicted_quantity'] * avg_price
    else:
        for row in forecast_rows:
            row['predicted_revenue'] = None

    forecast_df = pd.DataFrame(forecast_rows)
    return forecast_df, metrics


def _generate_future(df: pd.DataFrame, model, feature_cols: list,
                     event_impacts: list, tier: str) -> list:
    """
    Iteratively generate 90-day forecast.

    WHY ITERATIVE:
    Lag features need actual values. For day 8 of forecast,
    lag_7 = day 1's prediction (not real data).
    So we generate one day at a time, feeding predictions back as lags.

    Think of it like: each day's forecast is built on yesterday's forecast.
    """
    # Start with full historical data as context
    history = df[['date', 'quantity']].copy()
    today = pd.Timestamp(date.today())
    forecast_start = max(df['date'].max() + timedelta(days=1), today)

    results = []
    std_dev = df['quantity'].std()  # For confidence intervals

    for i in range(FORECAST_HORIZON_DAYS):
        forecast_date = forecast_start + timedelta(days=i)

        # Build a single-row feature set for this date
        recent = history.tail(35)  # Only need last 35 days for features

        row = {
            'date': forecast_date,
            'quantity': np.nan,  # Unknown — what we're predicting
            'day_of_week': forecast_date.dayofweek,
            'month': forecast_date.month,
            'week_of_year': forecast_date.isocalendar()[1],
            'is_weekend': int(forecast_date.dayofweek in [4, 5]),
            'day_of_month': forecast_date.day,
            'quarter': (forecast_date.month - 1) // 3 + 1,
            'trend': (forecast_date - df['date'].min()).days,
            'lag_7': float(recent.iloc[-7]['quantity']) if len(recent) >= 7 else float(recent['quantity'].mean()),
            'lag_14': float(recent.iloc[-14]['quantity']) if len(recent) >= 14 else float(recent['quantity'].mean()),
            'lag_30': float(recent.iloc[-30]['quantity']) if len(recent) >= 30 else float(recent['quantity'].mean()),
            'rolling_7': float(recent.tail(7)['quantity'].mean()),
            'rolling_30': float(recent.tail(30)['quantity'].mean()),
            'rolling_7_std': float(recent.tail(7)['quantity'].std()) if len(recent) >= 2 else 0.0,
        }

        X_pred = pd.DataFrame([row])[feature_cols]
        predicted = float(model.predict(X_pred)[0])
        predicted = max(0, predicted)

        # ── Apply Event Multiplier if applicable ──
        for impact in event_impacts:
            if impact['start_date'] <= forecast_date.date() <= impact['end_date']:
                predicted = predicted * impact['multiplier']
                break

        # Confidence interval: ±1 std dev (rough but honest)
        results.append({
            'date': forecast_date,
            'predicted_quantity': predicted,
            'quantity_lower': max(0, predicted - std_dev),
            'quantity_upper': predicted + std_dev,
            'predicted_revenue': None  # Filled after
        })

        # Feed prediction back as history for next iteration
        new_row = pd.DataFrame([{'date': forecast_date, 'quantity': predicted}])
        history = pd.concat([history, new_row], ignore_index=True)

    return results


# ============================================
# SIMPLE AVERAGE FALLBACK
# ============================================

def _simple_average_forecast(df: pd.DataFrame, event_impacts: list) -> tuple:
    """
    Fallback for products with < 30 days of data.

    METHOD:
    - Weighted average: recent sales weighted more than old ones
    - Day-of-week pattern applied if detectable
    - Event multipliers applied to known event dates
    """
    quantities = df['quantity'].values
    n = len(quantities)

    # Weighted average: more recent = higher weight
    weights = np.linspace(1, 2, n)
    weighted_avg = np.average(quantities, weights=weights)

    # Day-of-week pattern (ratio vs average)
    df_feat = df.copy()
    df_feat['dow'] = df_feat['date'].dt.dayofweek
    dow_avg = df_feat.groupby('dow')['quantity'].mean()
    overall_avg = df_feat['quantity'].mean()

    if overall_avg > 0:
        dow_ratio = (dow_avg / overall_avg).to_dict()
    else:
        dow_ratio = {i: 1.0 for i in range(7)}

    # Fill missing dow with 1.0
    for i in range(7):
        if i not in dow_ratio:
            dow_ratio[i] = 1.0

    # Revenue price estimate
    if 'revenue' in df.columns and df['revenue'].sum() > 0 and df['quantity'].sum() > 0:
        avg_price = df['revenue'].sum() / df['quantity'].sum()
    else:
        avg_price = None

    forecast_start = df['date'].max() + timedelta(days=1)
    results = []
    std_dev = df['quantity'].std() if len(df) > 1 else weighted_avg * 0.3

    for i in range(FORECAST_HORIZON_DAYS):
        forecast_date = forecast_start + timedelta(days=i)
        dow = forecast_date.dayofweek
        base = weighted_avg * dow_ratio.get(dow, 1.0)
        base = max(0, base)

        # Apply event multiplier
        for impact in event_impacts:
            if impact['start_date'] <= forecast_date.date() <= impact['end_date']:
                base = base * impact['multiplier']
                break

        results.append({
            'date': forecast_date,
            'predicted_quantity': base,
            'quantity_lower': max(0, base - std_dev),
            'quantity_upper': base + std_dev,
            'predicted_revenue': base * avg_price if avg_price else None
        })

    metrics = {'mae': None, 'rmse': None, 'r2': None}
    return pd.DataFrame(results), metrics


# ============================================
# EVENT IMPACT LOADER
# ============================================

def _load_event_impacts(db: Session, product_id: int) -> list:
    """
    Load confirmed event impact multipliers for a product.
    Used to boost forecast on known event dates.

    MULTIPLIER LOGIC:
    If product had +155% during Ramadan last year,
    multiplier = 2.55 (1 + 1.55)
    Applied to base forecast during this year's Ramadan dates.

    FALLBACK CHAIN:
    1. Product-specific impact (most accurate)
    2. Category-level average (medium accuracy)
    3. No boost (conservative)
    """
    today = date.today()

    # Get this product's own confirmed impacts
    impacts = db.query(
        EventImpactResult,
        Event
    ).join(
        Event, EventImpactResult.event_id == Event.event_id
    ).filter(
        EventImpactResult.product_id == product_id,
        Event.status == 'confirmed',
        Event.deleted_at.is_(None)
    ).all()

    result = []

    for impact_row, event in impacts:
        # Only apply to recurring events that fall in our forecast window
        if not event.is_recurring:
            continue

        # Project event dates to this year / next year
        for year_offset in [0, 1]:
            try:
                projected_start = event.start_date.replace(year=today.year + year_offset)
                projected_end = event.end_date.replace(year=today.year + year_offset)
            except ValueError:
                projected_start = event.start_date.replace(year=today.year + year_offset, day=28)
                projected_end = event.end_date.replace(year=today.year + year_offset, day=28)

            # Only if it falls within forecast horizon
            forecast_end = today + timedelta(days=FORECAST_HORIZON_DAYS)
            if projected_start > forecast_end or projected_end < today:
                continue

            change_pct = float(impact_row.change_percentage)

            # Cap at 999.99 (event_only products) → use category average instead
            if change_pct >= 999:
                change_pct = 150.0  # Conservative default for event-only products

            multiplier = 1 + (change_pct / 100)

            result.append({
                'event_id': event.event_id,
                'event_name': event.event_name,
                'start_date': projected_start,
                'end_date': projected_end,
                'multiplier': multiplier,
                'source': 'product_specific'
            })

    return result


# ============================================
# CAMPAIGN IMPACT FORECAST
# ============================================

def forecast_with_campaign(
    db: Session,
    product_id: int,
    campaign_start: date,
    campaign_end: date,
    expected_uplift_pct: float = None
) -> dict:
    """
    Adjust forecast for a planned campaign date range.

    If uplift_pct is provided (user estimates), use it directly.
    Otherwise, derive from historical event impacts for this product.
    """
    # Get base forecast for this period
    base_forecasts = db.query(ForecastResult).filter(
        ForecastResult.product_id == product_id,
        ForecastResult.forecast_date >= campaign_start,
        ForecastResult.forecast_date <= campaign_end
    ).order_by(ForecastResult.forecast_date).all()

    if not base_forecasts:
        return {"error": "No forecast available for this period. Run forecast generation first."}

    # Determine multiplier
    if expected_uplift_pct is not None:
        multiplier = 1 + (expected_uplift_pct / 100)
        multiplier_source = 'user_provided'
        confidence = 'medium'
    else:
        # Look at historical promotional events for this product
        promo_impacts = db.query(EventImpactResult).join(
            Event, EventImpactResult.event_id == Event.event_id
        ).filter(
            EventImpactResult.product_id == product_id,
            # Event.event_type == 'promotional',
            Event.status == 'confirmed'
        ).all()

        if promo_impacts:
            avg_change = np.mean([float(r.change_percentage) for r in promo_impacts if float(r.change_percentage) < 999])
            multiplier = 1 + (avg_change / 100)
            multiplier_source = 'historical_promotions'
            confidence = 'high'
        else:
            # Fall back to all confirmed events for this product
            all_impacts = db.query(EventImpactResult).filter(
                EventImpactResult.product_id == product_id
            ).all()

            if all_impacts:
                avg_change = np.mean([float(r.change_percentage) for r in all_impacts if float(r.change_percentage) < 999])
                multiplier = 1 + (avg_change / 100)
                multiplier_source = 'all_events_average'
                confidence = 'medium'
            else:
                multiplier = 1.15  # Conservative 15% default
                multiplier_source = 'default'
                confidence = 'low'

    # Apply multiplier to base forecasts
    adjusted = []
    total_base_qty = 0
    total_adjusted_qty = 0
    total_base_revenue = 0
    total_adjusted_revenue = 0

    for f in base_forecasts:
        base_qty = float(f.predicted_quantity)
        adj_qty = base_qty * multiplier
        base_rev = float(f.predicted_revenue) if f.predicted_revenue else None
        adj_rev = base_rev * multiplier if base_rev else None

        total_base_qty += base_qty
        total_adjusted_qty += adj_qty
        if base_rev:
            total_base_revenue += base_rev
            total_adjusted_revenue += adj_rev

        adjusted.append({
            'date': f.forecast_date.isoformat(),
            'base_quantity': round(base_qty, 1),
            'adjusted_quantity': round(adj_qty, 1),
            'base_revenue': round(base_rev, 2) if base_rev else None,
            'adjusted_revenue': round(adj_rev, 2) if adj_rev else None,
        })

    return {
        'product_id': product_id,
        'campaign_period': {
            'start': campaign_start.isoformat(),
            'end': campaign_end.isoformat(),
            'duration_days': (campaign_end - campaign_start).days + 1
        },
        'multiplier': round(multiplier, 4),
        'expected_uplift_pct': round((multiplier - 1) * 100, 1),
        'multiplier_source': multiplier_source,
        'confidence': confidence,
        'totals': {
            'base_quantity': round(total_base_qty, 1),
            'adjusted_quantity': round(total_adjusted_qty, 1),
            'additional_units': round(total_adjusted_qty - total_base_qty, 1),
            'base_revenue': round(total_base_revenue, 2) if total_base_revenue else None,
            'adjusted_revenue': round(total_adjusted_revenue, 2) if total_adjusted_revenue else None,
            'additional_revenue': round(total_adjusted_revenue - total_base_revenue, 2) if total_base_revenue else None,
        },
        'daily_breakdown': adjusted
    }


# ============================================
# HELPERS
# ============================================

def _mark_failed(db: Session, product_id: int, error: str):
    model = db.query(ForecastModel).filter(
        ForecastModel.product_id == product_id
    ).first()
    if model:
        model.status = 'failed'
        model.error_message = error[:1000]
        db.commit()
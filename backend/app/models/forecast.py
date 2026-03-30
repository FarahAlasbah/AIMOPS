"""
File: backend/app/models/forecast.py
Purpose: Stores pre-computed forecast results and model metadata
"""
from sqlalchemy import Column, Integer, String, Date, Boolean, DECIMAL, TIMESTAMP, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class ForecastModel(Base):
    """
    Stores metadata about a trained XGBoost model for one product.

    WHY ONE MODEL PER PRODUCT:
    Each product has its own sales pattern — dates spike during Ramadan,
    watermelon spikes in summer. A single model for all products would
    average out these patterns and lose what makes each product unique.

    Think of it like: each product has its own "personality",
    and this table remembers that personality.
    """
    __tablename__ = "forecast_models"

    model_id = Column(Integer, primary_key=True, autoincrement=True)

    product_id = Column(
        Integer,
        ForeignKey('products.product_id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        unique=True  # One active model per product
    )

    # Which tier was used for this product
    model_tier = Column(
        Enum(
            'xgboost_full',     # 60+ days: full feature set
            'xgboost_reduced',  # 30-59 days: reduced features
            'simple_average',   # <30 days: weighted average fallback
            name='model_tier_enum'
        ),
        nullable=False
    )

    # Training data info
    training_rows = Column(Integer, nullable=False)          # How many sales records used
    training_date_start = Column(Date, nullable=False)       # Earliest date in training data
    training_date_end = Column(Date, nullable=False)         # Latest date in training data
    trained_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    # Model quality metrics (only for XGBoost tiers)
    mae = Column(DECIMAL(10, 4), nullable=True)   # Mean Absolute Error
    rmse = Column(DECIMAL(10, 4), nullable=True)  # Root Mean Squared Error
    r2 = Column(DECIMAL(6, 4), nullable=True)     # R² score (how well model fits data)

    # Status
    status = Column(
        Enum(
            'training',   # Background task running
            'ready',      # Forecasts available
            'failed',     # Training failed
            name='forecast_model_status_enum'
        ),
        nullable=False,
        default='training'
    )
    error_message = Column(Text, nullable=True)  # If failed, why

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(),
                        onupdate=func.current_timestamp())

    # Relationships
    product = relationship("Product")
    forecasts = relationship("ForecastResult", back_populates="model",
                             cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ForecastModel product:{self.product_id} tier:{self.model_tier} status:{self.status}>"


class ForecastResult(Base):
    """
    One row = one day's forecast for one product.

    WHY STORE DAILY FORECASTS:
    Pre-computing lets us serve forecasts instantly.
    Dashboard loads in milliseconds — no training on request.

    We store 90 days of forecasts per product.
    Re-training happens when new data is uploaded.
    """
    __tablename__ = "forecast_results"

    forecast_id = Column(Integer, primary_key=True, autoincrement=True)

    model_id = Column(
        Integer,
        ForeignKey('forecast_models.model_id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    product_id = Column(
        Integer,
        ForeignKey('products.product_id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    forecast_date = Column(Date, nullable=False, index=True)

    # Predictions
    predicted_quantity = Column(DECIMAL(10, 2), nullable=False)
    predicted_revenue = Column(DECIMAL(12, 2), nullable=True)  # null if no price data

    # Confidence interval (how wide is the uncertainty band?)
    quantity_lower = Column(DECIMAL(10, 2), nullable=True)  # pessimistic estimate
    quantity_upper = Column(DECIMAL(10, 2), nullable=True)  # optimistic estimate

    # Confidence level
    confidence = Column(
        Enum(
            'high',    # XGBoost full, good R²
            'medium',  # XGBoost reduced OR full with lower R²
            'low',     # Simple average fallback
            name='forecast_confidence_enum'
        ),
        nullable=False
    )

    # Was an event/campaign factored into this day's forecast?
    has_event_boost = Column(Boolean, default=False)
    event_id = Column(Integer, ForeignKey('events.event_id'), nullable=True)
    event_multiplier = Column(DECIMAL(6, 4), nullable=True)  # e.g. 2.55 = +155%

    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    # Relationships
    model = relationship("ForecastModel", back_populates="forecasts")
    product = relationship("Product")

    def __repr__(self):
        return f"<ForecastResult product:{self.product_id} date:{self.forecast_date} qty:{self.predicted_quantity}>"


class ForecastExplanation(Base):
    """
    Claude-generated explanation for a forecast.

    WHY SEPARATE TABLE:
    Explanations are generated on demand (when user clicks a product).
    Storing them means we only call Claude once per product per forecast cycle,
    not on every page view.

    Cache invalidates when forecast is re-trained.
    """
    __tablename__ = "forecast_explanations"

    explanation_id = Column(Integer, primary_key=True, autoincrement=True)

    product_id = Column(
        Integer,
        ForeignKey('products.product_id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        unique=True  # One active explanation per product
    )

    model_id = Column(
        Integer,
        ForeignKey('forecast_models.model_id', ondelete='CASCADE'),
        nullable=False
    )

    # The explanation text from Claude
    explanation_text = Column(Text, nullable=False)

    # Key drivers Claude identified (stored for quick display)
    # e.g. ["Ramadan event boost", "Strong weekly pattern", "Growing trend"]
    key_drivers = Column(JSON, nullable=True)

    # Forecast horizon this explanation covers
    horizon_days = Column(Integer, nullable=False, default=30)
    forecast_start = Column(Date, nullable=False)
    forecast_end = Column(Date, nullable=False)

    generated_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    def __repr__(self):
        return f"<ForecastExplanation product:{self.product_id}>"
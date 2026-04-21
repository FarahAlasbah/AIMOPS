"""
File: backend/app/models/campaign.py
Purpose: Campaign, Product, and junction table models
"""

from sqlalchemy import Column, Integer, String, Text, Date, DECIMAL, Enum, TIMESTAMP, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from datetime import date


# ============================================
# Product Model
# ============================================

class Product(Base):
    """
    Product catalog.
    Products are created during data import (confirm-products step).
    They can also be created manually via the products API.

    WHY NORMALIZED_NAME:
    Allows fuzzy matching during import — "Premium Dates 500g" and
    "premium dates 500g" both map to the same product.
    """
    __tablename__ = "products"

    product_id = Column(Integer, primary_key=True, autoincrement=True)

    product_code = Column(String(50), unique=True, nullable=True)
    product_name = Column(String(200), nullable=False)
    product_name_ar = Column(String(200), nullable=True)

    category = Column(String(100), nullable=True)
    category_ar = Column(String(100), nullable=True)
    brand = Column(String(100), nullable=True)

    unit_price = Column(DECIMAL(10, 2), nullable=True)
    cost_price = Column(DECIMAL(10, 2), nullable=True)

    normalized_name = Column(String(200), nullable=True, index=True)

    is_active = Column(Boolean, default=True)
    deleted_at = Column(TIMESTAMP, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(),
                        onupdate=func.current_timestamp())
    created_by = Column(Integer, ForeignKey('users.user_id'), nullable=True)
    updated_by = Column(Integer, ForeignKey('users.user_id'), nullable=True)

    # Relationships
    campaigns = relationship("CampaignProduct", back_populates="product")

    def __repr__(self):
        return f"<Product {self.product_id}: {self.product_name}>"


# ============================================
# Campaign Model
# ============================================

class Campaign(Base):
    """
    A marketing campaign planned by a marketing user.

    LIFECYCLE:
    planned → active → completed (or cancelled)

    FORECASTING INTEGRATION:
    When created, AIMOPS runs forecast_impact and stores
    forecast_uplift_pct and forecast_additional_revenue.
    After the campaign runs and results are entered, we compare
    predicted vs actual to improve future forecasts.

    EVENT LINKING:
    After the campaign runs, if new sales data is uploaded and a spike
    is detected matching the campaign dates, the user can confirm
    that event and link it here via linked_event_id.
    This closes the loop: plan → run → measure → learn.
    """
    __tablename__ = "campaigns"

    campaign_id = Column(Integer, primary_key=True, autoincrement=True)

    # ── Basic Info ──
    campaign_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    # Notes: free text passed to Claude for context-aware advice
    # Example: "Targeting Ramadan shoppers, Bethlehem market only"

    # ── Campaign Type ──
    # Drives which historical events we use as multiplier reference.
    # discount → uses past promotional event impacts
    # seasonal → uses past seasonal event impacts
    campaign_type = Column(
        Enum(
            'discount',    # Price reduction
            'bundle',      # Buy X get Y
            'flash_sale',  # Short burst, high urgency
            'seasonal',    # Tied to season or holiday
            'loyalty',     # Rewards program promotion
            'other',
            name='campaign_type_enum'
        ),
        nullable=True
    )

    # ── Date Range ──
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    # ── Budget ──
    budget = Column(DECIMAL(12, 2), nullable=True)
    currency = Column(String(10), nullable=True, default='ILS')

    # ── Target Audience ──
    target_audience = Column(Text, nullable=True)

    # ── Status ──
    status = Column(
        Enum(
            'planned',    # Created, not yet running
            'active',     # Currently running
            'completed',  # Finished
            'cancelled',  # Cancelled before running
            name='campaign_status_enum'
        ),
        nullable=False,
        default='planned'
    )

    # ── AIMOPS Forecast (stored at creation time) ──
    # What AIMOPS predicted before the campaign ran.
    # Stored so we can compare predicted vs actual after.
    forecast_uplift_pct = Column(DECIMAL(6, 2), nullable=True)
    forecast_additional_revenue = Column(DECIMAL(12, 2), nullable=True)

    # ── Actual Results (entered after campaign completes) ──
    actual_revenue = Column(DECIMAL(12, 2), nullable=True)
    actual_cost = Column(DECIMAL(12, 2), nullable=True)
    actual_uplift_pct = Column(DECIMAL(6, 2), nullable=True)
    roi = Column(DECIMAL(10, 2), nullable=True)
    

    # ── Event Link ──
    # After campaign runs and spike is confirmed as an event,
    # link the event here to close the learning loop.
    linked_event_id = Column(
        Integer,
        ForeignKey('events.event_id', ondelete='SET NULL'),
        nullable=True
    )

    # ── Soft Delete ──
    deleted_at = Column(TIMESTAMP, nullable=True)

    # ── Audit ──
    created_by = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(),
                        onupdate=func.current_timestamp())
    updated_by = Column(Integer, ForeignKey('users.user_id'), nullable=True)

    # ── Relationships ──
    products = relationship(
        "CampaignProduct",
        back_populates="campaign",
        cascade="all, delete-orphan"
    )
    channels = relationship(
        "CampaignChannel",
        back_populates="campaign",
        cascade="all, delete-orphan"
    )
    linked_event = relationship(
        "Event",
        foreign_keys=[linked_event_id]
    )

    # ── Helper Methods ──

    def duration_days(self) -> int:
        """How many days does this campaign run?"""
        return (self.end_date - self.start_date).days + 1

    def is_active_now(self) -> bool:
        """Is this campaign currently running?"""
        today = date.today()
        return (
            self.status == 'active' and
            self.deleted_at is None and
            self.start_date <= today <= self.end_date
        )

    def predicted_roi(self) -> float | None:
        """
        Calculate predicted ROI from forecast data.

        ROI = (additional_revenue - budget) / budget * 100
        Example: 8594 additional revenue, 5000 budget
                 → (8594 - 5000) / 5000 * 100 = 71.9% ROI

        Returns None if budget or forecast not set.
        """
        if not self.budget or not self.forecast_additional_revenue:
            return None
        if float(self.budget) == 0:
            return None
        roi = (
            (float(self.forecast_additional_revenue) - float(self.budget))
            / float(self.budget)
        ) * 100
        return round(roi, 1)

    def actual_roi(self) -> float | None:
        """
        Calculate actual ROI after campaign completes.
        Same formula but uses real numbers entered by marketing.
        """
        if not self.actual_cost or not self.actual_revenue:
            return None
        if float(self.actual_cost) == 0:
            return None
        roi = (
            (float(self.actual_revenue) - float(self.actual_cost))
            / float(self.actual_cost)
        ) * 100
        return round(roi, 1)

    def forecast_vs_actual(self) -> dict | None:
        """
        Compare predicted vs actual performance.
        Only available after results are entered.
        Returns None if results not yet entered.
        """
        if not self.actual_revenue or not self.forecast_additional_revenue:
            return None
        accuracy = (
            float(self.actual_revenue) /
            float(self.forecast_additional_revenue)
        ) * 100
        return {
            "predicted_revenue": float(self.forecast_additional_revenue),
            "actual_revenue": float(self.actual_revenue),
            "accuracy_pct": round(accuracy, 1),
            "over_under": "over" if accuracy > 100 else "under"
        }

    def __repr__(self):
        return f"<Campaign {self.campaign_id}: {self.campaign_name} ({self.status})>"


# ============================================
# Junction Tables
# ============================================

class CampaignProduct(Base):
    """
    Links a campaign to a product with campaign-specific details.

    WHY PER-PRODUCT DISCOUNT:
    A campaign might offer 20% off dates but 10% off coffee.
    Each product can have its own discount and target quantity.
    """
    __tablename__ = "campaign_products"

    campaign_id = Column(
        Integer,
        ForeignKey('campaigns.campaign_id', ondelete='CASCADE'),
        primary_key=True
    )
    product_id = Column(
        Integer,
        ForeignKey('products.product_id', ondelete='CASCADE'),
        primary_key=True
    )

    target_quantity = Column(Integer, nullable=True)
    discount_percentage = Column(DECIMAL(5, 2), nullable=True)

    # Relationships
    campaign = relationship("Campaign", back_populates="products")
    product = relationship("Product", back_populates="campaigns")

    def __repr__(self):
        return f"<CampaignProduct C{self.campaign_id}-P{self.product_id}>"


class CampaignChannel(Base):
    """
    Links a campaign to a marketing channel with budget allocation.

    WHY TRACK BUDGET PER CHANNEL:
    Marketing can allocate 3,000 ILS to Instagram and 2,000 ILS
    to in-store promotions. After the campaign, they can see which
    channel gave the best ROI.
    """
    __tablename__ = "campaign_channels"

    campaign_id = Column(
        Integer,
        ForeignKey('campaigns.campaign_id', ondelete='CASCADE'),
        primary_key=True
    )
    channel_name = Column(
        Enum(
            'facebook', 'instagram', 'twitter', 'tiktok',
            'email', 'sms', 'in_store', 'website', 'other',
            name='channel_enum'
        ),
        primary_key=True
    )

    budget_allocated = Column(DECIMAL(10, 2), nullable=True)

    # Relationship
    campaign = relationship("Campaign", back_populates="channels")

    def __repr__(self):
        return f"<CampaignChannel C{self.campaign_id}-{self.channel_name}>"
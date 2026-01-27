"""
Campaign-related SQLAlchemy models
File: backend/app/models/campaign.py

Purpose: Python classes that map to your database tables
Why: Work with database as objects instead of raw SQL

Example:
    campaign = Campaign(campaign_name="Ramadan 2026", ...)
    db.add(campaign)
    db.commit()
"""
from sqlalchemy import Column, Integer, String, Text, Date, DECIMAL, Enum, TIMESTAMP, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


# ============================================
# Enums 
# ============================================

class CampaignStatusEnum(str, enum.Enum):
    """Campaign status - matches your DB enum"""
    PLANNED = "planned"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ChannelEnum(str, enum.Enum):
    """Marketing channels - matches your campaign_channels table"""
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    TWITTER = "twitter"
    TIKTOK = "tiktok"
    EMAIL = "email"
    SMS = "sms"
    IN_STORE = "in_store"
    WEBSITE = "website"
    OTHER = "other"


# ============================================
# Campaign Model (Main table)
# ============================================

class Campaign(Base):
    """
    Main campaign table
    
    Maps to: campaigns table 
    Used for: Creating marketing campaigns with products, channels, events
    """
    __tablename__ = "campaigns"
    
    # Primary key
    campaign_id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Basic info
    campaign_name = Column(String(200), nullable=False)  # e.g., "Ramadan Special 2026"
    description = Column(Text, nullable=True)
    
    # Date range
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Budget & settings
    budget = Column(DECIMAL(12, 2), nullable=True)  # Total budget
    currency = Column(String(10), nullable=True, default="USD")
    target_audience = Column(Text, nullable=True)  # Who is this for?
    
    # Status tracking
    status = Column(
        Enum('planned', 'active', 'completed', 'cancelled', name='campaign_status_enum'),
        nullable=False,
        default='planned'
    )
    
    # Performance metrics (filled after campaign completes)
    actual_revenue = Column(DECIMAL(12, 2), nullable=True)  # How much we earned
    actual_cost = Column(DECIMAL(12, 2), nullable=True)  # How much we spent
    uplift_percentage = Column(DECIMAL(5, 2), nullable=True)  # % increase vs baseline
    roi = Column(DECIMAL(10, 2), nullable=True)  # Return on investment
    
    # Soft delete (keep data but mark as deleted)
    deleted_at = Column(TIMESTAMP, nullable=True)
    
    # Audit fields (WHO created/updated and WHEN)
    created_by = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    updated_by = Column(Integer, ForeignKey('users.user_id'), nullable=True)
    
    # ============================================
    # Relationships 
    # ============================================
    
    # Link to products (many-to-many through campaign_products)
    products = relationship("CampaignProduct", back_populates="campaign", cascade="all, delete-orphan")
    
    # Link to channels (many-to-many through campaign_channels)
    channels = relationship("CampaignChannel", back_populates="campaign", cascade="all, delete-orphan")
    
    # Link to events (many-to-many through campaign_events)
    events = relationship("CampaignEvent", back_populates="campaign", cascade="all, delete-orphan")
    
    def __repr__(self):
        """String representation for debugging"""
        return f"<Campaign {self.campaign_id}: {self.campaign_name}>"


# ============================================
# Product Model
# ============================================

class Product(Base):
    """
    Product catalog
    
    Maps to: products table
    Why: Store product info once, reuse across campaigns
    """
    __tablename__ = "products"
    
    # Primary key
    product_id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Product identifiers
    product_code = Column(String(50), unique=True, nullable=True)  # SKU/barcode
    product_name = Column(String(200), nullable=False)  # English name
    product_name_ar = Column(String(200), nullable=True)  # Arabic name
    
    # Classification
    category = Column(String(100), nullable=True)  # e.g., "Food & Beverages"
    category_ar = Column(String(100), nullable=True)  # Arabic category
    brand = Column(String(100), nullable=True)
    
    # Pricing (optional - can come from sales data)
    unit_price = Column(DECIMAL(10, 2), nullable=True)
    cost_price = Column(DECIMAL(10, 2), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)  # Can be discontinued
    deleted_at = Column(TIMESTAMP, nullable=True)
    
    # Audit
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    created_by = Column(Integer, ForeignKey('users.user_id'), nullable=True)
    updated_by = Column(Integer, ForeignKey('users.user_id'), nullable=True)
    
    # Relationships
    campaigns = relationship("CampaignProduct", back_populates="product")
    
    def __repr__(self):
        return f"<Product {self.product_id}: {self.product_name}>"


# ============================================
# Junction Tables (Many-to-Many Links)
# ============================================

class CampaignProduct(Base):
    """
    Links campaigns to products
    
    Maps to: campaign_products table
    Why: One campaign can have many products
         One product can be in many campaigns
    Extra: Stores campaign-specific targets per product
    """
    __tablename__ = "campaign_products"
    
    # Composite primary key
    campaign_id = Column(Integer, ForeignKey('campaigns.campaign_id'), primary_key=True)
    product_id = Column(Integer, ForeignKey('products.product_id'), primary_key=True)
    
    # Product-specific campaign details
    target_quantity = Column(Integer, nullable=True)  # Goal: sell 1000 units
    discount_percentage = Column(DECIMAL(5, 2), nullable=True)  # e.g., 15% off
    
    # Relationships
    campaign = relationship("Campaign", back_populates="products")
    product = relationship("Product", back_populates="campaigns")
    
    def __repr__(self):
        return f"<CampaignProduct C{self.campaign_id}-P{self.product_id}>"


class CampaignChannel(Base):
    """
    Links campaigns to marketing channels
    
    Maps to: campaign_channels table
    Why: Track budget per channel
         e.g., $10,000 on Facebook, $5,000 on Instagram
    """
    __tablename__ = "campaign_channels"
    
    # Composite primary key
    campaign_id = Column(Integer, ForeignKey('campaigns.campaign_id'), primary_key=True)
    channel_name = Column(
        Enum('facebook', 'instagram', 'twitter', 'tiktok', 'email', 'sms', 'in_store', 'website', 'other',
             name='channel_enum'),
        primary_key=True
    )
    
    # Budget per channel
    budget_allocated = Column(DECIMAL(10, 2), nullable=True)
    
    # Relationships
    campaign = relationship("Campaign", back_populates="channels")
    
    def __repr__(self):
        return f"<CampaignChannel C{self.campaign_id}-{self.channel_name}>"


class CampaignEvent(Base):
    """
    Links campaigns to seasonal events
    
    Maps to: campaign_events table
    Why: Track which events affect campaign (used in forecasting)
         e.g., Ramadan campaign linked to Ramadan event
    """
    __tablename__ = "campaign_events"
    
    # Composite primary key
    campaign_id = Column(Integer, ForeignKey('campaigns.campaign_id'), primary_key=True)
    event_id = Column(Integer, ForeignKey('events.event_id'), primary_key=True)
    
    # How relevant is this event? (0.00 to 1.00)
    relevance_score = Column(DECIMAL(3, 2), default=1.00)
    
    # Relationships
    campaign = relationship("Campaign", back_populates="events")
    # Note: Event model will be created when we build Events feature
    
    def __repr__(self):
        return f"<CampaignEvent C{self.campaign_id}-E{self.event_id}>"


# ============================================
# Helper Methods 
# ============================================

def get_product_count(self):
    """Count products in this campaign"""
    return len(self.products)

def get_channel_names(self):
    """Get list of channel names as strings"""
    return [ch.channel_name for ch in self.channels]

def is_active_now(self):
    """Check if campaign is currently running"""
    from datetime import date
    today = date.today()
    return (
        self.status == 'active' and 
        self.deleted_at is None and
        self.start_date <= today <= self.end_date
    )

# Add helper methods to Campaign class
Campaign.get_product_count = get_product_count
Campaign.get_channel_names = get_channel_names
Campaign.is_active_now = is_active_now



#  Relationships work both ways:
#    campaign.products[0].product  # → Access Product from Campaign
#    product.campaigns[0].campaign # → Access Campaign from Product




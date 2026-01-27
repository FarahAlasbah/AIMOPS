"""
Campaign Pydantic schemas
File: backend/app/schemas/campaign.py

Purpose: Define what data API accepts and returns
Why: Automatic validation - FastAPI rejects invalid requests

Example:
    If user sends: {"name": ""}  # Empty name
    FastAPI auto-returns: 422 error "name too short"
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


# ============================================
# Enums (Valid values only)
# ============================================

class CampaignStatus(str, Enum):
    """
    Valid campaign statuses
    
    Why enum? Prevents typos like "planed" or "activ"
    """
    PLANNED = "planned"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ChannelName(str, Enum):
    """Valid marketing channels"""
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
# Product Schemas
# ============================================

class ProductBase(BaseModel):
    """
    Base product info
    
    Why separate Base class? Shared by Create/Update/Response
    """
    product_code: Optional[str] = Field(None, max_length=50)
    product_name: str = Field(..., min_length=1, max_length=200)  # Required
    product_name_ar: Optional[str] = Field(None, max_length=200)  # Arabic name
    category: Optional[str] = Field(None, max_length=100)
    category_ar: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    unit_price: Optional[Decimal] = Field(None, ge=0)  # ge = greater or equal
    cost_price: Optional[Decimal] = Field(None, ge=0)


class ProductCreate(ProductBase):
    """Data needed to create a product"""
    pass  # Inherits all from ProductBase


class ProductResponse(ProductBase):
    """What API returns when showing a product"""
    product_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True  # Allows SQLAlchemy model → Pydantic conversion


# ============================================
# Campaign-Product Link Schemas
# ============================================

class CampaignProductLink(BaseModel):
    """
    Link a product to a campaign with campaign-specific details
    
    Why? Each product can have different targets/discounts per campaign
    """
    product_id: int
    target_quantity: Optional[int] = Field(None, ge=0)  # Must be positive
    discount_percentage: Optional[Decimal] = Field(None, ge=0, le=100)  # 0-100%
    
    @field_validator('discount_percentage')
    @classmethod
    def validate_discount(cls, v):
        """
        Custom validation for discount
        
        Why? Extra safety beyond ge/le constraints
        """
        if v is not None:
            if v < 0:
                raise ValueError('Discount cannot be negative')
            if v > 100:
                raise ValueError('Discount cannot exceed 100%')
        return v


class CampaignProductInfo(BaseModel):
    """
    Product info when shown as part of campaign
    
    Why? Campaign detail view shows product names, not just IDs
    """
    product_id: int
    product_code: Optional[str]
    product_name: str
    product_name_ar: Optional[str]
    category: Optional[str]
    target_quantity: Optional[int]
    discount_percentage: Optional[Decimal]
    
    class Config:
        from_attributes = True


# ============================================
# Campaign Channel Schema
# ============================================

class CampaignChannelInput(BaseModel):
    """Channel with optional budget allocation"""
    channel_name: ChannelName
    budget_allocated: Optional[Decimal] = Field(None, ge=0)


# ============================================
# Campaign Schemas
# ============================================

class CampaignBase(BaseModel):
    """
    Base campaign fields
    
    Shared by Create and Update
    """
    campaign_name: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    start_date: date
    end_date: date
    budget: Optional[Decimal] = Field(None, ge=0)  # Must be positive
    currency: Optional[str] = Field("USD", max_length=10)
    target_audience: Optional[str] = None
    
    @field_validator('end_date')
    @classmethod
    def validate_dates(cls, end_date, info):
        """
        Ensure end_date is after start_date
        
        Why? Prevents invalid campaigns like:
              start: April 1, end: March 1 ❌
        """
        # Access start_date from the data being validated
        start_date = info.data.get('start_date')
        if start_date and end_date < start_date:
            raise ValueError('end_date must be on or after start_date')
        return end_date
    
    @field_validator('campaign_name')
    @classmethod
    def validate_name(cls, v):
        """Ensure campaign name is not just whitespace"""
        if v and not v.strip():
            raise ValueError('Campaign name cannot be empty or whitespace')
        return v.strip()


class CampaignCreate(CampaignBase):
    """
    Data needed to create a campaign
    
    Includes products, channels, events
    """
    # Optional: Simple list of product IDs
    product_ids: Optional[List[int]] = Field(default_factory=list)
    
    # OR: Detailed with targets and discounts
    products: Optional[List[CampaignProductLink]] = Field(default_factory=list)
    
    # Channels
    channels: Optional[List[CampaignChannelInput]] = Field(default_factory=list)
    
    # Events
    event_ids: Optional[List[int]] = Field(default_factory=list)
    
    @field_validator('channels')
    @classmethod
    def validate_channels(cls, v):
        """Ensure no duplicate channels"""
        if v:
            channel_names = [ch.channel_name for ch in v]
            if len(channel_names) != len(set(channel_names)):
                raise ValueError('Duplicate channels not allowed')
        return v


class CampaignUpdate(BaseModel):
    """
    Data for updating a campaign
    
    Why all optional? User can update just one field
    """
    campaign_name: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=10)
    target_audience: Optional[str] = None
    status: Optional[CampaignStatus] = None
    
    # Performance metrics (filled after campaign)
    actual_revenue: Optional[Decimal] = Field(None, ge=0)
    actual_cost: Optional[Decimal] = Field(None, ge=0)
    
    @field_validator('end_date')
    @classmethod
    def validate_dates(cls, end_date, info):
        """Validate dates if both provided"""
        start_date = info.data.get('start_date')
        if start_date and end_date and end_date < start_date:
            raise ValueError('end_date must be on or after start_date')
        return end_date


class CampaignListResponse(BaseModel):
    """
    Minimal campaign info for list view
    
    Why? List doesn't need ALL details (faster queries)
    """
    campaign_id: int
    campaign_name: str
    start_date: date
    end_date: date
    status: str  # Will be enum value as string
    budget: Optional[Decimal]
    currency: Optional[str]
    product_count: int  # Calculated field
    created_at: datetime
    
    class Config:
        from_attributes = True


class CampaignChannelResponse(BaseModel):
    """Channel info in campaign response"""
    channel_name: str
    budget_allocated: Optional[Decimal]
    
    class Config:
        from_attributes = True


class CampaignEventInfo(BaseModel):
    """Event info in campaign response"""
    event_id: int
    relevance_score: Optional[Decimal]
    # Will add event details when we build Events feature
    
    class Config:
        from_attributes = True


class CampaignDetailResponse(BaseModel):
    """
    Full campaign details
    
    Used for: Campaign detail view, after create/update
    """
    campaign_id: int
    campaign_name: str
    description: Optional[str]
    start_date: date
    end_date: date
    budget: Optional[Decimal]
    currency: Optional[str]
    target_audience: Optional[str]
    status: str
    
    # Performance metrics
    actual_revenue: Optional[Decimal]
    actual_cost: Optional[Decimal]
    uplift_percentage: Optional[Decimal]
    roi: Optional[Decimal]
    
    # Related data
    products: List[CampaignProductInfo]
    channels: List[CampaignChannelResponse]
    
    # Audit info
    created_by: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Why This Structure?
# ============================================

# 1. Clear separation:
#    - Create schemas: what users SEND
#    - Response schemas: what API RETURNS
#    - Update schemas: flexible (all optional)

# 2. Automatic validation:
#    - Dates validated
#    - Budget must be positive
#    - Campaign name 3-200 chars
#    - FastAPI returns 422 error if invalid

# 3. Auto-generated API docs:
#    - FastAPI creates interactive docs
#    - Shows required fields, types, constraints
#    - Frontend knows exactly what to send

# 4. Type safety:
#    - IDE autocomplete works
#    - Catch errors before runtime

# 5. Flexibility:
#    - Can create campaign with simple product IDs
#    - OR with detailed targets/discounts
#    - Both work!
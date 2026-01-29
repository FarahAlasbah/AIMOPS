"""
Campaign service - Business logic
File: backend/app/services/campaign_service.py

Purpose: Handle all campaign operations (CRUD + business rules)
Why: Separate business logic from API routes (cleaner, testable)

Example flow:
    API route → calls service → service uses models → returns data
"""
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime

from app.models.campaign import Campaign, Product, CampaignProduct, CampaignChannel, CampaignEvent
from app.schemas.campaign import (
    CampaignCreate, CampaignUpdate, CampaignProductLink, 
    CampaignChannelInput
)


# ============================================
# READ Operations (Get campaigns)
# ============================================

def get_all_campaigns(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    include_deleted: bool = False
) -> List[Campaign]:
    """
    Get list of campaigns with optional filters
    
    Args:
        skip: How many to skip (pagination)
        limit: Max number to return
        status: Filter by status ("planned", "active", etc.)
        include_deleted: Show soft-deleted campaigns?
        
    Returns:
        List of Campaign objects
        
    Why pagination? If you have 10,000 campaigns, don't load all at once!
    """
    # Start building query
    query = db.query(Campaign)
    
    # Filter out deleted campaigns (unless requested)
    if not include_deleted:
        query = query.filter(Campaign.deleted_at.is_(None))
    
    # Filter by status if provided
    if status:
        query = query.filter(Campaign.status == status)
    
    # Order by most recent first
    query = query.order_by(Campaign.created_at.desc())
    
    # Apply pagination
    campaigns = query.offset(skip).limit(limit).all()
    
    return campaigns


def get_campaign_by_id(db: Session, campaign_id: int) -> Campaign:
    """
    Get single campaign by ID with all relationships loaded
    
    Args:
        campaign_id: Campaign to fetch
        
    Returns:
        Campaign object
        
    Raises:
        HTTPException 404: Campaign not found
        
    Why joinedload? Load products, channels, events in ONE query (faster!)
    """
    campaign = (
        db.query(Campaign)
        .options(
            joinedload(Campaign.products).joinedload(CampaignProduct.product),  # Load products
            joinedload(Campaign.channels),  # Load channels
            joinedload(Campaign.events)  # Load events
        )
        .filter(Campaign.campaign_id == campaign_id)
        .filter(Campaign.deleted_at.is_(None))  # Don't show deleted
        .first()
    )
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign with ID {campaign_id} not found"
        )
    
    return campaign


# ============================================
# CREATE Operation
# ============================================

def create_campaign(
    db: Session,
    campaign_data: CampaignCreate,
    current_user_id: int
) -> Campaign:
    """
    Create a new campaign
    
    Steps:
    1. Validate products exist
    2. Create campaign record
    3. Link products
    4. Link channels
    5. Link events
    6. Save to database
    
    Args:
        campaign_data: Campaign info from API
        current_user_id: Who is creating this
        
    Returns:
        Created Campaign object
        
    Why so many steps? To ensure data consistency!
    """
    # Step 1: Validate all product IDs exist
    product_ids = []
    
    # Extract product IDs (handle both simple and detailed formats)
    if campaign_data.products:  # Detailed format with targets
        product_ids = [p.product_id for p in campaign_data.products]
    elif campaign_data.product_ids:  # Simple format
        product_ids = campaign_data.product_ids
    
    if product_ids:
        # Check all products exist
        existing_products = db.query(Product.product_id).filter(
            Product.product_id.in_(product_ids),
            Product.is_active == True,
            Product.deleted_at.is_(None)
        ).all()
        
        existing_ids = [p.product_id for p in existing_products]
        missing_ids = set(product_ids) - set(existing_ids)
        
        if missing_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Products not found or inactive: {list(missing_ids)}"
            )
    
    # Step 2: Create main campaign record
    campaign = Campaign(
        campaign_name=campaign_data.campaign_name,
        description=campaign_data.description,
        start_date=campaign_data.start_date,
        end_date=campaign_data.end_date,
        budget=campaign_data.budget,
        currency=campaign_data.currency,
        target_audience=campaign_data.target_audience,
        status='planned',  # Always start as planned
        created_by=current_user_id,
        updated_by=current_user_id
    )
    
    db.add(campaign)
    db.flush()  # Get campaign_id without committing
    
    # Step 3: Link products to campaign
    if campaign_data.products:  # Detailed format
        for product_link in campaign_data.products:
            campaign_product = CampaignProduct(
                campaign_id=campaign.campaign_id,
                product_id=product_link.product_id,
                target_quantity=product_link.target_quantity,
                discount_percentage=product_link.discount_percentage
            )
            db.add(campaign_product)
            
    elif campaign_data.product_ids:  # Simple format
        for product_id in campaign_data.product_ids:
            campaign_product = CampaignProduct(
                campaign_id=campaign.campaign_id,
                product_id=product_id
            )
            db.add(campaign_product)
    
    # Step 4: Link channels
    if campaign_data.channels:
        for channel_input in campaign_data.channels:
            campaign_channel = CampaignChannel(
                campaign_id=campaign.campaign_id,
                channel_name=channel_input.channel_name.value,  # Get string from enum
                budget_allocated=channel_input.budget_allocated
            )
            db.add(campaign_channel)
    
    # Step 5: Link events
    if campaign_data.event_ids:
        for event_id in campaign_data.event_ids:
            campaign_event = CampaignEvent(
                campaign_id=campaign.campaign_id,
                event_id=event_id,
                relevance_score=1.00  # Default: fully relevant
            )
            db.add(campaign_event)
    
    # Step 6: Save everything
    db.commit()
    db.refresh(campaign)
    
    # Reload with relationships
    return get_campaign_by_id(db, campaign.campaign_id)


# ============================================
# UPDATE Operation
# ============================================

def update_campaign(
    db: Session,
    campaign_id: int,
    campaign_data: CampaignUpdate,
    current_user_id: int
) -> Campaign:
    """
    Update existing campaign
    
    Why only update provided fields? User might want to change just status
    
    Args:
        campaign_id: Which campaign to update
        campaign_data: New values (only provided fields updated)
        current_user_id: Who is updating
        
    Returns:
        Updated Campaign object
    """
    # Get existing campaign
    campaign = get_campaign_by_id(db, campaign_id)
    
    # Update only provided fields
    update_data = campaign_data.model_dump(exclude_unset=True)  # Only fields that were set
    
    for field, value in update_data.items():
        setattr(campaign, field, value)  # campaign.field_name = value
    
    # Update audit fields
    campaign.updated_by = current_user_id
    campaign.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(campaign)
    
    return get_campaign_by_id(db, campaign.campaign_id)


# ============================================
# DELETE Operation (Soft delete)
# ============================================

def delete_campaign(
    db: Session,
    campaign_id: int,
    current_user_id: int
) -> dict:
    """
    Soft delete a campaign
    
    Why soft delete? Keep data for:
    - Historical analysis
    - Audit trails
    - Forecasting models (need past campaigns!)
    
    Args:
        campaign_id: Which campaign to delete
        current_user_id: Who is deleting
        
    Returns:
        Success message
    """
    campaign = get_campaign_by_id(db, campaign_id)
    
    # Check if already deleted
    if campaign.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign is already deleted"
        )
    
    # Soft delete: just set timestamp
    campaign.deleted_at = datetime.utcnow()
    campaign.updated_by = current_user_id
    
    db.commit()
    
    return {
        "message": f"Campaign '{campaign.campaign_name}' has been deleted",
        "campaign_id": campaign_id
    }


# ============================================
# HELPER Functions
# ============================================

def get_campaign_product_count(db: Session, campaign_id: int) -> int:
    """
    Count products in a campaign
    
    Why separate function? Reusable, testable
    """
    count = db.query(CampaignProduct).filter(
        CampaignProduct.campaign_id == campaign_id
    ).count()
    return count


def update_campaign_status(
    db: Session,
    campaign_id: int,
    new_status: str,
    current_user_id: int
) -> Campaign:
    """
    Quick status update
    
    Common operation: Admin marks campaign as "active"
    """
    campaign = get_campaign_by_id(db, campaign_id)
    
    campaign.status = new_status
    campaign.updated_by = current_user_id
    
    db.commit()
    db.refresh(campaign)
    
    return campaign


# ============================================
# Why This Structure?
# ============================================

# 1. Single Responsibility:
#    Each function does ONE thing well
#    Easy to test: test_create_campaign()

# 2. Reusable:
#    get_campaign_by_id() used by many functions
#    Write once, use everywhere!

# 3. Error Handling:
#    Clear error messages
#    "Product 123 not found" vs "Error"

# 4. Database Efficiency:
#    joinedload() = fewer queries
#    flush() before commit = get IDs early

# 5. Audit Trail:
#    Always track WHO and WHEN
#    created_by, updated_by filled automatically

# 6. Business Rules:
#    - Can't delete already-deleted campaign
#    - Must validate products exist
#    - Status always starts as "planned"
#    All in one place!
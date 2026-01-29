"""
Campaign API routes
File: backend/app/api/campaigns.py

Purpose: HTTP endpoints for campaign management
Why: This is what the frontend calls!

"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.schemas.campaign import (
    CampaignCreate, 
    CampaignUpdate, 
    CampaignDetailResponse, 
    CampaignListResponse,
    ProductCreate,
    ProductResponse
)
from app.services import campaign_service


# Create router
router = APIRouter(
    prefix="/api/campaigns",  # All routes start with /api/campaigns
    tags=["campaigns"]  # Groups in API docs
)


# ============================================
# Campaign Endpoints
# ============================================

@router.get("", response_model=List[CampaignListResponse])
def list_campaigns(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    status: Optional[str] = Query(None, description="Filter by status"),
    include_deleted: bool = Query(False, description="Include deleted campaigns"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of campaigns
    
    **Permissions:** All authenticated users
    
    **Query Parameters:**
    - skip: Pagination offset (default: 0)
    - limit: Max results (default: 100, max: 500)
    - status: Filter by status (planned/active/completed/cancelled)
    - include_deleted: Show soft-deleted campaigns (default: false)
    
    **Returns:** List of campaigns with basic info
    
    **Example:**
    ```
    GET /api/campaigns?status=active&limit=10
    ```
    """
    # Get campaigns from service
    campaigns = campaign_service.get_all_campaigns(
        db=db,
        skip=skip,
        limit=limit,
        status=status,
        include_deleted=include_deleted
    )
    
    # Add product count to each campaign
    result = []
    for campaign in campaigns:
        campaign_dict = {
            "campaign_id": campaign.campaign_id,
            "campaign_name": campaign.campaign_name,
            "start_date": campaign.start_date,
            "end_date": campaign.end_date,
            "status": campaign.status,
            "budget": campaign.budget,
            "currency": campaign.currency,
            "product_count": len(campaign.products),  # Count products
            "created_at": campaign.created_at
        }
        result.append(CampaignListResponse(**campaign_dict))
    
    return result


@router.post("", response_model=CampaignDetailResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(
    campaign_data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new campaign
    
    **Permissions:** Admin or Marketing User
    
    **Request Body:**
    ```json
    {
      "campaign_name": "Ramadan Special 2026",
      "description": "Promote dates and sweets",
      "start_date": "2026-03-01",
      "end_date": "2026-04-05",
      "budget": 50000.00,
      "currency": "USD",
      "products": [
        {"product_id": 1, "target_quantity": 1000, "discount_percentage": 15.0}
      ],
      "channels": [
        {"channel_name": "facebook", "budget_allocated": 20000.00},
        {"channel_name": "instagram", "budget_allocated": 15000.00}
      ],
      "event_ids": [1, 2]
    }
    ```
    
    **Returns:** Created campaign with full details
    """
    # Check permission (only admin and marketing_user can create)
    if current_user.role not in ['admin', 'marketing_user']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Marketing Users can create campaigns"
        )
    
    # Create campaign
    campaign = campaign_service.create_campaign(
        db=db,
        campaign_data=campaign_data,
        current_user_id=current_user.user_id
    )
    
    # Convert to response format
    return _build_campaign_detail_response(campaign)


@router.get("/{campaign_id}", response_model=CampaignDetailResponse)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get campaign details by ID
    
    **Permissions:** All authenticated users
    
    **Path Parameters:**
    - campaign_id: Campaign ID
    
    **Returns:** Full campaign details with products, channels, events
    
    **Example:**
    ```
    GET /api/campaigns/1
    ```
    """
    # Get campaign
    campaign = campaign_service.get_campaign_by_id(db=db, campaign_id=campaign_id)
    
    # Convert to response
    return _build_campaign_detail_response(campaign)


@router.patch("/{campaign_id}", response_model=CampaignDetailResponse)
def update_campaign(
    campaign_id: int,
    campaign_data: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update campaign
    
    **Permissions:** Admin or Marketing User
    
    **Path Parameters:**
    - campaign_id: Campaign to update
    
    **Request Body:** (All fields optional)
    ```json
    {
      "campaign_name": "Updated Name",
      "status": "active",
      "budget": 60000.00
    }
    ```
    
    **Returns:** Updated campaign with full details
    """
    # Check permission
    if current_user.role not in ['admin', 'marketing_user']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Marketing Users can update campaigns"
        )
    
    # Update campaign
    campaign = campaign_service.update_campaign(
        db=db,
        campaign_id=campaign_id,
        campaign_data=campaign_data,
        current_user_id=current_user.user_id
    )
    
    return _build_campaign_detail_response(campaign)


@router.delete("/{campaign_id}", status_code=status.HTTP_200_OK)
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete campaign (soft delete)
    
    **Permissions:** Admin or Marketing User
    
    **Path Parameters:**
    - campaign_id: Campaign to delete
    
    **Returns:** Success message
    
    **Note:** This is a soft delete - data is retained for analysis
    """
    # Check permission
    if current_user.role not in ['admin', 'marketing_user']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Marketing Users can delete campaigns"
        )
    
    # Delete campaign
    result = campaign_service.delete_campaign(
        db=db,
        campaign_id=campaign_id,
        current_user_id=current_user.user_id
    )
    
    return result


@router.patch("/{campaign_id}/status", response_model=CampaignDetailResponse)
def update_campaign_status(
    campaign_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Quick status update
    
    **Permissions:** Admin or Marketing User
    
    **Path Parameters:**
    - campaign_id: Campaign to update
    
    **Query Parameters:**
    - new_status: New status (planned/active/completed/cancelled)
    
    **Example:**
    ```
    PATCH /api/campaigns/1/status?new_status=active
    ```
    """
    # Check permission
    if current_user.role not in ['admin', 'marketing_user']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Marketing Users can update campaign status"
        )
    
    # Validate status
    valid_statuses = ['planned', 'active', 'completed', 'cancelled']
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    # Update status
    campaign = campaign_service.update_campaign_status(
        db=db,
        campaign_id=campaign_id,
        new_status=new_status,
        current_user_id=current_user.user_id
    )
    
    return _build_campaign_detail_response(campaign)


# ============================================
# Product Endpoints (Simple CRUD for products)
# ============================================

@router.get("/products/all", response_model=List[ProductResponse])
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category: Optional[str] = Query(None, description="Filter by category"),
    active_only: bool = Query(True, description="Show only active products"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of products
    
    **Permissions:** All authenticated users
    
    **Query Parameters:**
    - skip: Pagination offset
    - limit: Max results
    - category: Filter by category
    - active_only: Show only active products (default: true)
    
    **Returns:** List of products
    """
    from app.models.campaign import Product
    
    # Build query
    query = db.query(Product)
    
    # Filter by active status
    if active_only:
        query = query.filter(Product.is_active == True)
        query = query.filter(Product.deleted_at.is_(None))
    
    # Filter by category
    if category:
        query = query.filter(Product.category == category)
    
    # Order and paginate
    products = query.order_by(Product.product_name).offset(skip).limit(limit).all()
    
    return products


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new product
    
    **Permissions:** Admin or Marketing User
    
    **Request Body:**
    ```json
    {
      "product_code": "DATES-001",
      "product_name": "Premium Medjool Dates",
      "product_name_ar": "تمر مجهول فاخر",
      "category": "Food & Beverages",
      "category_ar": "مأكولات ومشروبات",
      "brand": "Local Farms",
      "unit_price": 25.00
    }
    ```
    """
    # Check permission
    if current_user.role not in ['admin', 'marketing_user']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Marketing Users can create products"
        )
    
    from app.models.campaign import Product
    
    # Check if product_code already exists
    if product_data.product_code:
        existing = db.query(Product).filter(
            Product.product_code == product_data.product_code
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product code '{product_data.product_code}' already exists"
            )
    
    # Create product
    product = Product(
        **product_data.model_dump(),
        created_by=current_user.user_id,
        updated_by=current_user.user_id
    )
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    return product


# ============================================
# Helper Functions
# ============================================

def _build_campaign_detail_response(campaign) -> CampaignDetailResponse:
    """
    Convert Campaign model to response schema
    
    Why separate function? Reusable, handles all nested data
    """
    # Build products list with details
    products_info = []
    for cp in campaign.products:
        product_info = {
            "product_id": cp.product.product_id,
            "product_code": cp.product.product_code,
            "product_name": cp.product.product_name,
            "product_name_ar": cp.product.product_name_ar,
            "category": cp.product.category,
            "target_quantity": cp.target_quantity,
            "discount_percentage": cp.discount_percentage
        }
        products_info.append(product_info)
    
    # Build channels list
    channels_info = [
        {
            "channel_name": ch.channel_name,
            "budget_allocated": ch.budget_allocated
        }
        for ch in campaign.channels
    ]
    
    # Build response
    response_data = {
        "campaign_id": campaign.campaign_id,
        "campaign_name": campaign.campaign_name,
        "description": campaign.description,
        "start_date": campaign.start_date,
        "end_date": campaign.end_date,
        "budget": campaign.budget,
        "currency": campaign.currency,
        "target_audience": campaign.target_audience,
        "status": campaign.status,
        "actual_revenue": campaign.actual_revenue,
        "actual_cost": campaign.actual_cost,
        "uplift_percentage": campaign.uplift_percentage,
        "roi": campaign.roi,
        "products": products_info,
        "channels": channels_info,
        "created_by": campaign.created_by,
        "created_at": campaign.created_at,
        "updated_at": campaign.updated_at
    }
    
    return CampaignDetailResponse(**response_data)


# ============================================
# Why This Structure?
# ============================================

# 1. RESTful design:
#    GET /campaigns → List
#    POST /campaigns → Create
#    GET /campaigns/1 → Detail
#    PATCH /campaigns/1 → Update
#    DELETE /campaigns/1 → Delete

# 2. Clear documentation:
#    FastAPI auto-generates docs
#    Docstrings show in Swagger UI
#    Examples help frontend developers

# 3. Permission checks:
#    Every endpoint checks user role
#    Business Owner can view, not modify

# 4. Error handling:
#    HTTPException with clear messages
#    Frontend gets proper error codes

# 5. Type safety:
#    response_model validates responses
#    FastAPI auto-converts to JSON

# 6. Query parameters:
#    Pagination built-in
#    Filters (status, category)
#    Documented with Query()
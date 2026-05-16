# backend/app/api/business_profile.py
"""
File: backend/app/api/business_profile.py
Purpose: Manage the business profile for this AIMOPS instance.

WHY THIS EXISTS:
The AI consultation feature needs to know who it's advising.
The business profile is set once by the admin during onboarding
and updated whenever business details change.

There is always exactly one row in the business_profile table.

ENDPOINTS:
  GET  /api/business-profile  — get current profile (all roles)
  POST /api/business-profile  — create profile on first setup (admin only)
  PUT  /api/business-profile  — update existing profile (admin only)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.business_profile import BusinessProfile
from app.services.consultation_service import invalidate_consultation_cache

router = APIRouter(prefix="/api/business-profile", tags=["Business Profile"])


# ============================================
# HELPER
# ============================================

def require_admin(current_user: User):
    """Raise 403 if user is not admin."""
    if current_user.role.role_name != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Only admins can manage the business profile."
        )


def profile_to_dict(profile: BusinessProfile) -> dict:
    """Serialize profile to dict."""
    return {
        "profile_id": profile.profile_id,
        "business_name": profile.business_name,
        "industry": profile.industry,
        "city": profile.city,
        "created_at": profile.created_at.isoformat() if profile.created_at else None
    }


# ============================================
# ENDPOINT 1: Get Profile
# ============================================

@router.get("")
async def get_business_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the current business profile.
    Readable by all authenticated users.
    Returns 404 if profile has not been set up yet.
    """
    profile = db.query(BusinessProfile).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Business profile not set up yet. Ask your admin to create it."
        )

    return {
        "success": True,
        "profile": profile_to_dict(profile)
    }


# ============================================
# ENDPOINT 2: Create Profile
# ============================================

@router.post("")
async def create_business_profile(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create the business profile on first setup.
    Admin only. Fails if a profile already exists — use PUT to update.

    Body:
    - business_name: str (required)
    - industry:      str (optional) — e.g. retail, food, clothing
    - city:          str (optional) — e.g. Ramallah, Bethlehem
    """
    require_admin(current_user)

    existing = db.query(BusinessProfile).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Business profile already exists. Use PUT to update it."
        )

    business_name = request.get("business_name", "").strip()
    if not business_name:
        raise HTTPException(
            status_code=400,
            detail="business_name is required."
        )

    profile = BusinessProfile(
        business_name=business_name,
        industry=request.get("industry", "").strip() or None,
        city=request.get("city", "").strip() or None
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    invalidate_consultation_cache()

    return {
        "success": True,
        "message": "Business profile created successfully.",
        "profile": profile_to_dict(profile)
    }


# ============================================
# ENDPOINT 3: Update Profile
# ============================================

@router.put("")
async def update_business_profile(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update the existing business profile.
    Admin only. Fails if no profile exists — use POST to create first.

    Body (all fields optional — only provided fields are updated):
    - business_name: str
    - industry:      str
    - city:          str
    """
    require_admin(current_user)

    profile = db.query(BusinessProfile).first()
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="No business profile found. Use POST to create one first."
        )

    # Only update fields that were actually provided
    if "business_name" in request:
        business_name = request["business_name"].strip()
        if not business_name:
            raise HTTPException(
                status_code=400,
                detail="business_name cannot be empty."
            )
        profile.business_name = business_name

    if "industry" in request:
        profile.industry = request["industry"].strip() or None

    if "city" in request:
        profile.city = request["city"].strip() or None

    db.commit()
    db.refresh(profile)
    invalidate_consultation_cache()
    
    return {
        "success": True,
        "message": "Business profile updated successfully.",
        "profile": profile_to_dict(profile)
    }
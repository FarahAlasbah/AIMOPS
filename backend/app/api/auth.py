"""
Authentication API endpoints
File: backend/app/api/auth.py
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse
from app.services.auth_service import authenticate_user, create_user_token
from app.models.user import User
from app.api.dependencies import get_current_user  # ← NEW IMPORT

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login endpoint
    
    Frontend sends:
    {
        "username": "admin",
        "password": "Admin@123"
    }
    
    Backend returns:
    {
        "access_token": "eyJhbGciOiJIUz...",
        "token_type": "bearer",
        "user": {
            "user_id": 1,
            "username": "admin",
            "role": {...},
            "permissions": [...]
        }
    }
    """
    # Authenticate user
    user = authenticate_user(db, credentials.username, credentials.password)
    
    # Create JWT token
    access_token = create_user_token(user)
    
    # Update last login time
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Return token and user info
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user.to_dict(include_permissions=True)
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user)  # ← FIXED: Now uses JWT!
):
    """
    Get current logged-in user info
    
    Requires: Valid JWT token in Authorization header
    
    Frontend usage:
    fetch('/api/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    """
    return UserResponse(
        user_id=current_user.user_id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role={
            "role_name": current_user.role.role_name,
            "display_name": current_user.role.display_name
        },
        is_admin=current_user.is_admin(),
        is_active=current_user.is_active()
    )


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """
    Logout endpoint
    
    Note: JWT tokens are stateless, so logout is handled client-side
    by removing the token from storage. This endpoint just validates
    the token is still valid.
    """
    return {
        "message": "Logged out successfully",
        "username": current_user.username
    }
"""
Authentication dependencies - JWT token verification
File: backend/app/api/dependencies.py
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

# Security scheme for JWT tokens
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user from JWT token
    """
    # Extract token from Authorization header
    token = credentials.credentials
    
    # Decode and verify token
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user_id from "sub" field (JWT standard)
    user_id_str: str = payload.get("sub")  # ← CHANGED: "user_id" → "sub"
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Convert to integer
    try:
        user_id = int(user_id_str)  
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Fetch user from database
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user


def get_current_active_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to require admin role
    
    Usage:
        @router.delete("/users/{user_id}")
        def delete_user(
            user_id: int,
            current_user: User = Depends(get_current_active_admin)
        ):
            # Only admins can access this
            ...
    
    Raises:
        HTTPException 403: If user is not an admin
    """
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return current_user
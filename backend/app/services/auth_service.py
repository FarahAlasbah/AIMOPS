# app/services/auth_service.py
"""
Authentication service - login logic
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.core.security import verify_password, create_access_token
from app.core.config import settings

def authenticate_user(db: Session, username: str, password: str) -> User:
    """
    Authenticate user with username and password
    """
    # Find user
    user = db.query(User).filter(User.username == username.lower()).first()

    # User not found
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    # Check if account is active
    if not user.is_active():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    # ── NEW: Check if account is locked ──
    if user.locked_until and user.locked_until > datetime.utcnow():
        minutes_remaining = int((user.locked_until - datetime.utcnow()).seconds / 60) + 1
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account locked due to too many failed attempts. Try again in {minutes_remaining} minute(s)."
        )

    # Verify password
    if not verify_password(password, user.password_hash):
        user.failed_login_attempts += 1

        if user.failed_login_attempts >= 3:
            user.locked_until = datetime.utcnow() + timedelta(minutes=2)

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    # Success - reset failed attempts and clear any lock
    user.failed_login_attempts = 0
    user.locked_until = None  
    db.commit()

    return user


def create_user_token(user: User) -> str:
    """
    Create JWT token for user
    """
    token_data = {
        "sub": str(user.user_id),
        "username": user.username,
        "role": user.role.role_name if user.role else None
    }

    access_token = create_access_token(
        data=token_data,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return access_token
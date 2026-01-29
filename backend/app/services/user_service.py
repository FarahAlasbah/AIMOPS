"""
User service - business logic for user management
File: backend/app/services/user_service.py

UPDATED: Allows username/email reuse for inactive users
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime

from app.models.user import User
from app.models.role import Role
from app.core.security import hash_password
from app.schemas.user import UserCreate, UserUpdate


def get_all_users(db: Session, include_inactive: bool = False) -> List[User]:
    """
    Get all users with their roles
    
    Args:
        include_inactive: If True, includes inactive users. Default False.
    """
    query = db.query(User)
    
    if not include_inactive:
        query = query.filter(User.status == 'active')
    
    return query.order_by(User.created_at.desc()).all()


def get_user_by_id(db: Session, user_id: int) -> User:
    """Get user by ID"""
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    return user


def get_user_by_username(db: Session, username: str, only_active: bool = True) -> Optional[User]:
    """
    Get user by username
    
    Args:
        username: Username to search for
        only_active: If True, only returns active users. Default True.
    """
    query = db.query(User).filter(User.username == username.lower())
    
    if only_active:
        query = query.filter(User.status == 'active')
    
    return query.first()


def get_user_by_email(db: Session, email: str, only_active: bool = True) -> Optional[User]:
    """
    Get user by email
    
    Args:
        email: Email to search for
        only_active: If True, only returns active users. Default True.
    """
    query = db.query(User).filter(User.email == email.lower())
    
    if only_active:
        query = query.filter(User.status == 'active')
    
    return query.first()


def create_user(db: Session, user_data: UserCreate) -> User:
    """
    Create a new user
    
    Validates:
    - Username is unique among ACTIVE users
    - Email is unique among ACTIVE users
    - Role exists
    
    Note: Allows reusing usernames/emails from inactive users
    """
    # Check if username exists among ACTIVE users only
    existing_user = get_user_by_username(db, user_data.username, only_active=True)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{user_data.username}' is already taken"
        )
    
    # Check if there's an inactive user with this username
    inactive_user = get_user_by_username(db, user_data.username, only_active=False)
    if inactive_user and inactive_user.status != 'active':
        # Inform admin they're reusing a username from deleted user
        print(f"ℹ️  Reusing username '{user_data.username}' from inactive user (ID: {inactive_user.user_id})")
    
    # Check if email exists among ACTIVE users only
    existing_email = get_user_by_email(db, user_data.email, only_active=True)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{user_data.email}' is already registered"
        )
    
    # Check if role exists
    role = db.query(Role).filter(Role.role_id == user_data.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role with ID {user_data.role_id} does not exist"
        )
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Create user
    new_user = User(
        username=user_data.username.lower(),
        email=user_data.email.lower(),
        password_hash=hashed_password,
        full_name=user_data.full_name,
        role_id=user_data.role_id,
        status='active',
        created_at=datetime.utcnow(),
        failed_login_attempts=0
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


def update_user(db: Session, user_id: int, user_data: UserUpdate, current_user: User) -> User:
    """
    Update user information
    
    Validates:
    - User exists
    - Email is unique among ACTIVE users (if changed)
    - Role exists (if changed)
    - Only admins can change roles
    """
    user = get_user_by_id(db, user_id)
    
    # Check email uniqueness among ACTIVE users if changing
    if user_data.email and user_data.email != user.email:
        existing_email = get_user_by_email(db, user_data.email, only_active=True)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{user_data.email}' is already registered"
            )
        user.email = user_data.email.lower()
    
    # Update full name
    if user_data.full_name is not None:
        user.full_name = user_data.full_name
    
    # Update role (only admins can do this)
    if user_data.role_id is not None:
        if not current_user.is_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can change user roles"
            )
        
        role = db.query(Role).filter(Role.role_id == user_data.role_id).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role with ID {user_data.role_id} does not exist"
            )
        user.role_id = user_data.role_id
    
    # Update status (only admins can do this)
    if user_data.status is not None:
        if not current_user.is_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can change user status"
            )
        user.status = user_data.status
    
    db.commit()
    db.refresh(user)
    
    return user


def delete_user(db: Session, user_id: int, current_user: User) -> dict:
    """
    Delete a user (soft delete by setting status to 'inactive')
    
    Prevents:
    - Deleting yourself
    - Deleting the last admin
    
    Note: Username and email can be reused after deletion
    """
    user = get_user_by_id(db, user_id)
    
    # Can't delete yourself
    if user.user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    # Check if this is the last admin
    if user.is_admin():
        admin_count = db.query(User).join(Role).filter(
            Role.role_name == 'admin',
            User.status == 'active'
        ).count()
        
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last admin user"
            )
    
    # Soft delete
    user.status = 'inactive'
    db.commit()
    
    return {
        "message": f"User '{user.username}' has been deactivated",
        "user_id": user.user_id,
        "note": f"Username '{user.username}' and email '{user.email}' can now be reused for new users"
    }


def reactivate_user(db: Session, user_id: int) -> User:
    """
    Reactivate a deactivated user (optional feature)
    
    Use case: User was deleted by mistake
    """
    user = get_user_by_id(db, user_id)
    
    if user.status == 'active':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already active"
        )
    
    # Check if username/email are now taken by another active user
    username_conflict = get_user_by_username(db, user.username, only_active=True)
    if username_conflict and username_conflict.user_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot reactivate: Username '{user.username}' is now used by another user. Please change the username first."
        )
    
    email_conflict = get_user_by_email(db, user.email, only_active=True)
    if email_conflict and email_conflict.user_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot reactivate: Email '{user.email}' is now used by another user. Please change the email first."
        )
    
    user.status = 'active'
    user.failed_login_attempts = 0  # Reset login attempts
    db.commit()
    db.refresh(user)
    
    return user


def get_available_roles(db: Session) -> List[Role]:
    """Get all available roles"""
    return db.query(Role).order_by(Role.role_id).all()


def change_password(
    db: Session,
    user_id: int,
    current_password: str,
    new_password: str
) -> dict:
    """
    Change user's password
    
    Steps:
    1. Verify user exists and is active
    2. Verify current password is correct
    3. Check new password is different from current
    4. Hash new password
    5. Update database
    6. Reset failed login attempts (clean slate)
    
    Args:
        db: Database session
        user_id: User to update
        current_password: Current password for verification
        new_password: New password to set
        
    Returns:
        Success message dict
        
    Raises:
        HTTPException 404: User not found
        HTTPException 400: Current password incorrect or new password same as current
    """
    from app.core.security import verify_password
    
    # Get user
    user = get_user_by_id(db, user_id)
    
    # Check user is active
    if not user.is_active():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot change password for inactive account"
        )
    
    # Verify current password is correct
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Check new password is different from current
    if verify_password(new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    # Hash and update password
    user.password_hash = hash_password(new_password)
    
    # Reset failed login attempts (fresh start)
    user.failed_login_attempts = 0
    user.locked_until = None
    
    # Update timestamp
    user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": "Password changed successfully",
        "user_id": user_id
    }
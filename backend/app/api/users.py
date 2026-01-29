"""
User management API endpoints - WITH REACTIVATION
File: backend/app/api/users.py
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.dependencies import get_current_user, get_current_active_admin
from app.models.user import User
from app.schemas.user import (
    UserCreate, 
    UserUpdate, 
    UserListResponse, 
    UserDetailResponse,
    
)
from app.services.user_service import (
    get_all_users,
    get_user_by_id,
    create_user,
    update_user,
    delete_user,
    reactivate_user,
    get_available_roles
)
from app.schemas.user import UserPasswordUpdate
from app.services.user_service import change_password

router = APIRouter(prefix="/api/users", tags=["User Management"])


@router.get("/roles")
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    """
    Get all available roles (Admin only)
    
    Only admins need to see roles since only they can create users.
    """
    roles = get_available_roles(db)
    return [
        {
            "role_id": role.role_id,
            "role_name": role.role_name,
            "display_name": role.display_name,
            "description": role.description
        }
        for role in roles
    ]


@router.get("", response_model=List[UserListResponse])
def list_users(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    """
    Get all users (Admin only)
    
    Query params:
    - include_inactive: If true, shows inactive users too (default: false)
    
    Returns list of users with basic info
    """
    users = get_all_users(db, include_inactive=include_inactive)
    
    return [
        UserListResponse(
            user_id=user.user_id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            role_name=user.role.display_name,
            status=user.status,
            created_at=user.created_at,
            last_login=user.last_login
        )
        for user in users
    ]


@router.get("/{user_id}", response_model=UserDetailResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed user information
    
    - Admins can view any user
    - Non-admins can only view themselves
    """
    # Non-admins can only view themselves
    if not current_user.is_admin() and user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile"
        )
    
    user = get_user_by_id(db, user_id)
    
    return UserDetailResponse(
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role={
            "role_id": user.role.role_id,
            "role_name": user.role.role_name,
            "display_name": user.role.display_name
        },
        permissions=user.get_permissions(),
        status=user.status,
        is_admin=user.is_admin(),
        is_active=user.is_active(),
        created_at=user.created_at,
        last_login=user.last_login,
        failed_login_attempts=user.failed_login_attempts
    )


@router.post("", response_model=UserDetailResponse, status_code=status.HTTP_201_CREATED)
def create_new_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    """
    Create a new user (Admin only)
    
    Note: Can reuse usernames/emails from inactive users
    
    Request body:
    {
        "username": "john_doe",
        "email": "john@example.com",
        "password": "SecurePass123",
        "full_name": "John Doe",
        "role_id": 3
    }
    """
    user = create_user(db, user_data)
    
    return UserDetailResponse(
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role={
            "role_id": user.role.role_id,
            "role_name": user.role.role_name,
            "display_name": user.role.display_name
        },
        permissions=user.get_permissions(),
        status=user.status,
        is_admin=user.is_admin(),
        is_active=user.is_active(),
        created_at=user.created_at,
        last_login=user.last_login,
        failed_login_attempts=user.failed_login_attempts
    )


@router.patch("/{user_id}", response_model=UserDetailResponse)
def update_user_info(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update user information
    
    - Users can update their own email and full_name
    - Only admins can update role_id and status
    
    Request body (all fields optional):
    {
        "email": "newemail@example.com",
        "full_name": "New Name",
        "role_id": 2,
        "status": "active"
    }
    """
    # Non-admins can only update themselves
    if not current_user.is_admin() and user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile"
        )
    
    user = update_user(db, user_id, user_data, current_user)
    
    return UserDetailResponse(
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role={
            "role_id": user.role.role_id,
            "role_name": user.role.role_name,
            "display_name": user.role.display_name
        },
        permissions=user.get_permissions(),
        status=user.status,
        is_admin=user.is_admin(),
        is_active=user.is_active(),
        created_at=user.created_at,
        last_login=user.last_login,
        failed_login_attempts=user.failed_login_attempts
    )


@router.delete("/{user_id}")
def delete_user_account(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    """
    Delete (deactivate) a user (Admin only)
    
    - Cannot delete yourself
    - Cannot delete the last admin
    - Username and email can be reused after deletion
    """
    return delete_user(db, user_id, current_user)


@router.post("/{user_id}/reactivate", response_model=UserDetailResponse)
def reactivate_user_account(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    """
    Reactivate a deactivated user (Admin only)
    
    Use case: User was deleted by mistake and needs to be restored
    
    Note: Will fail if username/email are now used by another active user
    """
    user = reactivate_user(db, user_id)
    
    return UserDetailResponse(
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role={
            "role_id": user.role.role_id,
            "role_name": user.role.role_name,
            "display_name": user.role.display_name
        },
        permissions=user.get_permissions(),
        status=user.status,
        is_admin=user.is_admin(),
        is_active=user.is_active(),
        created_at=user.created_at,
        last_login=user.last_login,
        failed_login_attempts=user.failed_login_attempts
    )

    
@router.post("/{user_id}/change-password")
def change_user_password(
    user_id: int,
    password_data: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Change user password
    
    **Permissions:**
    - Users can change their own password
    - Admins can change any user's password
    
    **Security:**
    - Requires current password verification
    - New password must be different from current
    - New password must be at least 8 characters
    
    **Request Body:**
    ```json
    {
      "current_password": "OldPassword123",
      "new_password": "NewPassword123"
    }
    ```
    
    **Returns:**
    ```json
    {
      "message": "Password changed successfully",
      "user_id": 1
    }
    ```
    """
    # Users can change their own password
    # Admins can change any user's password
    if not current_user.is_admin() and user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only change your own password"
        )
    
    # Import here to avoid circular imports
    from app.services.user_service import change_password
    
    # Change password
    result = change_password(
        db=db,
        user_id=user_id,
        current_password=password_data.current_password,
        new_password=password_data.new_password
    )
    
    return result

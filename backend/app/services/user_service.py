"""
User service - business logic for user management
File: backend/app/services/user_service.py
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime

from app.models.user import User
from app.models.role import Role
from app.models.audit_log import AuditLog
from app.core.security import hash_password
from app.schemas.user import UserCreate, UserUpdate


# ── Helper: write one audit log entry ──
def _log(
    db: Session,
    action: str,
    performed_by: User,
    target_user: User,
    field_changed: str = None,
    old_value: str = None,
    new_value: str = None,
    note: str = None
):
    """
    Write a single audit log entry.
    Kept as a private helper so every service function
    calls it in one line instead of repeating the ORM code.
    """
    entry = AuditLog(
        performed_by_id=performed_by.user_id,
        target_user_id=target_user.user_id,
        action=action,
        field_changed=field_changed,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        note=note
    )
    db.add(entry)
    # No commit here — caller commits after their main change
    # so both the change and the log are in the same transaction


def get_all_users(db: Session, include_inactive: bool = False) -> List[User]:
    query = db.query(User)
    if not include_inactive:
        query = query.filter(User.status == 'active')
    return query.order_by(User.created_at.desc()).all()


def get_user_by_id(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    return user


def get_user_by_username(db: Session, username: str, only_active: bool = True) -> Optional[User]:
    query = db.query(User).filter(User.username == username.lower())
    if only_active:
        query = query.filter(User.status == 'active')
    return query.first()


def get_user_by_email(db: Session, email: str, only_active: bool = True) -> Optional[User]:
    query = db.query(User).filter(User.email == email.lower())
    if only_active:
        query = query.filter(User.status == 'active')
    return query.first()


def create_user(db: Session, user_data: UserCreate, performed_by: User) -> User:
    # Check username uniqueness
    existing_user = get_user_by_username(db, user_data.username, only_active=True)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{user_data.username}' is already taken"
        )

    # Check email uniqueness
    existing_email = get_user_by_email(db, user_data.email, only_active=True)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{user_data.email}' is already registered"
        )

    # Check role exists
    role = db.query(Role).filter(Role.role_id == user_data.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role with ID {user_data.role_id} does not exist"
        )

    new_user = User(
        username=user_data.username.lower(),
        email=user_data.email.lower(),
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        role_id=user_data.role_id,
        status='active',
        created_at=datetime.utcnow(),
        failed_login_attempts=0
    )

    db.add(new_user)
    db.flush()  # Gets new_user.user_id without committing yet

    _log(
        db, 'user_created', performed_by, new_user,
        note=f"Created user '{new_user.username}' with role '{role.role_name}'"
    )

    db.commit()
    db.refresh(new_user)
    return new_user


def update_user(db: Session, user_id: int, user_data: UserUpdate, current_user: User) -> User:
    user = get_user_by_id(db, user_id)

    # ── Email ──
    if user_data.email and user_data.email != user.email:
        existing_email = get_user_by_email(db, user_data.email, only_active=True)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{user_data.email}' is already registered"
            )
        _log(db, 'user_updated', current_user, user,
             field_changed='email',
             old_value=user.email,
             new_value=user_data.email.lower())
        user.email = user_data.email.lower()

    # ── Full name ──
    if user_data.full_name is not None and user_data.full_name != user.full_name:
        _log(db, 'user_updated', current_user, user,
             field_changed='full_name',
             old_value=user.full_name,
             new_value=user_data.full_name)
        user.full_name = user_data.full_name

    # ── Role ──
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
        if user_data.role_id != user.role_id:
            _log(db, 'user_updated', current_user, user,
                 field_changed='role',
                 old_value=user.role.role_name,
                 new_value=role.role_name)
            user.role_id = user_data.role_id

    # ── Status ──
    if user_data.status is not None and user_data.status != user.status:
        if not current_user.is_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can change user status"
            )
        _log(db, 'user_updated', current_user, user,
             field_changed='status',
             old_value=user.status,
             new_value=user_data.status)
        user.status = user_data.status

    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int, current_user: User) -> dict:
    user = get_user_by_id(db, user_id)

    if user.user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )

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

    _log(db, 'user_deleted', current_user, user,
         note=f"Deactivated user '{user.username}'")

    user.status = 'inactive'
    db.commit()

    return {
        "message": f"User '{user.username}' has been deactivated",
        "user_id": user.user_id,
        "note": f"Username '{user.username}' and email '{user.email}' can now be reused"
    }


def reactivate_user(db: Session, user_id: int, performed_by: User) -> User:
    user = get_user_by_id(db, user_id)

    if user.status == 'active':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already active"
        )

    username_conflict = get_user_by_username(db, user.username, only_active=True)
    if username_conflict and username_conflict.user_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot reactivate: Username '{user.username}' is now used by another user."
        )

    email_conflict = get_user_by_email(db, user.email, only_active=True)
    if email_conflict and email_conflict.user_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot reactivate: Email '{user.email}' is now used by another user."
        )

    _log(db, 'user_reactivated', performed_by, user,
         note=f"Reactivated user '{user.username}'")

    user.status = 'active'
    user.failed_login_attempts = 0
    db.commit()
    db.refresh(user)
    return user


def get_available_roles(db: Session) -> List[Role]:
    return db.query(Role).order_by(Role.role_id).all()


def change_password(
    db: Session,
    user_id: int,
    current_password: str,
    new_password: str,
    performed_by: User
) -> dict:
    from app.core.security import verify_password

    user = get_user_by_id(db, user_id)

    if not user.is_active():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot change password for inactive account"
        )

    if not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    if verify_password(new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    user.password_hash = hash_password(new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    user.updated_at = datetime.utcnow()

    _log(db, 'password_changed', performed_by, user,
         note=f"Password changed by user_id={performed_by.user_id}")

    db.commit()

    return {
        "message": "Password changed successfully",
        "user_id": user_id
    }
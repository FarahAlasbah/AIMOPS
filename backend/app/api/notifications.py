"""
File: backend/app/api/notifications.py
Purpose: Notification management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.notification import Notification

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


# ============================================
# ENDPOINT 1: Get User's Notifications
# ============================================

@router.get("")
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get notifications for the current user.
    
    **Query Parameters:**
    - unread_only: Only show unread notifications (default: false)
    - limit: Maximum notifications to return (default: 50, max: 100)
    
    **Use Cases:**
    - Load notification dropdown on page load
    - Show unread count badge
    - Display notification center
    """
    
    # ── Build Query ──
    query = db.query(Notification).filter(
        Notification.user_id == current_user.user_id
    )
    
    # ── Filter by Read Status ──
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    # ── Apply Limit ──
    if limit > 100:
        limit = 100
    
    # ── Sort by Most Recent First ──
    notifications = query.order_by(
        Notification.created_at.desc()
    ).limit(limit).all()
    
    # ── Count Unread ──
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.user_id,
        Notification.is_read == False
    ).count()
    
    # ── Build Response ──
    return {
        "success": True,
        "unread_count": unread_count,
        "total_notifications": len(notifications),
        "notifications": [
            {
                "notification_id": n.notification_id,
                "title": n.title,
                "message": n.message,
                "type": n.notification_type,
                "is_read": n.is_read,
                "related_id": n.related_id,
                "related_type": n.related_type,
                "created_at": n.created_at.isoformat() if n.created_at else None,
                "read_at": n.read_at.isoformat() if n.read_at else None
            }
            for n in notifications
        ]
    }


# ============================================
# ENDPOINT 2: Mark Notification as Read
# ============================================

@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark a single notification as read.
    
    **Use Case:**
    User clicks on a notification → mark it read
    """
    
    # ── Get Notification ──
    notification = db.query(Notification).filter(
        Notification.notification_id == notification_id,
        Notification.user_id == current_user.user_id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=404,
            detail=f"Notification {notification_id} not found"
        )
    
    # ── Mark as Read ──
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.commit()
    
    return {
        "success": True,
        "message": "Notification marked as read",
        "notification_id": notification_id
    }


# ============================================
# ENDPOINT 3: Mark All Notifications as Read
# ============================================

@router.put("/read-all")
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark all user's notifications as read.
    
    **Use Case:**
    User clicks "Mark all as read" button
    """
    
    # ── Update All Unread Notifications ──
    updated_count = db.query(Notification).filter(
        Notification.user_id == current_user.user_id,
        Notification.is_read == False
    ).update(
        {
            "is_read": True,
            "read_at": datetime.utcnow()
        },
        synchronize_session='fetch'
    )
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Marked {updated_count} notifications as read",
        "notifications_updated": updated_count
    }


# ============================================
# ENDPOINT 4: Delete Notification
# ============================================

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a notification.
    
    **Use Case:**
    User dismisses a notification permanently
    """
    
    # ── Get Notification ──
    notification = db.query(Notification).filter(
        Notification.notification_id == notification_id,
        Notification.user_id == current_user.user_id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=404,
            detail=f"Notification {notification_id} not found"
        )
    
    # ── Hard Delete ──
    db.delete(notification)
    db.commit()
    
    return {
        "success": True,
        "message": "Notification deleted",
        "notification_id": notification_id
    }


# ============================================
# ENDPOINT 5: Create Notification (Internal Use)
# ============================================

@router.post("")
async def create_notification(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a notification.
    
    **Permission:** Admin only (for testing and manual notifications)
    
    **Use Case:**
    - Admin sends system-wide announcement
    - Testing notification system
    - Manual event reminders
    """
    
    # ── Permission Check ──
    if current_user.role.role_name != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Only admins can create notifications manually"
        )
    
    # ── Get Request Data ──
    user_id = request.get("user_id")
    title = request.get("title", "").strip()
    message = request.get("message", "").strip()
    notification_type = request.get("type", "system")
    related_id = request.get("related_id")
    related_type = request.get("related_type")
    
    # ── Validate ──
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if not title:
        raise HTTPException(status_code=400, detail="title is required")
    if not message:
        raise HTTPException(status_code=400, detail="message is required")
    
    # ── Validate User Exists ──
    target_user = db.query(User).filter(User.user_id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    # ── Create Notification ──
    new_notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        related_id=related_id,
        related_type=related_type,
        is_read=False
    )
    
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)
    
    return {
        "success": True,
        "message": f"Notification sent to {target_user.username}",
        "notification": {
            "notification_id": new_notification.notification_id,
            "user_id": new_notification.user_id,
            "title": new_notification.title,
            "message": new_notification.message,
            "type": new_notification.notification_type,
            "created_at": new_notification.created_at.isoformat() if new_notification.created_at else None
        }
    }


# ============================================
# ENDPOINT 6: Broadcast Notification
# ============================================

@router.post("/broadcast")
async def broadcast_notification(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send notification to multiple users at once.
    
    **Permission:** Admin only
    
    **Target Options:**
    - "all": All active users
    - "role": Specific role (admin, marketing_user, business_owner)
    - "users": List of specific user IDs
    """
    from app.models.role import Role
    
    # ── Permission Check ──
    if current_user.role.role_name != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Only admins can broadcast notifications"
        )
    
    # ── Get Request Data ──
    title = request.get("title", "").strip()
    message = request.get("message", "").strip()
    notification_type = request.get("type", "system")
    target_type = request.get("target_type")
    target_value = request.get("target_value")
    related_id = request.get("related_id")
    related_type = request.get("related_type")
    
    # ── Validate ──
    if not title:
        raise HTTPException(status_code=400, detail="title is required")
    if not message:
        raise HTTPException(status_code=400, detail="message is required")
    if not target_type:
        raise HTTPException(status_code=400, detail="target_type is required (all/role/users)")
    
    # ── Determine Target Users ──
    target_users = []
    
    if target_type == "all":
        # Send to all active users
        # FIXED: Removed deleted_at check (User model doesn't have it)
        target_users = db.query(User).filter(
            User.status == 'active'
        ).all()
        
    elif target_type == "role":
        # Send to all users with specific role
        if not target_value:
            raise HTTPException(status_code=400, detail="target_value (role_name) is required")
        
        # FIXED: Removed deleted_at check
        target_users = db.query(User).join(Role).filter(
            Role.role_name == target_value,
            User.status == 'active'
        ).all()
        
        if not target_users:
            raise HTTPException(
                status_code=404,
                detail=f"No active users found with role '{target_value}'"
            )
        
    elif target_type == "users":
        # Send to specific user IDs
        if not target_value or not isinstance(target_value, list):
            raise HTTPException(
                status_code=400,
                detail="target_value must be a list of user IDs"
            )
        
        # FIXED: Removed deleted_at check
        target_users = db.query(User).filter(
            User.user_id.in_(target_value),
            User.status == 'active'
        ).all()
        
        if len(target_users) != len(target_value):
            found_ids = {u.user_id for u in target_users}
            missing_ids = [uid for uid in target_value if uid not in found_ids]
            raise HTTPException(
                status_code=404,
                detail=f"Users not found or inactive: {missing_ids}"
            )
    else:
        raise HTTPException(
            status_code=400,
            detail="target_type must be 'all', 'role', or 'users'"
        )
    
    # ── Create Notifications ──
    notifications_created = []
    
    for user in target_users:
        notification = Notification(
            user_id=user.user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            related_id=related_id,
            related_type=related_type,
            is_read=False
        )
        db.add(notification)
        notifications_created.append(user.user_id)
    
    db.commit()
    
    # ── Build Response ──
    return {
        "success": True,
        "message": f"Notification sent to {len(notifications_created)} users",
        "broadcast_type": target_type,
        "target_value": target_value,
        "recipients": [
            {
                "user_id": u.user_id,
                "username": u.username,
                "email": u.email,
                "role": u.role.role_name
            }
            for u in target_users
        ],
        "total_recipients": len(notifications_created)
    }
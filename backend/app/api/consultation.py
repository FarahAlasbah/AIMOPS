# backend/app/api/consultation.py
"""
File: backend/app/api/consultation.py
Purpose: API endpoints for AI business consultation feature.

ENDPOINTS:
  GET    /api/consultation/history              — load chat history on page load
  POST   /api/consultation/chat                 — send a message, get Claude's response
  GET    /api/consultation/summaries            — load all saved summaries
  POST   /api/consultation/summaries            — save a new summary
  DELETE /api/consultation/summaries/{id}       — delete a saved summary

ACCESS:
  All endpoints restricted to marketing_user and admin roles.
  user_id always comes from the verified JWT token — never from the request body.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.consultation_summary import ConsultationSummary
from app.models.consultation_message import ConsultationMessage
from app.services import consultation_service

router = APIRouter(prefix="/api/consultation", tags=["Consultation"])

ALLOWED_ROLES = ['marketing_user', 'admin']


# ============================================
# ROLE CHECK HELPER
# ============================================

def require_consultation_access(current_user: User):
    """
    Raise 403 if user role is not allowed.
    Called at the top of every endpoint.
    """
    if current_user.role.role_name not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Access restricted to marketing users and admins."
        )


# ============================================
# ENDPOINT 1: Load Chat History
# ============================================

@router.get("/history")
async def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Return recent chat history for this user.
    Called on page load so the frontend can render existing conversation.
    Returns last 50 messages in chronological order.
    """
    require_consultation_access(current_user)

    messages = consultation_service.get_history(
        db=db,
        user_id=current_user.user_id
    )

    return {
        "success": True,
        "messages": messages,
        "count": len(messages)
    }


# ============================================
# ENDPOINT 2: Send a Message
# ============================================

@router.post("/chat")
async def chat(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send a user message and get Claude's response.

    Body:
    - message: str (required) — the user's question or request

    Returns Claude's response text.
    The service handles saving both the user message and
    Claude's response to the DB automatically.
    """
    require_consultation_access(current_user)

    message = request.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if len(message) > 2000:
        raise HTTPException(
            status_code=400,
            detail="Message too long. Keep it under 2000 characters."
        )

    try:
        response = await consultation_service.chat(
            db=db,
            user_id=current_user.user_id,
            user_message=message
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Consultation service unavailable: {str(e)}"
        )

    return {
        "success": True,
        "response": response
    }


# ============================================
# ENDPOINT 3: Load Saved Summaries
# ============================================

@router.get("/summaries")
async def get_summaries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Return all saved summaries for this user, newest first.
    Called on page load alongside /history.
    """
    require_consultation_access(current_user)

    summaries = consultation_service.get_summaries(
        db=db,
        user_id=current_user.user_id
    )

    return {
        "success": True,
        "summaries": summaries,
        "count": len(summaries)
    }


# ============================================
# ENDPOINT 4: Save a Summary
# ============================================

@router.post("/summaries")
async def save_summary(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate and save a summary of the current conversation.

    Body:
    - title: str (required) — user-provided name for this summary

    Claude reads the last 20 messages and writes a concise
    business-focused summary. The user names it.
    """
    require_consultation_access(current_user)

    title = request.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title cannot be empty.")

    if len(title) > 200:
        raise HTTPException(
            status_code=400,
            detail="Title too long. Keep it under 200 characters."
        )

    try:
        summary = await consultation_service.generate_summary(
            db=db,
            user_id=current_user.user_id,
            title=title
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Summary generation failed: {str(e)}"
        )

    return {
        "success": True,
        "summary": summary
    }


# ============================================
# ENDPOINT 5: Delete a Summary
# ============================================

@router.delete("/summaries/{summary_id}")
async def delete_summary(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a saved summary.

    Only the owner can delete their own summary —
    we filter by both summary_id and user_id to enforce this.
    A user cannot delete another user's summary even if they
    know the summary_id.
    """
    require_consultation_access(current_user)

    summary = db.query(ConsultationSummary).filter(
        ConsultationSummary.summary_id == summary_id,
        ConsultationSummary.user_id == current_user.user_id
    ).first()

    if not summary:
        raise HTTPException(
            status_code=404,
            detail="Summary not found."
        )

    db.delete(summary)
    db.commit()

    return {
        "success": True,
        "message": f"Summary '{summary.title}' deleted."
    }
    
    
# ============================================
# ENDPOINT 6: Clear Conversation
# ============================================

@router.delete("/history/clear")
async def clear_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Clear the entire conversation thread for this user.
    Summaries are never affected — only messages are deleted.

    Frontend should prompt the user to save a summary before clearing
    if they want to keep a record of the conversation.
    """
    require_consultation_access(current_user)

    deleted_count = (
        db.query(ConsultationMessage)
        .filter(ConsultationMessage.user_id == current_user.user_id)
        .delete()
    )
    db.commit()

    return {
        "success": True,
        "message": f"Conversation cleared. {deleted_count} messages deleted.",
        "deleted_count": deleted_count,
        "tip": "Your saved summaries are untouched. Start a new conversation anytime."
    }
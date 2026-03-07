"""
File: backend/app/api/data_upload.py
Purpose: API endpoints for uploading and managing sales data files
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import hashlib
from datetime import datetime

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.ingestion_batch import IngestionBatch
from app.models.column_mapping import ColumnMapping
from app.schemas.data_upload import (
    UploadWithAnalysisResponse,
    BatchInfoResponse,
    BatchListResponse,
    ColumnMappingRequest,
    ProcessingResponse,
    MappingConfirmation,
    MappingConfirmationResponse
)

router = APIRouter(prefix="/api/data", tags=["Data Upload"])

UPLOAD_DIR = "uploads/temp"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


# ============================================
# Helper Functions
# ============================================

def ensure_upload_directory_exists():
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

def get_file_type(filename: str) -> str:
    _, ext = os.path.splitext(filename)
    return ext.lstrip('.').lower()

def calculate_file_checksum(file_content: bytes) -> str:
    return hashlib.md5(file_content).hexdigest()


def _auto_save_high_confidence_mappings(
    batch_id: int,
    columns: list,
    current_user_id: int,
    db: Session
) -> None:
    """
    Silently pre-save high-confidence column mappings to the DB.

    WHY THIS EXISTS:
    When the user sees the confirmation screen and clicks "Confirm" without
    changing anything, confirm-mappings needs to know what was already detected.
    Rather than re-running analysis at that point, we pre-save the high-confidence
    results here so they're already in the DB.

    WHY SILENT (not returned to frontend):
    The user still sees ALL columns in the UI — this is just a DB optimization.
    confirm-mappings will overwrite these with whatever the user actually submits,
    so if the user changes something, the correction wins.

    THRESHOLD: confidence >= 0.9
    Only "VALUES CONFIRM NAME" detections qualify — both keyword match AND
    value type match confirmed the role. Anything lower stays unconfirmed
    until the user explicitly submits.
    """
    allowed_roles = {
        'date', 'product_code', 'product_name', 'category', 'quantity',
        'unit_price', 'total_amount', 'discount', 'customer_id',
        'location', 'payment_method', 'other'
    }

    for col in columns:
        role = col.get("role")
        confidence = col.get("confidence", 0.0)
        classification = col.get("classification")

        # Only pre-save high-confidence, actionable roles
        if confidence < 0.9:
            continue
        if role == "unknown" or role not in allowed_roles:
            continue
        if classification == "probably_not_useful":
            continue

        db_mapping = ColumnMapping(
            batch_id=batch_id,
            source_column_name=col["name"],
            source_column_index=col["index"],
            detected_language='english',
            target_field=role,
            confidence_score=confidence,
            is_confirmed=False,         # NOT confirmed yet — user must confirm
            confirmed_by=None,
            confirmed_at=None,
            detected_data_type=None,
            sample_values=None,
            transformation_applied=None
        )
        db.add(db_mapping)

    db.flush()


def _build_columns_for_frontend(columns: list) -> list:
    """
    Format all columns for the frontend confirmation screen.

    WHAT THE FRONTEND RECEIVES:
    Every column from the file, enriched with:
    - confidence_level: "high" / "medium" / "low" — drives UI styling
    - suggested_role: what AIMOPS thinks this column is
    - alternative_roles: dropdown options if user wants to change
    - samples: first 5 values so user can verify visually
    - display_hint: human-readable explanation of our reasoning

    UI BEHAVIOR BASED ON confidence_level:
    - "high"   → pre-selected with green checkmark, user can still change
    - "medium" → pre-selected but highlighted with warning icon
    - "low"    → shown as unassigned, user must pick a role
    - "skip"   → pre-checked as "skip" (probably_not_useful columns)

    This way the user sees EVERYTHING the system did, not just the uncertain
    parts — which builds trust in AIMOPS.
    """
    result = []

    for col in columns:
        classification = col.get("classification")
        role = col.get("role", "unknown")
        confidence = col.get("confidence", 0.0)

        # Columns classified as not useful are pre-set to skip
        if classification == "probably_not_useful":
            result.append({
                "name": col["name"],
                "index": col["index"],
                "suggested_role": "skip",
                "confidence": confidence,
                "confidence_level": "skip",
                "alternative_roles": ["include_anyway"],
                "samples": col.get("samples", []),
                "display_hint": col.get("reason", "This column is likely not needed for analysis"),
                "but_useful_if": col.get("but_useful_if"),
                "completeness": col.get("completeness")
            })
            continue

        # Map confidence to UI level
        if confidence >= 0.9:
            confidence_level = "high"
            display_hint = f"We're confident this is '{role.replace('_', ' ').title()}'"
        elif confidence >= 0.6:
            confidence_level = "medium"
            display_hint = col.get("user_prompt", f"We think this might be '{role.replace('_', ' ').title()}' — please verify")
        else:
            confidence_level = "low"
            display_hint = f"We couldn't determine what this column is — please assign a role"

        result.append({
            "name": col["name"],
            "index": col["index"],
            "suggested_role": role if confidence >= 0.6 else "unknown",
            "confidence": confidence,
            "confidence_level": confidence_level,
            "alternative_roles": col.get("alternative_roles", []),
            "samples": col.get("samples", []),
            "display_hint": display_hint,
            "classification": classification,
            "completeness": col.get("completeness"),
            # Why we included this field (shown for required/beneficial)
            "why": col.get("why") or col.get("benefit")
        })

    return result


# ============================================
# ENDPOINT 1: Upload File
# ============================================

@router.post("/upload-sales", response_model=UploadWithAnalysisResponse)
async def upload_sales_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a sales data file. Returns column analysis immediately.

    WHAT CHANGED FROM OLD VERSION:
    Before: Returned only batch_id. Frontend called /analyze/{batch_id}
            separately. User had to wait for a second round-trip before
            seeing the column mapping screen.

    After:  Analysis runs immediately during upload. Response includes
            ALL detected columns with confidence levels, ready to display
            on the mapping confirmation screen without any extra calls.

    WHAT THE USER SEES AFTER THIS:
    A column mapping screen showing every column in their file with:
    - AIMOPS's best guess for each column's role
    - Confidence level (high/medium/low) shown visually
    - Sample values from their actual data
    - Option to change any assignment before confirming

    The goal: user feels informed, not surprised. They see exactly what
    AIMOPS detected and why, before committing to the import.

    NEXT STEP AFTER THIS:
    Frontend displays the mapping screen → user reviews → submits to
    POST /confirm-mappings/{batch_id}
    """

    # ── Permission Check ──
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Marketing Users can upload files."
        )

    # ── Validate File Type ──
    file_type = get_file_type(file.filename)
    if file_type not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type: .{file_type}. Allowed: .csv, .xlsx, .xls"
        )

    # ── Read & Validate Size ──
    file_content = await file.read()
    file_size_bytes = len(file_content)
    if file_size_bytes > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum: {MAX_FILE_SIZE / (1024*1024):.0f} MB"
        )
    file_size_kb = file_size_bytes // 1024

    # ── Duplicate Detection ──
    file_checksum = calculate_file_checksum(file_content)
    existing_batch = db.query(IngestionBatch).filter(
        IngestionBatch.file_checksum == file_checksum,
        IngestionBatch.deleted_at.is_(None)
    ).first()

    if existing_batch:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "This file has already been uploaded",
                "existing_batch": {
                    "batch_id": existing_batch.batch_id,
                    "file_name": existing_batch.file_name,
                    "uploaded_at": existing_batch.uploaded_at.isoformat(),
                    "status": existing_batch.status
                }
            }
        )

    # ── Save File to Disk ──
    ensure_upload_directory_exists()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(UPLOAD_DIR, f"{timestamp}_{file.filename}")

    with open(file_path, "wb") as f:
        f.write(file_content)

    # ── Create Batch Record ──
    new_batch = IngestionBatch(
        file_name=file.filename,
        file_type=file_type,
        file_size_kb=file_size_kb,
        file_checksum=file_checksum,
        uploaded_by=current_user.user_id,
        status='pending',
        uploaded_at=datetime.utcnow()
    )
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)

    # ── Rename file to include batch_id ──
    better_file_path = os.path.join(UPLOAD_DIR, f"batch_{new_batch.batch_id}_{file.filename}")
    os.rename(file_path, better_file_path)

    # ── Analyze File ──
    from app.services.ingestion_service import analyze_uploaded_file as analyze_file

    try:
        analysis_result = analyze_file(better_file_path, file_type)

        if not analysis_result.get("success"):
            # Analysis failed — batch created, user will need to retry analysis
            new_batch.status = 'mapping'
            db.commit()
            return UploadWithAnalysisResponse(
                batch_id=new_batch.batch_id,
                file_name=new_batch.file_name,
                file_type=new_batch.file_type,
                file_size_kb=new_batch.file_size_kb,
                status='mapping',
                uploaded_at=new_batch.uploaded_at,
                columns=[],
                required_missing=[],
                sample_data=[],
                file_info={},
                analysis_error=analysis_result.get("error")
            )

        # Pre-save high-confidence mappings silently
        _auto_save_high_confidence_mappings(
            batch_id=new_batch.batch_id,
            columns=analysis_result["columns"],
            current_user_id=current_user.user_id,
            db=db
        )

        # Format ALL columns for the frontend confirmation screen
        columns_for_ui = _build_columns_for_frontend(analysis_result["columns"])

        new_batch.status = 'mapping'
        db.commit()

        return UploadWithAnalysisResponse(
            batch_id=new_batch.batch_id,
            file_name=new_batch.file_name,
            file_type=new_batch.file_type,
            file_size_kb=new_batch.file_size_kb,
            status='mapping',
            uploaded_at=new_batch.uploaded_at,
            columns=columns_for_ui,
            required_missing=analysis_result.get("classified", {}).get("required_missing", []),
            sample_data=analysis_result.get("sample_data", []),
            file_info=analysis_result.get("file_info", {}),
            analysis_error=None
        )

    except Exception as e:
        new_batch.status = 'mapping'
        db.commit()
        return UploadWithAnalysisResponse(
            batch_id=new_batch.batch_id,
            file_name=new_batch.file_name,
            file_type=new_batch.file_type,
            file_size_kb=new_batch.file_size_kb,
            status='mapping',
            uploaded_at=new_batch.uploaded_at,
            columns=[],
            required_missing=[],
            sample_data=[],
            file_info={},
            analysis_error=str(e)
        )


# ============================================
# ENDPOINT 2: List All Uploads
# ============================================

@router.get("/uploads", response_model=List[BatchListResponse])
async def list_uploaded_files(
    status: str = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(IngestionBatch).filter(IngestionBatch.deleted_at.is_(None))

    if status:
        valid_statuses = ['pending', 'mapping', 'processing', 'completed', 'failed']
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        query = query.filter(IngestionBatch.status == status)

    if limit > 100:
        limit = 100

    batches = query.order_by(IngestionBatch.uploaded_at.desc()).limit(limit).offset(offset).all()

    return [
        BatchListResponse(
            batch_id=b.batch_id, file_name=b.file_name, file_type=b.file_type,
            file_size_kb=b.file_size_kb, status=b.status, uploaded_at=b.uploaded_at,
            valid_rows=b.valid_rows or 0, rejected_rows=b.rejected_rows or 0
        )
        for b in batches
    ]


# ============================================
# ENDPOINT 3: Get Single Upload Details
# ============================================

@router.get("/uploads/{batch_id}", response_model=BatchInfoResponse)
async def get_upload_details(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    batch = db.query(IngestionBatch).filter(
        IngestionBatch.batch_id == batch_id,
        IngestionBatch.deleted_at.is_(None)
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail=f"Upload batch {batch_id} not found")

    return BatchInfoResponse(
        batch_id=batch.batch_id, file_name=batch.file_name, file_type=batch.file_type,
        file_size_kb=batch.file_size_kb, uploaded_by=batch.uploaded_by,
        uploaded_at=batch.uploaded_at, status=batch.status,
        total_rows=batch.total_rows or 0, valid_rows=batch.valid_rows or 0,
        rejected_rows=batch.rejected_rows or 0, date_range_start=batch.date_range_start,
        date_range_end=batch.date_range_end, processing_started_at=batch.processing_started_at,
        processing_completed_at=batch.processing_completed_at,
        processing_duration_seconds=batch.processing_duration_seconds,
        error_message=batch.error_message
    )


# ============================================
# ENDPOINT 4: Re-Analyze File (manual retry)
# ============================================

@router.get("/analyze/{batch_id}")
async def analyze_uploaded_file_endpoint(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Re-analyze a file and reset its column mappings.

    WHY THIS STILL EXISTS:
    Normally analysis runs automatically at upload time. This endpoint is
    a fallback for when the upload response contained analysis_error, or
    when the user wants to reset mappings and start the review over.

    It deletes existing mappings, re-runs analysis, pre-saves high-confidence
    ones again, and returns the same columns structure as the upload endpoint.
    """
    from app.services.ingestion_service import analyze_uploaded_file as analyze_file

    batch = db.query(IngestionBatch).filter(
        IngestionBatch.batch_id == batch_id,
        IngestionBatch.deleted_at.is_(None)
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

    if batch.status == 'completed':
        raise HTTPException(status_code=400, detail="Batch already completed. Cannot re-analyze.")

    file_path = os.path.join(UPLOAD_DIR, f"batch_{batch_id}_{batch.file_name}")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server. Please re-upload.")

    # Reset mappings so we start fresh
    db.query(ColumnMapping).filter(ColumnMapping.batch_id == batch_id).delete()

    analysis_result = analyze_file(file_path, batch.file_type)
    if not analysis_result.get("success"):
        raise HTTPException(status_code=400, detail=analysis_result.get("error"))

    _auto_save_high_confidence_mappings(
        batch_id=batch_id,
        columns=analysis_result["columns"],
        current_user_id=current_user.user_id,
        db=db
    )

    columns_for_ui = _build_columns_for_frontend(analysis_result["columns"])

    if batch.status == 'pending':
        batch.status = 'mapping'
    db.commit()

    return {
        "success": True,
        "batch_id": batch_id,
        "columns": columns_for_ui,
        "required_missing": analysis_result.get("classified", {}).get("required_missing", []),
        "sample_data": analysis_result.get("sample_data", []),
        "file_info": analysis_result.get("file_info", {})
    }


# ============================================
# ENDPOINT 5: Delete Upload Batch
# ============================================

@router.delete("/uploads/{batch_id}")
async def delete_upload_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.sales_record import SalesRecord

    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Only Admin and Marketing Users can delete uploads")

    batch = db.query(IngestionBatch).filter(
        IngestionBatch.batch_id == batch_id,
        IngestionBatch.deleted_at.is_(None)
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

    sales_count = db.query(SalesRecord).filter(SalesRecord.batch_id == batch_id).count()
    db.query(SalesRecord).filter(SalesRecord.batch_id == batch_id).delete(synchronize_session='fetch')

    batch.deleted_at = datetime.utcnow()
    batch.status = 'failed'
    db.commit()

    file_path = os.path.join(UPLOAD_DIR, f"batch_{batch_id}_{batch.file_name}")
    file_deleted = False
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            file_deleted = True
        except Exception:
            pass

    return {
        "success": True,
        "message": f"Batch {batch_id} deleted successfully",
        "deleted": {
            "batch_id": batch_id,
            "file_name": batch.file_name,
            "sales_records_deleted": sales_count,
            "file_removed_from_disk": file_deleted
        },
        "note": "Products are kept. Only sales records from this batch were deleted."
    }
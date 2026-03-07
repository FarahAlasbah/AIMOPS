"""
File: backend/app/api/column_mapping.py
Purpose: Column mapping confirmation — merges user input with auto-detected mappings,
         then immediately triggers product extraction.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import os
from datetime import datetime

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.ingestion_batch import IngestionBatch
from app.models.column_mapping import ColumnMapping
from app.schemas.data_upload import MappingConfirmation

router = APIRouter(prefix="/api/data", tags=["Column Mapping"])
UPLOAD_DIR = "uploads/temp"


# ============================================
# ENDPOINT: Confirm Column Mappings
# ============================================

@router.post("/confirm-mappings/{batch_id}")
async def confirm_column_mappings(
    batch_id: int,
    confirmation: MappingConfirmation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save the user's confirmed column mappings, then extract products automatically.

    WHAT CHANGED FROM OLD VERSION:
    Before: Saved mappings, returned next_step. Frontend then had to call
            POST /extract-products/{batch_id} as a separate request.

    After:  Saves mappings AND runs product extraction in the same request.
            Returns extracted products directly so the frontend can show
            the product review screen without an extra round-trip.

    WHAT THIS RECEIVES:
    The full list of ALL columns — including the ones AIMOPS already detected
    with high confidence. The user confirmed everything on the review screen
    (possibly correcting some). We overwrite whatever was pre-saved at upload
    time with the user's final decisions.

    WHY OVERWRITE INSTEAD OF MERGE:
    The user saw everything and submitted. Their submission is the truth.
    We don't try to be clever about which ones changed — we delete all
    existing mappings for this batch and write the confirmed ones fresh.
    This avoids subtle bugs where a pre-saved mapping conflicts with a correction.

    WHAT HAPPENS NEXT (automatic, no extra call needed):
    After saving mappings, this endpoint immediately calls extract_unique_products
    and returns the product list. Frontend shows the product review screen.

    SINGLE PRODUCT FILES:
    If detect_file_type_from_mappings returns "single_product", we skip
    extraction entirely and return a flag telling the frontend to go
    straight to the import step.
    """

    from app.services.ingestion_service import analyze_uploaded_file as analyze_file, detect_file_type_from_mappings
    from app.services.product_extraction_service import extract_unique_products

    # ── Permission Check ──
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Marketing Users can confirm mappings"
        )

    # ── Get Batch ──
    batch = db.query(IngestionBatch).filter(
        IngestionBatch.batch_id == batch_id,
        IngestionBatch.deleted_at.is_(None)
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail=f"Upload batch {batch_id} not found")

    if batch.status == 'completed':
        raise HTTPException(status_code=400, detail="Batch already completed.")

    if batch.status == 'failed':
        raise HTTPException(status_code=400, detail="Batch failed. Please re-upload.")

    # ── Verify File Exists ──
    file_path = os.path.join(UPLOAD_DIR, f"batch_{batch_id}_{batch.file_name}")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server. Please re-upload.")

    # ── Overwrite All Mappings With User's Confirmed Choices ──
    # Delete whatever was pre-saved at upload time.
    # The user reviewed everything — their submission is now the authority.
    db.query(ColumnMapping).filter(ColumnMapping.batch_id == batch_id).delete()

    allowed_roles = {
        'date', 'product_code', 'product_name', 'category', 'quantity',
        'unit_price', 'total_amount', 'discount', 'customer_id',
        'location', 'payment_method', 'other'
    }

    mappings_saved = 0

    # Get original analysis so we can record what the system originally detected
    try:
        analysis = analyze_file(file_path, batch.file_type)
        original_roles = {col['name']: col['role'] for col in analysis.get('columns', [])}
        col_indexes = {col['name']: col['index'] for col in analysis.get('columns', [])}
    except Exception:
        original_roles = {}
        col_indexes = {}

    confirmed_mappings_list = []

    for mapping in confirmation.mappings:
        # User explicitly skipped this column
        if mapping.role == "skip":
            continue

        # Normalize unsupported roles
        role = mapping.role
        if role not in allowed_roles:
            if role in ['channel', 'brand']:
                role = 'other'
            else:
                continue

        original_role = original_roles.get(mapping.original_name, "unknown")
        was_changed = (original_role != role)

        db_mapping = ColumnMapping(
            batch_id=batch_id,
            source_column_name=mapping.original_name,
            source_column_index=col_indexes.get(mapping.original_name, 0),
            detected_language='english',
            target_field=role,
            confidence_score=None,
            is_confirmed=True,
            confirmed_by=current_user.user_id,
            confirmed_at=datetime.utcnow(),
            detected_data_type=None,
            sample_values=None,
            transformation_applied=None
        )
        db.add(db_mapping)
        mappings_saved += 1

        confirmed_mappings_list.append({
            "original_name": mapping.original_name,
            "role": role,
            "was_changed": was_changed
        })

    db.flush()

    # ── Build column_map for downstream use ──
    column_map = {m["role"]: m["original_name"] for m in confirmed_mappings_list}

    # ── Validate product_name mapping exists ──
    if 'product_name' not in column_map:
        raise HTTPException(
            status_code=400,
            detail="No column was mapped to 'product_name'. Product name is required."
        )

    # ── Detect Single vs Multiple Products ──
    mappings_dict = [
        {"original_name": m.original_name, "role": m.role}
        for m in confirmation.mappings
        if m.role != "skip"
    ]

    try:
        file_type_info = detect_file_type_from_mappings(file_path, mappings_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to detect file type: {str(e)}")

    # ── Update Batch Status ──
    batch.status = 'processing'
    db.commit()

    # ── Single Product: Skip Extraction ──
    # File has only one product — no need for the product review screen.
    # Tell frontend to go straight to confirm-products.
    if file_type_info["type"] == "single_product":
        return {
            "success": True,
            "batch_id": batch_id,
            "mappings_saved": mappings_saved,
            "confirmed_mappings": confirmed_mappings_list,
            "flow": "single_product",
            "single_product_info": file_type_info["details"],
            "products": None,   # No extraction needed
            "next_step": "Go directly to confirm-products. Provide the product name in the request."
        }

    # ── Multiple Products: Run Extraction Now ──
    # This used to be a separate /extract-products endpoint call.
    # Now it runs here so the frontend gets products in the same response.
    try:
        extraction_result = extract_unique_products(
            file_path=file_path,
            product_column=column_map['product_name'],
            date_column=column_map.get('date'),
            quantity_column=column_map.get('quantity'),
            total_amount_column=column_map.get('total_amount'),
            category_column=column_map.get('category')
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract products: {str(e)}")

    return {
        "success": True,
        "batch_id": batch_id,
        "mappings_saved": mappings_saved,
        "confirmed_mappings": confirmed_mappings_list,
        "flow": "multiple_products",
        "single_product_info": None,
        # Products ready for user review — same structure as old /extract-products response
        "products": {
            "total_unique_products": extraction_result["total_unique_products"],
            "products": extraction_result["products"],
            "file_info": extraction_result["file_info"]
        },
        "next_step": "User reviews products, then submits to POST /confirm-products/{batch_id}"
    }
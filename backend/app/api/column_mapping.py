"""
File: backend/app/api/column_mapping.py
Purpose: Column mapping confirmation endpoints
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
from app.schemas.data_upload import MappingConfirmation, MappingConfirmationResponse

router = APIRouter(prefix="/api/data", tags=["Column Mapping"])
UPLOAD_DIR = "uploads/temp"

# ============================================
# ENDPOINT: Confirm Column Mappings
# ============================================

@router.post("/confirm-mappings/{batch_id}", response_model=MappingConfirmationResponse)
async def confirm_column_mappings(
    batch_id: int,
    confirmation: MappingConfirmation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save user's column mapping decisions and detect file type
    
    **What this does:**
    1. Saves which column is which (date, product, quantity, etc.)
    2. Detects if file has single or multiple products
    3. Returns next step for frontend (single vs multiple product flow)
    
    **Request body:**
```json
    {
        "mappings": [
            {"original_name": "Sale DT", "role": "date"},
            {"original_name": "Item Description", "role": "product_name"},
            {"original_name": "Qty Sold", "role": "quantity"},
            {"original_name": "Notes", "role": "skip"}
        ]
    }
```
    
    **Columns with role="skip" are not saved (they're ignored)**
    
    **Permissions:** Admin, Marketing User only (Business Owner cannot upload)
    """
    
    # Import models and services
    from app.models.column_mapping import ColumnMapping
    from app.services.ingestion_service import analyze_uploaded_file as analyze_file, detect_file_type_from_mappings
    
    # ============================================
    # Permission Check
    # ============================================
    
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Marketing Users can confirm mappings"
        )
    
    # ============================================
    # Verify Batch Exists and Belongs to User
    # ============================================
    
    batch = db.query(IngestionBatch).filter(
        IngestionBatch.batch_id == batch_id,
        IngestionBatch.deleted_at.is_(None)
    ).first()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Upload batch {batch_id} not found"
        )
    
    # Check if already processed
    if batch.status in ["processing", "completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch already processed (status: {batch.status})"
        )
    
    # ============================================
    # Get Original Detection Results
    # ============================================
    
    file_path = os.path.join(UPLOAD_DIR, f"batch_{batch_id}_{batch.file_name}")
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )
    
    try:
        # Get original analysis (what system detected)
        analysis = analyze_file(file_path, batch.file_type)
        
        original_mappings = {}
        for col in analysis['columns']:
            original_mappings[col['name']] = col['role']
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze file: {str(e)}"
        )
    
    # ============================================
    # Delete Existing Mappings (if any)
    # ============================================
    
    db.query(ColumnMapping).filter(
        ColumnMapping.batch_id == batch_id
    ).delete()
    
    # ============================================
    # Save User's Confirmed Mappings
    # ============================================
    
    # ============================================
    # Save User's Confirmed Mappings
    # ============================================

    from datetime import datetime

    mappings_saved = 0

    for mapping in confirmation.mappings:
        # Skip columns user doesn't want
        if mapping.role == "skip":
            continue
        
        # Validate role is in allowed enum values
        allowed_roles = [
            'date', 'product_code', 'product_name', 'category', 'quantity',
            'unit_price', 'total_amount', 'discount', 'customer_id', 
            'location', 'payment_method', 'other'
        ]
        
        if mapping.role not in allowed_roles:
            # Map unsupported roles to "other" or skip them
            if mapping.role in ['channel', 'brand']:
                mapping.role = 'other'
            else:
                continue
        
        # Get what system originally detected
        original_role = original_mappings.get(mapping.original_name, "other")
        
        # Get column index
        column_index = next(
            (i for i, col in enumerate(analysis['columns']) if col['name'] == mapping.original_name),
            0
        )
        
        # Create mapping record
        db_mapping = ColumnMapping(
            batch_id=batch_id,
            source_column_name=mapping.original_name,
            source_column_index=column_index,
            detected_language='english',
            target_field=mapping.role,
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
    
    try:
        # Convert mappings to dict format
        mappings_dict = [
            {"original_name": m.original_name, "role": m.role}
            for m in confirmation.mappings
        ]
        
        # DEBUG: Print what we're sending
        print(f"DEBUG: File path: {file_path}")
        print(f"DEBUG: Mappings dict: {mappings_dict}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found: {file_path}"
            )
        
        file_type_info = detect_file_type_from_mappings(
            file_path,
            mappings_dict
        )
        
        print(f"DEBUG: File type detected: {file_type_info}")

    except Exception as e:
        import traceback
        print(f"ERROR: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to detect file type: {str(e)}"
        )
        
    # ============================================
    # Detect File Type (Single vs Multiple Products)
    # ============================================
    
    try:
        # Convert mappings to dict format
        mappings_dict = [
            {"original_name": m.original_name, "role": m.role}
            for m in confirmation.mappings
        ]
        
        file_type_info = detect_file_type_from_mappings(
            file_path,
            mappings_dict
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to detect file type: {str(e)}"
        )
    
    # ============================================
    # Update Batch Status
    # ============================================
    
    batch.status = "processing"
    
    # Commit everything
    db.commit()
    
    # ============================================
    # Return Response
    # ============================================
    
    # Build list of confirmed mappings for frontend
    confirmed_mappings_list = []
    for mapping in confirmation.mappings:
        if mapping.role == "skip":
            continue
        
        original_role = original_mappings.get(mapping.original_name, "unknown")
        was_changed = (original_role != mapping.role)
        
        confirmed_mappings_list.append({
            "original_name": mapping.original_name,
            "role": mapping.role,
            "was_changed": was_changed,
            "confidence": None  # Can add if you store it
        })

    return {
        "success": True,
        "batch_id": batch_id,
        "mappings_saved": mappings_saved,
        "confirmed_mappings": confirmed_mappings_list,
        "file_type": file_type_info["type"],
        "next_step": {
            "type": file_type_info["type"],
            "details": file_type_info["details"]
        }
    }
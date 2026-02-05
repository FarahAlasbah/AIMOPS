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
from app.schemas.data_upload import (
    MappingConfirmationResponse,
    UploadInitiateResponse,
    BatchInfoResponse,
    BatchListResponse,
    ColumnMappingRequest,
    ProcessingResponse,
    MappingConfirmation,
    MappingConfirmationResponse
)


# Create router
router = APIRouter(
    prefix="/api/data",
    tags=["Data Upload"]
)


# ============================================
# Configuration
# ============================================

# Where to save uploaded files temporarily
UPLOAD_DIR = "uploads/temp"

# Maximum file size (50 MB in bytes)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


# ============================================
# Helper Functions
# ============================================

def ensure_upload_directory_exists():
    """Create upload directory if it doesn't exist"""
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)


def get_file_type(filename: str) -> str:
    """Extract file type from filename"""
    _, ext = os.path.splitext(filename)
    return ext.lstrip('.').lower()


def calculate_file_checksum(file_content: bytes) -> str:
    """Calculate MD5 checksum of file content"""
    return hashlib.md5(file_content).hexdigest()


# ============================================
# ENDPOINT 1: Upload File
# ============================================

@router.post("/upload-sales", response_model=UploadInitiateResponse)
async def upload_sales_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a sales data file (CSV or Excel)
    
    **Permissions:** Admin, Marketing User only (Business Owner cannot upload)
    
    **Accepted formats:**
    - CSV (.csv)
    - Excel (.xlsx, .xls)
    
    **Max file size:** 50 MB
    """
    
    # ============================================
    # Permission Check
    # ============================================
    
    # Only admin and marketing_user can upload files
    # Business owners can only VIEW data, not upload
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Marketing Users can upload files. Business Owners have view-only access."
        )
    
    # Validate File Type
    file_type = get_file_type(file.filename)
    
    if file_type not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type: .{file_type}. Allowed: .csv, .xlsx, .xls"
        )
    
    # Read File Content
    file_content = await file.read()
    
    # Check file size
    file_size_bytes = len(file_content)
    if file_size_bytes > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.0f} MB"
        )
    
    file_size_kb = file_size_bytes // 1024
    
    # Calculate Checksum (Duplicate Detection)
    file_checksum = calculate_file_checksum(file_content)
    
    # Check if file already uploaded
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
    
    # Save File to Disk
    ensure_upload_directory_exists()
    
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Create Database Record
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
    
    # Rename file with batch_id
    better_filename = f"batch_{new_batch.batch_id}_{file.filename}"
    better_file_path = os.path.join(UPLOAD_DIR, better_filename)
    os.rename(file_path, better_file_path)
    
    # Return Response
    return UploadInitiateResponse(
        batch_id=new_batch.batch_id,
        file_name=new_batch.file_name,
        file_type=new_batch.file_type,
        file_size_kb=new_batch.file_size_kb,
        status=new_batch.status,
        message="File uploaded successfully. Analyzing...",
        uploaded_at=new_batch.uploaded_at
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
    """
    Get list of all uploaded files
    
    **What this returns:**
    - All uploads by all users (visible to everyone)
    - Shows file name, size, status, upload date
    - Sorted by most recent first
    
    **Query Parameters:**
    - `status`: Filter by status (pending, mapping, processing, completed, failed)
    - `limit`: Max results to return (default: 50, max: 100)
    - `offset`: Skip first N results (for pagination)
    
    **Example usage:**
    - `/api/data/uploads` - Get last 50 uploads
    - `/api/data/uploads?status=completed` - Only successful uploads
    - `/api/data/uploads?limit=20&offset=20` - Get results 21-40
    
    **Permissions:** All authenticated users can view uploads
    """
    
    # Build query - exclude soft-deleted batches
    query = db.query(IngestionBatch).filter(
        IngestionBatch.deleted_at.is_(None)
    )
    
    # Filter by status if provided
    if status:
        # Validate status value
        valid_statuses = ['pending', 'mapping', 'processing', 'completed', 'failed']
        if status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        query = query.filter(IngestionBatch.status == status)
    
    # Apply pagination limits
    if limit > 100:
        limit = 100  # Prevent excessive data transfer
    
    # Sort by most recent first
    query = query.order_by(IngestionBatch.uploaded_at.desc())
    
    # Apply limit and offset
    batches = query.limit(limit).offset(offset).all()
    
    # Convert to response schema
    return [
        BatchListResponse(
            batch_id=batch.batch_id,
            file_name=batch.file_name,
            file_type=batch.file_type,
            file_size_kb=batch.file_size_kb,
            status=batch.status,
            uploaded_at=batch.uploaded_at,
            valid_rows=batch.valid_rows or 0,
            rejected_rows=batch.rejected_rows or 0
        )
        for batch in batches
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
    """
    Get detailed information about a specific upload
    
    **What this returns:**
    - Complete details about one upload
    - Includes processing stats, date range, errors
    - More detailed than the list endpoint
    
    **Use cases:**
    - User clicks on upload in list
    - Check processing status
    - View error details if failed
    
    **Permissions:** All authenticated users can view details
    """
    
    # Get batch from database
    batch = db.query(IngestionBatch).filter(
        IngestionBatch.batch_id == batch_id,
        IngestionBatch.deleted_at.is_(None)
    ).first()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Upload batch {batch_id} not found"
        )
    
    # Return detailed info
    return BatchInfoResponse(
        batch_id=batch.batch_id,
        file_name=batch.file_name,
        file_type=batch.file_type,
        file_size_kb=batch.file_size_kb,
        uploaded_by=batch.uploaded_by,
        uploaded_at=batch.uploaded_at,
        status=batch.status,
        total_rows=batch.total_rows or 0,
        valid_rows=batch.valid_rows or 0,
        rejected_rows=batch.rejected_rows or 0,
        date_range_start=batch.date_range_start,
        date_range_end=batch.date_range_end,
        processing_started_at=batch.processing_started_at,
        processing_completed_at=batch.processing_completed_at,
        processing_duration_seconds=batch.processing_duration_seconds,
        error_message=batch.error_message
    )


# ============================================
# ENDPOINT 4: Analyze File
# ============================================

@router.get("/analyze/{batch_id}")
async def analyze_uploaded_file_endpoint(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze uploaded file and return column detection results
    
    **What this does:**
    - Reads the uploaded file
    - Detects column roles (date, product, quantity, etc.)
    - Auto-includes required & beneficial fields
    - Suggests skipping irrelevant fields
    - Returns sample data preview

    """
    
    # Import the analysis function
    from app.services.ingestion_service import analyze_uploaded_file as analyze_file
    
    # Get Batch from Database
    batch = db.query(IngestionBatch).filter(
        IngestionBatch.batch_id == batch_id
    ).first()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Upload batch {batch_id} not found"
        )
    
    # Check Permissions
    # Admin: Can analyze any upload
    # Marketing User: Can analyze any upload (needs data for campaign planning)
    # Business Owner: Can analyze any upload (view access to all data)
    # 
    # Everyone can view analysis - it's operational data needed for their work
    
    # No additional permission check needed - all authenticated users can analyze
    # (Already checked by get_current_user dependency)
    
    # Check if File Exists on Disk
    file_path = os.path.join(UPLOAD_DIR, f"batch_{batch_id}_{batch.file_name}")
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded file not found on server. Please re-upload."
        )
    
    # Analyze File
    try:
        analysis_result = analyze_file(file_path, batch.file_type)
        
        if not analysis_result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=analysis_result.get("error", "Failed to analyze file")
            )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing file: {str(e)}"
        )
    
    # Update Batch Status to 'mapping'
    if batch.status == 'pending':
        batch.status = 'mapping'
        db.commit()
    
    # Return Analysis Results
    return {
        "success": True,
        "batch_id": batch_id,
        "file_name": batch.file_name,
        "uploaded_at": batch.uploaded_at.isoformat() if batch.uploaded_at else None,
        "status": batch.status,
        "file_info": analysis_result["file_info"],
        "columns": analysis_result["columns"],
        "classified": analysis_result["classified"],
        "sample_data": analysis_result["sample_data"]
    }


# ============================================
# ENDPOINT 5: Process/Import File
# ============================================

@router.post("/process/{batch_id}", response_model=ProcessingResponse)
async def process_sales_data(
    batch_id: int,
    mappings: ColumnMappingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process and import sales data into database
    
    **What this does:**
    1. Takes user's confirmed column mappings
    2. Reads and validates the data
    3. Imports into sales_data table
    4. Updates batch statistics
    5. Calculates date range
    
    **Request body example:**
    ```json
    {
        "date_column": "sale_date",
        "product_column": "product_name",
        "quantity_column": "qty",
        "price_column": "unit_price",
        "category_column": "category",
        "skip_columns": ["employee_id", "invoice_num"]
    }
    ```
    
    **Permissions:** Admin, Marketing User only
    """
    
    # Permission Check
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Marketing Users can process files"
        )
    
    # Get Batch
    batch = db.query(IngestionBatch).filter(
        IngestionBatch.batch_id == batch_id,
        IngestionBatch.deleted_at.is_(None)
    ).first()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Upload batch {batch_id} not found"
        )
    
    # Check batch status
    if batch.status not in ['mapping', 'pending']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch cannot be processed. Current status: {batch.status}"
        )
    
    # Check file exists
    file_path = os.path.join(UPLOAD_DIR, f"batch_{batch_id}_{batch.file_name}")
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )
    
    # Update status to processing
    batch.status = 'processing'
    batch.processing_started_at = datetime.utcnow()
    db.commit()
    
    try:
        # Import the processing function
        from app.services.ingestion_service import parse_uploaded_file, extract_date_range
        
        # Parse file
        df = parse_uploaded_file(file_path, batch.file_type)
        
        # Get column mappings from request
        date_col = mappings.date_column
        product_col = mappings.product_column
        quantity_col = mappings.quantity_column
        
        # TODO: Here you would actually import the data into your sales_data table
        # For now, we'll just update the batch statistics
        
        total_rows = len(df)
        valid_rows = len(df.dropna(subset=[date_col, product_col]))
        rejected_rows = total_rows - valid_rows
        
        # Extract date range
        date_info = extract_date_range(df, date_col)
        
        # Update batch
        batch.total_rows = total_rows
        batch.valid_rows = valid_rows
        batch.rejected_rows = rejected_rows
        batch.date_range_start = date_info.get('start_date')
        batch.date_range_end = date_info.get('end_date')
        batch.processing_completed_at = datetime.utcnow()
        batch.status = 'completed'
        
        # Calculate duration
        if batch.processing_started_at:
            duration = (batch.processing_completed_at - batch.processing_started_at).total_seconds()
            batch.processing_duration_seconds = int(duration)
        
        db.commit()
        db.refresh(batch)
        
        return ProcessingResponse(
            success=True,
            message="File processed successfully",
            batch_id=batch.batch_id,
            status=batch.status,
            statistics={
                "total_rows": batch.total_rows,
                "valid_rows": batch.valid_rows,
                "rejected_rows": batch.rejected_rows,
                "success_rate": round((valid_rows / total_rows * 100), 2) if total_rows > 0 else 0
            },
            date_range={
                "start": batch.date_range_start.isoformat() if batch.date_range_start else None,
                "end": batch.date_range_end.isoformat() if batch.date_range_end else None
            },
            processing_time_seconds=batch.processing_duration_seconds
        )
        
    except Exception as e:
        # Mark as failed
        batch.status = 'failed'
        batch.error_message = str(e)
        batch.processing_completed_at = datetime.utcnow()
        
        if batch.processing_started_at:
            duration = (batch.processing_completed_at - batch.processing_started_at).total_seconds()
            batch.processing_duration_seconds = int(duration)
        
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process file: {str(e)}"
        )
        
# ============================================
# ENDPOINT 6: Confirm Column Mappings
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

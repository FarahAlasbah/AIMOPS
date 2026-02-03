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
    UploadInitiateResponse,
    BatchInfoResponse,
    BatchListResponse
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
# ENDPOINT 2: Analyze File
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
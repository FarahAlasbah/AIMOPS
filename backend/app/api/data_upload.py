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
    """
    Create upload directory if it doesn't exist
    
    """
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)


def get_file_type(filename: str) -> str:
    """
    Extract file type from filename
    
    """
    # Get extension with dot: ".xlsx"
    _, ext = os.path.splitext(filename)
    # Remove dot and lowercase: "xlsx"
    return ext.lstrip('.').lower()


def calculate_file_checksum(file_content: bytes) -> str:
    """
    Calculate MD5 checksum of file content

    """
    return hashlib.md5(file_content).hexdigest()


# ============================================
# Upload Endpoint
# ============================================

@router.post("/upload-sales", response_model=UploadInitiateResponse)
async def upload_sales_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a sales data file (CSV or Excel)
    
    **Step 1 of the import process:**
    1. User uploads file → THIS ENDPOINT
    2. User reviews column mappings → (Next endpoint)
    3. User confirms → (Next endpoint)
    4. System imports data → (Background job)
    
    **Permissions:** All authenticated users
    
    **Accepted formats:**
    - CSV (.csv)
    - Excel (.xlsx, .xls)
    
    **Max file size:** 50 MB
    
    **What this endpoint does:**
    1. Validates file type and size
    2. Checks for duplicate (via checksum)
    3. Saves file temporarily
    4. Creates database record
    5. Returns upload info
    
    **Next steps:**
    - File will be analyzed (column detection)
    - User will review mappings
    - User will confirm import
    
    **Example:**
    ```
    POST /api/data/upload-sales
    Content-Type: multipart/form-data
    
    file: sales_2024.xlsx (binary data)
    ```
    """
    
    # ============================================
    # Step 1: Validate File Type
    # ============================================
    
    file_type = get_file_type(file.filename)  # Gets "xlsx", "csv", or "xls"
    
    if file_type not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type: .{file_type}. Allowed: .csv, .xlsx, .xls"
        )
    
    
    # ============================================
    # Step 2: Read File Content
    # ============================================
    
    # Read entire file into memory
    file_content = await file.read()
    
    # Check file size
    file_size_bytes = len(file_content)
    if file_size_bytes > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.0f} MB"
        )
    
    file_size_kb = file_size_bytes // 1024  # Convert to KB
    
    
    # ============================================
    # Step 3: Calculate Checksum (Duplicate Detection)
    # ============================================
    
    file_checksum = calculate_file_checksum(file_content)
    
    # Check if file already uploaded
    existing_batch = db.query(IngestionBatch).filter(
        IngestionBatch.file_checksum == file_checksum,
        IngestionBatch.deleted_at.is_(None)  # Only check non-deleted
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
    
    
    # ============================================
    # Step 4: Save File to Disk
    # ============================================
    
    # Ensure upload directory exists
    ensure_upload_directory_exists()
    
    # Create unique filename: batch_ID_originalname.ext
    # We'll use timestamp for now, will update with batch_id after DB insert
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    # Write file to disk
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    
    # ============================================
    # Step 5: Create Database Record
    # ============================================
    
    # file_type is already in correct format ("xlsx", not ".xlsx")
    new_batch = IngestionBatch(
        file_name=file.filename,
        file_type=file_type,  # Already correct: "xlsx", "csv", or "xls"
        file_size_kb=file_size_kb,
        file_checksum=file_checksum,
        uploaded_by=current_user.user_id,
        status='pending',  # Just uploaded, not analyzed yet
        uploaded_at=datetime.utcnow()
    )
    
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)  # Get the batch_id
    
    # Now update filename with batch_id
    better_filename = f"batch_{new_batch.batch_id}_{file.filename}"
    better_file_path = os.path.join(UPLOAD_DIR, better_filename)
    
    # Rename file
    os.rename(file_path, better_file_path)
    
    # Update database with better path (we'll add file_path column later)
    # For now, we just track the filename
    
    
    # ============================================
    # Step 6: Return Response
    # ============================================
    
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
# Why This Design?
# ============================================

# Q: Why save file to disk (not just database)?
# A: Files can be large (50 MB)
#    Storing in database is inefficient
#    Disk is cheap, designed for files
#    Database is for structured data

# Q: Why unique filename with batch_id?
# A: Two users might upload "sales.xlsx"
#    batch_1_sales.xlsx vs batch_2_sales.xlsx
#    No filename conflicts!

# Q: Why async def?
# A: File upload is I/O operation
#    async allows server to handle other requests while reading file
#    Better performance under load
"""
File: backend/app/api/product_ingestion.py
Purpose: Product extraction and sales import endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import os
from datetime import datetime
import sqlalchemy as sa

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.ingestion_batch import IngestionBatch
from app.models.column_mapping import ColumnMapping
from app.models.campaign import Product
from app.models.sales_record import SalesRecord

router = APIRouter(prefix="/api/data", tags=["Product Ingestion"])
UPLOAD_DIR = "uploads/temp"


# ============================================
# ENDPOINT: Extract Products
# ============================================

@router.post("/extract-products/{batch_id}")
async def extract_products_from_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Extract unique products from uploaded file with smart grouping
    
    **What this does:**
    1. Reads the uploaded file using confirmed column mappings
    2. Extracts unique product names with minimal normalization
    3. Groups exact matches automatically
    4. Detects possible typos (1-2 character differences)
    5. Calculates statistics per product (quantity, revenue, date range)
    6. Returns structured data for user review
    
    
    **Workflow:**
    User uploaded → Confirmed mappings → **YOU ARE HERE** → User reviews products → Confirm & import

    """
    from app.models.column_mapping import ColumnMapping
    from app.services.product_extraction_service import extract_unique_products
    
    # ============================================
    # Permission Check
    # ============================================
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Marketing Users can extract products"
        )
    
    # ============================================
    # Get Batch
    # ============================================
    batch = db.query(IngestionBatch).filter(
        IngestionBatch.batch_id == batch_id,
        IngestionBatch.deleted_at.is_(None)
    ).first()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch {batch_id} not found"
        )
    
    # ============================================
    # Verify Batch Status
    # ============================================
    # Should be in 'processing' status after confirm-mappings
    if batch.status == 'completed':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch already processed. Products already extracted."
        )
    
    if batch.status == 'failed':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch processing failed. Cannot extract products."
        )
    
    # ============================================
    # Get Column Mappings
    # ============================================
    mappings = db.query(ColumnMapping).filter(
        ColumnMapping.batch_id == batch_id
    ).all()
    
    if not mappings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No column mappings found. Please confirm column mappings first using /confirm-mappings endpoint."
        )
    
    # Build mapping dictionary
    column_map = {}
    for mapping in mappings:
        column_map[mapping.target_field] = mapping.source_column_name
    
    # ============================================
    # Validate Required Mappings
    # ============================================
    if 'product_name' not in column_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product name column mapping required for extraction"
        )
    
    # ============================================
    # Get File Path
    # ============================================
    file_path = os.path.join(UPLOAD_DIR, f"batch_{batch_id}_{batch.file_name}")
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server. Please re-upload."
        )
    
    # ============================================
    # Extract Products
    # ============================================
    try:
        extraction_result = extract_unique_products(
            file_path=file_path,
            product_column=column_map['product_name'],
            date_column=column_map.get('date'),
            quantity_column=column_map.get('quantity'),
            total_amount_column=column_map.get('total_amount'),
            category_column=column_map.get('category')
        )
        
        # ============================================
        # Return Response
        # ============================================
        return {
            "success": True,
            "message": f"Extracted {extraction_result['total_unique_products']} unique products",
            "batch_id": batch_id,
            "file_name": batch.file_name,
            "total_unique_products": extraction_result['total_unique_products'],
            "products": extraction_result['products'],
            "file_info": extraction_result['file_info']
        }
        
    except ValueError as e:
        # Handle extraction errors (bad column names, file parsing issues)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract products: {str(e)}"
        )



# ============================================
# ENDPOINT: Confirm Products & Import Sales
# ============================================
@router.post("/confirm-products/{batch_id}")
async def confirm_products_and_import(
    batch_id: int,
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.sales_record import SalesRecord
    from app.models.campaign import Product
    from app.models.column_mapping import ColumnMapping
    import pandas as pd
    from datetime import datetime

    # ── Permission Check ──
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Only Admin and Marketing Users can confirm products")

    # ── Get Batch ──
    batch = db.query(IngestionBatch).filter(
        IngestionBatch.batch_id == batch_id,
        IngestionBatch.deleted_at.is_(None)
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
    if batch.status == 'completed':
        raise HTTPException(status_code=400, detail="Batch already completed.")
    if batch.status == 'failed':
        raise HTTPException(status_code=400, detail="Batch failed. Please re-upload.")

    # ── Get Column Mappings ──
    mappings = db.query(ColumnMapping).filter(ColumnMapping.batch_id == batch_id).all()
    if not mappings:
        raise HTTPException(status_code=400, detail="No column mappings found.")

    column_map = {m.target_field: m.source_column_name for m in mappings}
    if 'product_name' not in column_map:
        raise HTTPException(status_code=400, detail="Product name column mapping is required.")

    # ── Get Confirmed Products ──
    confirmed_products = request.get("confirmed_products", [])
    if not confirmed_products:
        raise HTTPException(status_code=400, detail="No confirmed products provided.")

    # ── Get File ──
    file_path = os.path.join(UPLOAD_DIR, f"batch_{batch_id}_{batch.file_name}")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found. Please re-upload.")

    # ── Read File ──
    try:
        if batch.file_name.endswith('.csv'):
            df = pd.read_csv(file_path, encoding='utf-8')
        else:
            df = pd.read_excel(file_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    # ── Create Products in DB ──
    name_to_product_id = {}
    products_created = 0
    products_reused = 0

    try:
        for confirmed in confirmed_products:
            primary_name = confirmed.get("primary_name", "").strip()
            normalized_name = confirmed.get("normalized_name", "").strip()
            category = confirmed.get("category")
            merge_with = confirmed.get("merge_with", [])

            if not primary_name:
                continue

            existing = db.query(Product).filter(
                Product.normalized_name == normalized_name,
                Product.deleted_at.is_(None)
            ).first()

            if existing:
                product_id = existing.product_id
                products_reused += 1
            else:
                new_product = Product(
                    product_name=primary_name,
                    normalized_name=normalized_name,
                    category=category,
                    is_active=True,
                    created_by=current_user.user_id
                )
                db.add(new_product)
                db.flush()
                product_id = new_product.product_id
                products_created += 1

            # Map all variations to this product_id
            name_to_product_id[primary_name.lower().strip()] = product_id
            name_to_product_id[normalized_name] = product_id
            name_to_product_id[' '.join(primary_name.lower().split())] = product_id

            for merge_name in merge_with:
                name_to_product_id[merge_name.lower().strip()] = product_id
                name_to_product_id[' '.join(merge_name.lower().split())] = product_id

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create products: {str(e)}")

    # ── Vectorized Processing ──
    try:
        product_col = column_map.get('product_name')
        date_col = column_map.get('date')
        quantity_col = column_map.get('quantity')
        unit_price_col = column_map.get('unit_price')
        total_amount_col = column_map.get('total_amount')
        category_col = column_map.get('category')
        channel_col = column_map.get('channel')
        discount_col = column_map.get('discount')
        customer_col = column_map.get('customer_id')
        product_code_col = column_map.get('product_code')

        # Rename columns to standard names
        rename_map = {}
        if product_col: rename_map[product_col] = '_product_name'
        if date_col: rename_map[date_col] = '_sale_date'
        if quantity_col: rename_map[quantity_col] = '_quantity'
        if unit_price_col: rename_map[unit_price_col] = '_unit_price'
        if total_amount_col: rename_map[total_amount_col] = '_total_amount'
        if category_col: rename_map[category_col] = '_category'
        if channel_col: rename_map[channel_col] = '_channel'
        if discount_col: rename_map[discount_col] = '_discount'
        if customer_col: rename_map[customer_col] = '_customer_id'
        if product_code_col: rename_map[product_code_col] = '_product_code'

        df = df.rename(columns=rename_map)
        df['_row_num'] = df.index + 2  # Track original row numbers for error reporting

        # Normalize product names (vectorized)
        df['_lookup_key'] = df['_product_name'].astype(str).str.lower().str.strip()
        df['_lookup_key'] = df['_lookup_key'].str.split().str.join(' ')

        # Map to product IDs (vectorized)
        df['_product_id'] = df['_lookup_key'].map(name_to_product_id)

        # Split known and unknown
        unknown_df = df[df['_product_id'].isna()].copy()
        valid_df = df[df['_product_id'].notna()].copy()

        if not unknown_df.empty:
            # Get all unique unknown names at once
            unknown_names = unknown_df['_lookup_key'].dropna().unique().tolist()
            # e.g. ["premiam dates 500g", "organic coffe 1kg", "تمور فاخره", ...]

            # ONE query to check which ones already exist in DB
            # Instead of 30 queries, this is 1 query
            existing_products = db.query(Product).filter(
                Product.normalized_name.in_(unknown_names),
                Product.deleted_at.is_(None)
            ).all()

            # Map existing ones immediately
            for p in existing_products:
                name_to_product_id[p.normalized_name] = p.product_id

            # Find which ones truly don't exist yet
            already_exists = {p.normalized_name for p in existing_products}
            truly_new = [n for n in unknown_names if n not in already_exists]

            # ONE batch insert for all new products
            # Instead of 30 separate flushes, this is 1 insert
            if truly_new:
                new_products_data = [
                    {
                        "product_name": name.title(),  # "premiam dates 500g" → "Premiam Dates 500g"
                        "normalized_name": name,
                        "is_active": True,
                        "created_by": current_user.user_id
                    }
                    for name in truly_new
                ]
                db.execute(Product.__table__.insert(), new_products_data)
                products_created += len(truly_new)

                # Fetch the newly inserted products to get their IDs
                new_products = db.query(Product).filter(
                    Product.normalized_name.in_(truly_new)
                ).all()

                for p in new_products:
                    name_to_product_id[p.normalized_name] = p.product_id

        # Re-map ALL rows now that name_to_product_id is complete
        df['_product_id'] = df['_lookup_key'].map(name_to_product_id)
        rejected_df = df[df['_product_id'].isna()].copy()
        valid_df = df[df['_product_id'].notna()].copy()

        # Parse dates (vectorized)
        valid_df['_sale_date'] = pd.to_datetime(valid_df['_sale_date'], errors='coerce')
        invalid_date_df = valid_df[valid_df['_sale_date'].isna()].copy()
        valid_df = valid_df[valid_df['_sale_date'].notna()].copy()
        valid_df['_sale_date'] = valid_df['_sale_date'].dt.date

        # Parse quantities (vectorized)
        valid_df['_quantity'] = pd.to_numeric(valid_df['_quantity'], errors='coerce')
        invalid_qty_df = valid_df[valid_df['_quantity'].isna()].copy()
        valid_df = valid_df[valid_df['_quantity'].notna()].copy()

        # Calculate missing totals (vectorized)
        if '_total_amount' in valid_df.columns and '_unit_price' in valid_df.columns:
            mask = valid_df['_total_amount'].isna() & valid_df['_unit_price'].notna()
            valid_df.loc[mask, '_total_amount'] = (
                valid_df.loc[mask, '_unit_price'] * valid_df.loc[mask, '_quantity']
            ).round(2)

        # Build rejected details (max 10 shown)
        rejected_details = []
        for _, row in rejected_df.head(10).iterrows():
            rejected_details.append(
                f"Row {int(row['_row_num'])}: Product '{row['_product_name']}' not in confirmed products list"
            )
        for _, row in invalid_date_df.head(5).iterrows():
            rejected_details.append(f"Row {int(row['_row_num'])}: Invalid date value")
        for _, row in invalid_qty_df.head(5).iterrows():
            rejected_details.append(f"Row {int(row['_row_num'])}: Invalid quantity value")

        valid_rows = len(valid_df)
        rejected_rows = len(rejected_df) + len(invalid_date_df) + len(invalid_qty_df)
        dates = valid_df['_sale_date'].tolist() if valid_rows > 0 else []

        # Build insert data
        def safe_float(val):
            try:
                return float(val) if pd.notna(val) else None
            except:
                return None

        def safe_str(val):
            try:
                return str(val).strip() if pd.notna(val) else None
            except:
                return None

        sales_records_data = [
            {
                "batch_id": batch_id,
                "product_id": int(row['_product_id']),
                "sale_date": row['_sale_date'],
                "quantity": float(row['_quantity']),
                "unit_price": safe_float(row.get('_unit_price')),
                "total_amount": safe_float(row.get('_total_amount')),
                "discount": safe_float(row.get('_discount')),
                "category": safe_str(row.get('_category')),
                "channel": safe_str(row.get('_channel')),
                "customer_id": safe_str(row.get('_customer_id')),
                "product_code": safe_str(row.get('_product_code')),
            }
            for _, row in valid_df.iterrows()
        ]

        # ── Bulk Insert ──
        if sales_records_data:
            db.execute(SalesRecord.__table__.insert(), sales_records_data)

        # ── Update Batch ──
        batch.status = 'completed'
        batch.total_rows = len(df)
        batch.valid_rows = valid_rows
        batch.rejected_rows = rejected_rows
        batch.processing_completed_at = datetime.utcnow()
        batch.processing_duration_seconds = batch.calculate_duration()

        if dates:
            batch.date_range_start = min(dates)
            batch.date_range_end = max(dates)

        db.commit()

    except Exception as e:
        db.rollback()
        batch.status = 'failed'
        batch.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to import: {str(e)}")

    return {
        "success": True,
        "message": f"Successfully imported {valid_rows} sales records",
        "batch_id": batch_id,
        "summary": {
            "total_rows_in_file": len(df),
            "valid_rows_imported": valid_rows,
            "rejected_rows": rejected_rows,
            "products_created": products_created,
            "products_reused": products_reused,
            "date_range_start": min(dates).isoformat() if dates else None,
            "date_range_end": max(dates).isoformat() if dates else None,
        },
        "rejected_details": rejected_details,
        "next_step": "Your data is ready for forecasting and campaign analysis"
    }
    

# ============================================
# ENDPOINT: Delete Products & Import Sales
# ============================================

@router.delete("/confirm-products/{batch_id}")
async def delete_confirmed_products(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete all products and sales records for a batch
    Resets batch status back to 'processing' so you can re-confirm
    
    USE CASE: Testing - undo a confirm-products call
    """
    from app.models.sales_record import SalesRecord
    from app.models.campaign import Product

    # ── Permission Check ──
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Not authorized")

    # ── Get Batch ──
    batch = db.query(IngestionBatch).filter(
        IngestionBatch.batch_id == batch_id,
        IngestionBatch.deleted_at.is_(None)
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

    # ── Delete Sales Records First ──
    # WHY FIRST: sales_records has a foreign key to products
    # If we delete products first → database error (RESTRICT constraint)
    # Like removing a shelf before removing the items on it
    deleted_sales = db.query(SalesRecord).filter(
        SalesRecord.batch_id == batch_id
    ).delete()

    # ── Get Product IDs from this batch ──
    # We need to find which products were created BY this batch
    # and delete only those - not products from other batches
    from app.models.column_mapping import ColumnMapping
    
    # Get product IDs that have sales records ONLY from this batch
    # (no other batch uses them)
    product_ids_in_batch = db.execute(
        sa.text("""
            SELECT DISTINCT product_id 
            FROM sales_records 
            WHERE batch_id = :batch_id
        """),
        {"batch_id": batch_id}
    ).fetchall()

    # Since we already deleted sales records, query products created_by this user
    # that have normalized_name matching what was imported
    # Simplest approach: delete products where created_by = current user
    # and no other sales records reference them
    deleted_products = db.query(Product).filter(
        Product.created_by == current_user.user_id,
        ~Product.product_id.in_(
            db.query(SalesRecord.product_id).distinct()
        )
    ).delete(synchronize_session='fetch')

    # ── Reset Batch Status ──
    # WHY: So user can call confirm-products again
    batch.status = 'processing'
    batch.valid_rows = 0
    batch.rejected_rows = 0
    batch.total_rows = 0
    batch.date_range_start = None
    batch.date_range_end = None
    batch.processing_completed_at = None
    batch.processing_duration_seconds = None
    batch.error_message = None

    db.commit()

    return {
        "success": True,
        "message": f"Deleted {deleted_sales} sales records and {deleted_products} products",
        "batch_id": batch_id,
        "batch_status": "processing",
        "next_step": "You can now call confirm-products again"
    }
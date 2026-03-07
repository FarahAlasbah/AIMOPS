"""
File: backend/app/api/product_ingestion.py
Purpose: Product confirmation and sales import endpoints.

WHAT CHANGED FROM OLD VERSION:
- extract_products_from_batch endpoint REMOVED.
  Product extraction now happens inside confirm-mappings automatically.

- confirm_products_and_import now accepts BackgroundTasks and fires
  campaign detection after import completes.

- DELETE endpoint unchanged (still useful for testing).
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
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
# ENDPOINT: Confirm Products & Import Sales
# ============================================

@router.post("/confirm-products/{batch_id}")
async def confirm_products_and_import(
    batch_id: int,
    request: dict,
    background_tasks: BackgroundTasks,          # NEW: for campaign detection
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save confirmed products, bulk-import sales records, then detect campaigns.

    WHAT CHANGED FROM OLD VERSION:
    The import logic is identical. One addition at the end:
    after db.commit(), we register detect_campaigns_for_batch as a
    BackgroundTask. It runs after the response is returned so the user
    isn't waiting for it.

    BACKGROUND TASK BEHAVIOR:
    FastAPI BackgroundTasks run in the same process after the response
    is sent. The user gets their "Import successful" response immediately.
    Campaign detection runs silently in the background and creates a
    notification when it finishes.

    WHY NOT asyncio / Celery:
    For the competition demo, BackgroundTasks is sufficient and requires
    no extra infrastructure. If AIMOPS scales to large files, Celery
    with Redis would be the upgrade path.
    """
    from app.models.sales_record import SalesRecord
    from app.models.campaign import Product
    from app.models.column_mapping import ColumnMapping
    from app.services.campaign_detection_service import detect_campaigns_for_batch
    import pandas as pd

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

        rename_map = {}
        if product_col:      rename_map[product_col]      = '_product_name'
        if date_col:         rename_map[date_col]          = '_sale_date'
        if quantity_col:     rename_map[quantity_col]      = '_quantity'
        if unit_price_col:   rename_map[unit_price_col]   = '_unit_price'
        if total_amount_col: rename_map[total_amount_col] = '_total_amount'
        if category_col:     rename_map[category_col]     = '_category'
        if channel_col:      rename_map[channel_col]      = '_channel'
        if discount_col:     rename_map[discount_col]     = '_discount'
        if customer_col:     rename_map[customer_col]     = '_customer_id'
        if product_code_col: rename_map[product_code_col] = '_product_code'

        df = df.rename(columns=rename_map)
        df['_row_num'] = df.index + 2

        df['_lookup_key'] = df['_product_name'].astype(str).str.lower().str.strip()
        df['_lookup_key'] = df['_lookup_key'].str.split().str.join(' ')
        df['_product_id'] = df['_lookup_key'].map(name_to_product_id)

        unknown_df = df[df['_product_id'].isna()].copy()
        valid_df = df[df['_product_id'].notna()].copy()

        if not unknown_df.empty:
            unknown_names = unknown_df['_lookup_key'].dropna().unique().tolist()

            existing_products = db.query(Product).filter(
                Product.normalized_name.in_(unknown_names),
                Product.deleted_at.is_(None)
            ).all()

            for p in existing_products:
                name_to_product_id[p.normalized_name] = p.product_id

            already_exists = {p.normalized_name for p in existing_products}
            truly_new = [n for n in unknown_names if n not in already_exists]

            if truly_new:
                new_products_data = [
                    {
                        "product_name": name.title(),
                        "normalized_name": name,
                        "is_active": True,
                        "created_by": current_user.user_id
                    }
                    for name in truly_new
                ]
                db.execute(Product.__table__.insert(), new_products_data)
                products_created += len(truly_new)

                new_products = db.query(Product).filter(
                    Product.normalized_name.in_(truly_new)
                ).all()

                for p in new_products:
                    name_to_product_id[p.normalized_name] = p.product_id

        df['_product_id'] = df['_lookup_key'].map(name_to_product_id)
        rejected_df = df[df['_product_id'].isna()].copy()
        valid_df = df[df['_product_id'].notna()].copy()

        valid_df['_sale_date'] = pd.to_datetime(valid_df['_sale_date'], errors='coerce')
        invalid_date_df = valid_df[valid_df['_sale_date'].isna()].copy()
        valid_df = valid_df[valid_df['_sale_date'].notna()].copy()
        valid_df['_sale_date'] = valid_df['_sale_date'].dt.date

        valid_df['_quantity'] = pd.to_numeric(valid_df['_quantity'], errors='coerce')
        invalid_qty_df = valid_df[valid_df['_quantity'].isna()].copy()
        valid_df = valid_df[valid_df['_quantity'].notna()].copy()

        if '_total_amount' in valid_df.columns and '_unit_price' in valid_df.columns:
            mask = valid_df['_total_amount'].isna() & valid_df['_unit_price'].notna()
            valid_df.loc[mask, '_total_amount'] = (
                valid_df.loc[mask, '_unit_price'] * valid_df.loc[mask, '_quantity']
            ).round(2)

        rejected_details = []
        for _, row in rejected_df.head(10).iterrows():
            rejected_details.append(f"Row {int(row['_row_num'])}: Product '{row['_product_name']}' not in confirmed list")
        for _, row in invalid_date_df.head(5).iterrows():
            rejected_details.append(f"Row {int(row['_row_num'])}: Invalid date value")
        for _, row in invalid_qty_df.head(5).iterrows():
            rejected_details.append(f"Row {int(row['_row_num'])}: Invalid quantity value")

        valid_rows = len(valid_df)
        rejected_rows = len(rejected_df) + len(invalid_date_df) + len(invalid_qty_df)
        dates = valid_df['_sale_date'].tolist() if valid_rows > 0 else []

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

        if sales_records_data:
            db.execute(SalesRecord.__table__.insert(), sales_records_data)

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

        # ── Fire Campaign Detection in Background ──
        # This runs AFTER the response is sent — user isn't waiting for it.
        # detect_campaigns_for_batch will analyze the imported sales records
        # and create a notification when it finds anything.
        background_tasks.add_task(
            detect_campaigns_for_batch,
            batch_id=batch_id,
            uploaded_by=current_user.user_id
        )

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
        "campaign_detection": "Running in background. You'll be notified when complete.",
        "next_step": "Your data is ready for forecasting and campaign analysis"
    }


# ============================================
# ENDPOINT: Delete Products & Sales (testing utility)
# ============================================

@router.delete("/confirm-products/{batch_id}")
async def delete_confirmed_products(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Undo a confirm-products call. Deletes sales records and orphaned products,
    resets batch to 'processing' so you can re-confirm.

    USE CASE: Testing only.
    """
    from app.models.sales_record import SalesRecord
    from app.models.campaign import Product

    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Not authorized")

    batch = db.query(IngestionBatch).filter(
        IngestionBatch.batch_id == batch_id,
        IngestionBatch.deleted_at.is_(None)
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

    deleted_sales = db.query(SalesRecord).filter(
        SalesRecord.batch_id == batch_id
    ).delete()

    deleted_products = db.query(Product).filter(
        Product.created_by == current_user.user_id,
        ~Product.product_id.in_(
            db.query(SalesRecord.product_id).distinct()
        )
    ).delete(synchronize_session='fetch')

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
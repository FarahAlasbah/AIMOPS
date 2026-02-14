"""
File: backend/app/api/products.py
Purpose: Product management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.campaign import Product
from app.models.sales_record import SalesRecord

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("")
async def get_all_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all products with their sales statistics.
    
    Returns each product with:
    - Basic info (name, category, normalized_name)
    - Total sales count
    - Total quantity sold
    - Total revenue
    - Date range of sales
    - Whether it looks like a possible duplicate
    """

    # ── ONE query: join products with sales_records and aggregate ──
    # Think of it like:
    # "Give me all products, and for each one tell me
    #  how many times it was sold, how much quantity, how much revenue"
    results = db.query(
        Product,
        func.count(SalesRecord.record_id).label('total_sales'),
        func.sum(SalesRecord.quantity).label('total_quantity'),
        func.sum(SalesRecord.total_amount).label('total_revenue'),
        func.min(SalesRecord.sale_date).label('first_sale'),
        func.max(SalesRecord.sale_date).label('last_sale'),
    ).outerjoin(
        SalesRecord, Product.product_id == SalesRecord.product_id
    ).filter(
        Product.deleted_at.is_(None),
        Product.is_active == True
    ).group_by(
        Product.product_id
    ).order_by(
        func.sum(SalesRecord.total_amount).desc()  # Highest revenue first
    ).all()

    if not results:
        return {
            "success": True,
            "total_products": 0,
            "products": []
        }

    # ── Build response ──
    products_list = []
    all_normalized_names = [r.Product.normalized_name for r in results if r.Product.normalized_name]

    for row in results:
        product = row.Product

        # ── Possible duplicate detection ──
        # Flag products that:
        # 1. Have only 1 sale ever (suspicious - likely a typo)
        # 2. Have a very similar name to another product
        is_suspicious = (
            row.total_sales == 1 and
            row.total_revenue is not None and
            float(row.total_revenue) < 1000  # Low revenue + 1 sale = likely typo
        )

        products_list.append({
            "product_id": product.product_id,
            "product_name": product.product_name,
            "normalized_name": product.normalized_name,
            "category": product.category,
            "is_active": product.is_active,
            "stats": {
                "total_sales": row.total_sales or 0,
                "total_quantity": float(row.total_quantity) if row.total_quantity else 0,
                "total_revenue": float(row.total_revenue) if row.total_revenue else 0,
                "first_sale": row.first_sale.isoformat() if row.first_sale else None,
                "last_sale": row.last_sale.isoformat() if row.last_sale else None,
            },
            "flags": {
                "is_suspicious": is_suspicious,
                "reason": "Only 1 sale recorded - possible typo?" if is_suspicious else None
            }
        })

    return {
        "success": True,
        "total_products": len(products_list),
        "products": products_list
    }
 

@router.delete("/bulk-delete")
async def bulk_delete_products(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime
    from sqlalchemy import func

    # ── Permission Check ──
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Not authorized")

    product_ids = request.get("product_ids", [])
    force = request.get("force", False)

    if not product_ids:
        raise HTTPException(status_code=400, detail="product_ids is required")

    # ── Get all requested products ──
    products = db.query(Product).filter(
        Product.product_id.in_(product_ids),
        Product.deleted_at.is_(None)
    ).all()

    if not products:
        raise HTTPException(status_code=404, detail="No products found")

    # ── ONE query to get sales counts for ALL products at once ──
    # Instead of looping and querying one by one
    # Result looks like: {241: 1, 242: 1, 243: 0}
    sales_counts = dict(
        db.query(
            SalesRecord.product_id,
            func.count(SalesRecord.record_id)
        ).filter(
            SalesRecord.product_id.in_(product_ids)
        ).group_by(SalesRecord.product_id).all()
    )

    # ── Check if any have sales but force not set ──
    # First call never has force=True
    # If any products have sales, warn the user first
    # User then decides and sends request again with force=True
    products_with_sales = [
        {
            "product_id": p.product_id,
            "product_name": p.product_name,
            "sales_count": sales_counts.get(p.product_id, 0)
        }
        for p in products
        if sales_counts.get(p.product_id, 0) > 0
    ]

    if products_with_sales and not force:
        # Don't delete anything yet
        # Just warn the user and ask them to confirm
        return {
            "success": False,
            "requires_confirmation": True,
            "message": "Some products have sales records. Are you sure you want to delete them?",
            "products_with_sales": products_with_sales,
            "products_without_sales": [
                {
                    "product_id": p.product_id,
                    "product_name": p.product_name
                }
                for p in products
                if sales_counts.get(p.product_id, 0) == 0
            ],
            "hint": "Send the same request again with force: true to confirm deletion"
        }

    # ── If force=True OR no products have sales: delete everything ──
    # Soft delete all of them
    now = datetime.utcnow()
    deleted = []

    for product in products:
        product.deleted_at = now
        product.updated_by = current_user.user_id
        deleted.append({
            "product_id": product.product_id,
            "product_name": product.product_name,
            "had_sales": sales_counts.get(product.product_id, 0) > 0
        })

    # ── Keep sales records ──
    # WHY: The sale happened in real life, we don't erase history
    # Product is hidden from the products list
    # But sales records stay for data integrity and accurate reports
    # Think of it like an employee leaving a company:
    # hide their profile but keep their work history

    db.commit()

    return {
        "success": True,
        "message": f"Successfully deleted {len(deleted)} products",
        "deleted_count": len(deleted),
        "deleted": deleted
    }
    

@router.post("/merge")
async def merge_products(
    request:dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    #permission check
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    primary_product_id = request.get("primary_product_id")
    merge_product_ids = request.get("merge_product_ids", [])
    
    #selct primary product
    if not primary_product_id:
        raise HTTPException(status_code=400, detail="primary_product_id is required")
    
    #select products to merge
    if not merge_product_ids:
        raise HTTPException(status_code=400, detail="merge_product_ids is required")
    
    if primary_product_id in merge_product_ids:
        raise HTTPException(status_code=400, detail="primary_product_id cannot be in merge_product_ids")
    
    #get primary product
    primary_product = db.query(Product).filter(
        Product.product_id == primary_product_id,
        Product.deleted_at.is_(None)
    ).first()
    
    if not primary_product:
        raise HTTPException(status_code=404, detail=f"Primary product {primary_product_id} not found")
    
    #get products to merge
    products_to_merge = db.query(Product).filter(
        Product.product_id.in_(merge_product_ids),
        Product.deleted_at.is_(None)
    ).all()
    
    if len(products_to_merge) != len(merge_product_ids):
        found_ids = {p.product_id for p in products_to_merge}
        missing = [id for id in merge_product_ids if id not in found_ids]
        raise HTTPException(status_code=404, detail=f"Products to merge not found: {missing}")
    
    try:
        # ── Step 1: Move all sales records to primary product ──        
        updated_records = db.query(SalesRecord).filter(
            SalesRecord.product_id.in_(merge_product_ids)
        ).update(
            {"product_id": primary_product_id},
            synchronize_session='fetch'
        )
        
        # ── Step 2: Soft delete the merged products ──
        from datetime import datetime
        for product in products_to_merge:
            product.deleted_at = datetime.utcnow()
            product.updated_by = current_user.user_id
        
        # ── Step 3: Commit everything together ──
        # WHY together: If anything fails, BOTH steps roll back
        db.commit()
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Merge failed: {str(e)}")
    
    from sqlalchemy import func
    
    stats = db.query(
        func.count(SalesRecord.record_id).label('total_sales'),
        func.sum(SalesRecord.quantity).label('total_quantity'),
        func.sum(SalesRecord.total_amount).label('total_revenue'),
        func.min(SalesRecord.sale_date).label('first_sale'),
        func.max(SalesRecord.sale_date).label('last_sale'),
    ).filter(
        SalesRecord.product_id == primary_product_id
    ).first()

    return {
        "success": True,
        "message": f"Successfully merged {len(products_to_merge)} products into '{primary_product.product_name}'",
        "primary_product": {
            "product_id": primary_product.product_id,
            "product_name": primary_product.product_name,
            "normalized_name": primary_product.normalized_name,
            "category": primary_product.category,
            "stats": {
                "total_sales": stats.total_sales or 0,
                "total_quantity": float(stats.total_quantity) if stats.total_quantity else 0,
                "total_revenue": float(stats.total_revenue) if stats.total_revenue else 0,
                "first_sale": stats.first_sale.isoformat() if stats.first_sale else None,
                "last_sale": stats.last_sale.isoformat() if stats.last_sale else None,
            }
        },
        "merged_products": [
            {"product_id": p.product_id, "product_name": p.product_name}
            for p in products_to_merge
        ],
        "sales_records_moved": updated_records
    }
    
    
@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime

    # ── Permission Check ──
    if current_user.role.role_name not in ['admin', 'marketing_user']:
        raise HTTPException(status_code=403, detail="Not authorized")

    # ── Get Product ──
    product = db.query(Product).filter(
        Product.product_id == product_id,
        Product.deleted_at.is_(None)
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

    # ── Check if product has sales records ──
    # WHY: Don't want to delete a product that has real sales data
    # Think of it like: can't delete a customer who has open orders
    from sqlalchemy import func
    sales_count = db.query(func.count(SalesRecord.record_id)).filter(
        SalesRecord.product_id == product_id
    ).scalar()

    if sales_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete product '{product.product_name}' - it has {sales_count} sales records. Merge it into another product instead."
        )

    # ── Soft Delete ──
    # WHY soft delete: keeps audit trail, recoverable if mistake
    product.deleted_at = datetime.utcnow()
    product.updated_by = current_user.user_id
    db.commit()

    return {
        "success": True,
        "message": f"Product '{product.product_name}' deleted successfully",
        "product_id": product_id
    }
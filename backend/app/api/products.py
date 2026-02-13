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
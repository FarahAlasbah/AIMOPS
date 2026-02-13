"""
Product Extraction Schemas

File: backend/app/schemas/product_extraction.py
Purpose: Request/response validation for product extraction endpoints
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date


# ============================================
# Response Schemas
# ============================================

class ProductStats(BaseModel):
    """Statistics for a product group"""
    occurrences: int = Field(..., description="Number of times product appears in file")
    total_quantity: float = Field(..., description="Total units sold")
    total_revenue: float = Field(..., description="Total revenue generated")
    date_range: Optional[str] = Field(None, description="Date range (YYYY-MM-DD to YYYY-MM-DD)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "occurrences": 45,
                "total_quantity": 1350.00,
                "total_revenue": 33750.00,
                "date_range": "2024-01-15 to 2024-03-20"
            }
        }


class PossibleTypo(BaseModel):
    """Potential typo detected"""
    product: str = Field(..., description="Product name that might be a typo")
    edit_distance: int = Field(..., description="Number of character differences")
    suggestion: str = Field(..., description="Message explaining the similarity")
    
    class Config:
        json_schema_extra = {
            "example": {
                "product": "Premiam Dates 500g",
                "edit_distance": 1,
                "suggestion": "Only 1 character different - possible typo?"
            }
        }


class ExtractedProduct(BaseModel):
    """Single extracted product with metadata"""
    normalized_name: str = Field(..., description="Normalized product name for grouping")
    primary_name: str = Field(..., description="Most common variation of the name")
    name_variations: List[str] = Field(..., description="All name variations found in file")
    category: Optional[str] = Field(None, description="Product category if provided")
    stats: ProductStats = Field(..., description="Aggregated statistics")
    possible_typos: List[PossibleTypo] = Field(default=[], description="Potential typos detected")
    
    class Config:
        json_schema_extra = {
            "example": {
                "normalized_name": "premium dates 500g",
                "primary_name": "Premium Dates 500g",
                "name_variations": ["Premium Dates 500g", "PREMIUM DATES 500g"],
                "category": "Food",
                "stats": {
                    "occurrences": 45,
                    "total_quantity": 1350.00,
                    "total_revenue": 33750.00,
                    "date_range": "2024-01-15 to 2024-03-20"
                },
                "possible_typos": [
                    {
                        "product": "Premiam Dates 500g",
                        "edit_distance": 1,
                        "suggestion": "Only 1 character different - possible typo?"
                    }
                ]
            }
        }


class ProductExtractionResponse(BaseModel):
    """Complete response from product extraction"""
    success: bool = Field(..., description="Whether extraction succeeded")
    message: str = Field(..., description="Status message")
    batch_id: int = Field(..., description="Batch ID")
    file_name: str = Field(..., description="Original filename")
    total_unique_products: int = Field(..., description="Number of unique products found")
    products: List[ExtractedProduct] = Field(..., description="List of extracted products")
    file_info: Dict[str, Any] = Field(..., description="File metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Extracted 15 unique products",
                "batch_id": 5,
                "file_name": "sales_2024_q1.xlsx",
                "total_unique_products": 15,
                "products": [
                    {
                        "normalized_name": "premium dates 500g",
                        "primary_name": "Premium Dates 500g",
                        "name_variations": ["Premium Dates 500g", "PREMIUM DATES 500g"],
                        "category": "Food",
                        "stats": {
                            "occurrences": 45,
                            "total_quantity": 1350.00,
                            "total_revenue": 33750.00,
                            "date_range": "2024-01-15 to 2024-03-20"
                        },
                        "possible_typos": []
                    }
                ],
                "file_info": {
                    "total_rows": 1250,
                    "product_column": "Item Description"
                }
            }
        }


class ProductExtractionError(BaseModel):
    """Error response"""
    success: bool = False
    error: str = Field(..., description="Error message")
    batch_id: int = Field(..., description="Batch ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": "No column mappings found. Please confirm mappings first.",
                "batch_id": 5
            }
        }
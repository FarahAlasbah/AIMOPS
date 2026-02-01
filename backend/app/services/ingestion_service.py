"""
File: backend/app/services/ingestion_service.py

Complete sales data ingestion service with smart field classification

What this does:
1. Parse CSV/Excel files
2. Detect column roles (date, product, quantity, etc.)
3. Auto-include beneficial fields (Farah's improvement!)
4. Suggest skipping irrelevant fields
5. Prepare preview for user confirmation
"""
import pandas as pd
import os
from typing import Dict, List, Any, Optional
from datetime import datetime


# ============================================
# Field Classifications
# ============================================

REQUIRED_FIELDS = {
    "date": {
        "name": "Sale Date",
        "keywords": ['date', 'تاريخ', 'datetime', 'timestamp', 'time', 'day', 'يوم'],
        "auto_include": True,
        "can_skip": False,
        "why": "Required for time-series forecasting"
    },
    "product_name": {
        "name": "Product Name",
        "keywords": ['product', 'item', 'منتج', 'اسم', 'name', 'description', 'سلعة'],
        "auto_include": True,
        "can_skip": False,
        "why": "Required to identify what was sold"
    },
    "quantity": {
        "name": "Quantity Sold",
        "keywords": ['quantity', 'qty', 'amount', 'كمية', 'عدد', 'units', 'count'],
        "auto_include": True,
        "can_skip": False,
        "why": "Required for demand forecasting"
    },
    "total_amount": {
        "name": "Total Amount",
        "keywords": ['total', 'amount', 'revenue', 'مبلغ', 'إجمالي', 'قيمة'],
        "auto_include": True,
        "can_skip": True,  # Can calculate from price × quantity
        "why": "Needed for revenue analysis"
    }
}


BENEFICIAL_FIELDS = {
    # AUTO-INCLUDE if detected! (Farah's improvement)
    
    "unit_price": {
        "name": "Unit Price",
        "keywords": ['price', 'unit_price', 'سعر', 'سعر_الوحدة', 'cost'],
        "auto_include": True,
        "benefit": "Can calculate total_amount if missing",
        "impact": "Enables price trend analysis"
    },
    "product_code": {
        "name": "Product Code/SKU",
        "keywords": ['code', 'sku', 'id', 'رمز', 'كود', 'معرف'],
        "auto_include": True,
        "benefit": "Matches products across different uploads",
        "impact": "More accurate product identification"
    },
    "category": {
        "name": "Product Category",
        "keywords": ['category', 'type', 'فئة', 'نوع', 'تصنيف', 'صنف'],
        "auto_include": True,
        "benefit": "Category-level trend analysis",
        "impact": "Better forecasts for new products in same category"
    },
    "customer_id": {
        "name": "Customer ID",
        "keywords": ['customer', 'client', 'عميل', 'زبون', 'customer_id'],
        "auto_include": True,
        "benefit": "Customer segmentation insights",
        "impact": "Identify repeat customers and buying patterns"
    },
    "channel": {
        "name": "Sales Channel",
        "keywords": ['channel', 'store', 'location', 'قناة', 'متجر', 'فرع'],
        "auto_include": True,
        "benefit": "Channel-specific performance tracking",
        "impact": "Know which channels sell which products"
    },
    "brand": {
        "name": "Brand",
        "keywords": ['brand', 'manufacturer', 'علامة', 'ماركة'],
        "auto_include": True,
        "benefit": "Brand performance analysis",
        "impact": "Track which brands perform best"
    },
    "discount": {
        "name": "Discount Amount",
        "keywords": ['discount', 'خصم', 'تخفيض', 'تنزيل'],
        "auto_include": True,
        "benefit": "Discount impact analysis",
        "impact": "Optimize campaign discounts"
    }
}


PROBABLY_NOT_USEFUL = {
    # Suggest skipping, but let user include if they want
    
    "employee_id": {
        "keywords": ['employee', 'staff', 'موظف', 'cashier'],
        "reason": "Employee who processed sale not relevant to demand forecasting",
        "but_useful_if": "Tracking employee performance"
    },
    "invoice_number": {
        "keywords": ['invoice', 'receipt', 'فاتورة', 'ايصال', 'رقم'],
        "reason": "Receipt ID not useful for analysis",
        "but_useful_if": "Auditing or compliance requirements"
    },
    "payment_method": {
        "keywords": ['payment', 'method', 'طريقة', 'دفع', 'cash', 'card'],
        "reason": "Payment type not relevant to demand patterns",
        "but_useful_if": "Analyzing payment preferences"
    },
    "register_number": {
        "keywords": ['register', 'pos', 'terminal', 'صندوق'],
        "reason": "Which POS terminal not relevant to forecasting",
        "but_useful_if": "Store layout analysis"
    },
    "tax_amount": {
        "keywords": ['tax', 'vat', 'ضريبة'],
        "reason": "Tax already included in total_amount",
        "but_useful_if": "Tax reporting"
    }
}


# ============================================
# File Parsing
# ============================================

def parse_uploaded_file(file_path: str, file_type: str) -> pd.DataFrame:
    """
    Read CSV or Excel file into pandas DataFrame
    
    Args:
        file_path: Path to file
        file_type: "csv", "xlsx", or "xls"
        
    Returns:
        pandas DataFrame
    """
    try:
        if file_type == 'csv':
            df = pd.read_csv(file_path, encoding='utf-8', on_bad_lines='skip')
        elif file_type in ['xlsx', 'xls']:
            df = pd.read_excel(file_path, engine='openpyxl' if file_type == 'xlsx' else None)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
        
        if df.empty or len(df.columns) == 0:
            raise ValueError("File is empty or has no columns")
        
        return df
        
    except Exception as e:
        raise ValueError(f"Failed to parse file: {str(e)}")


# ============================================
# Column Role Detection
# ============================================

def detect_column_role(column_name: str, sample_values: List[Any]) -> Dict[str, Any]:
    """
    Detect what a column represents
    
    Args:
        column_name: Column header
        sample_values: First 10 values
        
    Returns:
        Detection result with role, classification, confidence
    """
    col_lower = str(column_name).lower().strip()
    non_null = [v for v in sample_values if pd.notna(v)]
    
    if not non_null:
        return {
            "role": "unknown",
            "classification": "unknown",
            "auto_include": False,
            "confidence": 0.0
        }
    
    # Check REQUIRED fields
    for role, info in REQUIRED_FIELDS.items():
        if any(kw in col_lower for kw in info["keywords"]):
            confidence = _verify_data_matches(role, non_null)
            if confidence > 0.5:
                return {
                    "role": role,
                    "classification": "required",
                    "auto_include": True,
                    "can_skip": info["can_skip"],
                    "confidence": confidence,
                    "why": info["why"]
                }
    
    # Check BENEFICIAL fields
    for role, info in BENEFICIAL_FIELDS.items():
        if any(kw in col_lower for kw in info["keywords"]):
            confidence = _verify_data_matches(role, non_null)
            if confidence > 0.5:
                return {
                    "role": role,
                    "classification": "beneficial",
                    "auto_include": True,  # ✅ Auto-include!
                    "can_skip": True,
                    "confidence": confidence,
                    "benefit": info["benefit"],
                    "impact": info["impact"]
                }
    
    # Check if PROBABLY NOT USEFUL
    for role, info in PROBABLY_NOT_USEFUL.items():
        if any(kw in col_lower for kw in info["keywords"]):
            return {
                "role": role,
                "classification": "probably_not_useful",
                "auto_include": False,  # Don't auto-include
                "can_skip": True,
                "confidence": 0.8,
                "reason": info["reason"],
                "but_useful_if": info["but_useful_if"]
            }
    
    # Unknown
    return {
        "role": "unknown",
        "classification": "unknown",
        "auto_include": False,
        "can_skip": True,
        "confidence": 0.0
    }


def _verify_data_matches(role: str, values: List[Any]) -> float:
    """Verify values match expected type for role"""
    
    if role == "date":
        date_like = sum(1 for v in values if any(s in str(v) for s in ['-', '/', '.']))
        return min(date_like / len(values) + 0.2, 1.0)
    
    elif role in ["product_name", "category", "brand"]:
        text_count = sum(1 for v in values if not str(v).replace('.', '').isdigit())
        unique_ratio = len(set(str(v) for v in values)) / len(values)
        return min((text_count / len(values)) * unique_ratio + 0.2, 1.0)
    
    elif role == "quantity":
        try:
            int_count = sum(1 for v in values if float(v) == int(float(v)))
            return min(int_count / len(values) + 0.1, 1.0)
        except:
            return 0.0
    
    elif role in ["unit_price", "total_amount", "discount"]:
        try:
            float(values[0])
            return 0.9
        except:
            return 0.0
    
    else:
        return 0.7


# ============================================
# Complete File Analysis
# ============================================

def analyze_uploaded_file(file_path: str, file_type: str) -> Dict[str, Any]:
    """
    Complete analysis of uploaded file
    
    Returns everything needed for user preview
    """
    try:
        df = parse_uploaded_file(file_path, file_type)
    except ValueError as e:
        return {"success": False, "error": str(e)}
    
    total_rows = len(df)
    columns_analysis = []
    
    # Analyze each column
    for idx, col_name in enumerate(df.columns):
        col_data = df[col_name]
        samples = col_data.dropna().head(10).tolist()
        
        detection = detect_column_role(col_name, samples)
        
        non_null_count = col_data.notna().sum()
        completeness = (non_null_count / total_rows * 100) if total_rows > 0 else 0
        
        columns_analysis.append({
            "index": idx,
            "name": col_name,
            "role": detection["role"],
            "classification": detection["classification"],
            "auto_include": detection["auto_include"],
            "can_skip": detection.get("can_skip", True),
            "confidence": detection["confidence"],
            "samples": samples[:5],
            "total_values": total_rows,
            "non_null_values": int(non_null_count),
            "completeness": round(completeness, 2),
            "benefit": detection.get("benefit"),
            "why": detection.get("why"),
            "reason": detection.get("reason")
        })
    
    # Extract sample data
    sample_rows = df.head(5).to_dict('records')
    for row in sample_rows:
        for key, value in row.items():
            if pd.isna(value):
                row[key] = None
    
    # Classify columns for UI
    classified = _classify_for_ui(columns_analysis)
    
    return {
        "success": True,
        "file_info": {
            "total_rows": total_rows,
            "total_columns": len(df.columns)
        },
        "columns": columns_analysis,
        "sample_data": sample_rows,
        "classified": classified
    }


def _classify_for_ui(columns: List[Dict]) -> Dict[str, List]:
    """Group columns by classification for UI display"""
    
    result = {
        "auto_included": [],
        "suggested_skip": [],
        "unknown": [],
        "required_missing": []
    }
    
    detected_required = set()
    
    for col in columns:
        classification = col["classification"]
        role = col["role"]
        
        if classification in ["required", "beneficial"] and col["auto_include"]:
            result["auto_included"].append(col)
            if classification == "required":
                detected_required.add(role)
        
        elif classification == "probably_not_useful":
            result["suggested_skip"].append(col)
        
        elif classification == "unknown":
            result["unknown"].append(col)
    
    # Check for missing required fields
    for role in REQUIRED_FIELDS.keys():
        if role not in detected_required and not REQUIRED_FIELDS[role]["can_skip"]:
            result["required_missing"].append({
                "role": role,
                "name": REQUIRED_FIELDS[role]["name"],
                "why": REQUIRED_FIELDS[role]["why"]
            })
    
    return result


# ============================================
# Date Range Extraction
# ============================================

def extract_date_range(df: pd.DataFrame, date_column: str) -> Dict[str, Any]:
    """Extract date range from date column"""
    
    try:
        dates = pd.to_datetime(df[date_column], errors='coerce').dropna()
        
        if len(dates) == 0:
            return {"start_date": None, "end_date": None, "total_days": 0}
        
        start = dates.min()
        end = dates.max()
        days = (end - start).days
        
        return {
            "start_date": start.date().isoformat(),
            "end_date": end.date().isoformat(),
            "total_days": days
        }
    except Exception as e:
        return {"start_date": None, "end_date": None, "total_days": 0, "error": str(e)}
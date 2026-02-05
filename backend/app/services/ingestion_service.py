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
# Column Role Detection (IMPROVED VERSION)
# ============================================

def detect_column_role(column_name: str, sample_values: List[Any]) -> Dict[str, Any]:
    """
    Smart column detection: Name-first, Values-confirm approach
    
    Process:
    1. Check column NAME first (get initial guess)
    2. Analyze VALUES to CONFIRM or CONTRADICT
    3. Return validated result with confidence
    
    This catches mislabeled columns and works with unclear names!
    
    Example 1 - Perfect match:
        Column: "الكمية"
        Name suggests: quantity (70%)
        Values: [50, 30, 100] → integers ✓
        Result: quantity (95% confidence) ✅
    
    Example 2 - Name lies:
        Column: "الكمية" (says quantity)
        Name suggests: quantity (70%)
        Values: ["2024-01-15"] → dates! ❌
        Result: date (65%) + WARNING ⚠️
    
    Example 3 - Unclear name:
        Column: "الفئة" (category with ال prefix)
        Name suggests: category (70%)
        Values: ["مأكولات", "مشروبات"] → low variety text ✓
        Result: category (95%) ✅
    """
    
    col_lower = str(column_name).lower().strip()
    non_null = [v for v in sample_values if pd.notna(v)]
    
    if not non_null:
        return {
            "role": "unknown",
            "classification": "unknown",
            "auto_include": False,
            "can_skip": True,
            "confidence": 0.0
        }
    
    
    # ====================
    # STEP 1: Check NAME
    # ====================
    
    name_suggestion = _check_name_keywords(col_lower)
    suggested_role = name_suggestion["role"]
    name_confidence = name_suggestion["confidence"]
    
    
    # ====================
    # STEP 2: Analyze VALUES
    # ====================
    
    value_analysis = _analyze_values(non_null)
    
    
    # ====================
    # STEP 3: VALIDATE
    # ====================
    
    if suggested_role != "unknown":
        # We have name-based guess - validate with values
        validation = _validate_role_with_values(suggested_role, value_analysis)
        
        if validation["matches"]:
            # VALUES CONFIRM NAME! ✅
            final_confidence = min(name_confidence + 0.25, 1.0)
            return _build_result(suggested_role, final_confidence)
        
        else:
            # VALUES CONTRADICT NAME! ⚠️
            actual_role = validation["actual_role"]
            return _build_result(actual_role, 0.65)
    
    else:
        # Name unclear - use values only
        detected = _detect_from_values(value_analysis)
        return _build_result(detected["role"], detected["confidence"])


# ====================
# Helper Functions
# ====================

def _check_name_keywords(col_lower: str) -> Dict[str, Any]:
    """Check if column name matches any known keywords"""
    
    # Check all field types
    all_fields = {**REQUIRED_FIELDS, **BENEFICIAL_FIELDS, **PROBABLY_NOT_USEFUL}
    
    for role, info in all_fields.items():
        keywords = info.get("keywords", [])
        for keyword in keywords:
            if keyword in col_lower:
                confidence = 0.8 if role in PROBABLY_NOT_USEFUL else 0.7
                return {"role": role, "confidence": confidence}
    
    return {"role": "unknown", "confidence": 0.0}


def _analyze_values(values: List[Any]) -> Dict[str, Any]:
    """Analyze column values to understand data type and patterns"""
    
    total = len(values)
    unique = len(set(str(v) for v in values))
    variety_ratio = unique / total
    
    analysis = {
        "total": total,
        "unique": unique,
        "variety": "high" if variety_ratio > 0.7 else "medium" if variety_ratio > 0.3 else "low"
    }
    
    # ============================================
    # IMPORTANT: Check numbers BEFORE dates!
    # ============================================
    
    # Try: Integers?
    try:
        int_count = sum(1 for v in values if float(v) == int(float(v)))
        if int_count / total > 0.8:
            analysis["data_type"] = "integer"
            return analysis
    except:
        pass
    
    # Try: Decimals?
    try:
        # If we can convert to float, it's a number (not a date!)
        float_count = 0
        for v in values:
            try:
                float(v)
                float_count += 1
            except (ValueError, TypeError):
                pass
        
        if float_count / total > 0.5:
            analysis["data_type"] = "decimal"
            return analysis
    except:
        pass
    
    # ============================================
    # NOW check for dates (after ruling out numbers)
    # ============================================
    
    # Try: Dates?
    # If we got here, values are NOT pure numbers
    # Now we can safely check for date separators
    date_like = 0
    for v in values:
        v_str = str(v).strip()
        
        # Check for date separators
        has_separator = any(sep in v_str for sep in ['-', '/', '.'])
        
        if has_separator:
            # Count separators (dates have at least 2: YYYY-MM-DD)
            separator_count = v_str.count('-') + v_str.count('/') + v_str.count('.')
            
            # Dates have at least 2 separators
            if separator_count >= 2:
                # Additional check: dates have multiple parts when split
                parts = v_str.replace('-', '/').replace('.', '/').split('/')
                # Should have 3 parts (year, month, day) or at least 2
                if len(parts) >= 2:
                    date_like += 1
    
    if date_like / total > 0.7:
        analysis["data_type"] = "date"
        return analysis
    
    # Default: Text
    analysis["data_type"] = "text"
    return analysis


def _validate_role_with_values(suggested_role: str, value_analysis: Dict) -> Dict[str, Any]:
    """Check if values match what we expect for this role"""
    
    data_type = value_analysis["data_type"]
    variety = value_analysis.get("variety", "medium")
    
    # Expected patterns for each role
    expectations = {
        "date": {"types": ["date"]},
        "product_name": {"types": ["text"]},
        "quantity": {"types": ["integer"]},
        "unit_price": {"types": ["decimal", "integer"]},
        "total_amount": {"types": ["decimal", "integer"]},
        "category": {"types": ["text"], "variety_check": "low"},
        "brand": {"types": ["text"], "variety_check": "low"},
        "channel": {"types": ["text"], "variety_check": "low"},
        "customer_id": {"types": ["text", "integer"]},
        "product_code": {"types": ["text", "integer"]},
        "employee_id": {"types": ["integer", "text"]},
    }
    
    if suggested_role not in expectations:
        return {"matches": True}
    
    expected = expectations[suggested_role]
    
    # Check data type
    if data_type not in expected["types"]:
        # MISMATCH! Detect actual role from values
        actual_role = _detect_from_data_type(data_type, variety)
        return {"matches": False, "actual_role": actual_role}
    
    # Check variety if specified
    if "variety_check" in expected:
        if variety != expected["variety_check"]:
            # Variety mismatch for category/brand/channel
            # If text but high variety, probably product_name
            if variety == "high":
                return {"matches": False, "actual_role": "product_name"}
    
    return {"matches": True}


def _detect_from_data_type(data_type: str, variety: str) -> str:
    """Detect role based purely on data type and variety"""
    
    if data_type == "date":
        return "date"
    elif data_type == "integer" and variety in ["high", "medium"]:
        return "quantity"
    elif data_type == "integer" and variety == "low":
        return "employee_id"
    elif data_type == "decimal":
        return "unit_price"
    elif data_type == "text" and variety == "low":
        return "category"
    elif data_type == "text" and variety in ["high", "medium"]:
        return "product_name"
    else:
        return "unknown"


def _detect_from_values(value_analysis: Dict) -> Dict[str, Any]:
    """Detect role when name is unclear - use values only"""
    
    role = _detect_from_data_type(
        value_analysis["data_type"],
        value_analysis.get("variety", "medium")
    )
    
    confidence = 0.6 if role != "unknown" else 0.0
    return {"role": role, "confidence": confidence}


def _build_result(role: str, confidence: float) -> Dict[str, Any]:
    """
    Build the final detection result with verification support
    
    Confidence levels:
    - 90%+: High confidence, auto-include
    - 60-89%: Medium confidence, needs user verification
    - <60%: Low confidence, user must map
    """
    
    # Determine if verification is needed
    verification_needed = confidence < 0.9
    confidence_level = "high" if confidence >= 0.9 else "medium" if confidence >= 0.6 else "low"
    
    # Build base result
    if role in REQUIRED_FIELDS:
        info = REQUIRED_FIELDS[role]
        result = {
            "role": role,
            "classification": "required",
            "auto_include": True if confidence >= 0.6 else False,
            "can_skip": info.get("can_skip", False),
            "confidence": confidence,
            "confidence_level": confidence_level,
            "verification_needed": verification_needed,
            "why": info.get("why")
        }
    
    elif role in BENEFICIAL_FIELDS:
        info = BENEFICIAL_FIELDS[role]
        result = {
            "role": role,
            "classification": "beneficial",
            "auto_include": True if confidence >= 0.6 else False,
            "can_skip": True,
            "confidence": confidence,
            "confidence_level": confidence_level,
            "verification_needed": verification_needed,
            "benefit": info.get("benefit"),
            "impact": info.get("impact")
        }
    
    elif role in PROBABLY_NOT_USEFUL:
        info = PROBABLY_NOT_USEFUL[role]
        result = {
            "role": role,
            "classification": "probably_not_useful",
            "auto_include": False,
            "can_skip": True,
            "confidence": confidence,
            "confidence_level": confidence_level,
            "verification_needed": False,  # Don't need verification for skips
            "reason": info.get("reason"),
            "but_useful_if": info.get("but_useful_if")
        }
    
    else:
        result = {
            "role": "unknown",
            "classification": "unknown",
            "auto_include": False,
            "can_skip": True,
            "confidence": 0.0,
            "confidence_level": "low",
            "verification_needed": True,  # Always need verification for unknown
        }
    
    # Add alternative roles for medium/low confidence
    if verification_needed and role != "unknown":
        result["alternative_roles"] = _get_alternative_roles(role, confidence)
        result["user_prompt"] = _get_user_prompt(role, confidence_level)
    
    return result


def _get_alternative_roles(detected_role: str, confidence: float) -> List[str]:
    """
    Suggest alternative roles for user to choose from
    
    Based on what the detected role is, suggest similar options
    """
    alternatives = []
    
    if detected_role == "category":
        alternatives = ["product_name", "brand", "channel", "skip"]
    
    elif detected_role == "product_name":
        alternatives = ["category", "brand", "description", "skip"]
    
    elif detected_role == "quantity":
        alternatives = ["discount", "unit_price", "skip"]
    
    elif detected_role == "unit_price":
        alternatives = ["total_amount", "discount", "quantity", "skip"]
    
    elif detected_role == "total_amount":
        alternatives = ["unit_price", "discount", "skip"]
    
    elif detected_role == "channel":
        alternatives = ["category", "brand", "skip"]
    
    elif detected_role == "customer_id":
        alternatives = ["product_code", "skip"]
    
    elif detected_role == "product_code":
        alternatives = ["customer_id", "skip"]
    
    elif detected_role in PROBABLY_NOT_USEFUL:
        alternatives = ["skip", "include_anyway"]
    
    else:
        # Generic alternatives for unknown fields
        alternatives = ["product_name", "category", "quantity", "unit_price", "total_amount", "skip"]
    
    return alternatives


def _get_user_prompt(role: str, confidence_level: str) -> str:
    """
    Generate user-friendly prompt for verification
    
    Makes it clear what we think and asks user to confirm
    """
    
    role_names = {
        "date": "Sale Date",
        "product_name": "Product Name",
        "quantity": "Quantity Sold",
        "unit_price": "Unit Price",
        "total_amount": "Total Amount",
        "category": "Product Category",
        "brand": "Product Brand",
        "channel": "Sales Channel",
        "customer_id": "Customer ID",
        "product_code": "Product Code/SKU",
        "discount": "Discount Amount",
        "employee_id": "Employee ID",
        "invoice_number": "Invoice Number",
        "payment_method": "Payment Method",
        "register_number": "POS Terminal",
        "tax_amount": "Tax Amount"
    }
    
    role_display = role_names.get(role, role.replace("_", " ").title())
    
    if confidence_level == "medium":
        return f"We think this is '{role_display}', but we're not completely sure. Please confirm."
    elif confidence_level == "low":
        return f"We detected this as '{role_display}', but confidence is low. Please verify or choose a different mapping."
    else:
        return f"Is this '{role_display}'?"


# ============================================
#  group by confidence
# ============================================

def _classify_for_ui(columns: List[Dict]) -> Dict[str, List]:
    """Group columns by classification AND confidence level for UI display"""
    
    result = {
        "high_confidence": [],      # 90%+ - Auto-include, minimal user interaction
        "needs_verification": [],   # 60-89% - User must verify
        "needs_mapping": [],        # <60% - User must map
        "suggested_skip": [],       # System thinks these are useless
        "required_missing": []      # Required fields not detected
    }
    
    detected_required = set()
    
    for col in columns:
        classification = col["classification"]
        role = col["role"]
        confidence = col.get("confidence", 0.0)
        confidence_level = col.get("confidence_level", "low")
        
        # High confidence columns (90%+)
        if confidence >= 0.9 and classification in ["required", "beneficial"]:
            result["high_confidence"].append(col)
            if classification == "required":
                detected_required.add(role)
        
        # Medium confidence (60-89%) - needs verification
        elif 0.6 <= confidence < 0.9 and classification in ["required", "beneficial"]:
            result["needs_verification"].append(col)
            if classification == "required":
                detected_required.add(role)
        
        # Low confidence (<60%) or unknown - needs mapping
        elif confidence < 0.6 or classification == "unknown":
            result["needs_mapping"].append(col)
        
        # Suggested to skip
        elif classification == "probably_not_useful":
            result["suggested_skip"].append(col)
    
    # Check for missing required fields
    for role in REQUIRED_FIELDS.keys():
        if role not in detected_required and not REQUIRED_FIELDS[role]["can_skip"]:
            result["required_missing"].append({
                "role": role,
                "name": REQUIRED_FIELDS[role]["name"],
                "why": REQUIRED_FIELDS[role]["why"],
                "user_prompt": f"We couldn't find a '{REQUIRED_FIELDS[role]['name']}' column. Please map one."
            })
    
    return result
      
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
            "confidence_level": detection.get("confidence_level"),  
            "verification_needed": detection.get("verification_needed"),  
            "alternative_roles": detection.get("alternative_roles"),  
            "user_prompt": detection.get("user_prompt"),  
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
    

def detect_file_type_from_mappings(file_path: str, mappings: List[Dict]) -> Dict:
    """
    Detect if file is single or multiple products
    based on user's confirmed mappings
    
    Args:
        file_path: Path to uploaded file
        mappings: List of user's confirmed column mappings
        
    Returns:
        {
            "type": "single_product" | "multiple_products",
            "details": {...}
        }
    """
    import pandas as pd
    
    # Check if user mapped a product_name column
    product_mapping = None
    for m in mappings:
        if m.get("role") == "product_name":
            product_mapping = m
            break
    
    if not product_mapping:
        # NO PRODUCT COLUMN = Single product file
        return {
            "type": "single_product",
            "details": {
                "requires_product_name": True,
                "message": "Please provide a name for this product"
            }
        }
    
    # HAS PRODUCT COLUMN = Check how many unique products
    try:
        # Read the file
        df = pd.read_csv(file_path)
        
        # Get product column name
        product_col = product_mapping.get("original_name")
        
        # Check if column exists in dataframe
        if product_col not in df.columns:
            # Column name doesn't match - print debug info
            print(f"DEBUG: Looking for column '{product_col}'")
            print(f"DEBUG: Available columns: {df.columns.tolist()}")
            
            raise ValueError(f"Column '{product_col}' not found in file")
        
        # Count unique products
        unique_products = df[product_col].dropna().nunique()
        
        if unique_products <= 1:
            # Only 1 unique product (or none)
            single_product_name = df[product_col].dropna().iloc[0] if len(df[product_col].dropna()) > 0 else "Unknown"
            return {
                "type": "single_product",
                "details": {
                    "detected_product_name": single_product_name,
                    "requires_confirmation": True,
                    "message": f"File contains one product: {single_product_name}"
                }
            }
        
        else:
            # Multiple products
            return {
                "type": "multiple_products",
                "details": {
                    "unique_products_count": int(unique_products),
                    "requires_extraction": True,
                    "message": f"Found {unique_products} unique products"
                }
            }
    
    except Exception as e:
        import traceback
        print(f"ERROR in detect_file_type_from_mappings: {str(e)}")
        print(traceback.format_exc())
        raise
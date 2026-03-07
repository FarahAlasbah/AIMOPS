"""
Realistic Palestinian Grocery Store Sales Data Generator
Generates 2+ years of daily sales across 50+ products
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# ═══════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════

# Time period: 2 years of daily data
START_DATE = datetime(2024, 1, 1)
END_DATE = datetime(2025, 12, 31)

# Products with different characteristics
PRODUCTS = [
    # Product category, base daily sales, seasonality factor, price elasticity
    
    # Ramadan-sensitive products (high event impact)
    {"name": "Premium Dates 500g", "category": "Dried Fruits", "base": 30, "ramadan_boost": 2.8, "elasticity": -1.5, "price": 25},
    {"name": "Regular Dates 500g", "category": "Dried Fruits", "base": 45, "ramadan_boost": 2.2, "elasticity": -2.0, "price": 15},
    {"name": "Mixed Nuts 250g", "category": "Snacks", "base": 20, "ramadan_boost": 1.9, "elasticity": -1.3, "price": 18},
    {"name": "Honey 500g", "category": "Sweeteners", "base": 15, "ramadan_boost": 1.7, "elasticity": -1.2, "price": 30},
    {"name": "Orange Juice 1L", "category": "Beverages", "base": 25, "ramadan_boost": 3.2, "elasticity": -1.8, "price": 8},
    {"name": "Basmati Rice 5kg", "category": "Grains", "base": 40, "ramadan_boost": 2.1, "elasticity": -1.6, "price": 35},
    
    # Anti-Ramadan products (decrease during fasting)
    {"name": "Coffee Beans 1kg", "category": "Beverages", "base": 35, "ramadan_boost": 0.3, "elasticity": -1.4, "price": 45},
    {"name": "Tea Bags 100pk", "category": "Beverages", "base": 28, "ramadan_boost": 0.5, "elasticity": -1.5, "price": 12},
    {"name": "Chocolate Bars", "category": "Snacks", "base": 50, "ramadan_boost": 0.4, "elasticity": -2.2, "price": 5},
    {"name": "Sugar 1kg", "category": "Sweeteners", "base": 55, "ramadan_boost": 0.6, "elasticity": -1.7, "price": 8},
    
    # Stable staples (minimal event impact)
    {"name": "Milk 1L", "category": "Dairy", "base": 80, "ramadan_boost": 1.1, "elasticity": -0.8, "price": 6},
    {"name": "Eggs 12pk", "category": "Dairy", "base": 60, "ramadan_boost": 1.15, "elasticity": -0.9, "price": 10},
    {"name": "Bread", "category": "Bakery", "base": 120, "ramadan_boost": 1.3, "elasticity": -0.7, "price": 3},
    {"name": "Butter 500g", "category": "Dairy", "base": 25, "ramadan_boost": 1.05, "elasticity": -1.1, "price": 12},
    {"name": "Olive Oil 1L", "category": "Oils", "base": 18, "ramadan_boost": 1.2, "elasticity": -0.6, "price": 35},
    
    # Seasonal products
    {"name": "Ice Cream", "category": "Frozen", "base": 40, "ramadan_boost": 0.2, "elasticity": -2.0, "price": 8, "summer_boost": 2.5},
    {"name": "Hot Chocolate Mix", "category": "Beverages", "base": 15, "ramadan_boost": 0.8, "elasticity": -1.5, "price": 12, "winter_boost": 2.0},
    {"name": "Watermelon (avg)", "category": "Produce", "base": 30, "ramadan_boost": 2.0, "elasticity": -1.8, "price": 4, "summer_boost": 3.0},
    
    # Add more products to reach 50+
    {"name": "Tomatoes 1kg", "category": "Produce", "base": 70, "ramadan_boost": 1.4, "elasticity": -1.9, "price": 5},
    {"name": "Onions 1kg", "category": "Produce", "base": 65, "ramadan_boost": 1.3, "elasticity": -1.7, "price": 4},
    {"name": "Potatoes 5kg", "category": "Produce", "base": 50, "ramadan_boost": 1.25, "elasticity": -1.5, "price": 15},
    {"name": "Chicken 1kg", "category": "Meat", "base": 45, "ramadan_boost": 1.6, "elasticity": -1.3, "price": 20},
    {"name": "Ground Beef 1kg", "category": "Meat", "base": 30, "ramadan_boost": 1.5, "elasticity": -1.2, "price": 35},
    {"name": "Yogurt 500g", "category": "Dairy", "base": 55, "ramadan_boost": 1.4, "elasticity": -1.1, "price": 7},
    {"name": "Cheese 500g", "category": "Dairy", "base": 35, "ramadan_boost": 1.35, "elasticity": -1.0, "price": 18},
    {"name": "Pasta 500g", "category": "Grains", "base": 40, "ramadan_boost": 1.45, "elasticity": -1.6, "price": 6},
    {"name": "Canned Tuna", "category": "Canned", "base": 25, "ramadan_boost": 2.0, "elasticity": -1.4, "price": 8},
    {"name": "Biscuits 400g", "category": "Snacks", "base": 48, "ramadan_boost": 1.3, "elasticity": -2.1, "price": 10},
    {"name": "Jam 500g", "category": "Spreads", "base": 20, "ramadan_boost": 1.8, "elasticity": -1.3, "price": 12},
    {"name": "Peanut Butter", "category": "Spreads", "base": 15, "ramadan_boost": 1.1, "elasticity": -1.2, "price": 15},
]

# Events (Islamic calendar shifts ~11 days earlier each year)
EVENTS = [
    # 2024
    {"name": "Ramadan 2024", "start": "2024-03-11", "end": "2024-04-09", "type": "ramadan"},
    {"name": "Eid Al-Fitr 2024", "start": "2024-04-10", "end": "2024-04-12", "type": "eid"},
    {"name": "Eid Al-Adha 2024", "start": "2024-06-16", "end": "2024-06-19", "type": "eid"},
    {"name": "Back to School 2024", "start": "2024-09-01", "end": "2024-09-15", "type": "seasonal"},
    {"name": "Christmas 2024", "start": "2024-12-20", "end": "2024-12-26", "type": "seasonal"},
    
    # 2025
    {"name": "Ramadan 2025", "start": "2025-02-28", "end": "2025-03-29", "type": "ramadan"},
    {"name": "Eid Al-Fitr 2025", "start": "2025-03-30", "end": "2025-04-01", "type": "eid"},
    {"name": "Eid Al-Adha 2025", "start": "2025-06-06", "end": "2025-06-09", "type": "eid"},
    {"name": "Back to School 2025", "start": "2025-09-01", "end": "2025-09-15", "type": "seasonal"},
    {"name": "Christmas 2025", "start": "2025-12-20", "end": "2025-12-26", "type": "seasonal"},
]

# Campaigns (promotional periods with discounts)
CAMPAIGNS = [
    # 2024 campaigns
    {"name": "Ramadan Mega Sale 2024", "start": "2024-03-11", "end": "2024-04-09", "discount": 20, "products": ["Premium Dates 500g", "Regular Dates 500g", "Orange Juice 1L"]},
    {"name": "Eid Special 2024", "start": "2024-04-10", "end": "2024-04-12", "discount": 15, "products": ["Mixed Nuts 250g", "Chocolate Bars", "Biscuits 400g"]},
    {"name": "Summer Clearance 2024", "start": "2024-07-01", "end": "2024-07-15", "discount": 25, "products": ["Ice Cream", "Watermelon (avg)", "Orange Juice 1L"]},
    {"name": "Back to School Bundle 2024", "start": "2024-09-01", "end": "2024-09-10", "discount": 10, "products": ["Biscuits 400g", "Juice Boxes", "Bread"]},
    
    # 2025 campaigns
    {"name": "New Year Flash Sale 2025", "start": "2025-01-01", "end": "2025-01-05", "discount": 30, "products": ["All products"]},  # Aggressive discount
    {"name": "Ramadan Essentials 2025", "start": "2025-02-28", "end": "2025-03-29", "discount": 18, "products": ["Basmati Rice 5kg", "Dates", "Canned Tuna"]},
    {"name": "Mid-Year Promotion 2025", "start": "2025-06-15", "end": "2025-06-30", "discount": 12, "products": ["Olive Oil 1L", "Pasta 500g", "Tomatoes 1kg"]},
]

def generate_sales_data():
    """
    Generate realistic daily sales data with:
    - Base demand
    - Day-of-week patterns (weekend spike)
    - Seasonality (summer/winter)
    - Event impacts (Ramadan boost)
    - Campaign impacts (discount effect)
    - Random noise (real life isn't perfect)
    - Stockouts (occasionally)
    - Cannibalization (discounted products steal from others)
    """
    
    # Create date range
    dates = pd.date_range(START_DATE, END_DATE, freq='D')
    
    all_sales = []
    
    for product in PRODUCTS:
        print(f"Generating sales for {product['name']}...")
        
        for current_date in dates:
            # ═══ BASE DEMAND ═══
            base_sales = product['base']
            
            # ═══ DAY OF WEEK PATTERN ═══
            # Friday (4) and Saturday (5) are weekend in Palestine → +30% sales
            # Monday (0) is slowest → -10%
            dow = current_date.weekday()
            if dow in [4, 5]:  # Weekend
                base_sales *= 1.3
            elif dow == 0:  # Monday
                base_sales *= 0.9
            
            # ═══ MONTHLY SEASONALITY ═══
            month = current_date.month
            # Summer months (June-August) boost cold products
            if 'summer_boost' in product and month in [6, 7, 8]:
                base_sales *= product['summer_boost']
            # Winter months (Dec-Feb) boost hot products
            if 'winter_boost' in product and month in [12, 1, 2]:
                base_sales *= product['winter_boost']
            
            # ═══ EVENT IMPACT ═══
            event_multiplier = 1.0
            active_event = None
            for event in EVENTS:
                event_start = pd.to_datetime(event['start'])
                event_end = pd.to_datetime(event['end'])
                if event_start <= current_date <= event_end:
                    active_event = event['name']
                    if event['type'] == 'ramadan':
                        event_multiplier = product.get('ramadan_boost', 1.0)
                    elif event['type'] == 'eid':
                        # Eid has moderate boost for sweets/snacks
                        if product['category'] in ['Snacks', 'Dried Fruits']:
                            event_multiplier = 1.4
                    elif event['type'] == 'seasonal':
                        event_multiplier = 1.15  # Small general boost
                    break
            
            base_sales *= event_multiplier
            
            # ═══ CAMPAIGN IMPACT (DISCOUNT EFFECT) ═══
            campaign_multiplier = 1.0
            active_campaign = None
            discount_pct = 0
            
            for campaign in CAMPAIGNS:
                campaign_start = pd.to_datetime(campaign['start'])
                campaign_end = pd.to_datetime(campaign['end'])
                if campaign_start <= current_date <= campaign_end:
                    # Check if this product is in campaign
                    if ("All products" in campaign['products'] or 
                        product['name'] in campaign['products'] or
                        any(p in product['name'] for p in campaign['products'])):
                        
                        active_campaign = campaign['name']
                        discount_pct = campaign['discount']
                        
                        # Price elasticity formula:
                        # Sales increase = elasticity × discount %
                        # Example: elasticity -1.5, discount 20% → +30% sales
                        elasticity = product['elasticity']
                        sales_increase_pct = abs(elasticity) * (discount_pct / 10)
                        campaign_multiplier = 1 + (sales_increase_pct / 100)
                        
                        # Diminishing returns for deep discounts
                        if discount_pct > 25:
                            campaign_multiplier *= 0.9  # Smaller effect
                        
                        break
            
            base_sales *= campaign_multiplier
            
            # ═══ CANNIBALIZATION ═══
            # If there's a campaign, non-discounted similar products lose sales
            if active_campaign and discount_pct > 0:
                # This product is NOT in campaign but same category product is
                for campaign in CAMPAIGNS:
                    campaign_start = pd.to_datetime(campaign['start'])
                    campaign_end = pd.to_datetime(campaign['end'])
                    if campaign_start <= current_date <= campaign_end:
                        if (product['name'] not in campaign['products'] and 
                            "All products" not in campaign['products']):
                            # Check if similar product is on discount
                            for other_prod in PRODUCTS:
                                if (other_prod['category'] == product['category'] and
                                    other_prod['name'] in campaign['products']):
                                    # Lose 15-25% sales to the discounted version
                                    base_sales *= random.uniform(0.75, 0.85)
                                    break
            
            # ═══ RANDOM NOISE ═══
            # Real life has variation: delivery delays, weather, customer mood
            noise = random.gauss(1.0, 0.15)  # Mean 1.0, StdDev 0.15
            base_sales *= noise
            
            # ═══ STOCKOUT SIMULATION ═══
            # 2% chance of stockout (ran out of product)
            if random.random() < 0.02:
                base_sales *= random.uniform(0.2, 0.5)  # Only sold partial stock
            
            # ═══ FLOOR AT ZERO ═══
            final_sales = max(0, int(base_sales))
            
            # ═══ CALCULATE REVENUE ═══
            # Apply discount if in campaign
            price = product['price']
            if discount_pct > 0 and active_campaign:
                price = price * (1 - discount_pct / 100)
            
            revenue = final_sales * price
            
            # ═══ RECORD ═══
            all_sales.append({
                'sale_date': current_date,
                'product_name': product['name'],
                'category': product['category'],
                'quantity': final_sales,
                'unit_price': round(price, 2),
                'revenue': round(revenue, 2),
                'base_price': product['price'],
                'discount_pct': discount_pct if active_campaign else 0,
                'event': active_event,
                'campaign': active_campaign,
                'day_of_week': current_date.strftime('%A'),
                'month': current_date.month,
                'is_weekend': dow in [4, 5],
            })
    
    return pd.DataFrame(all_sales)


# Generate the data
print("Generating 2 years of sales data for 30+ products...")
df = generate_sales_data()

# Save to CSV
df.to_csv('synthetic_sales_data.csv', index=False)

print(f"\n✅ Generated {len(df):,} sales records")
print(f"✅ Date range: {df['sale_date'].min()} to {df['sale_date'].max()}")
print(f"✅ Products: {df['product_name'].nunique()}")
print(f"✅ Total revenue: ${df['revenue'].sum():,.2f}")
print(f"\nPreview:")
print(df.head(20))

def generate_campaign_results():
    """
    Generate campaign performance metrics
    Shows which campaigns worked and which didn't
    """
    campaign_results = []
    
    for campaign in CAMPAIGNS:
        # Get sales during campaign
        camp_start = pd.to_datetime(campaign['start'])
        camp_end = pd.to_datetime(campaign['end'])
        
        # Calculate baseline (same period last year or month before)
        baseline_start = camp_start - timedelta(days=30)
        baseline_end = camp_start - timedelta(days=1)
        
        # Affected products
        affected_products = campaign['products']
        
        # Simulate results
        discount = campaign['discount']
        
        # Budget calculation (rough estimate)
        # Assume $100 per discount point per product per day
        duration_days = (camp_end - camp_start).days + 1
        num_products = len(affected_products) if "All" not in str(affected_products) else len(PRODUCTS)
        budget = discount * num_products * duration_days * 50
        
        # ROI calculation
        # Deep discounts (>25%) typically have worse ROI
        if discount > 25:
            roi = random.uniform(0.7, 1.1)
            uplift_pct = random.uniform(20, 35)
        elif discount > 15:
            roi = random.uniform(1.2, 1.8)
            uplift_pct = random.uniform(30, 50)
        else:
            roi = random.uniform(1.3, 1.9)
            uplift_pct = random.uniform(20, 35)
        
        campaign_results.append({
            'campaign_name': campaign['name'],
            'start_date': camp_start,
            'end_date': camp_end,
            'discount_pct': discount,
            'budget_spent': round(budget, 2),
            'revenue_generated': round(budget * roi, 2),
            'roi': round(roi, 2),
            'uplift_pct': round(uplift_pct, 1),
            'products_count': num_products,
            'duration_days': duration_days,
        })
    
    return pd.DataFrame(campaign_results)

# Generate campaign data
campaigns_df = generate_campaign_results()
campaigns_df.to_csv('synthetic_campaigns.csv', index=False)

print("\n✅ Generated campaign performance data")
print(campaigns_df)
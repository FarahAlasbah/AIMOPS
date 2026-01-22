"""
Test database connection
"""
from dotenv import load_dotenv
import os

load_dotenv()  # <-- THIS is the key line

print(os.getenv("DB_USER"))
print(os.getenv("DB_PASSWORD"))

from sqlalchemy import text
from app.core.database import engine, SessionLocal

print("🧪 Testing Database Connection...")
print("-" * 50)

try:
    # Test 1: Engine connection
    print("Test 1: Testing engine connection...")
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("✅ Engine connection successful!")
    
    # Test 2: Session creation
    print("\nTest 2: Testing session creation...")
    db = SessionLocal()
    print("✅ Session created successfully!")
    
    # Test 3: Query database
    print("\nTest 3: Querying database...")
    result = db.execute(text("SELECT DATABASE()"))
    db_name = result.scalar()
    print(f"✅ Connected to database: {db_name}")
    
    # Test 4: Query a table
    print("\nTest 4: Checking tables...")
    result = db.execute(text("SHOW TABLES"))
    tables = [row[0] for row in result]
    print(f"✅ Found {len(tables)} tables:")
    for table in tables[:5]:  # Show first 5 tables
        print(f"   - {table}")
    if len(tables) > 5:
        print(f"   ... and {len(tables) - 5} more")
    
    # Test 5: Query users table
    print("\nTest 5: Checking users table...")
    result = db.execute(text("SELECT COUNT(*) FROM users"))
    user_count = result.scalar()
    print(f"✅ Users table has {user_count} user(s)")
    
    db.close()
    
    print("\n" + "=" * 50)
    print("🎉 All database tests passed!")
    print("=" * 50)

except Exception as e:
    print("\n" + "=" * 50)
    print("❌ Database connection failed!")
    print("=" * 50)
    print(f"\nError: {str(e)}")
    print("\nTroubleshooting:")
    print("1. Check MySQL is running")
    print("2. Verify .env file has correct password")
    print("3. Ensure aimops_db database exists")
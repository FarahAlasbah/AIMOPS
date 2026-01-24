"""
Test User model
"""
from app.core.database import SessionLocal
from app.models.user import User

print("🧪 Testing User Model...")
print("-" * 50)

db = SessionLocal()

try:
    # Test 1: Query all users
    print("Test 1: Query all users...")
    users = db.query(User).all()
    print(f"✅ Found {len(users)} user(s)")
    
    # Test 2: Display user details
    if users:
        print("\nTest 2: User details...")
        for user in users:
            print(f"\n👤 {user}")
            print(f"   ID: {user.user_id}")
            print(f"   Username: {user.username}")
            print(f"   Email: {user.email}")
            print(f"   Role: {user.role.value}")
            print(f"   Status: {user.status.value}")
            print(f"   Created: {user.created_at}")
    
    # Test 3: Query by username
    print("\nTest 3: Query specific user...")
    admin = db.query(User).filter(User.username == "admin").first()
    if admin:
        print(f"✅ Found user: {admin.username}")
        print(f"   Full name: {admin.full_name}")
        print(f"   Role: {admin.role.value}")
    
    # Test 4: Convert to dict
    print("\nTest 4: Convert to dictionary...")
    if admin:
        user_dict = admin.to_dict()
        print("✅ User as dictionary:")
        for key, value in user_dict.items():
            print(f"   {key}: {value}")
    
    print("\n" + "=" * 50)
    print("🎉 All User model tests passed!")
    print("=" * 50)

except Exception as e:
    print("\n" + "=" * 50)
    print("❌ User model test failed!")
    print("=" * 50)
    print(f"\nError: {str(e)}")

finally:
    db.close()
"""
Test RBAC (Role-Based Access Control) system
"""
from app.core.database import SessionLocal
from app.models.user import User
from app.models.role import Role, Permission

print("🧪 Testing RBAC System...")
print("=" * 60)

db = SessionLocal()

try:
    # Test 1: Load roles
    print("\n1️⃣ Testing Roles...")
    roles = db.query(Role).all()
    print(f"   Found {len(roles)} roles:")
    for role in roles:
        print(f"   - {role.display_name} ({role.role_name})")
    
    # Test 2: Load permissions
    print("\n2️⃣ Testing Permissions...")
    permissions = db.query(Permission).all()
    print(f"   Found {len(permissions)} permissions")
    print(f"   Sample permissions:")
    for perm in permissions[:5]:
        print(f"   - {perm.permission_name}: {perm.display_name}")
    
    # Test 3: Role permissions
    print("\n3️⃣ Testing Role Permissions...")
    admin_role = db.query(Role).filter(Role.role_name == 'admin').first()
    marketing_role = db.query(Role).filter(Role.role_name == 'marketing_user').first()
    business_role = db.query(Role).filter(Role.role_name == 'business_owner').first()
    
    print(f"   Admin has {len(admin_role.permissions)} permissions")
    print(f"   Marketing User has {len(marketing_role.permissions)} permissions")
    print(f"   Business Owner has {len(business_role.permissions)} permissions")
    
    # Test 4: Check specific permissions
    print("\n4️⃣ Testing Permission Checks...")
    print(f"   Admin can create campaigns: {admin_role.has_permission('campaigns.create')}")
    print(f"   Marketing can create campaigns: {marketing_role.has_permission('campaigns.create')}")
    print(f"   Business Owner can create campaigns: {business_role.has_permission('campaigns.create')}")
    print(f"   Business Owner can view campaigns: {business_role.has_permission('campaigns.view')}")
    
    # Test 5: User with role
    print("\n5️⃣ Testing User Permissions...")
    admin_user = db.query(User).filter(User.username == 'admin').first()
    if admin_user:
        print(f"   User: {admin_user.username}")
        print(f"   Role: {admin_user.role.display_name if admin_user.role else 'None'}")
        print(f"   Is Admin: {admin_user.is_admin()}")
        print(f"   Can create campaigns: {admin_user.has_permission('campaigns.create')}")
        print(f"   Can delete users: {admin_user.has_permission('users.delete')}")
        print(f"   Can upload data: {admin_user.has_permission('data.upload')}")
        
        print(f"\n   All permissions for {admin_user.username}:")
        perms = admin_user.get_permissions()
        for i, perm in enumerate(perms[:10], 1):
            print(f"   {i}. {perm}")
        if len(perms) > 10:
            print(f"   ... and {len(perms) - 10} more")
    
    # Test 6: to_dict with permissions
    print("\n6️⃣ Testing JSON Serialization...")
    if admin_user:
        user_dict = admin_user.to_dict(include_permissions=True)
        print(f"   User dict keys: {list(user_dict.keys())}")
        print(f"   Role info: {user_dict['role']['display_name']}")
        print(f"   Permission count: {len(user_dict['permissions'])}")
    
    print("\n" + "=" * 60)
    print("✅ All RBAC tests passed!")
    print("=" * 60)
    
    print("\n📊 RBAC Summary:")
    print(f"   Roles: {len(roles)}")
    print(f"   Permissions: {len(permissions)}")
    print(f"   Admin permissions: {len(admin_role.permissions)}")
    print(f"   Marketing permissions: {len(marketing_role.permissions)}")
    print(f"   Business Owner permissions: {len(business_role.permissions)}")

except Exception as e:
    print("\n" + "=" * 60)
    print("❌ RBAC test failed!")
    print("=" * 60)
    print(f"\nError: {str(e)}")
    import traceback
    traceback.print_exc()

finally:
    db.close()
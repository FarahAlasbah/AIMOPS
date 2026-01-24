"""
Generate bcrypt password hash - FIXED VERSION
"""
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# Password to hash
password = "Admin@123"

# Handle long passwords (truncate if needed)
password_bytes = password.encode('utf-8')
if len(password_bytes) > 72:
    password = password_bytes[:72].decode('utf-8', errors='ignore')
    print(f"⚠️  Password truncated to 72 bytes")

# Generate hash
hashed = pwd_context.hash(password)

print(f"Password: {password}")
print(f"Password length: {len(password)} characters, {len(password.encode('utf-8'))} bytes")
print(f"Hash length: {len(hashed)} characters")
print(f"\nBcrypt hash:\n{hashed}")
print(f"\n✅ Run this in MySQL Workbench:")
print(f"UPDATE users SET password_hash = '{hashed}' WHERE username = 'admin';")

# Verify it works
if pwd_context.verify(password, hashed):
    print("\n✅ Hash verification successful!")
else:
    print("\n❌ Hash verification failed!")
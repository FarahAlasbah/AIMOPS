"""
Test that configuration loads correctly
"""
from app.core.config import settings

print("🧪 Testing Configuration...")
print("-" * 50)
print(f"Environment: {settings.ENVIRONMENT}")
print(f"Database Host: {settings.DB_HOST}")
print(f"Database Name: {settings.DB_NAME}")
print(f"Database User: {settings.DB_USER}")
print(f"Database Password: {'*' * len(settings.DB_PASSWORD)} (hidden)")
print(f"Secret Key: {settings.SECRET_KEY[:10]}... (hidden)")
print(f"Max Upload Size: {settings.MAX_UPLOAD_SIZE_MB}MB")
print("-" * 50)
print("✅ Configuration loaded successfully!")
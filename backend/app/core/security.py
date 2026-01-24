"""
Security utilities - password hashing and JWT tokens
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

# Password hashing context with proper configuration
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Explicit rounds for consistency
)


def hash_password(password: str) -> str:
    """
    Hash a plain password
    
    Args:
        password: Plain text password (will be truncated if > 72 bytes)
    
    Returns:
        Bcrypt hashed password
    
    Raises:
        ValueError: If password is empty or too short
    """
    if not password:
        raise ValueError("Password cannot be empty")
    
    if len(password) < 3:
        raise ValueError("Password must be at least 3 characters")
    
    # Truncate to 72 bytes if needed (bcrypt limitation)
    # This is safe - bcrypt only uses first 72 bytes anyway
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        # Truncate at 72 bytes, not characters (important for UTF-8!)
        password = password_bytes[:72].decode('utf-8', errors='ignore')
    
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password
    
    Args:
        plain_password: Password user entered
        hashed_password: Stored hash from database
    
    Returns:
        True if password matches, False otherwise
    """
    if not plain_password or not hashed_password:
        return False
    
    try:
        # Truncate password same way as hashing (consistency!)
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            plain_password = password_bytes[:72].decode('utf-8', errors='ignore')
        
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        # Log error but don't expose details to user
        print(f"Password verification error: {e}")
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token
    
    Args:
        data: Dictionary with user info (user_id, username, role)
        expires_delta: How long token is valid (default from settings)
    
    Returns:
        JWT token string
    """
    to_encode = data.copy()
    
    # Set expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    # Create token
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify JWT token
    
    Args:
        token: JWT token string
    
    Returns:
        Dictionary with user data if valid, None if invalid/expired
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
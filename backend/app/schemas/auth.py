"""
Authentication schemas - define request/response formats
"""
from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional


class LoginRequest(BaseModel):
    """Login request"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=3, max_length=72)  # bcrypt limit
    
    @validator('username')
    def username_must_be_valid(cls, v):
        if not v or not v.strip():
            raise ValueError('Username is required')
        return v.lower().strip()
    
    @validator('password')
    def password_must_be_valid(cls, v):
        if not v:
            raise ValueError('Password is required')
        if len(v) < 3:
            raise ValueError('Password must be at least 3 characters')
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password is too long (max 72 bytes)')
        return v


class LoginResponse(BaseModel):
    """Login response"""
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    """User info response"""
    user_id: int
    username: str
    email: str
    full_name: Optional[str]
    role: dict
    is_admin: bool
    is_active: bool
    
    class Config:
        from_attributes = True
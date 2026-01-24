"""
User management schemas
File: backend/app/schemas/user.py
"""
from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    """Schema for creating a new user"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=3, max_length=72)
    full_name: Optional[str] = Field(None, max_length=100)
    role_id: int = Field(..., description="Role ID (1=Admin, 2=Manager, 3=Analyst)")
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must be alphanumeric (can include _ and -)')
        return v.lower().strip()
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class UserUpdate(BaseModel):
    """Schema for updating user info"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    role_id: Optional[int] = None
    status: Optional[str] = Field(None, pattern="^(active|inactive|locked)$")


class UserPasswordUpdate(BaseModel):
    """Schema for changing password"""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=72)
    
    @validator('new_password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class UserListResponse(BaseModel):
    """Schema for user in list"""
    user_id: int
    username: str
    email: str
    full_name: Optional[str]
    role_name: str
    status: str
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


class UserDetailResponse(BaseModel):
    """Schema for detailed user info"""
    user_id: int
    username: str
    email: str
    full_name: Optional[str]
    role: dict
    permissions: list
    status: str
    is_admin: bool
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]
    failed_login_attempts: int
    
    class Config:
        from_attributes = True
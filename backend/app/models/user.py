"""
User model with RBAC integration
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, validates
from app.core.database import Base


class User(Base):
    """User model with role-based access control"""
    __tablename__ = "users"
    
    # Status constants (kept simple - only status needs hardcoding)
    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_SUSPENDED = "suspended"
    ALLOWED_STATUSES = [STATUS_ACTIVE, STATUS_INACTIVE, STATUS_SUSPENDED]
    
    # Columns
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    
    # Role relationship (dynamic from database)
    role_id = Column(Integer, ForeignKey('roles.role_id'), nullable=False)
    role = relationship("Role", back_populates="users")
    
    # Status (kept as string for backward compatibility)
    status = Column(String(50), nullable=False, default=STATUS_ACTIVE)
    
    # Security
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime, nullable=True)
    
    @validates('status')
    def validate_status(self, key, status):
        """Validate status"""
        if status not in self.ALLOWED_STATUSES:
            raise ValueError(
                f"Invalid status '{status}'. Must be one of: {', '.join(self.ALLOWED_STATUSES)}"
            )
        return status
    
    @validates('email')
    def validate_email(self, key, email):
        """Basic email validation"""
        if not email or '@' not in email:
            raise ValueError("Invalid email format")
        return email.lower()
    
    @validates('username')
    def validate_username(self, key, username):
        """Validate username"""
        if not username or len(username) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(username) > 50:
            raise ValueError("Username must be at most 50 characters")
        return username.lower()
    
    def has_permission(self, permission_name):
        """
        Check if user has specific permission
        Example: user.has_permission('campaigns.create')
        """
        if not self.role:
            return False
        return self.role.has_permission(permission_name)
    
    def get_permissions(self):
        """Get list of all permission names for this user"""
        if not self.role:
            return []
        return self.role.get_permission_names()
    
    def is_admin(self):
        """Check if user is admin"""
        return self.role and self.role.role_name == 'admin'
    
    def is_active(self):
        """Check if user account is active"""
        return self.status == self.STATUS_ACTIVE
    
    def __repr__(self):
        """For debugging"""
        role_name = self.role.role_name if self.role else "no role"
        return f"<User {self.username} ({role_name})>"
    
    def to_dict(self, include_permissions=False):
        """
        Convert to dictionary for JSON
        include_permissions: if True, includes full permission list
        """
        data = {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role.to_dict() if self.role else None,
            "status": self.status,
            "is_admin": self.is_admin(),
            "is_active": self.is_active(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }
        
        if include_permissions:
            data["permissions"] = self.get_permissions()
        
        return data
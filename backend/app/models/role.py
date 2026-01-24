"""
Role and Permission models for RBAC (Role-Based Access Control)
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Table, func
from sqlalchemy.orm import relationship
from app.core.database import Base


# Junction table for role-permission many-to-many relationship
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.role_id'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.permission_id'), primary_key=True),
    Column('granted_at', DateTime, server_default=func.now())
)


class Role(Base):
    """Role model - defines user roles"""
    __tablename__ = "roles"
    
    role_id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    description = Column(Text)
    is_system_role = Column(Boolean, default=False)  # System roles can't be deleted
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")
    users = relationship("User", back_populates="role")
    
    def has_permission(self, permission_name):
        """Check if role has specific permission"""
        return any(p.permission_name == permission_name for p in self.permissions)
    
    def get_permission_names(self):
        """Get list of all permission names for this role"""
        return [p.permission_name for p in self.permissions]
    
    def __repr__(self):
        return f"<Role {self.role_name}>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "role_id": self.role_id,
            "role_name": self.role_name,
            "display_name": self.display_name,
            "description": self.description,
            "is_system_role": self.is_system_role,
            "permissions": self.get_permission_names(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Permission(Base):
    """Permission model - defines what actions are allowed"""
    __tablename__ = "permissions"
    
    permission_id = Column(Integer, primary_key=True, index=True)
    permission_name = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    description = Column(Text)
    resource = Column(String(50), nullable=False, index=True)  # campaigns, forecasts, etc.
    action = Column(String(50), nullable=False)  # create, read, update, delete
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")
    
    def __repr__(self):
        return f"<Permission {self.permission_name}>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "permission_id": self.permission_id,
            "permission_name": self.permission_name,
            "display_name": self.display_name,
            "description": self.description,
            "resource": self.resource,
            "action": self.action,
        }
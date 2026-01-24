"""
AIMOPS FastAPI Application
Main entry point for the API
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.role import Role

# Create FastAPI app
app = FastAPI(
    title="AIMOPS API",
    description="AI for Marketing & Operations Predicting System",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI at http://localhost:8000/docs
    redoc_url="/redoc"  # ReDoc at http://localhost:8000/redoc
)

# CORS - allow frontend to call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint (test Postman with this!)
@app.get("/")
def root():
    """API root - health check"""
    return {
        "message": "AIMOPS API is running",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "database": "connected"
    }


# Test endpoint - get all users (FOR TESTING ONLY - will add auth later)
@app.get("/api/test/users")
def test_get_users(db: Session = Depends(get_db)):
    """
    TEST ENDPOINT - Get all users
    This is just for testing Postman - will be secured later
    """
    users = db.query(User).all()
    return {
        "count": len(users),
        "users": [user.to_dict() for user in users]
    }


# Test endpoint - get all roles
@app.get("/api/test/roles")
def test_get_roles(db: Session = Depends(get_db)):
    """
    TEST ENDPOINT - Get all roles with permissions
    """
    roles = db.query(Role).all()
    return {
        "count": len(roles),
        "roles": [role.to_dict() for role in roles]
    }


# Test endpoint - check user permissions
@app.get("/api/test/user/{user_id}/permissions")
def test_user_permissions(user_id: int, db: Session = Depends(get_db)):
    """
    TEST ENDPOINT - Check what permissions a user has
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return {"error": "User not found"}
    
    return {
        "user": user.username,
        "role": user.role.display_name if user.role else None,
        "permissions": user.get_permissions(),
        "is_admin": user.is_admin(),
        "permission_count": len(user.get_permissions())
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
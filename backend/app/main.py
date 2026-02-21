"""
AIMOPS FastAPI Application
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.role import Role
from app.api.auth import router as auth_router 
from app.api import users, campaigns
from app.api import data_upload
from app.api import column_mapping
from app.api import product_ingestion
from app.api import products
from app.api import events
from app.api import notifications


app = FastAPI(
    title="AIMOPS API",
    description="AI for Marketing & Operations Predicting System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router) 
app.include_router(users.router)
app.include_router(campaigns.router)
app.include_router(data_upload.router)
app.include_router(column_mapping.router)
app.include_router(product_ingestion.router)
app.include_router(products.router)
app.include_router(events.router)
app.include_router(notifications.router)

@app.get("/")
def root():
    return {
        "message": "AIMOPS API is running",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "database": "connected"
    }


@app.get("/api/test/users")
def test_get_users(db: Session = Depends(get_db)):
    """TEST ENDPOINT"""
    users = db.query(User).all()
    return {
        "count": len(users),
        "users": [user.to_dict() for user in users]
    }


@app.get("/api/test/roles")
def test_get_roles(db: Session = Depends(get_db)):
    """TEST ENDPOINT"""
    roles = db.query(Role).all()
    return {
        "count": len(roles),
        "roles": [role.to_dict() for role in roles]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
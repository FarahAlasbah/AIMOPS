from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.scheduler import scheduler
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
from app.api.draft_events import router as draft_events_router
from app.api.forecasts import router as forecasts_router
from app.api.consultation import router as consultation_router
from app.api.business_profile import router as business_profile_router
from app.api.reports import router as reports_router
from app.api.audit_logs import router as audit_logs_router


# ============================================
# App Setup
# ============================================

app = FastAPI(
    title="AIMOPS API",
    description="AI for Marketing & Operations Predicting System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Scheduler Lifecycle
# ============================================

@app.on_event("startup")
async def startup_event():
    scheduler.start()
    print("[Scheduler] Started — campaign end checker runs daily at 08:00")


@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown(wait=False)
    print("[Scheduler] Stopped")


# ============================================
# Routers
# ============================================

app.include_router(auth_router)
app.include_router(users.router)
app.include_router(data_upload.router)
app.include_router(column_mapping.router)
app.include_router(product_ingestion.router)
app.include_router(products.router)
app.include_router(draft_events_router)
app.include_router(events.router)
app.include_router(notifications.router)
app.include_router(forecasts_router)
app.include_router(campaigns.router)
app.include_router(consultation_router)
app.include_router(business_profile_router)
app.include_router(reports_router)
app.include_router(audit_logs_router)


# ============================================
# Base Endpoints
# ============================================

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


# @app.get("/api/test/users")
# def test_get_users(db: Session = Depends(get_db)):
#     """TEST ENDPOINT"""
#     users_list = db.query(User).all()
#     return {
#         "count": len(users_list),
#         "users": [user.to_dict() for user in users_list]
#     }


# @app.get("/api/test/roles")
# def test_get_roles(db: Session = Depends(get_db)):
#     """TEST ENDPOINT"""
#     roles = db.query(Role).all()
#     return {
#         "count": len(roles),
#         "roles": [role.to_dict() for role in roles]
#     }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
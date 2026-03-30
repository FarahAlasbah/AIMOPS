"""
Database connection and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from urllib.parse import quote_plus
from .config import settings


# URL-encode password to handle special characters
encoded_password = quote_plus(settings.DB_PASSWORD)

# Construct database URL from settings
DATABASE_URL = (
    f"mysql+pymysql://{settings.DB_USER}:{encoded_password}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    f"?charset=utf8mb4"
)

# Create database engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using
    pool_recycle=3600,   # Recycle connections after 1 hour
    echo=False,          # Set to True to see SQL queries (for debugging)
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()


# Dependency to get database session
def get_db():
    """
    Get database session for API endpoints
    Usage in FastAPI: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        

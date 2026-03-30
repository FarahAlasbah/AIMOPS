"""
Configuration settings loaded from environment variables
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    #AI
    ANTHROPIC_API_KEY: str
    
    # Application
    ENVIRONMENT: str = "development"
    
    # File Upload
    MAX_UPLOAD_SIZE_MB: int = 50
    UPLOAD_FOLDER: str = "./uploads"
    
    
    class Config:
        env_file = ".env"  # Load from .env file
        case_sensitive = True


# Create global settings instance
settings = Settings()
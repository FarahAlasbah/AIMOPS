"""
Configuration settings loaded from environment variables
"""
from pydantic_settings import BaseSettings
from typing import Optional
from pydantic import validator


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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    #AI
    ANTHROPIC_API_KEY: str
    
    # Application
    ENVIRONMENT: str = "development"
    
    # File Upload
    MAX_UPLOAD_SIZE_MB: int = 50
    UPLOAD_FOLDER: str = "./uploads"
    
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    
    
    class Config:
        env_file = ".env"  # Load from .env file
        case_sensitive = True


    @validator('SECRET_KEY')
    def secret_key_must_be_strong(cls, v):
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v


# Create global settings instance
settings = Settings()
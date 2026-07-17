from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    
    APP_NAME: str = "PulsoDigital"
    APP_VERSION: str = "0.1.0"
    API_PREFIX: str = "/api/v1"
    
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/pulsodigital",
        description="PostgreSQL async connection string",
    )
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    
    SECRET_KEY: str = Field(
        default="dev-secret-key-change-in-production",
        description="Secret key for JWT tokens",
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    CORS_ORIGINS: str = Field(
        default='["http://localhost:5173", "http://localhost:3000"]',
        description="Allowed CORS origins",
    )
    
    REDIS_URL: str = "redis://localhost:6379/0"
    
    SCHOOL_CODE_LENGTH: int = 6
    STUDENT_CODE_LENGTH: int = 8
    
    WELLBEING_EMOTIONAL_WEIGHT: float = 0.35
    WELLBEING_SAFETY_WEIGHT: float = 0.25
    WELLBEING_BELONGING_WEIGHT: float = 0.20
    WELLBEING_TREND_WEIGHT: float = 0.20
    
    TREND_DECLINE_WEEKS: int = 3
    SUDDEN_DROP_THRESHOLD: float = 0.30
    MIN_RESPONSES_FOR_TREND: int = 3
    
    ML_MODEL_PATH: str = "ml/models"
    ML_ENABLED: bool = False
    
    SENTRY_DSN: str = ""
    
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@pulsodigital.edu"
    
    PAGINATION_DEFAULT_SIZE: int = 20
    PAGINATION_MAX_SIZE: int = 100


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

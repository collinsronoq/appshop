from functools import lru_cache
from typing import Literal, Self

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated runtime configuration."""

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    ENV: Literal["development", "test", "staging", "production"] = "development"
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://shopping:shopping@localhost:5432/shopping"
    )
    MIGRATION_DATABASE_URL: str = Field(
        default="postgresql+psycopg://shopping:shopping@localhost:5432/shopping"
    )
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    LOG_LEVEL: str = "INFO"
    JWT_SECRET: SecretStr = SecretStr(
        "development-only-change-this-jwt-secret-before-production"
    )
    JWT_ALGORITHM: Literal["HS256"] = "HS256"
    ACCESS_TOKEN_TTL_MINUTES: int = Field(default=15, ge=1, le=60)
    REFRESH_TOKEN_TTL_DAYS: int = Field(default=30, ge=1, le=365)

    @model_validator(mode="after")
    def validate_auth_configuration(self) -> Self:
        secret = self.JWT_SECRET.get_secret_value()
        if len(secret) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 characters")
        if self.ENV in {"staging", "production"} and secret.startswith("development-only-"):
            raise ValueError("JWT_SECRET must be replaced outside development and test")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()

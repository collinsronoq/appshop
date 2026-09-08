import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_default_environment_is_development() -> None:
    settings = Settings(_env_file=None, ENV="development")
    assert settings.ENV == "development"
    assert settings.API_PORT == 8000
    assert settings.ACCESS_TOKEN_TTL_MINUTES == 15
    assert settings.REFRESH_TOKEN_TTL_DAYS == 30


def test_production_rejects_development_jwt_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            ENV="production",
            JWT_SECRET="development-only-change-this-jwt-secret-before-production",
        )

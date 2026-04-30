from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = Field(default="LogShield", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    debug: bool = Field(default=False, alias="DEBUG")

    database_url: str = Field(
        default="postgresql+psycopg2://logshield_user:logshield_password@localhost:5432/logshield_db",
        alias="DATABASE_URL",
    )

    jwt_secret_key: str = Field(default="change-this-access-secret-in-production", alias="JWT_SECRET_KEY")
    jwt_refresh_secret_key: str = Field(default="change-this-refresh-secret-in-production", alias="JWT_REFRESH_SECRET_KEY")
    access_token_expire_minutes: int = Field(default=30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=7, alias="REFRESH_TOKEN_EXPIRE_DAYS")

    cors_origins: str = Field(
        default=(
            "http://localhost:5173,http://127.0.0.1:5173,"
            "http://localhost:8080,http://127.0.0.1:8080,"
            "http://localhost,http://127.0.0.1"
        ),
        alias="CORS_ORIGINS",
    )

    rate_limit_per_minute: int = Field(default=120, alias="RATE_LIMIT_PER_MINUTE")
    auth_rate_limit_per_minute: int = Field(default=20, alias="AUTH_RATE_LIMIT_PER_MINUTE")
    login_max_failed_attempts: int = Field(default=3, alias="LOGIN_MAX_FAILED_ATTEMPTS")
    login_ip_block_minutes: int = Field(default=1, alias="LOGIN_IP_BLOCK_MINUTES")
    report_export_max_rows: int = Field(default=5000, alias="REPORT_EXPORT_MAX_ROWS")

    nvd_api_base_url: str = Field(default="https://services.nvd.nist.gov/rest/json/cves/2.0", alias="NVD_API_BASE_URL")
    nvd_api_key: str = Field(default="", alias="NVD_API_KEY")
    nvd_results_per_page: int = Field(default=20, alias="NVD_RESULTS_PER_PAGE")
    nvd_request_timeout_seconds: int = Field(default=15, alias="NVD_REQUEST_TIMEOUT_SECONDS")
    nvd_cache_ttl_hours: int = Field(default=24, alias="NVD_CACHE_TTL_HOURS")
    threat_search_local_first: bool = Field(default=True, alias="THREAT_SEARCH_LOCAL_FIRST")

    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR / ".env", BACKEND_DIR / ".env.local"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

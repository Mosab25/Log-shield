from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = Field(default="LogShield", alias="APP_NAME")
    app_env: str = Field(default="development", validation_alias=AliasChoices("APP_ENV", "ENVIRONMENT"))
    debug: bool = Field(default=False, alias="DEBUG")

    database_url: str = Field(
        default="postgresql+psycopg2://logshield_user:logshield_password@127.0.0.1:5432/logshield_db",
        alias="DATABASE_URL",
    )

    jwt_secret_key: str = Field(default="change-this-access-secret-in-production", alias="JWT_SECRET_KEY")
    jwt_refresh_secret_key: str = Field(default="change-this-refresh-secret-in-production", alias="JWT_REFRESH_SECRET_KEY")
    access_token_expire_minutes: int = Field(default=30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=7, alias="REFRESH_TOKEN_EXPIRE_DAYS")

    cors_origins: str = Field(
        default=(
            "http://127.0.0.1:5173,http://localhost:5173,"
            "https://logshield-frontend.onrender.com"
        ),
        alias="CORS_ORIGINS",
    )

    rate_limit_per_minute: int = Field(default=120, alias="RATE_LIMIT_PER_MINUTE")
    auth_rate_limit_per_minute: int = Field(default=20, alias="AUTH_RATE_LIMIT_PER_MINUTE")
    login_max_failed_attempts: int = Field(default=5, alias="LOGIN_MAX_FAILED_ATTEMPTS")
    login_ip_block_minutes: int = Field(default=1, alias="LOGIN_IP_BLOCK_MINUTES")
    report_export_max_rows: int = Field(default=5000, alias="REPORT_EXPORT_MAX_ROWS")
    admin_2fa_enabled: bool = Field(default=False, alias="ADMIN_2FA_ENABLED")
    admin_security_email: str = Field(default="", alias="ADMIN_SECURITY_EMAIL")
    admin_otp_expire_minutes: int = Field(default=5, alias="ADMIN_OTP_EXPIRE_MINUTES")
    admin_otp_max_attempts: int = Field(default=5, alias="ADMIN_OTP_MAX_ATTEMPTS")
    email_provider: str = Field(default="resend", alias="EMAIL_PROVIDER")
    resend_api_key: str = Field(default="", alias="RESEND_API_KEY")
    resend_from_email: str = Field(default="onboarding@resend.dev", alias="RESEND_FROM_EMAIL")
    email_request_timeout_seconds: int = Field(default=8, alias="EMAIL_REQUEST_TIMEOUT_SECONDS")
    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_username: str = Field(default="", alias="SMTP_USERNAME")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from_email: str = Field(default="", alias="SMTP_FROM_EMAIL")
    smtp_use_tls: bool = Field(default=True, alias="SMTP_USE_TLS")
    smtp_timeout_seconds: int = Field(default=15, alias="SMTP_TIMEOUT_SECONDS")

    root_admin_email: str = Field(default="admin@logshield.demo", alias="ROOT_ADMIN_EMAIL")

    # URL Scanner Configuration
    url_reputation_provider: str = Field(default="virustotal", alias="URL_REPUTATION_PROVIDER")
    virustotal_api_key: str = Field(default="", alias="VIRUSTOTAL_API_KEY")
    url_scan_cache_ttl_hours: int = Field(default=24, alias="URL_SCAN_CACHE_TTL_HOURS")
    url_scan_rate_limit_per_minute: int = Field(default=10, alias="URL_SCAN_RATE_LIMIT_PER_MINUTE")

    # Email Breach Checker (RapidAPI provider)
    rapidapi_breach_key: str = Field(default="", alias="RAPIDAPI_BREACH_KEY")
    rapidapi_breach_host: str = Field(default="", alias="RAPIDAPI_BREACH_HOST")
    rapidapi_breach_url: str = Field(default="", alias="RAPIDAPI_BREACH_URL")
    rapidapi_breach_method: str = Field(default="GET", alias="RAPIDAPI_BREACH_METHOD")
    rapidapi_breach_email_param: str = Field(default="email", alias="RAPIDAPI_BREACH_EMAIL_PARAM")
    rapidapi_breach_extra_query: str = Field(default="", alias="RAPIDAPI_BREACH_EXTRA_QUERY")

    nvd_api_base_url: str = Field(default="https://services.nvd.nist.gov/rest/json/cves/2.0", alias="NVD_API_BASE_URL")
    nvd_api_key: str = Field(default="", alias="NVD_API_KEY")
    nvd_results_per_page: int = Field(default=20, alias="NVD_RESULTS_PER_PAGE")
    nvd_request_timeout_seconds: int = Field(default=15, alias="NVD_REQUEST_TIMEOUT_SECONDS")
    nvd_cache_ttl_hours: int = Field(default=24, alias="NVD_CACHE_TTL_HOURS")
    threat_search_local_first: bool = Field(default=True, alias="THREAT_SEARCH_LOCAL_FIRST")

    # Detection tuning (comma-separated lists; usernames are matched case-insensitively)
    detection_trusted_ips: str = Field(default="", alias="DETECTION_TRUSTED_IPS")
    detection_ignore_usernames: str = Field(default="", alias="DETECTION_IGNORE_USERNAMES")
    detection_sliding_window_minutes: int = Field(default=10, ge=1, le=120, alias="DETECTION_SLIDING_WINDOW_MINUTES")
    detection_correlation_window_minutes: int = Field(default=15, alias="DETECTION_CORRELATION_WINDOW_MINUTES")
    detection_brute_force_threshold: int = Field(default=5, ge=1, le=50, alias="DETECTION_BRUTE_FORCE_THRESHOLD")
    detection_http_404_threshold: int = Field(default=5, ge=1, le=100, alias="DETECTION_HTTP_404_THRESHOLD")
    detection_server_error_threshold: int = Field(default=8, ge=1, le=200, alias="DETECTION_SERVER_ERROR_THRESHOLD")
    detection_sensitive_path_hits_threshold: int = Field(default=3, ge=1, le=50, alias="DETECTION_SENSITIVE_PATH_HITS_THRESHOLD")
    detection_multi_user_failed_threshold: int = Field(default=3, ge=1, le=50, alias="DETECTION_MULTI_USER_FAILED_THRESHOLD")
    detection_correlation_failed_logins: int = Field(default=3, ge=1, le=20, alias="DETECTION_CORRELATION_FAILED_LOGINS")

    alert_webhook_url: str = Field(default="", alias="ALERT_WEBHOOK_URL")
    alert_notification_email: str = Field(default="", alias="ALERT_NOTIFICATION_EMAIL")
    ai_provider: str = Field(default="", alias="AI_PROVIDER")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")
    ai_timeout_seconds: int = Field(default=8, alias="AI_TIMEOUT_SECONDS")
    ai_max_input_chars: int = Field(default=20000, alias="AI_MAX_INPUT_CHARS")

    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR / ".env", BACKEND_DIR / ".env.local"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_development(self) -> bool:
        return self.app_env.strip().lower() == "development"

    @property
    def normalized_email_provider(self) -> str:
        provider = self.email_provider.strip().lower()
        return provider or "resend"

    @property
    def resend_configured(self) -> bool:
        return bool(self.resend_api_key.strip() and self.resend_from_email.strip())

    @property
    def smtp_configured(self) -> bool:
        if not self.smtp_host.strip() or not self.smtp_from_email.strip():
            return False
        username = self.smtp_username.strip()
        password = self.smtp_password.strip()
        if bool(username) != bool(password):
            return False
        return True

    @property
    def detection_trusted_ips_list(self) -> list[str]:
        return [ip.strip() for ip in self.detection_trusted_ips.split(",") if ip.strip()]

    @property
    def detection_ignore_usernames_set(self) -> set[str]:
        return {u.strip().lower() for u in self.detection_ignore_usernames.split(",") if u.strip()}

    @property
    def alert_webhook_configured(self) -> bool:
        return bool(self.alert_webhook_url.strip())

    @property
    def alert_email_notification_configured(self) -> bool:
        return bool(self.alert_notification_email.strip()) and self.resend_configured

    @property
    def admin_email_delivery_configured(self) -> bool:
        if not self.admin_security_email.strip():
            return False
        provider = self.normalized_email_provider
        if provider == "resend":
            return self.resend_configured
        if provider == "smtp":
            return self.smtp_configured
        return False

    @property
    def rapidapi_breach_provider_configured(self) -> bool:
        return bool(
            self.rapidapi_breach_key.strip()
            and self.rapidapi_breach_host.strip()
            and self.rapidapi_breach_url.strip()
        )

    @property
    def rapidapi_breach_provider_settings_complete(self) -> bool:
        return bool(self.rapidapi_breach_host.strip() and self.rapidapi_breach_url.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

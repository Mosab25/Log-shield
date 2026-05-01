from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SecurityControl(BaseModel):
    admin_2fa_enabled: bool
    root_admin_protected: bool
    ip_blocking_enabled: bool
    rate_limiting_enabled: bool
    rbac_enabled: bool
    audit_logging_enabled: bool


class SecurityMetrics(BaseModel):
    failed_logins_today: int
    admin_logins_today: int
    active_blocked_ips: int
    sensitive_actions_today: int
    open_critical_alerts: int
    open_incidents: int


class RecentEvent(BaseModel):
    id: int
    action: str
    actor: str | None
    ip_address: str | None
    entity_type: str | None
    created_at: datetime
    summary: str


class RecentBlockedIP(BaseModel):
    id: int
    ip_address: str
    reason: str | None
    source: str
    is_active: bool
    created_at: datetime
    expires_at: datetime | None


class Admin2FAInfo(BaseModel):
    enabled: bool
    method: str = "Email OTP"
    security_email_masked: str | None


class Recommendation(BaseModel):
    level: str  # success, info, warning, critical
    title: str
    description: str


class SecurityCenterSummary(BaseModel):
    controls: SecurityControl
    metrics: SecurityMetrics
    recent_events: list[RecentEvent]
    recent_blocked_ips: list[RecentBlockedIP]
    admin_2fa: Admin2FAInfo
    recommendations: list[Recommendation]

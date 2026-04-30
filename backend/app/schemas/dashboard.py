from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    total_logs: int
    total_normalized_logs: int
    total_alerts: int
    open_alerts: int
    critical_alerts: int
    high_risk_ips: int
    average_risk_score: float


class AlertsTimelinePoint(BaseModel):
    date: str
    total: int
    low: int
    medium: int
    high: int
    critical: int


class AlertsTimelineResponse(BaseModel):
    items: list[AlertsTimelinePoint]


class RiskDistributionItem(BaseModel):
    level: str
    count: int


class RiskDistributionResponse(BaseModel):
    total: int
    items: list[RiskDistributionItem]


class TopAttackedUserItem(BaseModel):
    username: str
    alert_count: int
    log_count: int
    max_risk_score: int
    latest_seen: datetime | None = None


class TopAttackedUsersResponse(BaseModel):
    items: list[TopAttackedUserItem]


class RecentSecurityEventItem(BaseModel):
    id: int
    timestamp: datetime | None
    source: str
    source_type: str
    event_type: str
    severity: str
    parser_status: str
    ip_address: str | None = None
    username: str | None = None
    message: str


class RecentSecurityEventsResponse(BaseModel):
    total: int
    items: list[RecentSecurityEventItem]

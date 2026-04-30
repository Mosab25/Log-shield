from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ReportDateRange(BaseModel):
    start_date: datetime
    end_date: datetime


class ReportMetric(BaseModel):
    label: str
    value: int | float | str


class ReportSummaryResponse(BaseModel):
    report_type: str
    title: str
    generated_at: datetime
    date_range: ReportDateRange
    metrics: list[ReportMetric]
    notes: list[str]


class TopRiskyIpItem(BaseModel):
    ip_address: str
    alert_count: int
    related_log_count: int
    max_risk_score: int
    latest_seen: datetime | None


class TopRiskyIpsResponse(BaseModel):
    total: int
    items: list[TopRiskyIpItem]


class MostTargetedUserItem(BaseModel):
    username: str
    alert_count: int
    log_count: int
    max_risk_score: int
    latest_seen: datetime | None


class MostTargetedUsersResponse(BaseModel):
    total: int
    items: list[MostTargetedUserItem]


class AlertsBySeverityItem(BaseModel):
    severity: str
    count: int


class AlertsBySeverityResponse(BaseModel):
    total: int
    items: list[AlertsBySeverityItem]


class OpenVsResolvedResponse(BaseModel):
    open: int
    investigating: int
    escalated: int
    resolved: int
    false_positive: int
    total: int


class MttrResponse(BaseModel):
    resolved_alerts: int
    mean_time_to_resolve_minutes: float
    mean_time_to_resolve_hours: float

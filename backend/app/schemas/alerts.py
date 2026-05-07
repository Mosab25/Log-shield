from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

AlertStatus = Literal["open", "investigating", "resolved", "false_positive", "escalated"]
AlertSeverity = Literal["low", "medium", "high", "critical"]


class UserMiniResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role_name: str | None = None


class RelatedLogResponse(BaseModel):
    id: int
    raw_log_id: int
    event_time: datetime | None
    source: str
    source_type: str
    event_type: str
    severity: str
    parser_status: str
    src_ip: str | None
    username: str | None
    hostname: str | None
    message: str
    metadata: dict[str, Any]


class AnalystNoteCreate(BaseModel):
    note: str = Field(..., min_length=2, max_length=5000)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("note cannot be empty.")
        return normalized


class AnalystNoteResponse(BaseModel):
    id: int
    alert_id: int
    analyst: UserMiniResponse | None
    note: str
    created_at: datetime
    updated_at: datetime


class AlertStatusUpdate(BaseModel):
    status: AlertStatus
    comment: str | None = Field(default=None, max_length=2000)


class AlertContainmentUpdate(BaseModel):
    contained: bool


class AlertBlockSourceIpRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class AlertAssignRequest(BaseModel):
    analyst_id: int | None = None
    comment: str | None = Field(default=None, max_length=2000)


class AlertStatusHistoryResponse(BaseModel):
    id: int
    alert_id: int
    old_status: str | None
    new_status: str
    changed_by: UserMiniResponse | None
    comment: str | None
    changed_at: datetime


class AlertListItemResponse(BaseModel):
    id: int
    title: str
    description: str | None
    severity: str
    risk_score: int
    source_ip: str | None
    username: str | None
    status: str
    contained: bool = False
    detection_explanation: str | None = None
    assigned_analyst: UserMiniResponse | None
    attack_type: str | None
    detection_rule_name: str | None
    mitre_tactic: str | None
    mitre_technique: str | None
    related_log_count: int
    notes_count: int
    created_at: datetime
    updated_at: datetime


class AlertDetailResponse(AlertListItemResponse):
    related_logs: list[RelatedLogResponse]
    analyst_notes: list[AnalystNoteResponse]
    status_history: list[AlertStatusHistoryResponse]


class AlertListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[AlertListItemResponse]


class AlertHistoryListResponse(BaseModel):
    total: int
    items: list[AlertStatusHistoryResponse]


class AlertStatsSummaryResponse(BaseModel):
    total_alerts: int
    by_status: dict[str, int]
    by_severity: dict[str, int]
    high_risk_open_alerts: int
    unassigned_open_alerts: int
    average_risk_score: float


class AlertActionResponse(BaseModel):
    message: str
    alert: AlertDetailResponse


class AnalystNoteActionResponse(BaseModel):
    message: str
    note: AnalystNoteResponse


class AlertBlockSourceIpResponse(BaseModel):
    message: str
    ip_address: str
    block_id: int

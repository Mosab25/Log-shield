from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

IncidentSeverity = Literal["low", "medium", "high", "critical"]
IncidentStatus = Literal["open", "investigating", "resolved", "closed", "false_positive"]
IncidentEvidenceType = Literal["log", "alert", "url", "text", "file_reference"]


class IncidentUserMiniResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role_name: str | None = None


class IncidentLinkedAlertResponse(BaseModel):
    id: int
    title: str
    severity: str
    status: str
    risk_score: int
    source_ip: str | None
    username: str | None
    linked_at: datetime
    linked_by: IncidentUserMiniResponse | None


class IncidentTimelineEventResponse(BaseModel):
    id: int
    incident_id: int
    event_type: str
    message: str
    actor: IncidentUserMiniResponse | None
    created_at: datetime
    metadata: dict[str, Any] | None


class IncidentEvidenceResponse(BaseModel):
    id: int
    incident_id: int
    title: str
    evidence_type: str
    content: str
    related_log_id: int | None
    related_alert_id: int | None
    added_by: IncidentUserMiniResponse | None
    created_at: datetime


class IncidentNoteResponse(BaseModel):
    id: int
    incident_id: int
    author: IncidentUserMiniResponse | None
    note: str
    created_at: datetime
    updated_at: datetime


class IncidentListItemResponse(BaseModel):
    id: int
    title: str
    description: str | None
    severity: str
    status: str
    owner: IncidentUserMiniResponse | None
    created_by: IncidentUserMiniResponse | None
    linked_alerts_count: int
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None
    closed_at: datetime | None


class IncidentDetailResponse(IncidentListItemResponse):
    linked_alerts: list[IncidentLinkedAlertResponse]
    timeline: list[IncidentTimelineEventResponse]
    evidence: list[IncidentEvidenceResponse]
    notes: list[IncidentNoteResponse]


class IncidentListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[IncidentListItemResponse]


class IncidentTimelineListResponse(BaseModel):
    total: int
    items: list[IncidentTimelineEventResponse]


class IncidentActionResponse(BaseModel):
    message: str
    incident: IncidentDetailResponse


class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=8000)
    severity: IncidentSeverity = "medium"
    status: IncidentStatus = "open"
    owner_user_id: int | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("title cannot be empty.")
        return normalized

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class IncidentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=8000)
    severity: IncidentSeverity | None = None
    status: IncidentStatus | None = None
    owner_user_id: int | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("title cannot be empty.")
        return normalized

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class IncidentAlertLinkRequest(BaseModel):
    alert_id: int


class IncidentEvidenceCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    evidence_type: IncidentEvidenceType
    content: str = Field(..., min_length=1, max_length=12000)
    related_log_id: int | None = None
    related_alert_id: int | None = None

    @field_validator("title", "content")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("value cannot be empty.")
        return normalized


class IncidentEvidenceActionResponse(BaseModel):
    message: str
    evidence: IncidentEvidenceResponse


class IncidentNoteCreate(BaseModel):
    note: str = Field(..., min_length=2, max_length=5000)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("note cannot be empty.")
        return normalized


class IncidentNoteActionResponse(BaseModel):
    message: str
    note: IncidentNoteResponse

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

ThreatEntryType = Literal["vulnerability", "attack_pattern", "cve", "mitre_technique", "ioc"]
ThreatSeverity = Literal["low", "medium", "high", "critical"]
ThreatSource = Literal["manual", "nvd_api", "internal_seed"]
ThreatStatus = Literal["draft", "pending_review", "approved", "rejected", "archived"]
ThreatIndicatorType = Literal["ip", "domain", "url", "hash", "email", "user_agent", "file_path", "registry_key", "other"]
ThreatReviewDecision = Literal["approved", "rejected", "changes_requested", "archived"]


# ── Shared mini ──────────────────────────────────────────────
class UserMiniResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role_name: str | None = None


# ── Indicator ────────────────────────────────────────────────
class ThreatIndicatorCreate(BaseModel):
    indicator_type: ThreatIndicatorType
    indicator_value: str = Field(..., min_length=1, max_length=512)
    description: str | None = None


class ThreatIndicatorResponse(BaseModel):
    id: int
    threat_entry_id: int
    indicator_type: str
    indicator_value: str
    description: str | None
    created_at: datetime


# ── Tag ──────────────────────────────────────────────────────
class ThreatTagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)


class ThreatTagResponse(BaseModel):
    id: int
    name: str
    slug: str
    created_at: datetime


# ── Reference ────────────────────────────────────────────────
class ThreatReferenceCreate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    url: str = Field(..., min_length=1, max_length=1024)
    source_name: str | None = Field(default=None, max_length=120)


class ThreatReferenceResponse(BaseModel):
    id: int
    threat_entry_id: int
    title: str | None
    url: str
    source_name: str | None
    created_at: datetime


# ── Review ───────────────────────────────────────────────────
class ThreatReviewCreate(BaseModel):
    decision: ThreatReviewDecision
    comment: str | None = Field(default=None, max_length=5000)


class ThreatReviewResponse(BaseModel):
    id: int
    threat_entry_id: int
    reviewer: UserMiniResponse | None
    decision: str
    comment: str | None
    created_at: datetime


# ── Alert-Threat Link ────────────────────────────────────────
class AlertThreatLinkCreate(BaseModel):
    alert_id: int
    confidence: Decimal | None = Field(default=None, ge=0, le=100)
    reason: str | None = Field(default=None, max_length=5000)


class AlertThreatLinkResponse(BaseModel):
    alert_id: int
    threat_entry_id: int
    confidence: Decimal | None
    reason: str | None
    created_at: datetime


# ── Threat Entry ─────────────────────────────────────────────
class ThreatEntryCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    type: ThreatEntryType
    category: str | None = Field(default=None, max_length=120)
    severity: ThreatSeverity
    description: str = Field(..., min_length=1)
    cve_id: str | None = Field(default=None, max_length=50)
    cvss_score: Decimal | None = Field(default=None, ge=0, le=10)
    mitre_tactic: str | None = Field(default=None, max_length=120)
    mitre_technique: str | None = Field(default=None, max_length=50)
    affected_systems: dict[str, Any] | None = None
    detection_logic: str | None = None
    mitigation: str | None = None
    source: ThreatSource = "manual"
    indicators: list[ThreatIndicatorCreate] = Field(default_factory=list)
    references: list[ThreatReferenceCreate] = Field(default_factory=list)
    tag_names: list[str] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title cannot be empty.")
        return v


class ThreatEntryUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=120)
    severity: ThreatSeverity | None = None
    description: str | None = None
    cve_id: str | None = Field(default=None, max_length=50)
    cvss_score: Decimal | None = Field(default=None, ge=0, le=10)
    mitre_tactic: str | None = Field(default=None, max_length=120)
    mitre_technique: str | None = Field(default=None, max_length=50)
    affected_systems: dict[str, Any] | None = None
    detection_logic: str | None = None
    mitigation: str | None = None
    status: ThreatStatus | None = None


class ThreatEntryListItemResponse(BaseModel):
    id: int
    title: str
    slug: str
    type: str
    category: str | None
    severity: str
    cve_id: str | None
    cvss_score: Decimal | None
    mitre_tactic: str | None
    mitre_technique: str | None
    source: str
    status: str
    submitted_by: UserMiniResponse | None
    reviewed_by: UserMiniResponse | None
    tags: list[ThreatTagResponse]
    indicator_count: int
    created_at: datetime
    updated_at: datetime


class ThreatEntryDetailResponse(ThreatEntryListItemResponse):
    description: str
    affected_systems: dict[str, Any] | None
    detection_logic: str | None
    mitigation: str | None
    review_comment: str | None
    approved_at: datetime | None
    indicators: list[ThreatIndicatorResponse]
    references: list[ThreatReferenceResponse]
    reviews: list[ThreatReviewResponse]
    linked_alerts: list[AlertThreatLinkResponse]


class ThreatEntryListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[ThreatEntryListItemResponse]


class ThreatEntryActionResponse(BaseModel):
    message: str
    entry: ThreatEntryDetailResponse


class ThreatStatsSummaryResponse(BaseModel):
    total_entries: int
    by_type: dict[str, int]
    by_severity: dict[str, int]
    by_status: dict[str, int]
    by_source: dict[str, int]

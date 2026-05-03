from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class NormalizeBatchRequest(BaseModel):
    raw_log_ids: list[int] | None = None
    limit: int = 100


class NormalizedLogResponse(BaseModel):
    id: int
    raw_log_id: int
    timestamp: datetime | None
    source: str
    source_type: str
    event_type: str
    username: str | None
    ip_address: str | None
    hostname: str | None
    user_agent: str | None
    status: str | None
    http_method: str | None
    path: str | None
    status_code: int | None
    message: str
    severity: str
    parser_status: str
    metadata: dict[str, Any]
    created_at: datetime


class NormalizedLogListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[NormalizedLogResponse]


class SecurityEventLogResponse(BaseModel):
    id: int
    timestamp: datetime | None
    source: str | None = None
    event_type: str | None = None
    event_label: str | None = None
    category: str | None = None
    severity: str | None = None
    username: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    method: str | None = None
    endpoint: str | None = None
    status: str | None = None
    status_code: int | None = None
    message: str
    attack_type: str | None = None
    mitre_technique: str | None = None
    risk_score: int | None = None
    icon: str | None = None


class SecurityEventLogListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[SecurityEventLogResponse]

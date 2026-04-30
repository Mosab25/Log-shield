from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field, ConfigDict

SourceType = Literal["web_server", "auth_service", "application"]


class RawLogCreate(BaseModel):
    source: str = Field(..., min_length=2, max_length=120)
    source_type: SourceType
    raw_message: str = Field(..., min_length=1)
    received_at: datetime | None = None
    ip_address: str | None = None
    hostname: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class BulkRawLogCreate(BaseModel):
    logs: list[RawLogCreate] = Field(..., min_length=1, max_length=500)


class RawLogResponse(BaseModel):
    id: int
    source: str
    source_type: str
    raw_message: str
    received_at: datetime
    event_time: datetime | None
    parsed_json: dict[str, Any]
    ingestion_status: str
    error_message: str | None
    ip_address: str | None
    hostname: str | None
    metadata: dict[str, Any]
    created_at: datetime


class RawLogListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[RawLogResponse]

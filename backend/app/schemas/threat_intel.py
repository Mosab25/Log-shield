from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field


class ThreatIntelSearchRequest(BaseModel):
    q: str = Field(..., min_length=1, max_length=200)
    severity: Literal["low", "medium", "high", "critical"] | None = None
    source: Literal["local", "nvd_api", "all"] | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    include_external: bool = Field(default=True)


class ThreatIntelResultItem(BaseModel):
    id: int | None
    title: str
    slug: str
    type: str
    category: str | None
    severity: str
    cve_id: str | None
    cvss_score: Decimal | None
    source: str
    status: str
    tags: list[dict[str, Any]]
    indicator_count: int
    external_published_at: datetime | None
    external_last_modified_at: datetime | None
    created_at: datetime | None
    result_source: Literal["local", "cached", "nvd_api"]


class ThreatIntelSearchResponse(BaseModel):
    query: str
    results: list[ThreatIntelResultItem]
    total: int
    source_summary: dict[str, int]
    external_source_unavailable: bool
    message: str | None


class CVELookupResponse(BaseModel):
    found: bool
    source: Literal["local", "cached", "nvd_api"]
    cve_id: str
    entry_id: int | None = None
    created_at: datetime | None = None
    nvd_data: dict[str, Any] | None = None
    message: str | None = None


class CVEImportResponse(BaseModel):
    message: str
    entry_id: int | None = None
    cve_id: str | None = None
    created_at: datetime | None = None

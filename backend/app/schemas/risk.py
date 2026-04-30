from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

RiskLevel = Literal["low", "medium", "high", "critical"]


class RiskFactorBreakdown(BaseModel):
    factor: str
    points: int
    reason: str


class RiskScoreResponse(BaseModel):
    id: int
    alert_id: int | None
    normalized_log_id: int | None
    score: int
    severity: RiskLevel
    explanation: str | None
    factors: list[RiskFactorBreakdown]
    raw_factors: dict[str, Any]
    calculated_at: datetime


class CalculateRiskResponse(BaseModel):
    message: str
    risk: RiskScoreResponse


class RecalculateAllRequest(BaseModel):
    limit: int = Field(default=100, ge=1, le=500)
    status: str | None = None


class RecalculateAllResponse(BaseModel):
    message: str
    total_processed: int
    results: list[RiskScoreResponse]


class HighRiskIpResponse(BaseModel):
    ip_address: str
    max_score: int
    severity: RiskLevel
    alert_count: int
    related_log_count: int
    latest_seen: datetime | None
    reasons: list[str]


class HighRiskIpListResponse(BaseModel):
    total: int
    items: list[HighRiskIpResponse]


class RiskDistributionResponse(BaseModel):
    total: int
    low: int
    medium: int
    high: int
    critical: int

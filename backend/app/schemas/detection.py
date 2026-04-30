from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Severity = Literal["low", "medium", "high", "critical"]


class DetectionRuleCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=150)
    description: str | None = None
    category: str = Field(..., min_length=2, max_length=80)
    severity: Severity
    pattern_type: str = "logic"
    pattern: str
    risk_weight: int = Field(default=10, ge=0, le=100)
    is_active: bool = True
    mitre_tactic: str | None = None
    mitre_technique: str | None = None


class DetectionRuleUpdate(BaseModel):
    description: str | None = None
    severity: Severity | None = None
    risk_weight: int | None = Field(default=None, ge=0, le=100)
    is_active: bool | None = None
    mitre_tactic: str | None = None
    mitre_technique: str | None = None


class DetectionRuleResponse(BaseModel):
    id: int
    name: str
    description: str | None
    category: str
    severity: str
    pattern_type: str
    pattern: str
    risk_weight: int
    is_active: bool
    mitre_tactic: str | None
    mitre_technique: str | None
    created_by_id: int | None
    created_at: datetime
    updated_at: datetime
    trigger_count: int = 0
    last_triggered_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class DetectionRuleListResponse(BaseModel):
    total: int
    items: list[DetectionRuleResponse]


class RunBatchRequest(BaseModel):
    normalized_log_ids: list[int] | None = None
    limit: int = Field(default=100, ge=1, le=1000)
    only_without_alerts: bool = False


class DetectionRunResponse(BaseModel):
    message: str
    alerts_created: int
    alert_ids: list[int]

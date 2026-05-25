"""Schemas for the Website Security Analyzer endpoint."""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator
from typing import Any


class WebsiteAnalyzerRequest(BaseModel):
    """Request body for website security scan."""
    url: str = Field(..., min_length=1, max_length=2048, description="URL to analyze")
    authorized: bool = Field(..., description="User confirms ownership or permission to scan")

    @field_validator("url")
    @classmethod
    def validate_url_format(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("URL cannot be empty.")
        return v


class WebsiteAnalyzerTarget(BaseModel):
    input_url: str = ""
    final_url: str = ""
    hostname: str = ""
    scheme: str = ""


class WebsiteAnalyzerOverall(BaseModel):
    risk_score: int = 0
    risk_level: str = "low"
    summary: str = ""
    risk_explanation: str = ""
    top_priorities: list[str] = Field(default_factory=list)


class WebsiteAnalyzerFinding(BaseModel):
    id: str = ""
    title: str = ""
    severity: str = "informational"
    confidence: str = "high"
    original_severity: str | None = None
    adjustment_reason: str | None = None
    analyst_note: str | None = None
    category: str = ""
    owasp_category: str = ""
    evidence: str = ""
    impact: str = ""
    recommendation: str = ""
    priority: int = 1


class RoadmapItem(BaseModel):
    priority: int = 1
    action: str = ""
    effort: str = "low"
    impact: str = "low"
    findings: list[str] = Field(default_factory=list)


class WebsiteAnalyzerSafetyModel(BaseModel):
    authorized_confirmed: bool = True
    non_invasive: bool = True
    exploits_used: bool = False
    forms_submitted: bool = False
    bruteforce_used: bool = False
    html_rendered: bool = False
    javascript_executed: bool = False
    links_followed: bool = False
    raw_html_stored: bool = False
    max_paths_checked: int = 12
    note: str = "This assessment uses safe non-invasive checks only."


class WebsiteAnalyzerContext(BaseModel):
    known_provider_domain: bool = False
    provider_family: str | None = None
    note: str = ""
    adjusted_findings: int = 0


class WebsiteAnalyzerOwaspSummaryItem(BaseModel):
    category: str = ""
    count: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    informational: int = 0


class WebsiteAnalyzerContextTuningSummary(BaseModel):
    enabled: bool = True
    adjusted_findings_count: int = 0
    downgraded_findings_count: int = 0
    upgraded_findings_count: int = 0
    notes: list[str] = Field(default_factory=list)


class WebsiteAnalyzerResponse(BaseModel):
    mode: str = "safe_non_invasive_scan"
    target: WebsiteAnalyzerTarget = Field(default_factory=WebsiteAnalyzerTarget)
    overall: WebsiteAnalyzerOverall = Field(default_factory=WebsiteAnalyzerOverall)
    context: WebsiteAnalyzerContext = Field(default_factory=WebsiteAnalyzerContext)
    context_tuning_summary: WebsiteAnalyzerContextTuningSummary = Field(default_factory=WebsiteAnalyzerContextTuningSummary)
    severity_summary: dict[str, int] = Field(default_factory=dict)
    owasp_summary: list[WebsiteAnalyzerOwaspSummaryItem] = Field(default_factory=list)
    checks: dict[str, Any] = Field(default_factory=dict)
    findings: list[WebsiteAnalyzerFinding] = Field(default_factory=list)
    roadmap: list[RoadmapItem] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    safety_model: WebsiteAnalyzerSafetyModel = Field(default_factory=WebsiteAnalyzerSafetyModel)

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

AiMode = Literal["ai_provider", "local_fallback"]
AiVerdict = Literal["benign", "suspicious", "attack_detected", "insufficient_data"]
AiAttackType = Literal[
    "credential_attack",
    "web_attack",
    "privilege_escalation",
    "reconnaissance",
    "malware_indicator",
    "policy_violation",
    "unknown",
]
AiSeverity = Literal["informational", "low", "medium", "high", "critical"]


class MitreMapping(BaseModel):
    technique_id: str
    technique_name: str
    tactic: str
    reason: str


class ExtractedIocs(BaseModel):
    ips: list[str] = Field(default_factory=list)
    domains: list[str] = Field(default_factory=list)
    urls: list[str] = Field(default_factory=list)
    hashes: list[str] = Field(default_factory=list)


class ReportDraft(BaseModel):
    executive_summary: str = ""
    technical_summary: str = ""
    timeline: list[str] = Field(default_factory=list)
    iocs: list[str] = Field(default_factory=list)
    mitre: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    conclusion: str = ""


class SafetyModel(BaseModel):
    executed: bool = False
    rendered_as_html: bool = False
    note: str = "Input is analyzed as untrusted plain text only."


class AiAnalysisResult(BaseModel):
    mode: AiMode
    verdict: AiVerdict
    attack_type: AiAttackType
    severity: AiSeverity
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    risk_score: int = Field(default=0, ge=0, le=100)
    summary: str = ""
    risk_reasons: list[str] = Field(default_factory=list)
    mitre_mappings: list[MitreMapping] = Field(default_factory=list)
    extracted_iocs: ExtractedIocs = Field(default_factory=ExtractedIocs)
    recommended_actions: list[str] = Field(default_factory=list)
    analyst_notes: str = ""
    report_draft: ReportDraft = Field(default_factory=ReportDraft)
    safety_model: SafetyModel = Field(default_factory=SafetyModel)


class AiAnalyzeLogsRequest(BaseModel):
    raw_logs: str = Field(..., min_length=1, max_length=40000)
    context: str | None = Field(default=None, max_length=5000)

    @field_validator("raw_logs")
    @classmethod
    def normalize_raw_logs(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("raw_logs cannot be empty.")
        return normalized


class AiSummarizeIncidentRequest(BaseModel):
    incident_id: int | None = None
    incident_title: str | None = Field(default=None, max_length=400)
    incident_text: str = Field(..., min_length=1, max_length=40000)
    incident_severity: str | None = Field(default=None, max_length=32)
    incident_status: str | None = Field(default=None, max_length=32)

    @field_validator("incident_text")
    @classmethod
    def normalize_incident_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("incident_text cannot be empty.")
        return normalized


class AiGenerateReportRequest(BaseModel):
    title: str | None = Field(default=None, max_length=400)
    source_text: str = Field(..., min_length=1, max_length=50000)
    context: str | None = Field(default=None, max_length=6000)

    @field_validator("source_text")
    @classmethod
    def normalize_source_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("source_text cannot be empty.")
        return normalized

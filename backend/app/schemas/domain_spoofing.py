from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class DomainSpoofingRequest(BaseModel):
    domain: str = Field(..., min_length=1, max_length=253)
    authorized: bool = Field(default=False)
    max_variants: int = Field(default=20, ge=10, le=50)

    @field_validator("domain")
    @classmethod
    def validate_domain_not_empty(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("Please enter a valid domain.")
        return normalized


class DomainSpoofingTarget(BaseModel):
    domain: str
    brand: str
    tld: str


class DomainSpoofingSummary(BaseModel):
    variants_generated: int = 0
    registered_or_resolving: int = 0
    mx_enabled: int = 0
    highest_risk: Literal["informational", "low", "medium", "high", "critical"] = "low"
    top_priorities: list[str] = Field(default_factory=list)


class DomainSpoofingVariant(BaseModel):
    domain: str
    technique: str
    dns_resolves: bool = False
    a_records: list[str] = Field(default_factory=list)
    aaaa_records: list[str] = Field(default_factory=list)
    cname_records: list[str] = Field(default_factory=list)
    mx_records: list[str] = Field(default_factory=list)
    txt_records: list[str] = Field(default_factory=list)
    ns_records: list[str] = Field(default_factory=list)
    has_mx: bool = False
    has_spf_like_txt: bool = False
    risk_level: Literal["informational", "low", "medium", "high", "critical"] = "low"
    reason: str = ""
    recommendation: str = ""


class DomainSpoofingFinding(BaseModel):
    id: str
    title: str
    severity: Literal["informational", "low", "medium", "high", "critical"]
    category: str = "Brand Protection"
    owasp_category: str = "Security Logging and Monitoring Failures"
    evidence: str
    impact: str
    recommendation: str
    priority: int = 1


class DomainSpoofingSafetyModel(BaseModel):
    authorized_confirmed: bool = True
    passive_dns_only: bool = True
    phishing_content_generated: bool = False
    domains_registered: bool = False
    high_volume_scan: bool = False
    note: str = "This tool performs limited defensive lookalike-domain monitoring only."


class DomainSpoofingResponse(BaseModel):
    mode: str = "domain_spoofing_defense"
    target: DomainSpoofingTarget
    summary: DomainSpoofingSummary
    variants: list[DomainSpoofingVariant] = Field(default_factory=list)
    findings: list[DomainSpoofingFinding] = Field(default_factory=list)
    safety_model: DomainSpoofingSafetyModel = Field(default_factory=DomainSpoofingSafetyModel)

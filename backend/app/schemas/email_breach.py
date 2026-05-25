from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


EMAIL_PATTERN = r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$"


class EmailBreachCheckRequest(BaseModel):
    emails: list[str] = Field(default_factory=list)
    authorized: bool = Field(default=False)

    @field_validator("emails")
    @classmethod
    def validate_emails_list(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("No valid email addresses were found.")
        if len(value) > 100:
            raise ValueError("More than 100 emails were detected. Only the first 100 will be checked.")
        return value


class EmailBreachDetail(BaseModel):
    name: str = ""
    domain: str = ""
    breach_date: str = ""
    data_classes: list[str] = Field(default_factory=list)
    description: str = ""


class EmailBreachResult(BaseModel):
    email: str
    email_normalized: str | None = None
    exposed: bool = False
    status: Literal["exposed", "not_found", "unknown", "provider_error"] = "unknown"
    breach_count: int = 0
    breaches: list[EmailBreachDetail] = Field(default_factory=list)
    risk_level: Literal["low", "medium", "high", "critical"] = "low"
    recommendations: list[str] = Field(default_factory=list)


class EmailBreachSummary(BaseModel):
    total_checked: int = 0
    exposed_count: int = 0
    not_found_count: int = 0
    unknown_count: int = 0
    highest_risk: Literal["low", "medium", "high", "critical"] = "low"
    top_priorities: list[str] = Field(default_factory=list)


class EmailBreachFinding(BaseModel):
    id: str
    title: str
    severity: Literal["informational", "low", "medium", "high", "critical"]
    category: str = "Account Exposure"
    owasp_category: str = "Identification and Authentication Failures"
    evidence: str
    impact: str
    recommendation: str
    priority: int = 1


class EmailBreachSafetyModel(BaseModel):
    authorized_confirmed: bool = True
    passwords_collected: bool = False
    credentials_tested: bool = False
    emails_stored: bool = False
    uploaded_files_stored: bool = False
    external_provider_used: bool = True
    note: str = "This tool checks email exposure using a configured provider and does not test credentials."


class EmailBreachCheckResponse(BaseModel):
    mode: str = "email_breach_check"
    provider: str = "rapidapi"
    provider_configured: bool = False
    summary: EmailBreachSummary = Field(default_factory=EmailBreachSummary)
    results: list[EmailBreachResult] = Field(default_factory=list)
    findings: list[EmailBreachFinding] = Field(default_factory=list)
    safety_model: EmailBreachSafetyModel = Field(default_factory=EmailBreachSafetyModel)

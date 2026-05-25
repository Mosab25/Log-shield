from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class EmailHeaderAnalysisRequest(BaseModel):
    raw_headers: str = Field(..., min_length=1, max_length=50000)

    @field_validator("raw_headers")
    @classmethod
    def normalize_headers(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Email headers input cannot be empty.")
        return normalized


class EmailHeaderSummary(BaseModel):
    from_value: str = Field(default="not found", alias="from")
    reply_to: str = "not found"
    return_path: str = "not found"
    subject: str = "not found"
    date: str = "not found"
    message_id: str = "not found"
    received_hops: int = 0


class EmailHeaderAuthentication(BaseModel):
    spf: Literal["pass", "review", "not found"] = "not found"
    dkim: Literal["pass", "review", "not found"] = "not found"
    dmarc: Literal["pass", "review", "not found"] = "not found"


class EmailHeaderSafetyModel(BaseModel):
    rendered_as_html: bool = False
    external_requests: bool = False
    note: str = "Headers are analyzed as untrusted plain text only."


class EmailHeaderAnalysisResponse(BaseModel):
    summary: EmailHeaderSummary
    authentication: EmailHeaderAuthentication
    suspicious_signals: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    verdict: Literal["safe", "suspicious", "malicious"] = "safe"
    severity: Literal["low", "medium", "high"] = "low"
    risk_score: int = Field(default=0, ge=0, le=100)
    safety_model: EmailHeaderSafetyModel = Field(default_factory=EmailHeaderSafetyModel)


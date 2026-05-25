from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class URLScanRequest(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048, description="URL to scan for reputation")


class URLScanSummary(BaseModel):
    malicious: int = Field(..., description="Number of engines that detected malicious")
    suspicious: int = Field(..., description="Number of engines that detected suspicious")
    harmless: int = Field(..., description="Number of engines that detected harmless")
    undetected: int = Field(..., description="Number of engines that detected nothing")


class URLScanRawReference(BaseModel):
    provider_id: str = Field(..., description="Provider-specific ID")
    permalink: str = Field(..., description="Link to provider's detailed analysis")


class URLScanEngineResult(BaseModel):
    engine: str = Field(..., description="Security engine name")
    category: str = Field(..., description="Provider category")
    result: str = Field(..., description="Engine result")
    method: str | None = Field(None, description="Detection method")


class URLScanScoreBreakdown(BaseModel):
    formula: str = Field(..., description="How LogShield calculated the displayed score")
    explanation: str = Field(..., description="Human-readable score explanation")
    engine_total: int = Field(default=0, description="Total engines represented by provider counts")
    provider_error: str | None = Field(None, description="Provider error if fallback was used")
    engine_results: list[URLScanEngineResult] = Field(default_factory=list, description="Engines that affected the verdict")


class URLScanParsedUrl(BaseModel):
    scheme: str = Field(..., description="URL scheme")
    hostname: str = Field(..., description="Parsed hostname")
    path: str = Field(..., description="Parsed URL path")


class URLScanSafetyModel(BaseModel):
    visited_url: bool = Field(default=False, description="Whether LogShield visited the submitted URL")
    executed_content: bool = Field(default=False, description="Whether LogShield executed URL content")
    note: str = Field(default="URL was analyzed using static indicators only.", description="Safety note")


class URLScanResponse(BaseModel):
    id: int | None = Field(None, description="Scan result ID")
    url: str = Field(..., description="Original submitted URL")
    normalized_url: str = Field(..., description="Normalized URL for analysis")
    status: str = Field(..., description="Overall status: safe, suspicious, malicious, unknown")
    score: int = Field(..., ge=0, le=100, description="Risk score (0-100)")
    provider: str = Field(..., description="Reputation provider used")
    summary: URLScanSummary = Field(..., description="Detection summary from provider")
    categories: list[str] = Field(default_factory=list, description="Categories from provider")
    last_analysis_date: datetime | None = Field(None, description="When provider last analyzed this URL")
    recommendation: str = Field(..., description="Safety recommendation")
    summary_text: str | None = Field(None, description="Human-readable result summary")
    confidence_note: str | None = Field(None, description="Confidence and data-source note")
    score_breakdown: URLScanScoreBreakdown | None = Field(None, description="Explainable score breakdown")
    raw_reference: URLScanRawReference = Field(..., description="Provider reference information")
    scanned_at: datetime = Field(..., description="When LogShield scanned this URL")
    scanned_by: str = Field(..., description="User who requested the scan")
    mode: str = Field(default="external_provider", description="external_provider or local_fallback")
    severity: str | None = Field(None, description="Local fallback severity")
    reasons: list[str] = Field(default_factory=list, description="Static analysis reasons")
    parsed_url: URLScanParsedUrl | None = Field(None, description="Parsed URL details")
    recommended_actions: list[str] = Field(default_factory=list, description="Recommended analyst actions")
    safety_model: URLScanSafetyModel | None = Field(None, description="Safety properties of the scan")


class URLScanHistoryItem(BaseModel):
    id: int = Field(..., description="Scan result ID")
    url: str = Field(..., description="Submitted URL")
    status: str = Field(..., description="Scan result status")
    provider: str = Field(..., description="Provider used")
    score: int = Field(..., description="Risk score")
    scanned_at: datetime = Field(..., description="When scan was performed")
    scanned_by: str = Field(..., description="User who requested scan")


class URLScanHistoryResponse(BaseModel):
    scans: list[URLScanHistoryItem] = Field(..., description="List of scan results")
    total: int = Field(..., description="Total number of scans")
    page: int = Field(default=1, description="Current page")
    per_page: int = Field(default=50, description="Items per page")


class URLScanStatistics(BaseModel):
    total_scans: int = Field(..., description="Total scans in period")
    status_counts: dict[str, int] = Field(..., description="Count by status")
    malicious_today: int = Field(..., description="Malicious URLs found today")
    period_days: int = Field(..., description="Period in days")


class URLScanErrorResponse(BaseModel):
    error: str = Field(..., description="Error message")
    url: str | None = Field(None, description="URL that caused the error")
    details: dict[str, Any] = Field(default_factory=dict, description="Additional error details")

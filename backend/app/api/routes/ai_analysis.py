from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import require_roles
from app.models.user import User
from app.schemas.ai_analysis import (
    AiAnalysisResult,
    AiAnalyzeLogsRequest,
    AiGenerateReportRequest,
    AiSummarizeIncidentRequest,
)
from app.services.ai_analysis_service import AiAnalysisService

router = APIRouter()


@router.post("/logs", response_model=AiAnalysisResult)
def analyze_logs(
    payload: AiAnalyzeLogsRequest,
    current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))],
):
    _ = current_user
    return AiAnalysisService.analyze_logs(raw_logs=payload.raw_logs, context=payload.context)


@router.post("/incident-summary", response_model=AiAnalysisResult)
def summarize_incident(
    payload: AiSummarizeIncidentRequest,
    current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))],
):
    _ = current_user
    return AiAnalysisService.summarize_incident(
        incident_text=payload.incident_text,
        incident_title=payload.incident_title,
        incident_severity=payload.incident_severity,
        incident_status=payload.incident_status,
    )


@router.post("/report-draft", response_model=AiAnalysisResult)
def generate_report_draft(
    payload: AiGenerateReportRequest,
    current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))],
):
    _ = current_user
    return AiAnalysisService.generate_report_draft(
        title=payload.title,
        source_text=payload.source_text,
        context=payload.context,
    )

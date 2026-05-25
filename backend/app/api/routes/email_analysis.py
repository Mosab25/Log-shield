from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_roles
from app.models.user import User
from app.schemas.email_analysis import EmailHeaderAnalysisRequest, EmailHeaderAnalysisResponse
from app.services.email_analysis_service import EmailAnalysisService

router = APIRouter()
logger = logging.getLogger("logshield.email_analysis")


@router.post("/headers", response_model=EmailHeaderAnalysisResponse)
def analyze_email_headers(
    payload: EmailHeaderAnalysisRequest,
    current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))],
) -> dict:
    _ = current_user
    try:
        return EmailAnalysisService.analyze_headers(payload.raw_headers)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        logger.exception("Email header analysis failed.")
        raise HTTPException(
            status_code=500,
            detail="Email analysis service is unavailable. Please check backend connection.",
        )


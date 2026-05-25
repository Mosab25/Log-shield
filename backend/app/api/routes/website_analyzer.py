"""Website Security Analyzer API route."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.schemas.website_analyzer import (
    WebsiteAnalyzerRequest,
    WebsiteAnalyzerResponse,
)
from app.services.website_analyzer_service import run_scan, validate_url

router = APIRouter()
logger = logging.getLogger("logshield.website_analyzer")


@router.post("/scan", response_model=WebsiteAnalyzerResponse)
async def scan_website(request: WebsiteAnalyzerRequest) -> dict:
    """
    Perform a safe, non-invasive security assessment of a website.

    Only GET/HEAD requests are used. No exploitation, brute-forcing,
    form submission, or destructive actions.
    """
    # Check authorization confirmation
    if not request.authorized:
        raise HTTPException(
            status_code=400,
            detail="Please confirm you own this website or have permission to scan it.",
        )

    # Validate URL
    try:
        validate_url(request.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Run scan
    try:
        result = await run_scan(request.url)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Website scan failed for URL: %s", request.url[:120])
        raise HTTPException(
            status_code=500,
            detail="Website analyzer service is unavailable. Please check backend connection.",
        )

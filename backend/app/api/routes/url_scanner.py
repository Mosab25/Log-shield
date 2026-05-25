from __future__ import annotations

import ast
import json
from typing import Annotated

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.url_scanner import (
    URLScanErrorResponse,
    URLScanEngineResult,
    URLScanHistoryItem,
    URLScanHistoryResponse,
    URLScanRequest,
    URLScanResponse,
    URLScanScoreBreakdown,
    URLScanStatistics,
)
from app.services.url_scanner_service import URLScannerService

router = APIRouter()
logger = logging.getLogger("logshield.url_scanner")


def _parse_categories(raw_categories: str | None) -> list[str]:
    if not raw_categories:
        return []
    try:
        parsed = json.loads(raw_categories)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except Exception:
        pass
    # Backward compatibility with old stored format like "['a', 'b']".
    try:
        parsed = ast.literal_eval(raw_categories)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except Exception:
        pass
    return []


def _parse_raw_summary(raw_summary: str | None) -> dict:
    if not raw_summary:
        return {}
    try:
        parsed = json.loads(raw_summary)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        pass
    # Backward compatibility with older rows stored using Python repr().
    try:
        parsed = ast.literal_eval(raw_summary)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _build_score_breakdown(result) -> URLScanScoreBreakdown:
    raw_summary = _parse_raw_summary(result.raw_summary)
    provider_error = raw_summary.get("provider_error") or raw_summary.get("error")
    provider_error = provider_error if isinstance(provider_error, str) else None
    mode = str(raw_summary.get("mode") or ("local_fallback" if result.provider == "local_fallback" else "external_provider"))
    is_local_fallback = mode == "local_fallback" or result.provider == "local_fallback"
    status = "unknown" if is_local_fallback and result.status == "safe" else result.status
    engine_results = []
    for item in raw_summary.get("engine_results", []):
        if isinstance(item, dict):
            engine_results.append(
                URLScanEngineResult(
                    engine=str(item.get("engine", "Unknown engine")),
                    category=str(item.get("category", "unknown")),
                    result=str(item.get("result", item.get("category", "unknown"))),
                    method=str(item.get("method")) if item.get("method") else None,
                )
            )

    engine_total = (
        result.malicious_count
        + result.suspicious_count
        + result.harmless_count
        + result.undetected_count
    )

    if is_local_fallback:
        formula = "static URL indicator scoring only"
        if status == "suspicious":
            explanation = (
                "LogShield found suspicious static URL indicators and raised the "
                "score without visiting or executing the URL."
            )
        else:
            explanation = (
                "External reputation data was unavailable, so LogShield used static "
                "URL indicators only and kept the verdict unknown instead of calling it safe."
            )
    elif status == "malicious":
        formula = "min(100, malicious engines x 10)"
        explanation = (
            f"{result.malicious_count} engine(s) marked the URL as malicious, "
            "so LogShield raised the risk score based on malicious detections."
        )
    elif status == "suspicious":
        formula = "min(80, suspicious engines x 5 + 20)"
        explanation = (
            f"{result.suspicious_count} engine(s) marked the URL as suspicious, "
            "so LogShield added a suspicious baseline plus engine weight."
        )
    elif status == "safe":
        formula = "0 when providers report harmless detections and no malicious/suspicious hits"
        explanation = (
            f"{result.harmless_count} engine(s) reported harmless and no engine "
            "reported malicious or suspicious."
        )
    else:
        formula = "50 fallback when reliable provider verdict is unavailable"
        explanation = (
            "LogShield could not get a reliable provider verdict for this scan, "
            "so it uses a neutral unknown score instead of calling the URL safe."
        )

    return URLScanScoreBreakdown(
        formula=formula,
        explanation=explanation,
        engine_total=engine_total,
        provider_error=provider_error,
        engine_results=engine_results,
    )


def _build_scan_response(result, scanned_by: str) -> URLScanResponse:
    raw_summary = _parse_raw_summary(result.raw_summary)
    mode = str(raw_summary.get("mode") or ("local_fallback" if result.provider == "local_fallback" else "external_provider"))
    is_local_fallback = mode == "local_fallback" or result.provider == "local_fallback"
    status = "unknown" if is_local_fallback and result.status == "safe" else result.status
    summary = {
        "malicious": result.malicious_count,
        "suspicious": result.suspicious_count,
        "harmless": result.harmless_count,
        "undetected": result.undetected_count,
    }
    if is_local_fallback and result.status == "safe":
        summary["harmless"] = 0
        summary["undetected"] = max(1, summary["undetected"])

    recommendation = raw_summary.get("recommendation")
    if not isinstance(recommendation, str) or not recommendation:
        recommendation = _get_recommendation(status, mode)

    return URLScanResponse(
        id=result.id,
        url=result.submitted_url,
        normalized_url=result.normalized_url,
        status=status,
        score=result.score,
        provider=result.provider,
        summary=summary,
        categories=_parse_categories(result.categories),
        last_analysis_date=result.last_analysis_date,
        recommendation=recommendation,
        summary_text=raw_summary.get("summary_text") if isinstance(raw_summary.get("summary_text"), str) else None,
        confidence_note=raw_summary.get("confidence_note") if isinstance(raw_summary.get("confidence_note"), str) else None,
        score_breakdown=_build_score_breakdown(result),
        raw_reference={
            "provider_id": result.provider_reference or "",
            "permalink": _get_permalink(result.provider, result.provider_reference, result.normalized_url),
        },
        scanned_at=result.created_at,
        scanned_by=scanned_by,
        mode=mode,
        severity=raw_summary.get("severity") if isinstance(raw_summary.get("severity"), str) else None,
        reasons=raw_summary.get("reasons") if isinstance(raw_summary.get("reasons"), list) else [],
        parsed_url=raw_summary.get("parsed_url") if isinstance(raw_summary.get("parsed_url"), dict) else None,
        recommended_actions=raw_summary.get("recommended_actions") if isinstance(raw_summary.get("recommended_actions"), list) else [],
        safety_model=raw_summary.get("safety_model") if isinstance(raw_summary.get("safety_model"), dict) else None,
    )


@router.post("/scan", response_model=URLScanResponse)
async def scan_url(
    request: URLScanRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> URLScanResponse:
    """
    Scan a URL for reputation using external provider or local static fallback.
    
    This endpoint validates the URL, checks it against external reputation services,
    and returns a safety assessment. URLs are only sent to reputation providers,
    never accessed directly.
    
    Args:
        request: URL scan request with URL to analyze
        db: Database session
        current_user: Authenticated user requesting the scan
    
    Returns:
        Scan result with reputation assessment and recommendations
    
    Raises:
        HTTPException: For invalid URLs, provider errors, or rate limits
    """
    scanner_service = URLScannerService()
    
    try:
        # Scan the URL
        result = await scanner_service.scan_url(db, request.url, current_user)
        
        # Log the scan request
        await _log_scan_event(db, current_user, "url_scan_requested", request.url, result.status)
        
        return _build_scan_response(result, current_user.full_name or current_user.email)
        
    except ValueError as e:
        # Validation error
        await _log_scan_event(db, current_user, "url_scan_failed", request.url, "validation_error")
        raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        # Provider error or other issue
        await _log_scan_event(db, current_user, "url_scan_failed", request.url, "provider_error")
        logger.exception("URL scan failed for user %s.", current_user.id)
        raise HTTPException(
            status_code=500,
            detail="Scanner service is unavailable. Please check that the backend is running.",
        )


@router.get("/history", response_model=URLScanHistoryResponse)
def get_scan_history(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    page: Annotated[int, Query(ge=1, le=1000)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 50,
) -> URLScanHistoryResponse:
    """
    Get URL scan history for the current user.
    
    Args:
        db: Database session
        current_user: Authenticated user
        page: Page number (1-1000)
        per_page: Items per page (1-100)
    
    Returns:
        Paginated list of scan results
    """
    scanner_service = URLScannerService()
    
    # Get user's scan history
    scans = scanner_service.get_scan_history(db, current_user, limit=per_page)
    
    # Convert to response format
    scan_items = []
    for scan in scans:
        scan_items.append(
            URLScanHistoryItem(
                id=scan.id,
                url=scan.submitted_url,
                status=scan.status,
                provider=scan.provider,
                score=scan.score,
                scanned_at=scan.created_at,
                scanned_by=current_user.full_name or current_user.email,
            )
        )
    
    return URLScanHistoryResponse(
        scans=scan_items,
        total=len(scan_items),
        page=page,
        per_page=per_page,
    )


@router.get("/result/{result_id}", response_model=URLScanResponse)
def get_scan_result(
    result_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> URLScanResponse:
    """
    Get a specific scan result by ID.
    
    Args:
        result_id: Scan result ID
        db: Database session
        current_user: Authenticated user
    
    Returns:
        Detailed scan result
    
    Raises:
        HTTPException: If result not found or access denied
    """
    scanner_service = URLScannerService()
    
    # Get the scan result
    result = scanner_service.get_scan_result(db, result_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Scan result not found")
    
    # Check if user owns this result or is admin
    if result.submitted_by_user_id != current_user.id and current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return _build_scan_response(result, result.submitted_by.full_name or result.submitted_by.email)


@router.get("/statistics", response_model=URLScanStatistics)
def get_scan_statistics(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    days: Annotated[int, Query(ge=1, le=365)] = 7,
) -> URLScanStatistics:
    """
    Get URL scan statistics.
    
    Args:
        db: Database session
        current_user: Authenticated user (admin only for full stats)
        days: Period in days (1-365)
    
    Returns:
        Scan statistics for the period
    
    Raises:
        HTTPException: If non-admin user requests statistics
    """
    # Only admins can view statistics
    if current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    scanner_service = URLScannerService()
    stats = scanner_service.get_scan_statistics(db, days)
    
    return URLScanStatistics(
        total_scans=stats["total_scans"],
        status_counts=stats["status_counts"],
        malicious_today=stats["malicious_today"],
        period_days=stats["period_days"],
    )


async def _log_scan_event(
    db: Session,
    user: User,
    action: str,
    url: str,
    status: str,
):
    """Log URL scan events for audit trail."""
    from app.models.audit_log import AuditLog
    
    # Create audit log entry
    audit_log = AuditLog(
        actor_user_id=user.id,
        action=action,
        entity_type="url_scan",
        entity_id=url,  # Use URL as entity_id for tracking
        ip_address=None,  # Will be set by middleware if available
        user_agent=None,  # Will be set by middleware if available
        details={
            "url": url,
            "status": status,
            "timestamp": str(user.last_login_at or ""),
        },
    )
    
    db.add(audit_log)
    db.commit()


def _get_recommendation(status: str, mode: str | None = None) -> str:
    """Get safety recommendation based on status."""
    if mode == "local_fallback":
        if status == "suspicious":
            return "Review the static indicators before opening or sharing this URL."
        return "Use normal caution. Do not submit credentials unless you trust the site and verify the domain."

    recommendations = {
        "safe": "No malicious reputation was found. Continue with normal caution.",
        "suspicious": "Some engines flagged this URL as suspicious. Review before opening.",
        "malicious": "This URL has malicious reputation. Do not open it and consider blocking related IOCs.",
        "unknown": "No reliable reputation data found. Treat with caution.",
    }
    
    return recommendations.get(status, "No recommendation available.")


def _get_permalink(provider: str, provider_reference: str | None, url: str) -> str:
    """Get permalink to provider's detailed analysis."""
    if provider == "local_fallback":
        return ""

    if provider == "virustotal" and provider_reference:
        return f"https://www.virustotal.com/gui/url/{provider_reference}"
    
    # Fallback for other providers
    return "#"

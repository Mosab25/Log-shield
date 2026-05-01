from __future__ import annotations

import ast
import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.url_scanner import (
    URLScanErrorResponse,
    URLScanHistoryItem,
    URLScanHistoryResponse,
    URLScanRequest,
    URLScanResponse,
    URLScanStatistics,
)
from app.services.url_scanner_service import URLScannerService

router = APIRouter()


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


@router.post("/scan", response_model=URLScanResponse)
async def scan_url(
    request: URLScanRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> URLScanResponse:
    """
    Scan a URL for reputation using external provider.
    
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
        
        # Convert to response format
        return URLScanResponse(
            url=result.submitted_url,
            normalized_url=result.normalized_url,
            status=result.status,
            score=result.score,
            provider=result.provider,
            summary={
                "malicious": result.malicious_count,
                "suspicious": result.suspicious_count,
                "harmless": result.harmless_count,
                "undetected": result.undetected_count,
            },
            categories=_parse_categories(result.categories),
            last_analysis_date=result.last_analysis_date,
            recommendation=_get_recommendation(result.status),
            raw_reference={
                "provider_id": result.provider_reference or "",
                "permalink": _get_permalink(result.provider, result.provider_reference, result.normalized_url),
            },
            scanned_at=result.created_at,
            scanned_by=current_user.full_name or current_user.email,
        )
        
    except ValueError as e:
        # Validation error
        await _log_scan_event(db, current_user, "url_scan_failed", request.url, "validation_error")
        raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        # Provider error or other issue
        await _log_scan_event(db, current_user, "url_scan_failed", request.url, "provider_error")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to scan URL: {str(e)}"
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
    
    return URLScanResponse(
        url=result.submitted_url,
        normalized_url=result.normalized_url,
        status=result.status,
        score=result.score,
        provider=result.provider,
        summary={
            "malicious": result.malicious_count,
            "suspicious": result.suspicious_count,
            "harmless": result.harmless_count,
            "undetected": result.undetected_count,
        },
        categories=_parse_categories(result.categories),
        last_analysis_date=result.last_analysis_date,
        recommendation=_get_recommendation(result.status),
        raw_reference={
            "provider_id": result.provider_reference or "",
            "permalink": _get_permalink(result.provider, result.provider_reference, result.normalized_url),
        },
        scanned_at=result.created_at,
        scanned_by=result.submitted_by.full_name or result.submitted_by.email,
    )


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


def _get_recommendation(status: str) -> str:
    """Get safety recommendation based on status."""
    recommendations = {
        "safe": "No malicious reputation was found. Continue with normal caution.",
        "suspicious": "Some engines flagged this URL as suspicious. Review before opening.",
        "malicious": "This URL has malicious reputation. Do not open it and consider blocking related IOCs.",
        "unknown": "No reliable reputation data found. Treat with caution.",
    }
    
    return recommendations.get(status, "No recommendation available.")


def _get_permalink(provider: str, provider_reference: str | None, url: str) -> str:
    """Get permalink to provider's detailed analysis."""
    if provider == "virustotal" and provider_reference:
        return f"https://www.virustotal.com/gui/url/{provider_reference}"
    
    # Fallback for other providers
    return "#"

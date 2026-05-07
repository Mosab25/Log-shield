from __future__ import annotations

from datetime import datetime
from typing import Annotated
import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.raw_log import RawLog
from app.models.user import User
from app.schemas.normalized_logs import NormalizeBatchRequest, NormalizedLogResponse
from app.services.normalization_service import NormalizationService
from app.services.log_event_service import LogEventService

router = APIRouter()
logger = logging.getLogger("logshield")


@router.post("/normalize/{raw_log_id}", response_model=NormalizedLogResponse)
def normalize_single(raw_log_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]):
    return NormalizationService.to_response(NormalizationService.normalize_single_raw_log(db=db, raw_log_id=raw_log_id, current_user=current_user))


@router.post("/normalize/batch", response_model=list[NormalizedLogResponse])
def normalize_batch(payload: NormalizeBatchRequest, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]):
    if payload.raw_log_ids:
        ids = payload.raw_log_ids
    else:
        rows = db.execute(select(RawLog).order_by(RawLog.received_at.asc()).limit(payload.limit)).scalars().all()
        ids = [r.id for r in rows]
    results = []
    for raw_log_id in ids:
        results.append(NormalizationService.to_response(NormalizationService.normalize_single_raw_log(db=db, raw_log_id=raw_log_id, current_user=current_user)))
    return results


@router.get("/normalized")
def list_normalized_logs(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst"))], skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), source: str | None = None, source_type: str | None = None, event_type: str | None = None, severity: str | None = None, parser_status: str | None = None, ip_address: str | None = None, username: str | None = None, endpoint: str | None = None, q: str | None = None, start_date: datetime | None = None, end_date: datetime | None = None):
    try:
        # Get normalized logs with enhanced filters
        total, items = NormalizationService.list_normalized_enhanced(
            db=db,
            skip=skip,
            limit=limit,
            source=source,
            source_type=source_type,
            event_type=event_type,
            severity=severity,
            parser_status=parser_status,
            ip_address=ip_address,
            username=username,
            endpoint=endpoint,
            q=q,
            start_date=start_date,
            end_date=end_date,
        )

        # Enhance items with security event information
        enhanced_items = []
        for item in items:
            # Get raw log for event type inference
            raw_log = db.execute(select(RawLog).where(RawLog.id == item.raw_log_id)).scalar_one_or_none()
            enhanced = LogEventService.enhance_normalized_log(item, raw_log)
            enhanced_items.append(enhanced)

        return {"total": total, "skip": skip, "limit": limit, "items": enhanced_items}
    except Exception as exc:  # pragma: no cover - runtime safety fallback
        logger.exception("Failed to load normalized security events.")
        return {
            "total": 0,
            "skip": skip,
            "limit": limit,
            "items": [],
            "warning": "Security events are temporarily unavailable. Check database connectivity and normalization pipeline.",
        }


@router.get("/normalized/metadata")
def get_logs_metadata(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]):
    """Get metadata for filters - event types, categories, sources, etc."""
    return {
        "event_types": LogEventService.get_all_event_types(),
        "categories": LogEventService.get_categories(),
        "severities": ["low", "medium", "high", "critical"],
        "sources": ["auth-prod-01", "web-prod-01", "app-prod-01", "firewall-01", "proxy-01"]
    }


@router.get("/normalized/{normalized_log_id}", response_model=NormalizedLogResponse)
def get_normalized_log(normalized_log_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]):
    from app.models.normalized_log import NormalizedLog
    log = db.get(NormalizedLog, normalized_log_id)
    if not log:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Normalized log not found.")
    return NormalizationService.to_response(log)

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.raw_log import RawLog
from app.models.user import User
from app.schemas.normalized_logs import NormalizeBatchRequest, NormalizedLogListResponse, NormalizedLogResponse
from app.services.normalization_service import NormalizationService

router = APIRouter()


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


@router.get("/normalized", response_model=NormalizedLogListResponse)
def list_normalized_logs(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))], skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), source: str | None = None, source_type: str | None = None, event_type: str | None = None, severity: str | None = None, parser_status: str | None = None, ip_address: str | None = None, username: str | None = None, start_date: datetime | None = None, end_date: datetime | None = None):
    total, items = NormalizationService.list_normalized(db=db, skip=skip, limit=limit, source=source, source_type=source_type, event_type=event_type, severity=severity, parser_status=parser_status, ip_address=ip_address, username=username, start_date=start_date, end_date=end_date)
    return NormalizedLogListResponse(total=total, skip=skip, limit=limit, items=items)


@router.get("/normalized/{normalized_log_id}", response_model=NormalizedLogResponse)
def get_normalized_log(normalized_log_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))]):
    from app.models.normalized_log import NormalizedLog
    log = db.get(NormalizedLog, normalized_log_id)
    if not log:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Normalized log not found.")
    return NormalizationService.to_response(log)

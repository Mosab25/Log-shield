from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.logs import BulkRawLogCreate, RawLogCreate, RawLogListResponse, RawLogResponse
from app.services.log_ingestion_service import LogIngestionService

router = APIRouter()


@router.post("/ingest", response_model=RawLogResponse, status_code=201)
def ingest_log(payload: RawLogCreate, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]):
    return LogIngestionService.to_response(LogIngestionService.ingest(db, payload, current_user.id))


@router.post("/bulk-ingest", response_model=list[RawLogResponse], status_code=201)
def bulk_ingest(payload: BulkRawLogCreate, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]):
    return [LogIngestionService.to_response(LogIngestionService.ingest(db, item, current_user.id)) for item in payload.logs]


@router.get("/raw", response_model=RawLogListResponse)
def list_raw_logs(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))], skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), source: str | None = None, source_type: str | None = None, start_date: datetime | None = None, end_date: datetime | None = None, ip_address: str | None = None):
    total, items = LogIngestionService.list_raw(db=db, skip=skip, limit=limit, source=source, source_type=source_type, start_date=start_date, end_date=end_date, ip_address=ip_address)
    return RawLogListResponse(total=total, skip=skip, limit=limit, items=items)


@router.get("/raw/{raw_log_id}", response_model=RawLogResponse)
def get_raw_log(raw_log_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))]):
    log = db.get(__import__("app.models.raw_log", fromlist=["RawLog"]).RawLog, raw_log_id)
    if not log:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Raw log not found.")
    return LogIngestionService.to_response(log)

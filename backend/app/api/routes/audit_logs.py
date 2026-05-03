from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.audit import AuditLogListResponse, AuditSummaryResponse
from app.services.audit_service import AuditService

router = APIRouter()


@router.get("/summary", response_model=AuditSummaryResponse)
def get_audit_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin"))],
):
    summary = AuditService.get_summary(db)
    return AuditSummaryResponse(**summary)


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin"))],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    action: str | None = None,
    actor_user_id: int | None = None,
    entity_type: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    ip_address: str | None = None,
    q: str | None = None,
    category: str | None = None,
    severity: str | None = None,
):
    total, items = AuditService.list_audit_logs(
        db=db, skip=skip, limit=limit, action=action, actor_user_id=actor_user_id,
        entity_type=entity_type, start_date=start_date, end_date=end_date,
        ip_address=ip_address, q=q, category=category, severity=severity,
    )
    return AuditLogListResponse(total=total, skip=skip, limit=limit, items=items)

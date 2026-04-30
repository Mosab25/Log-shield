from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.audit import AuditLogListResponse
from app.services.audit_service import AuditService

router = APIRouter()


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin"))], skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), action: str | None = None, actor_user_id: int | None = None, entity_type: str | None = None, start_date: datetime | None = None, end_date: datetime | None = None):
    total, items = AuditService.list_audit_logs(db=db, skip=skip, limit=limit, action=action, actor_user_id=actor_user_id, entity_type=entity_type, start_date=start_date, end_date=end_date)
    return AuditLogListResponse(total=total, skip=skip, limit=limit, items=items)

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.schemas.security_center import SecurityCenterSummary
from app.services.security_center_service import SecurityCenterService

router = APIRouter()


@router.get("/summary", response_model=SecurityCenterSummary)
def get_security_center_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(require_admin)],
) -> SecurityCenterSummary:
    """
    Get comprehensive security center summary for admin users.
    
    This endpoint provides a centralized view of:
    - Security control status (2FA, RBAC, IP blocking, etc.)
    - Security metrics (failed logins, blocked IPs, alerts, incidents)
    - Recent security events from audit logs
    - Active IP blocks
    - Admin 2FA configuration
    - Security recommendations
    
    Access: Admin only
    """
    return SecurityCenterService.get_security_summary(db)

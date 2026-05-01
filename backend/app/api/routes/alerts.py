from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.alert import Alert
from app.models.alert_status_history import AlertStatusHistory
from app.models.user import User
from app.schemas.alerts import AlertActionResponse, AlertAssignRequest, AlertDetailResponse, AlertHistoryListResponse, AlertListResponse, AlertStatsSummaryResponse, AlertStatusUpdate, AnalystNoteActionResponse, AnalystNoteCreate
from app.services.alert_service import AlertService

router = APIRouter()


@router.get("/stats/summary", response_model=AlertStatsSummaryResponse)
def stats(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))]):
    # Use aggregated SQL queries instead of loading all alerts
    total_alerts = db.execute(select(func.count(Alert.id))).scalar_one()
    
    # Status counts
    status_counts = db.execute(
        select(Alert.status, func.count(Alert.id)).group_by(Alert.status)
    ).all()
    by_status = {k:0 for k in ["open","investigating","resolved","false_positive","escalated"]}
    for status, count in status_counts:
        by_status[status] = int(count)
    
    # Severity counts
    severity_counts = db.execute(
        select(Alert.severity, func.count(Alert.id)).group_by(Alert.severity)
    ).all()
    by_severity = {k:0 for k in ["low","medium","high","critical"]}
    for severity, count in severity_counts:
        by_severity[severity] = int(count)
    
    # High-risk open alerts
    high_risk_open = db.execute(
        select(func.count(Alert.id)).where(
            Alert.risk_score >= 61,
            Alert.status.in_(["open","investigating","escalated"])
        )
    ).scalar_one()
    
    # Unassigned open alerts
    unassigned_open = db.execute(
        select(func.count(Alert.id)).where(
            Alert.status == "open",
            Alert.assigned_to_id.is_(None)
        )
    ).scalar_one()
    
    # Average risk score
    avg_risk = db.execute(select(func.avg(Alert.risk_score))).scalar_one()
    
    return AlertStatsSummaryResponse(
        total_alerts=int(total_alerts),
        by_status=by_status,
        by_severity=by_severity,
        high_risk_open_alerts=int(high_risk_open),
        unassigned_open_alerts=int(unassigned_open),
        average_risk_score=round(float(avg_risk or 0), 2)
    )


@router.get("", response_model=AlertListResponse)
def list_alerts(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))], skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), status_filter: str | None = Query(None, alias="status"), severity: str | None = None, assigned_to_id: int | None = None, source_ip: str | None = None, username: str | None = None, min_risk_score: int | None = Query(None, ge=0, le=100), max_risk_score: int | None = Query(None, ge=0, le=100), start_date: datetime | None = None, end_date: datetime | None = None):
    total, items = AlertService.list_alerts(db=db, skip=skip, limit=limit, status_filter=status_filter, severity=severity, assigned_to_id=assigned_to_id, source_ip=source_ip, username=username, min_risk_score=min_risk_score, max_risk_score=max_risk_score, start_date=start_date, end_date=end_date)
    return AlertListResponse(total=total, skip=skip, limit=limit, items=items)


@router.get("/{alert_id}/history", response_model=AlertHistoryListResponse)
def history(alert_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))]):
    AlertService.get_alert(db, alert_id)
    rows = db.execute(select(AlertStatusHistory).where(AlertStatusHistory.alert_id == alert_id).order_by(AlertStatusHistory.changed_at.asc())).scalars().all()
    items = [{"id":h.id,"alert_id":h.alert_id,"old_status":h.old_status,"new_status":h.new_status,"changed_by":AlertService.user_mini(h.changed_by),"comment":h.comment,"changed_at":h.changed_at} for h in rows]
    return AlertHistoryListResponse(total=len(items), items=items)


@router.get("/{alert_id}", response_model=AlertDetailResponse)
def detail(alert_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))]):
    return AlertService.detail(db, AlertService.get_alert(db, alert_id))


@router.patch("/{alert_id}/status", response_model=AlertActionResponse)
def update_status(alert_id: int, payload: AlertStatusUpdate, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))]):
    return AlertActionResponse(message="Alert status updated successfully.", alert=AlertService.update_status(db=db, alert_id=alert_id, new_status=payload.status, comment=payload.comment, current_user=current_user))


@router.patch("/{alert_id}/assign", response_model=AlertActionResponse)
def assign(alert_id: int, payload: AlertAssignRequest, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))]):
    return AlertActionResponse(message="Alert assignment updated successfully.", alert=AlertService.assign_alert(db=db, alert_id=alert_id, analyst_id=payload.analyst_id, comment=payload.comment, current_user=current_user))


@router.post("/{alert_id}/notes", response_model=AnalystNoteActionResponse, status_code=201)
def add_note(alert_id: int, payload: AnalystNoteCreate, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))]):
    return AnalystNoteActionResponse(message="Analyst note added successfully.", note=AlertService.add_note(db=db, alert_id=alert_id, note_text=payload.note, current_user=current_user))

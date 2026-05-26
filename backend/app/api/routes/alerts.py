from __future__ import annotations

from datetime import datetime
import logging
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query, Request, Response, status as http_status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.alert import Alert
from app.models.alert_status_history import AlertStatusHistory
from app.models.user import User
from app.schemas.alerts import (
    AlertActionResponse,
    AlertAssignRequest,
    AlertBlockSourceIpRequest,
    AlertBlockSourceIpResponse,
    AlertContainmentUpdate,
    AlertDetailResponse,
    AlertHistoryListResponse,
    AlertListResponse,
    AlertStatsSummaryResponse,
    AlertStatusUpdate,
    AnalystNoteActionResponse,
    AnalystNoteCreate,
)
from app.services.alert_service import AlertService
from app.services.alert_report_service_simple import AlertReportServiceSimple
from app.services.ip_block_service import IPBlockService, get_client_ip

router = APIRouter()
logger = logging.getLogger("logshield.alerts")


@router.get("/stats/summary", response_model=AlertStatsSummaryResponse)
def stats(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))]):
    # Use aggregated SQL queries instead of loading all alerts
    total_alerts = db.execute(select(func.count(Alert.id))).scalar_one()
    
    # Status counts
    status_counts = db.execute(
        select(Alert.status, func.count(Alert.id)).group_by(Alert.status)
    ).all()
    by_status = {k:0 for k in ["open", "acknowledged", "investigating", "resolved", "false_positive", "escalated"]}
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
            Alert.risk_score >= 50,
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
def list_alerts(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))], skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), status_filter: str | None = Query(None, alias="status"), severity: str | None = None, assigned_to_id: int | None = None, source_ip: str | None = None, username: str | None = None, min_risk_score: int | None = Query(None, ge=0, le=100), max_risk_score: int | None = Query(None, ge=0, le=100), start_date: datetime | None = None, end_date: datetime | None = None):
    total, items = AlertService.list_alerts(db=db, skip=skip, limit=limit, status_filter=status_filter, severity=severity, assigned_to_id=assigned_to_id, source_ip=source_ip, username=username, min_risk_score=min_risk_score, max_risk_score=max_risk_score, start_date=start_date, end_date=end_date)
    return AlertListResponse(total=total, skip=skip, limit=limit, items=items)


@router.get("/{alert_id}/history", response_model=AlertHistoryListResponse)
def history(alert_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))]):
    AlertService.get_alert(db, alert_id)
    rows = db.execute(select(AlertStatusHistory).where(AlertStatusHistory.alert_id == alert_id).order_by(AlertStatusHistory.changed_at.asc())).scalars().all()
    items = [{"id":h.id,"alert_id":h.alert_id,"old_status":h.old_status,"new_status":h.new_status,"changed_by":AlertService.user_mini(h.changed_by),"comment":h.comment,"changed_at":h.changed_at} for h in rows]
    return AlertHistoryListResponse(total=len(items), items=items)


@router.patch("/{alert_id}/containment", response_model=AlertActionResponse)
def update_containment(
    alert_id: int,
    payload: AlertContainmentUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))],
):
    return AlertActionResponse(
        message="Alert containment flag updated.",
        alert=AlertService.update_containment(db=db, alert_id=alert_id, contained=payload.contained, current_user=current_user),
    )


@router.post("/{alert_id}/block-source-ip", response_model=AlertBlockSourceIpResponse, status_code=201)
def block_alert_source_ip(
    alert_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))],
    payload: Annotated[AlertBlockSourceIpRequest | None, Body()] = None,
):
    from fastapi import HTTPException

    alert_row = AlertService.get_alert(db, alert_id)
    summary = AlertService.list_item(db, alert_row)
    ip = summary.get("source_ip")
    if not ip:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="This alert has no source IP to block.")
    actor_ip = get_client_ip(request)
    if ip == actor_ip:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Cannot block your own current IP address.")
    reason = (payload.reason if payload is not None and payload.reason else None) or f"Blocked from alert #{alert_id}"
    block = IPBlockService.create_block(
        db=db,
        ip_address=ip,
        reason=reason,
        blocked_until=None,
        actor_user_id=current_user.id,
    )
    return AlertBlockSourceIpResponse(message="Source IP blocked successfully.", ip_address=ip, block_id=block.id)


@router.get("/{alert_id}", response_model=AlertDetailResponse)
def detail(alert_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))]):
    return AlertService.detail(db, AlertService.get_alert(db, alert_id))


@router.patch("/{alert_id}/status", response_model=AlertActionResponse)
def update_status(alert_id: int, payload: AlertStatusUpdate, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))]):
    return AlertActionResponse(message="Alert status updated successfully.", alert=AlertService.update_status(db=db, alert_id=alert_id, new_status=payload.status, comment=payload.comment, current_user=current_user))


@router.patch("/{alert_id}/acknowledge", response_model=AlertActionResponse)
def acknowledge_alert(
    alert_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))],
):
    return AlertActionResponse(
        message="Alert acknowledged successfully.",
        alert=AlertService.update_status(
            db=db,
            alert_id=alert_id,
            new_status="acknowledged",
            comment="Acknowledged by analyst.",
            current_user=current_user,
        ),
    )


@router.patch("/{alert_id}/assign", response_model=AlertActionResponse)
def assign(alert_id: int, payload: AlertAssignRequest, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))]):
    return AlertActionResponse(message="Alert assignment updated successfully.", alert=AlertService.assign_alert(db=db, alert_id=alert_id, analyst_id=payload.analyst_id, comment=payload.comment, current_user=current_user))


@router.post("/{alert_id}/notes", response_model=AnalystNoteActionResponse, status_code=201)
def add_note(alert_id: int, payload: AnalystNoteCreate, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))]):
    return AnalystNoteActionResponse(message="Analyst note added successfully.", note=AlertService.add_note(db=db, alert_id=alert_id, note_text=payload.note, current_user=current_user))


@router.get("/{alert_id}/report/pdf")
def generate_pdf_report(alert_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))]):
    """Generate PDF incident report for an alert"""
    from fastapi import HTTPException, status
    
    # Load alert with all necessary relationships
    alert = db.execute(
        select(Alert)
        .options(
            joinedload(Alert.assigned_to),
            joinedload(Alert.detection_rule),
            joinedload(Alert.normalized_log),
            joinedload(Alert.risk_scores),
        )
        .where(Alert.id == alert_id)
    ).unique().scalar_one_or_none()
    
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    
    try:
        pdf_bytes = AlertReportServiceSimple.generate_incident_report(db=db, alert=alert, generated_by=current_user)
        if not pdf_bytes or not pdf_bytes.startswith(b"%PDF-"):
            raise ValueError("Invalid PDF bytes generated")

        filename = f"logshield-alert-{alert_id}-incident-report.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"",
                "Content-Length": str(len(pdf_bytes)),
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    except Exception:
        logger.exception("Alert PDF generation failed for alert_id=%s", alert_id)
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate alert report.")

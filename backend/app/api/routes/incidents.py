from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.incidents import (
    IncidentActionResponse,
    IncidentAlertLinkRequest,
    IncidentCreate,
    IncidentDetailResponse,
    IncidentEvidenceActionResponse,
    IncidentEvidenceCreate,
    IncidentListResponse,
    IncidentNoteActionResponse,
    IncidentNoteCreate,
    IncidentTimelineListResponse,
    IncidentUpdate,
)
from app.services.incident_service import IncidentService
from app.services.ip_block_service import get_client_ip

router = APIRouter()


@router.get("", response_model=IncidentListResponse)
def list_incidents(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))],
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    status_filter: str | None = Query(None, alias="status"),
    severity: str | None = None,
    owner_user_id: int | None = None,
    alert_id: int | None = None,
    q: str | None = None,
):
    total, items = IncidentService.list_incidents(
        db=db,
        skip=skip,
        limit=limit,
        status_filter=status_filter,
        severity=severity,
        owner_user_id=owner_user_id,
        search=q,
        alert_id=alert_id,
    )
    return IncidentListResponse(total=total, skip=skip, limit=limit, items=items)


@router.post("", response_model=IncidentDetailResponse, status_code=201)
def create_incident(
    payload: IncidentCreate,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))],
):
    return IncidentService.create_incident(
        db=db,
        payload=payload,
        current_user=current_user,
        source_ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )


@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident(
    incident_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))],
):
    return IncidentService.get_incident_detail(db=db, incident_id=incident_id)


@router.patch("/{incident_id}", response_model=IncidentActionResponse)
def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))],
):
    incident = IncidentService.update_incident(
        db=db,
        incident_id=incident_id,
        payload=payload,
        current_user=current_user,
        source_ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return IncidentActionResponse(message="Incident updated successfully.", incident=incident)


@router.post("/{incident_id}/alerts", response_model=IncidentActionResponse)
def link_alert(
    incident_id: int,
    payload: IncidentAlertLinkRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))],
):
    incident = IncidentService.link_alert(
        db=db,
        incident_id=incident_id,
        alert_id=payload.alert_id,
        current_user=current_user,
        source_ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return IncidentActionResponse(message="Alert linked to incident.", incident=incident)


@router.delete("/{incident_id}/alerts/{alert_id}", response_model=IncidentActionResponse)
def unlink_alert(
    incident_id: int,
    alert_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))],
):
    incident = IncidentService.unlink_alert(
        db=db,
        incident_id=incident_id,
        alert_id=alert_id,
        current_user=current_user,
        source_ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return IncidentActionResponse(message="Alert unlinked from incident.", incident=incident)


@router.post("/{incident_id}/evidence", response_model=IncidentEvidenceActionResponse, status_code=201)
def add_evidence(
    incident_id: int,
    payload: IncidentEvidenceCreate,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))],
):
    evidence = IncidentService.add_evidence(
        db=db,
        incident_id=incident_id,
        payload=payload,
        current_user=current_user,
        source_ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return IncidentEvidenceActionResponse(message="Evidence added to incident.", evidence=evidence)


@router.post("/{incident_id}/notes", response_model=IncidentNoteActionResponse, status_code=201)
def add_note(
    incident_id: int,
    payload: IncidentNoteCreate,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))],
):
    note = IncidentService.add_note(
        db=db,
        incident_id=incident_id,
        payload=payload,
        current_user=current_user,
        source_ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return IncidentNoteActionResponse(message="Incident note added.", note=note)


@router.get("/{incident_id}/timeline", response_model=IncidentTimelineListResponse)
def get_timeline(
    incident_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))],
):
    items = IncidentService.list_timeline(db=db, incident_id=incident_id)
    return IncidentTimelineListResponse(total=len(items), items=items)

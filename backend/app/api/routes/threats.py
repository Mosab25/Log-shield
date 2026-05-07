from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.threat_entry import ThreatEntry
from app.models.user import User
from app.schemas.threats import (
    AlertThreatLinkCreate,
    AlertThreatLinkResponse,
    ThreatEntryCreate,
    ThreatEntryDetailResponse,
    ThreatEntryListResponse,
    ThreatEntryListItemResponse,
    ThreatEntryActionResponse,
    ThreatEntryUpdate,
    ThreatIndicatorCreate,
    ThreatIndicatorResponse,
    ThreatReferenceCreate,
    ThreatReferenceResponse,
    ThreatReviewCreate,
    ThreatReviewResponse,
    ThreatStatsSummaryResponse,
    ThreatTagResponse,
)
from app.services.threat_service import ThreatService

router = APIRouter()


def _scrub_operational_threat_fields(item: dict) -> dict:
    sanitized = dict(item)
    sanitized["submitted_by"] = None
    sanitized["reviewed_by"] = None
    sanitized["reviews"] = []
    sanitized["linked_alerts"] = []
    return sanitized


def _approved_threat_stats(db: Session) -> dict:
    entries = db.execute(select(ThreatEntry).where(ThreatEntry.status == "approved")).scalars().all()
    by_type: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    by_status: dict[str, int] = {}
    by_source: dict[str, int] = {}
    for entry in entries:
        by_type[entry.type] = by_type.get(entry.type, 0) + 1
        by_severity[entry.severity] = by_severity.get(entry.severity, 0) + 1
        by_status[entry.status] = by_status.get(entry.status, 0) + 1
        by_source[entry.source] = by_source.get(entry.source, 0) + 1
    return {
        "total_entries": len(entries),
        "by_type": by_type,
        "by_severity": by_severity,
        "by_status": by_status,
        "by_source": by_source,
    }


# ── Stats ────────────────────────────────────────────────────
@router.get("/stats/summary", response_model=ThreatStatsSummaryResponse)
def stats(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))]):
    if current_user.role and current_user.role.name == "viewer":
        return _approved_threat_stats(db)
    return ThreatService.stats(db)


# ── Tags ─────────────────────────────────────────────────────
@router.get("/tags", response_model=list[ThreatTagResponse])
def list_tags(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))]):
    return ThreatService.list_tags(db)


# ── List entries ─────────────────────────────────────────────
@router.get("", response_model=ThreatEntryListResponse)
def list_entries(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    type: str | None = Query(None, alias="type"),
    severity: str | None = None,
    status: str | None = Query(None, alias="status"),
    source: str | None = None,
    search: str | None = None,
):
    is_viewer = bool(current_user.role and current_user.role.name == "viewer")
    effective_status = "approved" if is_viewer else status
    total, items = ThreatService.list_entries(db=db, skip=skip, limit=limit, type_filter=type, severity=severity, status_filter=effective_status, source=source, search=search)
    if is_viewer:
        items = [_scrub_operational_threat_fields(item) for item in items]
    return ThreatEntryListResponse(total=total, skip=skip, limit=limit, items=items)


# ── Create entry ─────────────────────────────────────────────
@router.post("", response_model=ThreatEntryActionResponse, status_code=201)
def create_entry(payload: ThreatEntryCreate, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]):
    entry = ThreatService.create_entry(db=db, payload=payload.model_dump(), current_user=current_user)
    return ThreatEntryActionResponse(message="Threat entry created successfully.", entry=entry)


# ── Get entry detail ─────────────────────────────────────────
@router.get("/{entry_id}", response_model=ThreatEntryDetailResponse)
def get_entry(entry_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))]):
    entry = ThreatService._get_entry(db, entry_id)
    item = ThreatService.detail(db, entry)
    if current_user.role and current_user.role.name == "viewer":
        return _scrub_operational_threat_fields(item)
    return item


# ── Update entry ─────────────────────────────────────────────
@router.patch("/{entry_id}", response_model=ThreatEntryActionResponse)
def update_entry(entry_id: int, payload: ThreatEntryUpdate, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]):
    entry = ThreatService.update_entry(db=db, entry_id=entry_id, payload=payload.model_dump(exclude_unset=True), current_user=current_user)
    return ThreatEntryActionResponse(message="Threat entry updated successfully.", entry=entry)


# ── Delete entry ─────────────────────────────────────────────
@router.delete("/{entry_id}", status_code=200)
def delete_entry(entry_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin"))]):
    return ThreatService.delete_entry(db=db, entry_id=entry_id, current_user=current_user)


# ── Add indicator ────────────────────────────────────────────
@router.post("/{entry_id}/indicators", response_model=ThreatIndicatorResponse, status_code=201)
def add_indicator(entry_id: int, payload: ThreatIndicatorCreate, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]):
    return ThreatService.add_indicator(db=db, entry_id=entry_id, payload=payload.model_dump(), current_user=current_user)


# ── Add reference ───────────────────────────────────────────
@router.post("/{entry_id}/references", response_model=ThreatReferenceResponse, status_code=201)
def add_reference(entry_id: int, payload: ThreatReferenceCreate, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]):
    return ThreatService.add_reference(db=db, entry_id=entry_id, payload=payload.model_dump(), current_user=current_user)


# ── Add review ───────────────────────────────────────────────
@router.post("/{entry_id}/reviews", response_model=ThreatReviewResponse, status_code=201)
def add_review(entry_id: int, payload: ThreatReviewCreate, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]):
    return ThreatService.add_review(db=db, entry_id=entry_id, payload=payload.model_dump(), current_user=current_user)


# ── Link alert ───────────────────────────────────────────────
@router.post("/{entry_id}/alerts", response_model=AlertThreatLinkResponse, status_code=201)
def link_alert(entry_id: int, payload: AlertThreatLinkCreate, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]):
    return ThreatService.link_alert(db=db, entry_id=entry_id, payload=payload.model_dump(), current_user=current_user)

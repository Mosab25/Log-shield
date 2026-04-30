from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.threat_intel import (
    CVEImportResponse,
    CVELookupResponse,
    ThreatIntelSearchRequest,
    ThreatIntelSearchResponse,
)
from app.services.threat_search_service import ThreatSearchService

router = APIRouter()


@router.get("/search", response_model=ThreatIntelSearchResponse)
async def search_threats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))],
    q: str = Query(..., min_length=1, max_length=200),
    severity: str | None = None,
    source: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    include_external: bool = Query(True),
):
    request = ThreatIntelSearchRequest(
        q=q,
        severity=severity,
        source=source,
        page=page,
        page_size=page_size,
        include_external=include_external,
    )
    return await ThreatSearchService.search(
        db=db,
        query=request.q,
        severity=request.severity,
        source=request.source,
        include_external=request.include_external,
        current_user=current_user,
    )


@router.get("/cve/{cve_id}", response_model=CVELookupResponse)
async def get_cve(
    cve_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))],
):
    return await ThreatSearchService.get_cve_exact(db=db, cve_id=cve_id, current_user=current_user)


@router.post("/import-cve/{cve_id}", response_model=CVEImportResponse)
async def import_cve(
    cve_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))],
):
    try:
        return await ThreatSearchService.import_cve(db=db, cve_id=cve_id, current_user=current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

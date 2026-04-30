from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import AlertsTimelineResponse, DashboardSummaryResponse, RecentSecurityEventsResponse, RiskDistributionResponse, TopAttackedUsersResponse
from app.services.dashboard_service import DashboardService

router = APIRouter()


def filter_args(start_date, end_date, severity, source, status_filter):
    return {"start_date": start_date, "end_date": end_date, "severity": severity, "source": source, "status": status_filter}


@router.get("/summary", response_model=DashboardSummaryResponse)
def summary(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))], start_date: datetime | None = None, end_date: datetime | None = None, severity: str | None = None, source: str | None = None, status_filter: str | None = Query(None, alias="status")):
    return DashboardService.get_summary(db=db, **filter_args(start_date, end_date, severity, source, status_filter))


@router.get("/alerts-timeline", response_model=AlertsTimelineResponse)
def timeline(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))], start_date: datetime | None = None, end_date: datetime | None = None, severity: str | None = None, source: str | None = None, status_filter: str | None = Query(None, alias="status")):
    return DashboardService.alerts_timeline(db=db, **filter_args(start_date, end_date, severity, source, status_filter))


@router.get("/risk-distribution", response_model=RiskDistributionResponse)
def risk_dist(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))], start_date: datetime | None = None, end_date: datetime | None = None, severity: str | None = None, source: str | None = None, status_filter: str | None = Query(None, alias="status")):
    return DashboardService.risk_distribution(db=db, **filter_args(start_date, end_date, severity, source, status_filter))


@router.get("/top-attacked-users", response_model=TopAttackedUsersResponse)
def top_users(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))], start_date: datetime | None = None, end_date: datetime | None = None, severity: str | None = None, source: str | None = None, status_filter: str | None = Query(None, alias="status"), limit: int = Query(5, ge=1, le=50)):
    return DashboardService.top_attacked_users(db=db, start_date=start_date, end_date=end_date, severity=severity, source=source, status=status_filter, limit=limit)


@router.get("/recent-events", response_model=RecentSecurityEventsResponse)
def recent_events(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))], start_date: datetime | None = None, end_date: datetime | None = None, severity: str | None = None, source: str | None = None, limit: int = Query(10, ge=1, le=50)):
    return DashboardService.recent_events(db=db, start_date=start_date, end_date=end_date, severity=severity, source=source, limit=limit)

from __future__ import annotations

from datetime import datetime
from io import BytesIO
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.reports import AlertsBySeverityResponse, MostTargetedUsersResponse, MttrResponse, OpenVsResolvedResponse, ReportSummaryResponse, TopRiskyIpsResponse
from app.services.report_service import ReportService

router = APIRouter()


@router.get("/daily", response_model=ReportSummaryResponse)
def daily(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))], start_date: datetime | None = None, end_date: datetime | None = None):
    return ReportService.summary(db=db, report_type="daily", start_date=start_date, end_date=end_date)


@router.get("/weekly", response_model=ReportSummaryResponse)
def weekly(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))], start_date: datetime | None = None, end_date: datetime | None = None):
    return ReportService.summary(db=db, report_type="weekly", start_date=start_date, end_date=end_date)


@router.get("/top-risky-ips", response_model=TopRiskyIpsResponse)
def top_risky_ips(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))], start_date: datetime | None = None, end_date: datetime | None = None, limit: int = Query(10, ge=1, le=50)):
    return ReportService.top_risky_ips(db=db, start_date=start_date, end_date=end_date, limit=limit)


@router.get("/most-targeted-users", response_model=MostTargetedUsersResponse)
def targeted_users(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))], start_date: datetime | None = None, end_date: datetime | None = None, limit: int = Query(10, ge=1, le=50)):
    return ReportService.targeted_users(db=db, start_date=start_date, end_date=end_date, limit=limit)


@router.get("/alerts-by-severity", response_model=AlertsBySeverityResponse)
def by_severity(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))], start_date: datetime | None = None, end_date: datetime | None = None):
    return ReportService.alerts_by_severity(db=db, start_date=start_date, end_date=end_date)


@router.get("/open-vs-resolved", response_model=OpenVsResolvedResponse)
def open_vs_resolved(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))], start_date: datetime | None = None, end_date: datetime | None = None):
    return ReportService.open_vs_resolved(db=db, start_date=start_date, end_date=end_date)


@router.get("/mttr", response_model=MttrResponse)
def mttr(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))], start_date: datetime | None = None, end_date: datetime | None = None):
    return ReportService.mttr(db=db, start_date=start_date, end_date=end_date)


@router.get("/export/csv")
def export_csv(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))], start_date: datetime | None = None, end_date: datetime | None = None):
    csv_content = ReportService.csv_export(db=db, current_user=current_user, start_date=start_date, end_date=end_date)
    filename = f"logshield-report-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.csv"
    return StreamingResponse(iter([csv_content]), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/export/pdf")
def export_pdf(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))], start_date: datetime | None = None, end_date: datetime | None = None):
    pdf_content = ReportService.pdf_export(db=db, current_user=current_user, start_date=start_date, end_date=end_date)
    filename = f"logshield-report-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.pdf"
    return StreamingResponse(BytesIO(pdf_content), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})

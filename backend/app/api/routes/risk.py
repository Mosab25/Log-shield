from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.alert import Alert
from app.models.risk_score import RiskScore
from app.models.user import User
from app.schemas.risk import CalculateRiskResponse, HighRiskIpListResponse, RecalculateAllRequest, RecalculateAllResponse, RiskDistributionResponse, RiskScoreResponse
from app.services.risk_scoring_service import RiskScoringService

router = APIRouter()


@router.post("/calculate/alert/{alert_id}", response_model=CalculateRiskResponse)
def calculate(alert_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))]):
    risk = RiskScoringService.calculate_alert_risk(db=db, alert_id=alert_id, current_user=current_user)
    return CalculateRiskResponse(message="Risk score calculated successfully.", risk=RiskScoringService.to_response(risk))


@router.post("/recalculate-all", response_model=RecalculateAllResponse)
def recalc_all(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))], payload: RecalculateAllRequest | None = Body(default=None)):
    payload = payload or RecalculateAllRequest()
    query = select(Alert).order_by(Alert.created_at.desc()).limit(payload.limit)
    if payload.status:
        query = query.where(Alert.status == payload.status)
    results = []
    for alert in db.execute(query).scalars().all():
        try:
            risk = RiskScoringService.calculate_alert_risk(db=db, alert_id=alert.id, current_user=current_user)
            results.append(RiskScoringService.to_response(risk))
        except Exception:
            continue
    return RecalculateAllResponse(message="Risk scores recalculated successfully.", total_processed=len(results), results=results)


@router.get("/alert/{alert_id}", response_model=RiskScoreResponse)
def get_alert_risk(alert_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))]):
    risk = db.execute(select(RiskScore).where(RiskScore.alert_id == alert_id).order_by(RiskScore.calculated_at.desc(), RiskScore.id.desc()).limit(1)).scalar_one_or_none()
    if not risk:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No risk score has been calculated for this alert yet.")
    return RiskScoringService.to_response(risk)


@router.get("/high-risk-ips", response_model=HighRiskIpListResponse)
def high_risk_ips(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))], min_score: int = Query(61, ge=0, le=100), limit: int = Query(10, ge=1, le=100)):
    from app.services.alert_service import AlertService
    data = {}
    alerts = db.execute(select(Alert).where(Alert.risk_score >= min_score)).scalars().all()
    for a in alerts:
        for l in AlertService.related_logs(db, a):
            if not l.src_ip: continue
            d = data.setdefault(l.src_ip, {"ip_address": l.src_ip, "max_score": 0, "alert_ids": set(), "log_ids": set(), "latest_seen": None, "reasons": set()})
            d["max_score"] = max(d["max_score"], a.risk_score)
            d["alert_ids"].add(a.id); d["log_ids"].add(l.id)
            seen = l.event_time or l.created_at
            if d["latest_seen"] is None or seen > d["latest_seen"]: d["latest_seen"] = seen
            d["reasons"].add(a.title)
    items = []
    for d in data.values():
        score = d["max_score"]
        severity = RiskScoringService.score_to_level(score)
        items.append({"ip_address": d["ip_address"], "max_score": score, "severity": severity, "alert_count": len(d["alert_ids"]), "related_log_count": len(d["log_ids"]), "latest_seen": d["latest_seen"], "reasons": list(d["reasons"])[:3]})
    items = sorted(items, key=lambda x:x["max_score"], reverse=True)[:limit]
    return HighRiskIpListResponse(total=len(items), items=items)


@router.get("/distribution", response_model=RiskDistributionResponse)
def distribution(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst","viewer"))]):
    counts = {"low":0,"medium":0,"high":0,"critical":0}
    for a in db.execute(select(Alert)).scalars().all():
        counts[RiskScoringService.score_to_level(a.risk_score)] += 1
    return RiskDistributionResponse(total=sum(counts.values()), **counts)

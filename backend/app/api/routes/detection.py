from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.alert import Alert
from app.models.detection_rule import DetectionRule
from app.models.user import User
from app.schemas.detection import DetectionRuleCreate, DetectionRuleListResponse, DetectionRuleResponse, DetectionRuleUpdate, DetectionRunResponse, RunBatchRequest
from app.services.detection_engine import DetectionEngine
from app.services.detection_rules import DetectionRulesService

router = APIRouter()


@router.get("/rules", response_model=DetectionRuleListResponse)
def list_rules(db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))], skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=200), category: str | None = None, is_active: bool | None = None):
    query = select(DetectionRule)
    count_query = select(func.count(DetectionRule.id))
    if category:
        query = query.where(DetectionRule.category == category)
        count_query = count_query.where(DetectionRule.category == category)
    if is_active is not None:
        query = query.where(DetectionRule.is_active == is_active)
        count_query = count_query.where(DetectionRule.is_active == is_active)
    total = db.execute(count_query).scalar_one()
    rules = db.execute(query.order_by(DetectionRule.id.asc()).offset(skip).limit(limit)).scalars().all()
    items = []
    for rule in rules:
        metrics = DetectionRulesService.get_rule_trigger_metrics(db=db, rule_id=rule.id)
        items.append(DetectionRuleResponse.model_validate(rule).model_copy(update=metrics))
    return DetectionRuleListResponse(total=total, items=items)


@router.post("/rules", response_model=DetectionRuleResponse, status_code=201)
def create_rule(payload: DetectionRuleCreate, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin"))]):
    rule = DetectionRule(**payload.model_dump(), created_by_id=current_user.id)
    db.add(rule); db.commit(); db.refresh(rule)
    return DetectionRuleResponse.model_validate(rule)


@router.delete("/rules/{rule_id}")
def delete_rule(rule_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin"))]):
    rule = db.get(DetectionRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")
    linked_alerts = int(db.execute(select(func.count(Alert.id)).where(Alert.detection_rule_id == rule_id)).scalar_one() or 0)
    if linked_alerts > 0:
        rule.is_active = False
        db.commit()
        return {
            "message": "Rule was deactivated because it is linked to existing alerts.",
            "deactivated": True,
            "deleted": False,
        }
    db.delete(rule)
    db.commit()
    return {"message": "Rule deleted.", "deactivated": False, "deleted": True}


@router.patch("/rules/{rule_id}", response_model=DetectionRuleResponse)
def update_rule(rule_id: int, payload: DetectionRuleUpdate, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin"))]):
    rule = db.get(DetectionRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(rule, key, value)
    db.commit(); db.refresh(rule)
    metrics = DetectionRulesService.get_rule_trigger_metrics(db=db, rule_id=rule.id)
    return DetectionRuleResponse.model_validate(rule).model_copy(update=metrics)


@router.post("/run/{normalized_log_id}", response_model=DetectionRunResponse)
def run_detection(normalized_log_id: int, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))]):
    alerts = DetectionEngine.run_single(db=db, normalized_log_id=normalized_log_id, current_user=current_user)
    return DetectionRunResponse(message="Detection completed.", alerts_created=len(alerts), alert_ids=[a.id for a in alerts])


@router.post("/run-batch", response_model=DetectionRunResponse)
def run_batch(payload: RunBatchRequest, db: Annotated[Session, Depends(get_db)], current_user: Annotated[User, Depends(require_roles("admin","analyst"))]):
    alerts = DetectionEngine.run_batch(db=db, current_user=current_user, normalized_log_ids=payload.normalized_log_ids, limit=payload.limit, only_without_alerts=payload.only_without_alerts)
    return DetectionRunResponse(message="Batch detection completed.", alerts_created=len(alerts), alert_ids=[a.id for a in alerts])

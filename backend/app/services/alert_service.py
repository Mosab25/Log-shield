from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.alert import Alert
from app.models.alert_related_log import AlertRelatedLog
from app.models.alert_status_history import AlertStatusHistory
from app.models.analyst_note import AnalystNote
from app.models.normalized_log import NormalizedLog
from app.models.user import User
from app.services.audit_service import AuditService


class AlertService:
    ALLOWED_TRANSITIONS = {
        "open": {"investigating", "false_positive", "escalated"},
        "investigating": {"resolved", "escalated"},
        "resolved": set(),
        "false_positive": set(),
        "escalated": set(),
    }

    @staticmethod
    def user_mini(user: User | None) -> dict | None:
        if not user:
            return None
        return {"id": user.id, "full_name": user.full_name, "email": user.email, "role_name": user.role.name if user.role else None}

    @staticmethod
    def related_logs(db: Session, alert: Alert) -> list[NormalizedLog]:
        logs = {}
        if alert.normalized_log:
            logs[alert.normalized_log.id] = alert.normalized_log
        rows = db.execute(select(NormalizedLog).join(AlertRelatedLog, AlertRelatedLog.normalized_log_id == NormalizedLog.id).where(AlertRelatedLog.alert_id == alert.id)).scalars().all()
        for log in rows:
            logs[log.id] = log
        return list(logs.values())

    @staticmethod
    def log_response(log: NormalizedLog) -> dict:
        return {"id": log.id, "raw_log_id": log.raw_log_id, "event_time": log.event_time, "source": log.source, "source_type": log.source_type, "event_type": log.event_type, "severity": log.severity, "parser_status": log.parser_status, "src_ip": log.src_ip, "username": log.username, "hostname": log.hostname, "message": log.message, "metadata": log.event_metadata or {}}

    @classmethod
    def _list_item_from_context(cls, alert: Alert, logs: list[NormalizedLog], notes_count: int) -> dict:
        source_ip = next((l.src_ip for l in logs if l.src_ip), None)
        username = next((l.username for l in logs if l.username), None)
        return {
            "id": alert.id,
            "title": alert.title,
            "description": alert.description,
            "severity": alert.severity,
            "risk_score": alert.risk_score,
            "source_ip": source_ip,
            "username": username,
            "status": alert.status,
            "assigned_analyst": cls.user_mini(alert.assigned_to),
            "mitre_tactic": alert.detection_rule.mitre_tactic if alert.detection_rule else None,
            "mitre_technique": alert.detection_rule.mitre_technique if alert.detection_rule else None,
            "attack_type": alert.detection_rule.category if alert.detection_rule else None,
            "detection_rule_name": alert.detection_rule.name if alert.detection_rule else None,
            "related_log_count": len(logs),
            "notes_count": notes_count,
            "created_at": alert.created_at,
            "updated_at": alert.updated_at,
        }

    @classmethod
    def list_item(cls, db: Session, alert: Alert) -> dict:
        logs = cls.related_logs(db, alert)
        notes_count = db.execute(select(func.count(AnalystNote.id)).where(AnalystNote.alert_id == alert.id)).scalar_one()
        return cls._list_item_from_context(alert, logs, notes_count)

    @classmethod
    def _list_items(cls, db: Session, alerts: list[Alert]) -> list[dict]:
        if not alerts:
            return []

        alert_ids = [alert.id for alert in alerts]
        logs_by_alert: dict[int, dict[int, NormalizedLog]] = {alert.id: {} for alert in alerts}
        for alert in alerts:
            if alert.normalized_log:
                logs_by_alert[alert.id][alert.normalized_log.id] = alert.normalized_log

        related_rows = db.execute(
            select(AlertRelatedLog.alert_id, NormalizedLog)
            .join(NormalizedLog, AlertRelatedLog.normalized_log_id == NormalizedLog.id)
            .where(AlertRelatedLog.alert_id.in_(alert_ids))
        ).all()
        for alert_id, log in related_rows:
            logs_by_alert.setdefault(alert_id, {})[log.id] = log

        note_rows = db.execute(
            select(AnalystNote.alert_id, func.count(AnalystNote.id))
            .where(AnalystNote.alert_id.in_(alert_ids))
            .group_by(AnalystNote.alert_id)
        ).all()
        notes_by_alert = {alert_id: int(count) for alert_id, count in note_rows}

        return [
            cls._list_item_from_context(alert, list(logs_by_alert.get(alert.id, {}).values()), notes_by_alert.get(alert.id, 0))
            for alert in alerts
        ]

    @classmethod
    def detail(cls, db: Session, alert: Alert) -> dict:
        item = cls.list_item(db, alert)
        item["related_logs"] = [cls.log_response(log) for log in cls.related_logs(db, alert)]
        item["analyst_notes"] = [
            {"id": n.id, "alert_id": n.alert_id, "analyst": cls.user_mini(n.analyst), "note": n.note, "created_at": n.created_at, "updated_at": n.updated_at}
            for n in db.execute(select(AnalystNote).where(AnalystNote.alert_id == alert.id).order_by(AnalystNote.created_at.asc())).scalars().all()
        ]
        item["status_history"] = [
            {"id": h.id, "alert_id": h.alert_id, "old_status": h.old_status, "new_status": h.new_status, "changed_by": cls.user_mini(h.changed_by), "comment": h.comment, "changed_at": h.changed_at}
            for h in db.execute(select(AlertStatusHistory).where(AlertStatusHistory.alert_id == alert.id).order_by(AlertStatusHistory.changed_at.asc())).scalars().all()
        ]
        return item

    @staticmethod
    def get_alert(db: Session, alert_id: int) -> Alert:
        alert = db.get(Alert, alert_id)
        if not alert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert was not found.")
        return alert

    @classmethod
    def list_alerts(cls, *, db: Session, skip: int, limit: int, status_filter: str | None, severity: str | None, assigned_to_id: int | None, source_ip: str | None, username: str | None, min_risk_score: int | None, max_risk_score: int | None, start_date, end_date) -> tuple[int, list[dict]]:
        query = select(Alert).options(
            joinedload(Alert.normalized_log),
            joinedload(Alert.detection_rule),
            joinedload(Alert.assigned_to).joinedload(User.role),
        )
        count_query = select(func.count(Alert.id))
        filters = []
        if status_filter: filters.append(Alert.status == status_filter)
        if severity: filters.append(Alert.severity == severity)
        if assigned_to_id is not None: filters.append(Alert.assigned_to_id == assigned_to_id)
        if min_risk_score is not None: filters.append(Alert.risk_score >= min_risk_score)
        if max_risk_score is not None: filters.append(Alert.risk_score <= max_risk_score)
        if start_date: filters.append(Alert.created_at >= start_date)
        if end_date: filters.append(Alert.created_at <= end_date)
        for f in filters:
            query = query.where(f)
            count_query = count_query.where(f)
        total = db.execute(count_query).scalar_one()
        alerts = db.execute(query.order_by(Alert.risk_score.desc(), Alert.created_at.desc()).offset(skip).limit(limit)).scalars().all()
        items = cls._list_items(db, list(alerts))
        if source_ip:
            items = [i for i in items if i["source_ip"] == source_ip]
        if username:
            items = [i for i in items if i["username"] == username]
        return total, items

    @classmethod
    def update_status(cls, *, db: Session, alert_id: int, new_status: str, comment: str | None, current_user: User) -> dict:
        alert = cls.get_alert(db, alert_id)
        old = alert.status
        if new_status == old:
            raise HTTPException(status_code=400, detail="Alert already has this status.")
        if new_status not in cls.ALLOWED_TRANSITIONS.get(old, set()):
            raise HTTPException(status_code=400, detail=f"Invalid status transition: {old} -> {new_status}.")
        alert.status = new_status
        if new_status in {"resolved", "false_positive"}:
            alert.resolved_at = datetime.now(timezone.utc)
        db.add(AlertStatusHistory(alert_id=alert.id, old_status=old, new_status=new_status, changed_by_id=current_user.id, comment=comment))
        AuditService.create_audit_log(db=db, actor_user_id=current_user.id, action="alerts.status_update", entity_type="alert", entity_id=str(alert.id), details={"old_status": old, "new_status": new_status, "comment": comment})
        db.commit(); db.refresh(alert)
        return cls.detail(db, alert)

    @classmethod
    def assign_alert(cls, *, db: Session, alert_id: int, analyst_id: int | None, comment: str | None, current_user: User) -> dict:
        alert = cls.get_alert(db, alert_id)
        if analyst_id is not None:
            analyst = db.get(User, analyst_id)
            if not analyst or not analyst.is_active:
                raise HTTPException(status_code=404, detail="Analyst not found.")
            if analyst.role.name not in {"admin", "analyst"}:
                raise HTTPException(status_code=400, detail="Alert can only be assigned to admin or analyst.")
        alert.assigned_to_id = analyst_id
        if comment:
            db.add(AnalystNote(alert_id=alert.id, analyst_id=current_user.id, note=f"Assignment note: {comment}"))
        AuditService.create_audit_log(db=db, actor_user_id=current_user.id, action="alerts.assign", entity_type="alert", entity_id=str(alert.id), details={"analyst_id": analyst_id})
        db.commit(); db.refresh(alert)
        return cls.detail(db, alert)

    @classmethod
    def add_note(cls, *, db: Session, alert_id: int, note_text: str, current_user: User) -> dict:
        alert = cls.get_alert(db, alert_id)
        note = AnalystNote(alert_id=alert.id, analyst_id=current_user.id, note=note_text)
        db.add(note); db.flush()
        AuditService.create_audit_log(db=db, actor_user_id=current_user.id, action="alerts.note_add", entity_type="alert", entity_id=str(alert.id), details={"note_id": note.id})
        db.commit(); db.refresh(note)
        return {"id": note.id, "alert_id": note.alert_id, "analyst": cls.user_mini(note.analyst), "note": note.note, "created_at": note.created_at, "updated_at": note.updated_at}

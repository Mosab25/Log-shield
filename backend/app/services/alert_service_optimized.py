from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.alert_related_log import AlertRelatedLog
from app.models.analyst_note import AnalystNote
from app.models.alert_status_history import AlertStatusHistory
from app.models.normalized_log import NormalizedLog
from app.models.user import User
from app.services.audit_service import AuditService

class OptimizedAlertService:
    """Optimized AlertService with reduced N+1 queries and better performance."""
    
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
    def related_logs_optimized(db: Session, alert: Alert) -> list[dict]:
        """Get related logs with single query instead of multiple joins."""
        # Use a single query with LEFT JOIN to avoid N+1
        query = (
            select(
                NormalizedLog.id,
                NormalizedLog.src_ip,
                NormalizedLog.username,
                NormalizedLog.event_time,
                NormalizedLog.source,
                NormalizedLog.event_type,
                NormalizedLog.severity,
                NormalizedLog.message
            )
            .select_from(Alert)
            .join(NormalizedLog, Alert.normalized_log_id == NormalizedLog.id, isouter=True)
            .where(Alert.id == alert.id)
        )
        
        logs = db.execute(query).scalars().all()
        return [
            {
                "id": log.id,
                "src_ip": log.src_ip,
                "username": log.username,
                "event_time": log.event_time,
                "source": log.source,
                "event_type": log.event_type,
                "severity": log.severity,
                "message": log.message
            }
            for log in logs
        ]

    @staticmethod
    def log_response(log: NormalizedLog) -> dict:
        return {
            "id": log.id,
            "raw_log_id": log.raw_log_id,
            "event_time": log.event_time,
            "source": log.source,
            "source_type": log.source_type,
            "event_type": log.event_type,
            "severity": log.severity,
            "src_ip": log.src_ip,
            "username": log.username,
            "hostname": log.hostname,
            "message": log.message,
            "metadata": log.event_metadata or {},
            "created_at": log.created_at,
        }

    @staticmethod
    def list_item_optimized(alert: Alert, logs: list[dict], notes_count: int) -> dict:
        """Create list item with minimal data."""
        source_ip = next((l["src_ip"] for l in logs if l["src_ip"]), None)
        username = next((l["username"] for l in logs if l["username"]), None)
        
        return {
            "id": alert.id,
            "title": alert.title,
            "description": alert.description,
            "severity": alert.severity,
            "risk_score": alert.risk_score,
            "source_ip": source_ip,
            "username": username,
            "status": alert.status,
            "assigned_analyst": OptimizedAlertService.user_mini(alert.assigned_to),
            "mitre_tactic": alert.detection_rule.mitre_tactic if alert.detection_rule else None,
            "mitre_technique": alert.detection_rule.mitre_technique if alert.detection_rule else None,
            "attack_type": alert.detection_rule.category if alert.detection_rule else None,
            "detection_rule_name": alert.detection_rule.name if alert.detection_rule else None,
            "related_log_count": len(logs),
            "notes_count": notes_count,
            "created_at": alert.created_at,
            "updated_at": alert.updated_at,
        }

    @staticmethod
    def detail_optimized(db: Session, alert_id: int) -> dict:
        """Optimized alert detail with minimal queries."""
        # Get alert with minimal joins
        alert = db.execute(
            select(Alert)
            .options(
                # Only join detection_rule, avoid loading all relationships
                joinedload(Alert.detection_rule)
            )
            .where(Alert.id == alert_id)
        ).scalar_one_or_none()
        
        if not alert:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
        
        # Get related logs with single optimized query
        logs = OptimizedAlertService.related_logs_optimized(db, alert)
        
        # Get notes with single query
        notes = db.execute(
            select(AnalystNote)
            .where(AnalystNote.alert_id == alert_id)
            .order_by(AnalystNote.created_at.asc())
        ).scalars().all()
        
        # Get status history with single query
        status_history = db.execute(
            select(AlertStatusHistory)
            .where(AlertStatusHistory.alert_id == alert_id)
            .order_by(AlertStatusHistory.changed_at.desc())
        ).scalars().all()
        
        return {
            "id": alert.id,
            "title": alert.title,
            "description": alert.description,
            "severity": alert.severity,
            "risk_score": alert.risk_score,
            "source_ip": next((l["src_ip"] for l in logs if l["src_ip"]), None),
            "username": next((l["username"] for l in logs if l["username"]), None),
            "status": alert.status,
            "assigned_analyst": OptimizedAlertService.user_mini(alert.assigned_to),
            "mitre_tactic": alert.detection_rule.mitre_tactic if alert.detection_rule else None,
            "mitre_technique": alert.detection_rule.mitre_technique if alert.detection_rule else None,
            "attack_type": alert.detection_rule.category if alert.detection_rule else None,
            "detection_rule_name": alert.detection_rule.name if alert.detection_rule else None,
            "related_logs": [OptimizedAlertService.log_response(log) for log in logs],
            "analyst_notes": [
                {
                    "id": n.id,
                    "alert_id": n.alert_id,
                    "analyst": OptimizedAlertService.user_mini(n.analyst),
                    "note": n.note,
                    "created_at": n.created_at,
                    "updated_at": n.updated_at,
                }
                for n in notes
            ],
            "status_history": [
                {
                    "id": h.id,
                    "alert_id": h.alert_id,
                    "old_status": h.old_status,
                    "new_status": h.new_status,
                    "changed_by": OptimizedAlertService.user_mini(h.changed_by),
                    "comment": h.comment,
                    "changed_at": h.changed_at,
                }
                for h in status_history
            ],
            "created_at": alert.created_at,
            "updated_at": alert.updated_at,
        }

    @staticmethod
    def list_alerts_optimized(cls, *, db: Session, skip: int, limit: int, status_filter: str | None, severity: str | None, assigned_to_id: int | None, source_ip: str | None, username: str | None, min_risk_score: int | None, max_risk_score: int | None, start_date, end_date) -> tuple[int, list[dict]]:
        """Optimized alerts listing with minimal queries."""
        
        # Build base query with minimal joins
        query = (
            select(Alert)
            .options(
                # Only join essential relationships
                joinedload(Alert.detection_rule),
                joinedload(Alert.assigned_to).joinedload(User.role),
            )
        )
        
        # Build filters efficiently
        filters = []
        if status_filter:
            filters.append(Alert.status == status_filter)
        if severity:
            filters.append(Alert.severity == severity)
        if assigned_to_id is not None:
            filters.append(Alert.assigned_to_id == assigned_to_id)
        if source_ip:
            filters.append(Alert.normalized_log.has(NormalizedLog.src_ip == source_ip))
        if username:
            filters.append(Alert.normalized_log.has(NormalizedLog.username == username))
        if min_risk_score is not None:
            filters.append(Alert.risk_score >= min_risk_score)
        if max_risk_score is not None:
            filters.append(Alert.risk_score <= max_risk_score)
        if start_date:
            filters.append(Alert.created_at >= start_date)
        if end_date:
            filters.append(Alert.created_at <= end_date)
        
        if filters:
            query = query.where(*filters)
        
        # Get total count efficiently
        total_query = select(func.count(Alert.id))
        if filters:
            total_query = total_query.where(*filters)
        total = db.execute(total_query).scalar_one()
        
        # Get paginated results
        alerts = db.execute(
            query.order_by(Alert.risk_score.desc(), Alert.created_at.desc())
            .offset(skip)
            .limit(limit)
        ).scalars().all()
        
        # Pre-fetch notes count for all alerts to avoid N+1
        alert_ids = [alert.id for alert in alerts]
        if alert_ids:
            notes_counts = dict(
                db.execute(
                    select(AnalystNote.alert_id, func.count(AnalystNote.id))
                    .where(AnalystNote.alert_id.in_(alert_ids))
                    .group_by(AnalystNote.alert_id)
                ).all()
            )
        else:
            notes_counts = {}
        
        items = [OptizedAlertService.list_item_optimized(alert, [], notes_counts.get(alert.id, 0)) for alert in alerts]     
        return total, items

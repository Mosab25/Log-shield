from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select, text
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import AuditActorResponse, AuditLogResponse


# Category inference from action names
CATEGORY_MAP: dict[str, list[str]] = {
    "auth": ["login", "logout", "register", "2fa", "otp", "session", "login_success", "login_failed", "admin_2fa"],
    "admin": ["user_created", "user_updated", "user_deactivated", "user_deleted", "role_changed", "rule_disabled", "rule_enabled", "user_activated"],
    "security": ["ip_block", "ip_unblock", "root_admin", "failed_login", "blocked", "threat", "alert", "root_admin_modification_blocked", "root_admin_self_ip_block_denied", "admin_2fa_failed", "ip_block_created", "ip_block_removed"],
    "report": ["report_exported", "report_created", "report_deleted"],
    "incident": ["incident_created", "incident_updated", "incident_deleted", "incident_assigned"],
    "url_scan": ["url_scan_requested", "url_scan_completed", "url_scan_failed"],
}

# Severity inference from action names
SEVERITY_MAP: dict[str, str] = {
    # Critical
    "root_admin_modification_blocked": "critical",
    "root_admin_self_ip_block_denied": "critical",
    "admin_2fa_failed": "critical",
    "ip_block_created": "critical",
    "user_deleted": "critical",
    "role_changed": "critical",
    "detection_rule_disabled": "critical",
    # Warning
    "login_failed": "warning",
    "failed_login": "warning",
    "report_exported": "warning",
    "user_deactivated": "warning",
    "ip_block_removed": "warning",
    "user_updated": "warning",
    # Info - everything else
}


def infer_category(action: str) -> str:
    action_lower = action.lower()
    for category, keywords in CATEGORY_MAP.items():
        for kw in keywords:
            if kw in action_lower:
                return category
    return "system"


def infer_severity(action: str) -> str:
    action_lower = action.lower()
    for key_action, sev in SEVERITY_MAP.items():
        if key_action in action_lower:
            return sev
    return "info"


SENSITIVE_ACTIONS = {
    "user_deleted", "user_deactivated", "role_changed", "ip_block_created",
    "root_admin_modification_blocked", "admin_2fa_failed",
    "detection_rule_disabled", "report_exported", "ip_block_removed",
    "user_created", "user_updated", "user_activated",
}

ADMIN_ACTIONS = {
    "user_created", "user_updated", "user_deactivated", "user_deleted",
    "user_activated", "role_changed", "ip_block_created", "ip_block_removed",
    "rule_disabled", "rule_enabled", "report_exported",
    "root_admin_modification_blocked", "admin_2fa_failed",
    "admin_2fa_verified", "settings_updated",
}


class AuditService:
    @staticmethod
    def create_audit_log(
        *,
        db: Session,
        actor_user_id: int | None,
        action: str,
        entity_type: str | None = None,
        entity_id: str | None = None,
        details: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuditLog:
        audit_log = AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(audit_log)
        return audit_log

    @staticmethod
    def _actor_response(db: Session, actor_user_id: int | None) -> AuditActorResponse | None:
        if actor_user_id is None:
            return None
        user = db.get(User, actor_user_id)
        if user is None:
            return None
        return AuditActorResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            role_name=user.role.name if user.role else None,
        )

    @classmethod
    def _to_response(cls, db: Session, audit_log: AuditLog) -> AuditLogResponse:
        return AuditLogResponse(
            id=audit_log.id,
            actor_user_id=audit_log.actor_user_id,
            actor=cls._actor_response(db, audit_log.actor_user_id),
            action=audit_log.action,
            entity_type=audit_log.entity_type,
            entity_id=audit_log.entity_id,
            ip_address=audit_log.ip_address,
            user_agent=audit_log.user_agent,
            details=audit_log.details or {},
            created_at=audit_log.created_at,
        )

    @staticmethod
    def _apply_filters(
        *,
        query: Select,
        action: str | None = None,
        actor_user_id: int | None = None,
        entity_type: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        ip_address: str | None = None,
        q: str | None = None,
        category: str | None = None,
        severity: str | None = None,
    ) -> Select:
        if action:
            query = query.where(AuditLog.action.ilike(f"%{action.strip()}%"))
        if actor_user_id is not None:
            query = query.where(AuditLog.actor_user_id == actor_user_id)
        if entity_type:
            query = query.where(AuditLog.entity_type.ilike(f"%{entity_type.strip()}%"))
        if start_date:
            query = query.where(AuditLog.created_at >= start_date)
        if end_date:
            query = query.where(AuditLog.created_at <= end_date)
        if ip_address:
            query = query.where(AuditLog.ip_address.ilike(f"%{ip_address.strip()}%"))
        if q:
            term = f"%{q.strip()}%"
            query = query.where(
                (AuditLog.action.ilike(term))
                | (AuditLog.entity_type.ilike(term))
                | (AuditLog.ip_address.ilike(term))
            )
        if category:
            cat_actions = CATEGORY_MAP.get(category, [])
            if cat_actions:
                query = query.where(AuditLog.action.in_(cat_actions))
        if severity:
            sev_actions = [a for a, s in SEVERITY_MAP.items() if s == severity]
            if sev_actions:
                query = query.where(AuditLog.action.in_(sev_actions))
        return query

    @classmethod
    def list_audit_logs(
        cls,
        *,
        db: Session,
        skip: int,
        limit: int,
        action: str | None = None,
        actor_user_id: int | None = None,
        entity_type: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        ip_address: str | None = None,
        q: str | None = None,
        category: str | None = None,
        severity: str | None = None,
    ) -> tuple[int, list[AuditLogResponse]]:
        if start_date and end_date and start_date > end_date:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="start_date cannot be after end_date.")

        filter_kwargs = dict(
            action=action,
            actor_user_id=actor_user_id,
            entity_type=entity_type,
            start_date=start_date,
            end_date=end_date,
            ip_address=ip_address,
            q=q,
            category=category,
            severity=severity,
        )

        base_query = cls._apply_filters(query=select(AuditLog), **filter_kwargs)
        count_query = cls._apply_filters(query=select(func.count(AuditLog.id)), **filter_kwargs)
        total = db.execute(count_query).scalar_one()
        rows = db.execute(base_query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).offset(skip).limit(limit)).scalars().all()
        return total, [cls._to_response(db, item) for item in rows]

    @classmethod
    def get_summary(cls, db: Session) -> dict[str, Any]:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        # Total events today
        total_events_today = db.execute(
            select(func.count(AuditLog.id)).where(AuditLog.created_at >= today_start)
        ).scalar_one()

        # Sensitive events today
        sensitive_events_today = db.execute(
            select(func.count(AuditLog.id)).where(
                AuditLog.created_at >= today_start,
                AuditLog.action.in_(SENSITIVE_ACTIONS),
            )
        ).scalar_one()

        # Failed logins today
        failed_logins_today = db.execute(
            select(func.count(AuditLog.id)).where(
                AuditLog.created_at >= today_start,
                AuditLog.action.ilike("%failed%"),
            )
        ).scalar_one()

        # Admin actions today
        admin_actions_today = db.execute(
            select(func.count(AuditLog.id)).where(
                AuditLog.created_at >= today_start,
                AuditLog.action.in_(ADMIN_ACTIONS),
            )
        ).scalar_one()

        # Most active user today
        most_active_row = db.execute(
            select(AuditLog.actor_user_id, func.count(AuditLog.id).label("cnt"))
            .where(AuditLog.created_at >= today_start, AuditLog.actor_user_id.isnot(None))
            .group_by(AuditLog.actor_user_id)
            .order_by(text("cnt DESC"))
            .limit(1)
        ).first()

        most_active_user = None
        if most_active_row:
            user = db.get(User, most_active_row[0])
            if user:
                most_active_user = {
                    "id": user.id,
                    "email": user.email,
                    "name": user.full_name or user.email,
                }

        # Most common action today
        most_common_row = db.execute(
            select(AuditLog.action, func.count(AuditLog.id).label("cnt"))
            .where(AuditLog.created_at >= today_start)
            .group_by(AuditLog.action)
            .order_by(text("cnt DESC"))
            .limit(1)
        ).first()

        most_common_action = None
        if most_common_row:
            most_common_action = {"action": most_common_row[0], "count": most_common_row[1]}

        # Events by category
        all_actions_today = db.execute(
            select(AuditLog.action, func.count(AuditLog.id).label("cnt"))
            .where(AuditLog.created_at >= today_start)
            .group_by(AuditLog.action)
        ).all()

        category_counts: dict[str, int] = {}
        for action_name, cnt in all_actions_today:
            cat = infer_category(action_name)
            category_counts[cat] = category_counts.get(cat, 0) + cnt

        events_by_category = [{"category": cat, "count": cnt} for cat, cnt in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)]

        # Events timeline (hourly today)
        timeline_rows = db.execute(
            select(
                func.date_trunc("hour", AuditLog.created_at).label("hour"),
                func.count(AuditLog.id).label("cnt"),
            )
            .where(AuditLog.created_at >= today_start)
            .group_by(text("hour"))
            .order_by(text("hour"))
        ).all()

        events_timeline = [{"hour": str(row[0]), "count": row[1]} for row in timeline_rows]

        # Insights
        insights: list[str] = []
        if failed_logins_today > 10:
            insights.append(f"High number of failed logins detected today ({failed_logins_today}). Consider reviewing source IPs.")
        if sensitive_events_today > 5:
            insights.append(f"Multiple sensitive administrative actions occurred today ({sensitive_events_today}). Review for authorization.")
        if admin_actions_today > 0 and most_active_user:
            insights.append(f"Admin activity detected from {most_active_user['name']}. Verify authorized operations.")
        if not insights:
            insights.append("No unusual security patterns detected today.")

        return {
            "total_events_today": total_events_today,
            "sensitive_events_today": sensitive_events_today,
            "failed_logins_today": failed_logins_today,
            "admin_actions_today": admin_actions_today,
            "most_active_user": most_active_user,
            "most_common_action": most_common_action,
            "events_by_category": events_by_category,
            "events_timeline": events_timeline,
            "insights": insights,
        }

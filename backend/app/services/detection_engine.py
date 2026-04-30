from __future__ import annotations

from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.alert_related_log import AlertRelatedLog
from app.models.detection_rule import DetectionRule
from app.models.normalized_log import NormalizedLog
from app.services.audit_service import AuditService


class DetectionEngine:
    @staticmethod
    def _rule(db: Session, name: str) -> DetectionRule | None:
        return db.execute(select(DetectionRule).where(DetectionRule.name == name, DetectionRule.is_active.is_(True))).scalar_one_or_none()

    @staticmethod
    def _alert_exists(db: Session, rule_id: int, log_id: int) -> bool:
        return db.execute(select(Alert).where(Alert.detection_rule_id == rule_id, Alert.normalized_log_id == log_id)).scalar_one_or_none() is not None

    @staticmethod
    def _create_alert(db: Session, *, rule: DetectionRule, primary_log: NormalizedLog, related_logs: list[NormalizedLog], title: str, description: str) -> Alert | None:
        if DetectionEngine._alert_exists(db, rule.id, primary_log.id):
            return None
        alert = Alert(
            title=title,
            description=description,
            severity=rule.severity,
            risk_score=0,
            status="open",
            normalized_log_id=primary_log.id,
            detection_rule_id=rule.id,
        )
        db.add(alert)
        db.flush()
        for log in {log.id: log for log in related_logs}.values():
            db.add(AlertRelatedLog(alert_id=alert.id, normalized_log_id=log.id))
        return alert

    @classmethod
    def run_single(cls, *, db: Session, normalized_log_id: int, current_user) -> list[Alert]:
        log = db.get(NormalizedLog, normalized_log_id)
        if log is None:
            return []

        created: list[Alert] = []
        start = (log.event_time or log.created_at) - timedelta(minutes=10)
        end = (log.event_time or log.created_at) + timedelta(minutes=10)

        if log.event_type == "failed_login" and log.src_ip and log.username:
            related = db.execute(
                select(NormalizedLog).where(
                    NormalizedLog.event_type == "failed_login",
                    NormalizedLog.src_ip == log.src_ip,
                    NormalizedLog.username == log.username,
                    NormalizedLog.event_time >= start,
                    NormalizedLog.event_time <= end,
                )
            ).scalars().all()
            if len(related) >= 5:
                rule = cls._rule(db, "Brute Force Login")
                if rule:
                    alert = cls._create_alert(db=db, rule=rule, primary_log=log, related_logs=related, title=f"Brute Force Login: {log.source}", description=f"{len(related)} failed login attempts detected for {log.username} from {log.src_ip}.")
                    if alert: created.append(alert)

        if log.event_type == "successful_login" and (log.username or "").lower() in {"admin", "administrator", "root"}:
            if log.src_ip and not (log.src_ip.startswith("10.") or log.src_ip.startswith("192.168.") or log.src_ip.startswith("172.16.")):
                rule = cls._rule(db, "Admin Login From Unknown IP")
                if rule:
                    alert = cls._create_alert(db=db, rule=rule, primary_log=log, related_logs=[log], title=f"Admin Login From Unknown IP: {log.source}", description=f"Admin login observed from {log.src_ip}.")
                    if alert: created.append(alert)
            hour = (log.event_time or log.created_at).hour
            if hour < 8 or hour > 20:
                rule = cls._rule(db, "Login Outside Normal Hours")
                if rule:
                    alert = cls._create_alert(db=db, rule=rule, primary_log=log, related_logs=[log], title=f"Login Outside Normal Hours: {log.source}", description=f"Login occurred outside normal hours for {log.username}.")
                    if alert: created.append(alert)

        if log.event_type == "http_404" and log.src_ip:
            related = db.execute(
                select(NormalizedLog).where(
                    NormalizedLog.event_type == "http_404",
                    NormalizedLog.src_ip == log.src_ip,
                    NormalizedLog.event_time >= start,
                    NormalizedLog.event_time <= end,
                )
            ).scalars().all()
            if len(related) >= 5:
                rule = cls._rule(db, "Multiple 404 Requests")
                if rule:
                    alert = cls._create_alert(db=db, rule=rule, primary_log=log, related_logs=related, title=f"Multiple 404 Requests: {log.source}", description=f"{len(related)} 404 events detected from {log.src_ip}.")
                    if alert: created.append(alert)

        if log.event_type == "suspicious_web_request":
            rule = cls._rule(db, "SQL Injection Pattern In Log Text")
            if rule:
                alert = cls._create_alert(db=db, rule=rule, primary_log=log, related_logs=[log], title=f"SQL Injection Pattern Detected: {log.source}", description="Suspicious SQL-like pattern was detected in log text only.")
                if alert: created.append(alert)

        if log.user_agent and any(x in log.user_agent.lower() for x in ["sqlmap", "curl", "python-requests", "bot"]):
            rule = cls._rule(db, "Suspicious User Agent")
            if rule:
                alert = cls._create_alert(db=db, rule=rule, primary_log=log, related_logs=[log], title=f"Suspicious User Agent: {log.source}", description=f"Suspicious user agent observed: {log.user_agent}.")
                if alert: created.append(alert)

        if log.event_type == "privilege_change":
            rule = cls._rule(db, "Privilege Escalation Event")
            if rule:
                alert = cls._create_alert(db=db, rule=rule, primary_log=log, related_logs=[log], title=f"Privilege Change Event: {log.source}", description="Privilege change to a high-privilege role detected.")
                if alert: created.append(alert)

        if log.event_type == "server_error" and log.src_ip:
            related = db.execute(select(NormalizedLog).where(NormalizedLog.event_type == "server_error", NormalizedLog.src_ip == log.src_ip, NormalizedLog.event_time >= start, NormalizedLog.event_time <= end)).scalars().all()
            if len(related) >= 8:
                rule = cls._rule(db, "High Error Rate")
                if rule:
                    alert = cls._create_alert(db=db, rule=rule, primary_log=log, related_logs=related, title=f"High Error Rate: {log.source}", description=f"{len(related)} server errors observed.")
                    if alert: created.append(alert)

        if log.path and log.path.startswith("/admin"):
            related = db.execute(select(NormalizedLog).where(NormalizedLog.src_ip == log.src_ip, NormalizedLog.path.like("/admin%"), NormalizedLog.event_time >= start, NormalizedLog.event_time <= end)).scalars().all()
            if len(related) >= 3:
                rule = cls._rule(db, "Repeated Access To Sensitive Paths")
                if rule:
                    alert = cls._create_alert(db=db, rule=rule, primary_log=log, related_logs=related, title=f"Repeated Sensitive Path Access: {log.source}", description=f"Repeated access to sensitive paths from {log.src_ip}.")
                    if alert: created.append(alert)

        if log.event_type == "failed_login" and log.src_ip:
            usernames = db.execute(select(func.count(func.distinct(NormalizedLog.username))).where(NormalizedLog.event_type == "failed_login", NormalizedLog.src_ip == log.src_ip, NormalizedLog.event_time >= start, NormalizedLog.event_time <= end)).scalar_one()
            if usernames >= 3:
                related = db.execute(select(NormalizedLog).where(NormalizedLog.event_type == "failed_login", NormalizedLog.src_ip == log.src_ip, NormalizedLog.event_time >= start, NormalizedLog.event_time <= end)).scalars().all()
                rule = cls._rule(db, "Multiple Users From Same IP")
                if rule:
                    alert = cls._create_alert(db=db, rule=rule, primary_log=log, related_logs=related, title=f"Multiple Users From Same IP: {log.source}", description=f"Failed login attempts against multiple users from {log.src_ip}.")
                    if alert: created.append(alert)

        if created:
            AuditService.create_audit_log(db=db, actor_user_id=getattr(current_user, "id", None), action="detection.run", entity_type="normalized_log", entity_id=str(log.id), details={"alerts_created": len(created)})
            db.commit()
            for alert in created:
                db.refresh(alert)
        return created

    @classmethod
    def run_batch(cls, *, db: Session, current_user, normalized_log_ids: list[int] | None = None, limit: int = 100, only_without_alerts: bool = False) -> list[Alert]:
        query = select(NormalizedLog).order_by(NormalizedLog.event_time.asc(), NormalizedLog.id.asc())
        if normalized_log_ids:
            query = query.where(NormalizedLog.id.in_(normalized_log_ids))
        logs = db.execute(query.limit(limit)).scalars().all()
        created: list[Alert] = []
        for log in logs:
            created.extend(cls.run_single(db=db, normalized_log_id=log.id, current_user=current_user))
        return created

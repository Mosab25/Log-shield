from __future__ import annotations

import logging
from datetime import timedelta

from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.alert import Alert
from app.models.alert_related_log import AlertRelatedLog
from app.models.detection_rule import DetectionRule
from app.models.normalized_log import NormalizedLog
from app.services.alert_notification_service import AlertNotificationService
from app.services.audit_service import AuditService
from app.services.detection_suppression import should_suppress_detection

logger = logging.getLogger("logshield.detection")


class DetectionEngine:
    @staticmethod
    def _rule(db: Session, name: str) -> DetectionRule | None:
        return db.execute(select(DetectionRule).where(DetectionRule.name == name, DetectionRule.is_active.is_(True))).scalar_one_or_none()

    @staticmethod
    def _alert_exists(db: Session, rule_id: int, log_id: int) -> bool:
        return db.execute(select(Alert).where(Alert.detection_rule_id == rule_id, Alert.normalized_log_id == log_id)).scalar_one_or_none() is not None

    @staticmethod
    def _create_alert(
        db: Session,
        *,
        rule: DetectionRule,
        primary_log: NormalizedLog,
        related_logs: list[NormalizedLog],
        title: str,
        description: str,
        detection_explanation: str | None = None,
    ) -> Alert | None:
        if DetectionEngine._alert_exists(db, rule.id, primary_log.id):
            return None
        expl_parts = []
        if detection_explanation:
            expl_parts.append(detection_explanation.strip())
        expl_parts.append(f"Rule: {rule.name}.")
        if rule.description:
            expl_parts.append(rule.description.strip())
        if rule.pattern:
            expl_parts.append(f"Configured pattern summary: {rule.pattern}")
        if rule.mitre_tactic or rule.mitre_technique:
            expl_parts.append(f"MITRE: {rule.mitre_tactic or ''} {rule.mitre_technique or ''}".strip())
        merged_expl = "\n".join(p for p in expl_parts if p)

        alert = Alert(
            title=title,
            description=description,
            severity=rule.severity,
            risk_score=0,
            status="open",
            normalized_log_id=primary_log.id,
            detection_rule_id=rule.id,
            detection_explanation=merged_expl or None,
        )
        db.add(alert)
        db.flush()
        for log in {log.id: log for log in related_logs}.values():
            db.add(AlertRelatedLog(alert_id=alert.id, normalized_log_id=log.id))
        return alert

    @classmethod
    def run_single(cls, *, db: Session, normalized_log_id: int, current_user) -> list[Alert]:
        settings = get_settings()
        log = db.get(NormalizedLog, normalized_log_id)
        if log is None:
            return []
        if should_suppress_detection(log, settings):
            return []

        created: list[Alert] = []
        win = timedelta(minutes=settings.detection_sliding_window_minutes)
        start = (log.event_time or log.created_at) - win
        end = (log.event_time or log.created_at) + win
        corr_win = timedelta(minutes=settings.detection_correlation_window_minutes)
        corr_start = (log.event_time or log.created_at) - corr_win
        corr_end = (log.event_time or log.created_at) + corr_win

        thr_bf = settings.detection_brute_force_threshold
        thr_404 = settings.detection_http_404_threshold
        thr_err = settings.detection_server_error_threshold
        thr_admin = settings.detection_sensitive_path_hits_threshold
        thr_multi_user = settings.detection_multi_user_failed_threshold
        thr_corr_failed = settings.detection_correlation_failed_logins

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
            if len(related) >= thr_bf:
                rule = cls._rule(db, "Brute Force Login")
                if rule:
                    expl = (
                        f"Matched because there were {len(related)} failed login events for the same username and source IP "
                        f"within {settings.detection_sliding_window_minutes} minutes (threshold {thr_bf})."
                    )
                    alert = cls._create_alert(
                        db=db,
                        rule=rule,
                        primary_log=log,
                        related_logs=related,
                        title=f"Brute Force Login: {log.source}",
                        description=f"{len(related)} failed login attempts detected for {log.username} from {log.src_ip}.",
                        detection_explanation=expl,
                    )
                    if alert:
                        created.append(alert)

        if log.event_type == "successful_login" and (log.username or "").lower() in {"admin", "administrator", "root"}:
            if log.src_ip and not (log.src_ip.startswith("10.") or log.src_ip.startswith("192.168.") or log.src_ip.startswith("172.16.")):
                rule = cls._rule(db, "Admin Login From Unknown IP")
                if rule:
                    expl = "Matched because a privileged username logged in successfully from a non-RFC1918 source address."
                    alert = cls._create_alert(
                        db=db,
                        rule=rule,
                        primary_log=log,
                        related_logs=[log],
                        title=f"Admin Login From Unknown IP: {log.source}",
                        description=f"Admin login observed from {log.src_ip}.",
                        detection_explanation=expl,
                    )
                    if alert:
                        created.append(alert)
            hour = (log.event_time or log.created_at).hour
            if hour < 8 or hour > 20:
                rule = cls._rule(db, "Login Outside Normal Hours")
                if rule:
                    expl = f"Matched because login succeeded at hour {hour} UTC (outside 08:00–20:00 window)."
                    alert = cls._create_alert(
                        db=db,
                        rule=rule,
                        primary_log=log,
                        related_logs=[log],
                        title=f"Login Outside Normal Hours: {log.source}",
                        description=f"Login occurred outside normal hours for {log.username}.",
                        detection_explanation=expl,
                    )
                    if alert:
                        created.append(alert)

        if log.event_type == "http_404" and log.src_ip:
            related = db.execute(
                select(NormalizedLog).where(
                    NormalizedLog.event_type == "http_404",
                    NormalizedLog.src_ip == log.src_ip,
                    NormalizedLog.event_time >= start,
                    NormalizedLog.event_time <= end,
                )
            ).scalars().all()
            if len(related) >= thr_404:
                rule = cls._rule(db, "Multiple 404 Requests")
                if rule:
                    expl = (
                        f"Matched because {len(related)} HTTP 404 events originated from the same IP within "
                        f"{settings.detection_sliding_window_minutes} minutes (threshold {thr_404})."
                    )
                    alert = cls._create_alert(
                        db=db,
                        rule=rule,
                        primary_log=log,
                        related_logs=related,
                        title=f"Multiple 404 Requests: {log.source}",
                        description=f"{len(related)} 404 events detected from {log.src_ip}.",
                        detection_explanation=expl,
                    )
                    if alert:
                        created.append(alert)

        if log.event_type == "suspicious_web_request":
            rule = cls._rule(db, "SQL Injection Pattern In Log Text")
            if rule:
                expl = "Matched because the normalized log was classified as a suspicious web request containing SQL-like patterns in text (defensive parsing only)."
                alert = cls._create_alert(
                    db=db,
                    rule=rule,
                    primary_log=log,
                    related_logs=[log],
                    title=f"SQL Injection Pattern Detected: {log.source}",
                    description="Suspicious SQL-like pattern was detected in log text only.",
                    detection_explanation=expl,
                )
                if alert:
                    created.append(alert)

        if log.user_agent and any(x in log.user_agent.lower() for x in ["sqlmap", "curl", "python-requests", "bot"]):
            rule = cls._rule(db, "Suspicious User Agent")
            if rule:
                expl = f"Matched because user-agent string contained an automated or known offensive tool token: {log.user_agent[:200]}."
                alert = cls._create_alert(
                    db=db,
                    rule=rule,
                    primary_log=log,
                    related_logs=[log],
                    title=f"Suspicious User Agent: {log.source}",
                    description=f"Suspicious user agent observed: {log.user_agent}.",
                    detection_explanation=expl,
                )
                if alert:
                    created.append(alert)

        if log.event_type == "privilege_change":
            rule = cls._rule(db, "Privilege Escalation Event")
            if rule:
                expl = "Matched because the parser labeled this event as a privilege or role change toward a high-privilege state."
                alert = cls._create_alert(
                    db=db,
                    rule=rule,
                    primary_log=log,
                    related_logs=[log],
                    title=f"Privilege Change Event: {log.source}",
                    description="Privilege change to a high-privilege role detected.",
                    detection_explanation=expl,
                )
                if alert:
                    created.append(alert)

        if log.event_type == "server_error" and log.src_ip:
            related = db.execute(
                select(NormalizedLog).where(
                    NormalizedLog.event_type == "server_error",
                    NormalizedLog.src_ip == log.src_ip,
                    NormalizedLog.event_time >= start,
                    NormalizedLog.event_time <= end,
                )
            ).scalars().all()
            if len(related) >= thr_err:
                rule = cls._rule(db, "High Error Rate")
                if rule:
                    expl = (
                        f"Matched because {len(related)} server-side error events shared the same source IP within "
                        f"{settings.detection_sliding_window_minutes} minutes (threshold {thr_err})."
                    )
                    alert = cls._create_alert(
                        db=db,
                        rule=rule,
                        primary_log=log,
                        related_logs=related,
                        title=f"High Error Rate: {log.source}",
                        description=f"{len(related)} server errors observed.",
                        detection_explanation=expl,
                    )
                    if alert:
                        created.append(alert)

        if log.path and log.path.startswith("/admin") and log.src_ip:
            related = db.execute(
                select(NormalizedLog).where(
                    NormalizedLog.src_ip == log.src_ip,
                    NormalizedLog.path.like("/admin%"),
                    NormalizedLog.event_time >= start,
                    NormalizedLog.event_time <= end,
                )
            ).scalars().all()
            if len(related) >= thr_admin:
                rule = cls._rule(db, "Repeated Access To Sensitive Paths")
                if rule:
                    expl = (
                        f"Matched because the same IP hit /admin paths {len(related)} times within "
                        f"{settings.detection_sliding_window_minutes} minutes (threshold {thr_admin})."
                    )
                    alert = cls._create_alert(
                        db=db,
                        rule=rule,
                        primary_log=log,
                        related_logs=related,
                        title=f"Repeated Sensitive Path Access: {log.source}",
                        description=f"Repeated access to sensitive paths from {log.src_ip}.",
                        detection_explanation=expl,
                    )
                    if alert:
                        created.append(alert)

        if log.event_type == "failed_login" and log.src_ip:
            usernames = db.execute(
                select(func.count(func.distinct(NormalizedLog.username))).where(
                    NormalizedLog.event_type == "failed_login",
                    NormalizedLog.src_ip == log.src_ip,
                    NormalizedLog.event_time >= start,
                    NormalizedLog.event_time <= end,
                )
            ).scalar_one()
            if usernames >= thr_multi_user:
                related = db.execute(
                    select(NormalizedLog).where(
                        NormalizedLog.event_type == "failed_login",
                        NormalizedLog.src_ip == log.src_ip,
                        NormalizedLog.event_time >= start,
                        NormalizedLog.event_time <= end,
                    )
                ).scalars().all()
                rule = cls._rule(db, "Multiple Users From Same IP")
                if rule:
                    expl = (
                        f"Matched because {usernames} distinct usernames had failed logins from {log.src_ip} within "
                        f"{settings.detection_sliding_window_minutes} minutes (threshold {thr_multi_user})."
                    )
                    alert = cls._create_alert(
                        db=db,
                        rule=rule,
                        primary_log=log,
                        related_logs=related,
                        title=f"Multiple Users From Same IP: {log.source}",
                        description=f"Failed login attempts against multiple users from {log.src_ip}.",
                        detection_explanation=expl,
                    )
                    if alert:
                        created.append(alert)

        if log.src_ip:
            failed_corr = db.execute(
                select(NormalizedLog).where(
                    NormalizedLog.event_type == "failed_login",
                    NormalizedLog.src_ip == log.src_ip,
                    NormalizedLog.event_time >= corr_start,
                    NormalizedLog.event_time <= corr_end,
                )
            ).scalars().all()
            admin_hits = db.execute(
                select(NormalizedLog).where(
                    NormalizedLog.src_ip == log.src_ip,
                    NormalizedLog.path.isnot(None),
                    NormalizedLog.path.like("/admin%"),
                    NormalizedLog.event_time >= corr_start,
                    NormalizedLog.event_time <= corr_end,
                )
            ).scalars().all()
            if len(failed_corr) >= thr_corr_failed and len(admin_hits) >= 1:
                rule = cls._rule(db, "Failed Logins Correlated With Sensitive Path Access")
                if rule:
                    related_union = {x.id: x for x in failed_corr + admin_hits}
                    related_list = list(related_union.values())
                    primary = log if log in related_list else (failed_corr[-1] if failed_corr else log)
                    expl = (
                        f"Correlation: {len(failed_corr)} failed login events and {len(admin_hits)} /admin path requests "
                        f"from the same IP within {settings.detection_correlation_window_minutes} minutes "
                        f"(failed-login threshold {thr_corr_failed})."
                    )
                    alert = cls._create_alert(
                        db=db,
                        rule=rule,
                        primary_log=primary,
                        related_logs=related_list,
                        title=f"Correlated auth abuse and admin paths: {log.source}",
                        description=f"IP {log.src_ip} shows failed logins and sensitive path activity in the same window.",
                        detection_explanation=expl,
                    )
                    if alert:
                        created.append(alert)

        if created:
            AuditService.create_audit_log(
                db=db,
                actor_user_id=getattr(current_user, "id", None),
                action="detection.run",
                entity_type="normalized_log",
                entity_id=str(log.id),
                details={"alerts_created": len(created)},
            )
            db.commit()
            for alert in created:
                db.refresh(alert)
                try:
                    AlertNotificationService.notify_if_severe(alert=alert)
                except Exception:
                    logger.exception("Notification hook failed for alert %s.", alert.id)
        return created

    @classmethod
    def run_batch(cls, *, db: Session, current_user, normalized_log_ids: list[int] | None = None, limit: int = 100, only_without_alerts: bool = False) -> list[Alert]:
        query = select(NormalizedLog).order_by(NormalizedLog.event_time.asc(), NormalizedLog.id.asc())
        if normalized_log_ids:
            query = query.where(NormalizedLog.id.in_(normalized_log_ids))
        if only_without_alerts:
            has_alert = exists(select(Alert.id).where(Alert.normalized_log_id == NormalizedLog.id))
            query = query.where(~has_alert)
        logs = db.execute(query.limit(limit)).scalars().all()
        created: list[Alert] = []
        for log in logs:
            created.extend(cls.run_single(db=db, normalized_log_id=log.id, current_user=current_user))
        return created

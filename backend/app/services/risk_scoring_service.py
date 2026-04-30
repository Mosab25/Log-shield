from __future__ import annotations

from datetime import timedelta
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.alert import Alert
from app.models.alert_related_log import AlertRelatedLog
from app.models.normalized_log import NormalizedLog
from app.models.risk_score import RiskScore
from app.services.audit_service import AuditService


class RiskScoringService:
    SEVERITY_POINTS = {"low": 10, "medium": 25, "high": 35, "critical": 45}

    @staticmethod
    def score_to_level(score: int) -> str:
        if score <= 30:
            return "low"
        if score <= 60:
            return "medium"
        if score <= 85:
            return "high"
        return "critical"

    @staticmethod
    def _factor(factors: list[dict], name: str, points: int, reason: str) -> int:
        if points > 0:
            factors.append({"factor": name, "points": points, "reason": reason})
        return points

    @staticmethod
    def _logs(db: Session, alert: Alert) -> list[NormalizedLog]:
        logs = {}
        if alert.normalized_log:
            logs[alert.normalized_log.id] = alert.normalized_log
        rows = db.execute(
            select(NormalizedLog)
            .join(AlertRelatedLog, AlertRelatedLog.normalized_log_id == NormalizedLog.id)
            .where(AlertRelatedLog.alert_id == alert.id)
        ).scalars().all()
        for log in rows:
            logs[log.id] = log
        return list(logs.values())

    @classmethod
    def calculate_alert_risk(cls, *, db: Session, alert_id: int, current_user) -> RiskScore:
        alert = db.get(Alert, alert_id)
        if not alert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert was not found.")
        logs = cls._logs(db, alert)
        factors: list[dict] = []

        score = 0
        score += cls._factor(factors, "event_severity", cls.SEVERITY_POINTS.get(alert.severity, 0), f"Alert severity is {alert.severity}.")
        if len(logs) >= 8:
            score += cls._factor(factors, "frequency", 20, f"{len(logs)} related logs are linked.")
        elif len(logs) >= 4:
            score += cls._factor(factors, "frequency", 15, f"{len(logs)} related logs are linked.")
        elif len(logs) >= 2:
            score += cls._factor(factors, "frequency", 8, f"{len(logs)} related logs are linked.")

        usernames = {(log.username or "").lower() for log in logs if log.username}
        if any(u in {"admin", "root", "administrator", "system_admin"} or "admin" in u for u in usernames):
            score += cls._factor(factors, "privileged_user", 15, "Privileged account involved.")

        if alert.detection_rule:
            score += cls._factor(factors, "rule_weight", alert.detection_rule.risk_weight, f"Detection rule weight: {alert.detection_rule.name}.")
            if alert.detection_rule.mitre_technique:
                score += cls._factor(factors, "mitre_mapping", 10, f"MITRE mapping: {alert.detection_rule.mitre_technique}.")

        if any(log.src_ip and not (log.src_ip.startswith("10.") or log.src_ip.startswith("192.168.") or log.src_ip.startswith("172.16.")) for log in logs):
            score += cls._factor(factors, "external_ip", 10, "External or unknown source IP observed.")

        final = min(100, score)
        level = cls.score_to_level(final)
        explanation = " ".join([f"- {f['reason']}" for f in factors]) or "No major risk factors."

        risk = RiskScore(
            alert_id=alert.id,
            normalized_log_id=alert.normalized_log_id,
            score=final,
            severity=level,
            factors={"factors": factors},
            explanation=f"Risk Score: {final} {level.title()}. Reasons: {explanation}",
        )
        alert.risk_score = final
        alert.severity = level
        db.add(risk)
        db.flush()
        AuditService.create_audit_log(db=db, actor_user_id=getattr(current_user, "id", None), action="risk.calculate_alert", entity_type="risk_score", entity_id=str(risk.id), details={"alert_id": alert.id, "score": final})
        db.commit()
        db.refresh(risk)
        return risk

    @staticmethod
    def to_response(risk: RiskScore) -> dict:
        raw = risk.factors or {}
        return {
            "id": risk.id,
            "alert_id": risk.alert_id,
            "normalized_log_id": risk.normalized_log_id,
            "score": risk.score,
            "severity": risk.severity,
            "explanation": risk.explanation,
            "factors": raw.get("factors", []),
            "raw_factors": raw,
            "calculated_at": risk.calculated_at,
        }

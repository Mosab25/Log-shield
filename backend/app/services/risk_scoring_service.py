from __future__ import annotations

import ipaddress
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
    SEVERITY_POINTS = {"low": 12, "medium": 24, "high": 38, "critical": 52}
    SEVERITY_ORDER = {"informational": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}

    @staticmethod
    def score_to_level(score: int) -> str:
        if score <= 24:
            return "low"
        if score <= 49:
            return "medium"
        if score <= 74:
            return "high"
        return "critical"

    @classmethod
    def max_severity(cls, *levels: str) -> str:
        valid = [str(level or "").lower() for level in levels if str(level or "").strip()]
        if not valid:
            return "low"
        return max(valid, key=lambda level: cls.SEVERITY_ORDER.get(level, 0))

    @staticmethod
    def _is_external_ip(value: str | None) -> bool:
        if not value:
            return False
        candidate = value.strip()
        try:
            ip = ipaddress.ip_address(candidate)
            return not (ip.is_private or ip.is_loopback or ip.is_link_local)
        except ValueError:
            return True

    @classmethod
    def calculate_risk_score(cls, context: dict) -> dict:
        factors: dict[str, int] = {}
        reasons: list[str] = []
        score = 0

        base_severity = str(context.get("base_severity") or "low").lower()
        base_points = cls.SEVERITY_POINTS.get(base_severity, 10)
        factors["base"] = base_points
        score += base_points
        reasons.append(f"Base event severity is {base_severity}.")

        rule_weight = int(context.get("rule_weight") or 0)
        if rule_weight > 0:
            applied_weight = min(25, max(0, rule_weight))
            factors["rule_weight"] = applied_weight
            score += applied_weight
            reasons.append("Detection rule weight indicates elevated risk.")

        mitre_technique = str(context.get("mitre_technique") or "").upper()
        if mitre_technique:
            factors["mitre"] = 10
            score += 10
            reasons.append(f"MITRE ATT&CK mapping detected ({mitre_technique}).")

        related_logs_count = int(context.get("related_logs_count") or 0)
        if related_logs_count >= 8:
            factors["related_logs"] = 15
            score += 15
            reasons.append("High number of related log events observed.")
        elif related_logs_count >= 4:
            factors["related_logs"] = 10
            score += 10
            reasons.append("Multiple related log events were correlated.")
        elif related_logs_count >= 2:
            factors["related_logs"] = 6
            score += 6
            reasons.append("More than one related log event was correlated.")

        distinct_users = int(context.get("distinct_usernames_count") or 0)
        if distinct_users >= 5:
            factors["distinct_users"] = 14
            score += 14
            reasons.append("Many distinct usernames were targeted.")
        elif distinct_users >= 3:
            factors["distinct_users"] = 10
            score += 10
            reasons.append("Multiple usernames were targeted from the same source IP.")
        elif distinct_users >= 2:
            factors["distinct_users"] = 5
            score += 5
            reasons.append("More than one username was affected.")

        source_ip = str(context.get("source_ip") or "")
        if cls._is_external_ip(source_ip):
            factors["external_ip"] = 8
            score += 8
            reasons.append("External or unknown source IP observed.")

        if bool(context.get("automation_signal")):
            factors["automation_signal"] = 6
            score += 6
            reasons.append("Attack pattern suggests automated behavior.")

        if bool(context.get("targets_sensitive_assets")):
            factors["sensitive_target"] = 8
            score += 8
            reasons.append("Sensitive authentication/admin surface was targeted.")

        if bool(context.get("successful_followup")):
            factors["successful_followup"] = 12
            score += 12
            reasons.append("Successful follow-up activity was observed after suspicious attempts.")

        if bool(context.get("repeated_occurrence")):
            factors["repeat_window"] = 6
            score += 6
            reasons.append("Repeated occurrences were observed in the same time window.")

        # Strong policy for multi-user brute force (requested behavior)
        if (
            mitre_technique == "T1110"
            and related_logs_count >= 3
            and distinct_users >= 3
            and cls._is_external_ip(source_ip)
        ):
            score = max(score, 85)
            reasons.append("Brute-force policy threshold met (T1110 + multi-user + external IP).")

        final_score = max(0, min(100, score))
        severity = cls.score_to_level(final_score)

        confidence = 60
        if related_logs_count >= 3:
            confidence += 10
        if distinct_users >= 3:
            confidence += 10
        if mitre_technique:
            confidence += 10
        if cls._is_external_ip(source_ip):
            confidence += 5
        if final_score >= 75:
            confidence = max(confidence, 85)
        confidence = max(0, min(100, confidence))

        return {
            "risk_score": final_score,
            "severity": severity,
            "confidence": confidence,
            "risk_reasons": reasons,
            "calculation_factors": factors,
        }

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

        usernames = {(log.username or "").lower() for log in logs if log.username}
        primary_source_ip = next((log.src_ip for log in logs if log.src_ip), None)
        distinct_users = len(usernames)
        repeated_occurrence = len(logs) >= 3

        risk_context = cls.calculate_risk_score({
            "base_severity": alert.severity,
            "rule_weight": getattr(alert.detection_rule, "risk_weight", 0) if alert.detection_rule else 0,
            "mitre_technique": getattr(alert.detection_rule, "mitre_technique", "") if alert.detection_rule else "",
            "related_logs_count": len(logs),
            "distinct_usernames_count": distinct_users,
            "source_ip": primary_source_ip,
            "automation_signal": "failed_login" in {str(log.event_type or "").lower() for log in logs},
            "targets_sensitive_assets": any("admin" in u or u in {"root", "administrator", "system_admin"} for u in usernames),
            "successful_followup": any(str(log.event_type or "").lower() == "successful_login" for log in logs),
            "repeated_occurrence": repeated_occurrence,
        })
        final = int(risk_context["risk_score"])
        level = str(risk_context["severity"])
        explanation = " ".join([f"- {reason}" for reason in risk_context["risk_reasons"]]) or "No major risk factors."

        risk = RiskScore(
            alert_id=alert.id,
            normalized_log_id=alert.normalized_log_id,
            score=final,
            severity=level,
            factors={
                "factors": risk_context["calculation_factors"],
                "confidence": risk_context["confidence"],
                "risk_reasons": risk_context["risk_reasons"],
            },
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

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.detection_rule import DetectionRule
from app.services.audit_service import AuditService


DEFAULT_RULES = [
    {
        "name": "Brute Force Login",
        "description": "Detects repeated failed login attempts from the same IP against the same username.",
        "category": "authentication",
        "severity": "critical",
        "pattern_type": "logic",
        "pattern": "failed_login_count >= 5 within 10 minutes",
        "risk_weight": 30,
        "mitre_tactic": "Credential Access",
        "mitre_technique": "T1110 - Brute Force",
    },
    {
        "name": "Admin Login From Unknown IP",
        "description": "Detects successful admin login from an external or unknown IP.",
        "category": "authentication",
        "severity": "high",
        "pattern_type": "logic",
        "pattern": "successful_login and username admin and external_ip",
        "risk_weight": 25,
        "mitre_tactic": "Initial Access",
        "mitre_technique": "T1078 - Valid Accounts",
    },
    {
        "name": "Multiple 404 Requests",
        "description": "Detects repeated 404 requests from the same IP.",
        "category": "web",
        "severity": "medium",
        "pattern_type": "logic",
        "pattern": "http_404_count >= 5 within 10 minutes",
        "risk_weight": 15,
        "mitre_tactic": "Discovery",
        "mitre_technique": "T1083 - File and Directory Discovery",
    },
    {
        "name": "SQL Injection Pattern In Log Text",
        "description": "Detects SQL-like suspicious patterns found in web log text only.",
        "category": "web",
        "severity": "critical",
        "pattern_type": "text",
        "pattern": "SQL-like suspicious text in log message",
        "risk_weight": 35,
        "mitre_tactic": "Initial Access",
        "mitre_technique": "T1190 - Exploit Public-Facing Application",
    },
    {
        "name": "Suspicious User Agent",
        "description": "Detects suspicious automated user agents from logs.",
        "category": "web",
        "severity": "medium",
        "pattern_type": "text",
        "pattern": "curl|sqlmap|python-requests|bot",
        "risk_weight": 10,
        "mitre_tactic": "Reconnaissance",
        "mitre_technique": "T1595 - Active Scanning",
    },
    {
        "name": "Privilege Escalation Event",
        "description": "Detects application privilege change events to admin or privileged roles.",
        "category": "application",
        "severity": "critical",
        "pattern_type": "logic",
        "pattern": "privilege_change new_role=admin",
        "risk_weight": 35,
        "mitre_tactic": "Privilege Escalation",
        "mitre_technique": "T1078 - Valid Accounts",
    },
    {
        "name": "High Error Rate",
        "description": "Detects multiple server error events from the same source.",
        "category": "availability",
        "severity": "high",
        "pattern_type": "logic",
        "pattern": "server_error_count >= 8",
        "risk_weight": 20,
        "mitre_tactic": "Impact",
        "mitre_technique": "T1499 - Endpoint Denial of Service",
    },
    {
        "name": "Repeated Access To Sensitive Paths",
        "description": "Detects repeated access to sensitive web paths such as admin URLs.",
        "category": "web",
        "severity": "high",
        "pattern_type": "logic",
        "pattern": "path starts /admin repeated",
        "risk_weight": 20,
        "mitre_tactic": "Discovery",
        "mitre_technique": "T1083 - File and Directory Discovery",
    },
    {
        "name": "Login Outside Normal Hours",
        "description": "Detects successful login outside normal business hours.",
        "category": "authentication",
        "severity": "medium",
        "pattern_type": "logic",
        "pattern": "successful_login outside 08:00-20:00 UTC",
        "risk_weight": 15,
        "mitre_tactic": "Initial Access",
        "mitre_technique": "T1078 - Valid Accounts",
    },
    {
        "name": "Multiple Users From Same IP",
        "description": "Detects login attempts for multiple usernames from the same source IP.",
        "category": "authentication",
        "severity": "high",
        "pattern_type": "logic",
        "pattern": "distinct usernames from same ip >= 3",
        "risk_weight": 20,
        "mitre_tactic": "Credential Access",
        "mitre_technique": "T1110 - Brute Force",
    },
    {
        "name": "Failed Logins Correlated With Sensitive Path Access",
        "description": "Correlates multiple failed logins from one IP with requests to /admin paths within a short window (reconnaissance + credential abuse).",
        "category": "authentication",
        "severity": "high",
        "pattern_type": "correlation",
        "pattern": "failed_login_count >= threshold AND /admin path hits same IP within DETECTION_CORRELATION_WINDOW_MINUTES",
        "risk_weight": 28,
        "mitre_tactic": "Credential Access",
        "mitre_technique": "T1110 - Brute Force",
    },
]


class DetectionRulesService:
    @staticmethod
    def seed_default_rules(*, db: Session, actor_user_id: int | None = None) -> None:
        for item in DEFAULT_RULES:
            existing = db.execute(select(DetectionRule).where(DetectionRule.name == item["name"])).scalar_one_or_none()
            if existing is None:
                db.add(DetectionRule(**item, is_active=True, created_by_id=actor_user_id))
        AuditService.create_audit_log(db=db, actor_user_id=actor_user_id, action="detection.seed_rules", entity_type="detection_rule", entity_id="default", details={"count": len(DEFAULT_RULES)})
        db.commit()

    @staticmethod
    def get_rule_trigger_metrics(*, db: Session, rule_id: int) -> dict:
        trigger_count = db.execute(select(func.count(Alert.id)).where(Alert.detection_rule_id == rule_id)).scalar_one()
        last_triggered_at = db.execute(select(func.max(Alert.created_at)).where(Alert.detection_rule_id == rule_id)).scalar_one()
        return {"trigger_count": int(trigger_count or 0), "last_triggered_at": last_triggered_at}

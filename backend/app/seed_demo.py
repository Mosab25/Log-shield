from __future__ import annotations

from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.alert import Alert
from app.models.alert_status_history import AlertStatusHistory
from app.models.analyst_note import AnalystNote
from app.models.raw_log import RawLog
from app.models.report import Report
from app.models.role import Role
from app.models.user import User
from app.services.detection_engine import DetectionEngine
from app.services.detection_rules import DetectionRulesService
from app.services.normalization_service import NormalizationService
from app.services.risk_scoring_service import RiskScoringService
from app.utils.demo_data import DEMO_RAW_LOGS, DEMO_USERS


def get_or_create_role(db, name: str, description: str) -> Role:
    role = db.execute(select(Role).where(Role.name == name)).scalar_one_or_none()
    if role:
        return role
    role = Role(name=name, description=description)
    db.add(role); db.flush()
    return role


def seed_demo() -> None:
    db = SessionLocal()
    try:
        roles = {
            "admin": get_or_create_role(db, "admin", "Full system administrator."),
            "analyst": get_or_create_role(db, "analyst", "SOC analyst."),
            "viewer": get_or_create_role(db, "viewer", "Read-only viewer."),
        }
        db.commit()

        users = {}
        for u in DEMO_USERS:
            user = db.execute(select(User).where(User.email == u["email"])).scalar_one_or_none()
            if not user:
                user = User(email=u["email"], full_name=u["full_name"], hashed_password=get_password_hash(u["password"]), role_id=roles[u["role_name"]].id, is_active=True)
                db.add(user); db.flush()
            else:
                user.role_id = roles[u["role_name"]].id
                user.is_active = True
            users[u["email"]] = user
        db.commit()

        admin = users["admin@logshield.demo"]
        analyst = users["analyst@logshield.demo"]
        DetectionRulesService.seed_default_rules(db=db, actor_user_id=admin.id)

        raw_logs = []
        for item in DEMO_RAW_LOGS:
            existing = db.execute(select(RawLog).where(RawLog.raw_message == item["raw_message"], RawLog.received_at == item["received_at"])).scalar_one_or_none()
            if existing:
                raw_logs.append(existing)
                continue
            raw = RawLog(source=item["source"], source_type=item["source_type"], raw_message=item["raw_message"], received_at=item["received_at"], event_time=item["received_at"], parsed_json={"metadata": item["metadata"]}, ingestion_status="received", ip_address=item["ip_address"], hostname=item["hostname"], event_metadata=item["metadata"])
            db.add(raw); db.flush()
            raw_logs.append(raw)
        db.commit()

        for raw in raw_logs:
            NormalizationService.normalize_single_raw_log(db=db, raw_log_id=raw.id, current_user=admin)

        for raw in raw_logs:
            db.refresh(raw)
            if raw.normalized_log:
                DetectionEngine.run_single(db=db, normalized_log_id=raw.normalized_log.id, current_user=admin)

        alerts = db.execute(select(Alert).order_by(Alert.id.asc())).scalars().all()
        for alert in alerts:
            try:
                RiskScoringService.calculate_alert_risk(db=db, alert_id=alert.id, current_user=admin)
            except Exception:
                pass

        brute = db.execute(select(Alert).where(Alert.title.ilike("%Brute Force%")).order_by(Alert.id.asc())).scalars().first()
        if brute:
            brute.assigned_to_id = analyst.id
            if brute.status == "open":
                db.add(AlertStatusHistory(alert_id=brute.id, old_status="open", new_status="investigating", changed_by_id=analyst.id, comment="Demo triage started."))
                brute.status = "investigating"
            if brute.status == "investigating":
                db.add(AlertStatusHistory(alert_id=brute.id, old_status="investigating", new_status="resolved", changed_by_id=analyst.id, comment="Demo alert resolved after review."))
                brute.status = "resolved"
                from datetime import datetime, timezone
                brute.resolved_at = datetime.now(timezone.utc)
            db.add(AnalystNote(alert_id=brute.id, analyst_id=analyst.id, note="Reviewed repeated failed login attempts against admin account. Demo scenario resolved."))

        fp = db.execute(select(Alert).where(Alert.title.ilike("%404%")).order_by(Alert.id.asc())).scalars().first()
        if fp and fp.status == "open":
            fp.assigned_to_id = analyst.id
            db.add(AlertStatusHistory(alert_id=fp.id, old_status="open", new_status="false_positive", changed_by_id=analyst.id, comment="Marked as false positive for demo purposes."))
            fp.status = "false_positive"
            from datetime import datetime, timezone
            fp.resolved_at = datetime.now(timezone.utc)
            db.add(AnalystNote(alert_id=fp.id, analyst_id=analyst.id, note="Demo false positive: reviewed and classified as non-actionable."))

        if not db.execute(select(Report).where(Report.title == "Demo Daily Security Summary")).scalar_one_or_none():
            db.add(Report(title="Demo Daily Security Summary", report_type="daily", status="generated", generated_by_id=admin.id, parameters={"demo": True}, content={"summary": "Demo report showing alerts, risky IPs, targeted users, and MTTR."}))
        db.commit()

        print("\nLogShield demo seed completed.")
        print("--------------------------------")
        print("Demo accounts:")
        print("Admin   : admin@logshield.demo / Admin@12345")
        print("Analyst : analyst@logshield.demo / Analyst@12345")
        print("Viewer  : viewer@logshield.demo / Viewer@12345\n")
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo()

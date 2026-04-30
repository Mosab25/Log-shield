from __future__ import annotations

import csv
from datetime import datetime, timedelta, timezone
from io import BytesIO, StringIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.alert import Alert
from app.models.normalized_log import NormalizedLog
from app.models.report import Report
from app.models.user import User
from app.services.alert_service import AlertService
from app.services.audit_service import AuditService


class ReportService:
    @staticmethod
    def _range(start_date=None, end_date=None, days=7):
        end = end_date or datetime.now(timezone.utc)
        start = start_date or (end - timedelta(days=days))
        if start.tzinfo is None: start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None: end = end.replace(tzinfo=timezone.utc)
        return start, end

    @classmethod
    def summary(cls, *, db: Session, report_type: str, start_date=None, end_date=None):
        days = 1 if report_type == "daily" else 7
        start, end = cls._range(start_date, end_date, days)
        alerts = db.execute(select(Alert).where(Alert.created_at >= start, Alert.created_at <= end)).scalars().all()
        logs_count = db.execute(select(func.count(NormalizedLog.id)).where(NormalizedLog.event_time >= start, NormalizedLog.event_time <= end)).scalar_one()
        avg = sum(a.risk_score for a in alerts)/len(alerts) if alerts else 0
        mttr = cls.mttr(db=db, start_date=start, end_date=end)
        active = sum(a.status in {"open","investigating","escalated"} for a in alerts)
        critical = sum(a.severity == "critical" for a in alerts)
        return {"report_type":report_type,"title":"Daily Security Summary" if report_type=="daily" else "Weekly Security Report","generated_at":datetime.now(timezone.utc),"date_range":{"start_date":start,"end_date":end},"metrics":[{"label":"Normalized Logs","value":logs_count},{"label":"Total Alerts","value":len(alerts)},{"label":"Critical Alerts","value":critical},{"label":"Active Alerts","value":active},{"label":"Average Risk Score","value":round(avg,2)},{"label":"MTTR Hours","value":mttr["mean_time_to_resolve_hours"]}],"notes":[f"{critical} critical alert(s) observed.", f"{active} active alert(s) require review."]}

    @classmethod
    def top_risky_ips(cls, *, db: Session, start_date=None, end_date=None, limit=10):
        start,end=cls._range(start_date,end_date,7); data={}
        alerts=db.execute(select(Alert).where(Alert.created_at>=start,Alert.created_at<=end)).scalars().all()
        for a in alerts:
            for l in AlertService.related_logs(db,a):
                if not l.src_ip: continue
                d=data.setdefault(l.src_ip,{"ip_address":l.src_ip,"alerts":set(),"logs":set(),"max_risk_score":0,"latest_seen":None})
                d["alerts"].add(a.id); d["logs"].add(l.id); d["max_risk_score"]=max(d["max_risk_score"],a.risk_score)
                seen=l.event_time or l.created_at
                if d["latest_seen"] is None or seen>d["latest_seen"]: d["latest_seen"]=seen
        items=[{"ip_address":d["ip_address"],"alert_count":len(d["alerts"]),"related_log_count":len(d["logs"]),"max_risk_score":d["max_risk_score"],"latest_seen":d["latest_seen"]} for d in data.values()]
        return {"total":len(items[:limit]),"items":sorted(items,key=lambda x:(x["max_risk_score"],x["alert_count"]), reverse=True)[:limit]}

    @classmethod
    def targeted_users(cls, *, db: Session, start_date=None, end_date=None, limit=10):
        start,end=cls._range(start_date,end_date,7); data={}
        alerts=db.execute(select(Alert).where(Alert.created_at>=start,Alert.created_at<=end)).scalars().all()
        for a in alerts:
            for l in AlertService.related_logs(db,a):
                if not l.username: continue
                d=data.setdefault(l.username,{"username":l.username,"alerts":set(),"logs":set(),"max_risk_score":0,"latest_seen":None})
                d["alerts"].add(a.id); d["logs"].add(l.id); d["max_risk_score"]=max(d["max_risk_score"],a.risk_score)
                seen=l.event_time or l.created_at
                if d["latest_seen"] is None or seen>d["latest_seen"]: d["latest_seen"]=seen
        items=[{"username":d["username"],"alert_count":len(d["alerts"]),"log_count":len(d["logs"]),"max_risk_score":d["max_risk_score"],"latest_seen":d["latest_seen"]} for d in data.values()]
        return {"total":len(items[:limit]),"items":sorted(items,key=lambda x:(x["alert_count"],x["max_risk_score"]), reverse=True)[:limit]}

    @classmethod
    def alerts_by_severity(cls, *, db: Session, start_date=None, end_date=None):
        start,end=cls._range(start_date,end_date,7)
        counts={"low":0,"medium":0,"high":0,"critical":0}
        rows=db.execute(select(Alert.severity,func.count(Alert.id)).where(Alert.created_at>=start,Alert.created_at<=end).group_by(Alert.severity)).all()
        for sev,count in rows: counts[sev]=int(count)
        return {"total":sum(counts.values()),"items":[{"severity":k,"count":v} for k,v in counts.items()]}

    @classmethod
    def open_vs_resolved(cls, *, db: Session, start_date=None, end_date=None):
        start,end=cls._range(start_date,end_date,7)
        counts={"open":0,"investigating":0,"escalated":0,"resolved":0,"false_positive":0}
        rows=db.execute(select(Alert.status,func.count(Alert.id)).where(Alert.created_at>=start,Alert.created_at<=end).group_by(Alert.status)).all()
        for st,count in rows: counts[st]=int(count)
        counts["total"]=sum(counts.values())
        return counts

    @classmethod
    def mttr(cls, *, db: Session, start_date=None, end_date=None):
        start,end=cls._range(start_date,end_date,7)
        alerts=db.execute(select(Alert).where(Alert.created_at>=start,Alert.created_at<=end,Alert.status=="resolved",Alert.resolved_at.is_not(None))).scalars().all()
        if not alerts: return {"resolved_alerts":0,"mean_time_to_resolve_minutes":0,"mean_time_to_resolve_hours":0}
        mins=[(a.resolved_at-a.created_at).total_seconds()/60 for a in alerts]
        avg=sum(mins)/len(mins)
        return {"resolved_alerts":len(alerts),"mean_time_to_resolve_minutes":round(avg,2),"mean_time_to_resolve_hours":round(avg/60,2)}

    @classmethod
    def csv_export(cls, *, db: Session, current_user: User, start_date=None, end_date=None) -> str:
        start,end=cls._range(start_date,end_date,7)
        count_query = select(func.count(Alert.id)).where(Alert.created_at >= start, Alert.created_at <= end)
        total_alerts = db.execute(count_query).scalar_one()
        if total_alerts > settings.report_export_max_rows:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Report export is limited to {settings.report_export_max_rows} rows. Narrow the date range and try again.",
            )
        alerts=db.execute(select(Alert).where(Alert.created_at>=start,Alert.created_at<=end).order_by(Alert.created_at.desc())).scalars().all()
        output=StringIO(); writer=csv.writer(output)
        writer.writerow(["alert_id","title","severity","risk_score","status","created_at","resolved_at","mitre_tactic","mitre_technique","source_ips","usernames"])
        for a in alerts:
            logs=AlertService.related_logs(db,a)
            writer.writerow([a.id,a.title,a.severity,a.risk_score,a.status,a.created_at.isoformat(),a.resolved_at.isoformat() if a.resolved_at else "",a.detection_rule.mitre_tactic if a.detection_rule else "",a.detection_rule.mitre_technique if a.detection_rule else "", ";".join(sorted({l.src_ip for l in logs if l.src_ip})), ";".join(sorted({l.username for l in logs if l.username}))])
        AuditService.create_audit_log(db=db,actor_user_id=current_user.id,action="reports.export_csv",entity_type="report",entity_id="csv",details={"rows":len(alerts)})
        db.commit()
        return output.getvalue()

    @classmethod
    def pdf_export(cls, *, db: Session, current_user: User, start_date=None, end_date=None) -> bytes:
        start,end=cls._range(start_date,end_date,7)
        summary=cls.summary(db=db,report_type="weekly",start_date=start,end_date=end)
        buf=BytesIO(); doc=SimpleDocTemplate(buf,pagesize=A4)
        styles=getSampleStyleSheet(); elements=[Paragraph("LogShield Security Report", styles["Title"]), Paragraph(f"Generated: {summary['generated_at'].isoformat()}", styles["BodyText"]), Spacer(1,12)]
        table=[["Metric","Value"]]+[[m["label"],str(m["value"])] for m in summary["metrics"]]
        t=Table(table); t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#0f172a")),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),0.25,colors.grey)]))
        elements.append(t); elements.append(Spacer(1,12))
        for note in summary["notes"]: elements.append(Paragraph(f"- {note}", styles["BodyText"]))
        doc.build(elements)
        AuditService.create_audit_log(db=db,actor_user_id=current_user.id,action="reports.export_pdf",entity_type="report",entity_id="pdf",details={})
        db.commit()
        return buf.getvalue()

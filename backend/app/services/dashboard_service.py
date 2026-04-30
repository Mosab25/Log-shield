from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.normalized_log import NormalizedLog
from app.models.raw_log import RawLog
from app.services.alert_service import AlertService


class DashboardService:
    @staticmethod
    def _filtered_alerts(db: Session, start_date=None, end_date=None, severity=None, source=None, status=None):
        query = select(Alert)
        if start_date: query = query.where(Alert.created_at >= start_date)
        if end_date: query = query.where(Alert.created_at <= end_date)
        if severity: query = query.where(Alert.severity == severity)
        if status: query = query.where(Alert.status == status)
        alerts = db.execute(query).scalars().all()
        if source:
            alerts = [a for a in alerts if any(log.source == source or log.source_type == source for log in AlertService.related_logs(db, a))]
        return alerts

    @classmethod
    def get_summary(cls, *, db: Session, start_date=None, end_date=None, severity=None, source=None, status=None):
        alerts = cls._filtered_alerts(db, start_date, end_date, severity, source, status)
        total_logs = db.execute(select(func.count(RawLog.id))).scalar_one()
        total_norm = db.execute(select(func.count(NormalizedLog.id))).scalar_one()
        high_risk_ips = set()
        for a in alerts:
            if a.risk_score >= 61:
                for l in AlertService.related_logs(db, a):
                    if l.src_ip: high_risk_ips.add(l.src_ip)
        return {"total_logs": total_logs, "total_normalized_logs": total_norm, "total_alerts": len(alerts), "open_alerts": sum(a.status in {"open","investigating","escalated"} for a in alerts), "critical_alerts": sum(a.severity=="critical" for a in alerts), "high_risk_ips": len(high_risk_ips), "average_risk_score": round(sum(a.risk_score for a in alerts)/len(alerts),2) if alerts else 0}

    @classmethod
    def alerts_timeline(cls, *, db: Session, start_date=None, end_date=None, severity=None, source=None, status=None):
        alerts = cls._filtered_alerts(db, start_date, end_date, severity, source, status)
        data = defaultdict(lambda: {"total":0,"low":0,"medium":0,"high":0,"critical":0})
        for a in alerts:
            day = a.created_at.date().isoformat()
            data[day]["total"] += 1
            data[day][a.severity] += 1
        return {"items":[{"date": d, **vals} for d, vals in sorted(data.items())]}

    @classmethod
    def risk_distribution(cls, *, db: Session, start_date=None, end_date=None, severity=None, source=None, status=None):
        alerts = cls._filtered_alerts(db, start_date, end_date, severity, source, status)
        counts = {"low":0,"medium":0,"high":0,"critical":0}
        for a in alerts:
            if a.risk_score <= 30: counts["low"] += 1
            elif a.risk_score <= 60: counts["medium"] += 1
            elif a.risk_score <= 85: counts["high"] += 1
            else: counts["critical"] += 1
        return {"total": sum(counts.values()), "items":[{"level":k,"count":v} for k,v in counts.items()]}

    @classmethod
    def top_attacked_users(cls, *, db: Session, limit=5, **filters):
        alerts = cls._filtered_alerts(db, filters.get("start_date"), filters.get("end_date"), filters.get("severity"), filters.get("source"), filters.get("status"))
        data = {}
        for a in alerts:
            for l in AlertService.related_logs(db, a):
                if not l.username: continue
                d = data.setdefault(l.username, {"username":l.username,"alerts":set(),"logs":set(),"max_risk_score":0,"latest_seen":None})
                d["alerts"].add(a.id); d["logs"].add(l.id); d["max_risk_score"] = max(d["max_risk_score"], a.risk_score)
                seen = l.event_time or l.created_at
                if d["latest_seen"] is None or seen > d["latest_seen"]: d["latest_seen"] = seen
        items = [{"username":d["username"],"alert_count":len(d["alerts"]),"log_count":len(d["logs"]),"max_risk_score":d["max_risk_score"],"latest_seen":d["latest_seen"]} for d in data.values()]
        return {"items": sorted(items, key=lambda x:(x["alert_count"],x["max_risk_score"]), reverse=True)[:limit]}

    @staticmethod
    def recent_events(*, db: Session, start_date=None, end_date=None, severity=None, source=None, limit=10):
        query = select(NormalizedLog).order_by(NormalizedLog.event_time.desc(), NormalizedLog.id.desc())
        if severity: query = query.where(NormalizedLog.severity == severity)
        if source: query = query.where((NormalizedLog.source == source) | (NormalizedLog.source_type == source))
        if start_date: query = query.where(NormalizedLog.event_time >= start_date)
        if end_date: query = query.where(NormalizedLog.event_time <= end_date)
        logs = db.execute(query.limit(limit)).scalars().all()
        return {"total":len(logs),"items":[{"id":l.id,"timestamp":l.event_time or l.created_at,"source":l.source,"source_type":l.source_type,"event_type":l.event_type,"severity":l.severity,"parser_status":l.parser_status,"ip_address":l.src_ip,"username":l.username,"message":l.message} for l in logs]}

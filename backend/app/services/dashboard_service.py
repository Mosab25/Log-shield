from __future__ import annotations

from collections import defaultdict
from hashlib import md5
from sqlalchemy import case, func, select, union_all
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.alert_related_log import AlertRelatedLog
from app.models.normalized_log import NormalizedLog
from app.models.raw_log import RawLog
from app.utils.cache import cache, short_cache, long_cache


class DashboardService:
    @staticmethod
    def _alert_filters(start_date=None, end_date=None, severity=None, status=None):
        filters = []
        if start_date:
            filters.append(Alert.created_at >= start_date)
        if end_date:
            filters.append(Alert.created_at <= end_date)
        if severity:
            filters.append(Alert.severity == severity)
        if status:
            filters.append(Alert.status == status)
        return filters

    @classmethod
    def _source_alert_ids(cls, db: Session, source: str | None, filters: list) -> set[int] | None:
        if not source:
            return None
        source_filter = (NormalizedLog.source == source) | (NormalizedLog.source_type == source)
        direct_ids = db.execute(
            select(Alert.id)
            .join(NormalizedLog, Alert.normalized_log_id == NormalizedLog.id)
            .where(*filters, source_filter)
        ).scalars().all()
        related_ids = db.execute(
            select(Alert.id)
            .join(AlertRelatedLog, AlertRelatedLog.alert_id == Alert.id)
            .join(NormalizedLog, AlertRelatedLog.normalized_log_id == NormalizedLog.id)
            .where(*filters, source_filter)
        ).scalars().all()
        return set(direct_ids) | set(related_ids)

    @classmethod
    def _filters_with_source(cls, db: Session, start_date=None, end_date=None, severity=None, source=None, status=None):
        filters = cls._alert_filters(start_date, end_date, severity, status)
        source_ids = cls._source_alert_ids(db, source, filters)
        if source_ids is not None:
            if not source_ids:
                filters.append(Alert.id.in_([-1]))
            else:
                filters.append(Alert.id.in_(source_ids))
        return filters

    @staticmethod
    def _alert_log_rows(db: Session, filters: list, source: str | None = None):
        source_filter = None
        if source:
            source_filter = (NormalizedLog.source == source) | (NormalizedLog.source_type == source)

        direct_query = (
            select(Alert.id, Alert.risk_score, NormalizedLog.id, NormalizedLog.src_ip, NormalizedLog.username, NormalizedLog.event_time, NormalizedLog.created_at)
            .join(NormalizedLog, Alert.normalized_log_id == NormalizedLog.id)
            .where(*filters)
        )
        related_query = (
            select(Alert.id, Alert.risk_score, NormalizedLog.id, NormalizedLog.src_ip, NormalizedLog.username, NormalizedLog.event_time, NormalizedLog.created_at)
            .join(AlertRelatedLog, AlertRelatedLog.alert_id == Alert.id)
            .join(NormalizedLog, AlertRelatedLog.normalized_log_id == NormalizedLog.id)
            .where(*filters)
        )
        if source_filter is not None:
            direct_query = direct_query.where(source_filter)
            related_query = related_query.where(source_filter)

        seen: set[tuple[int, int]] = set()
        rows = []
        for row in [*db.execute(direct_query).all(), *db.execute(related_query).all()]:
            key = (row[0], row[2])
            if key in seen:
                continue
            seen.add(key)
            rows.append(row)
        return rows

    @classmethod
    def get_summary(cls, *, db: Session, start_date=None, end_date=None, severity=None, source=None, status=None):
        # Create cache key based on filters
        cache_key = f"dashboard_summary_{md5(str([start_date, end_date, severity, source, status]).encode()).hexdigest()}"
        
        # Try to get from cache first - use long cache for summary
        cached_result = long_cache.get(cache_key)
        if cached_result:
            return cached_result
        
        filters = cls._filters_with_source(db, start_date, end_date, severity, source, status)
        
        # Use cached counts for logs if no date filters
        if start_date is None and end_date is None:
            # These could be cached in production, but for now use efficient queries
            total_logs = db.execute(select(func.count(RawLog.id))).scalar_one()
            total_norm = db.execute(select(func.count(NormalizedLog.id))).scalar_one()
        else:
            # Apply date filters to log counts
            log_filters = []
            if start_date:
                log_filters.append(RawLog.received_at >= start_date)
                log_filters.append(NormalizedLog.event_time >= start_date)
            if end_date:
                log_filters.append(RawLog.received_at <= end_date)
                log_filters.append(NormalizedLog.event_time <= end_date)
            
            total_logs = db.execute(select(func.count(RawLog.id)).where(*log_filters)).scalar_one()
            total_norm = db.execute(select(func.count(NormalizedLog.id)).where(*log_filters)).scalar_one()
        
        # Single aggregated query for alert stats
        stats = db.execute(
            select(
                func.count(Alert.id),
                func.sum(case((Alert.status.in_(["open", "investigating", "escalated"]), 1), else_=0)),
                func.sum(case((Alert.severity == "critical", 1), else_=0)),
                func.avg(Alert.risk_score),
            ).where(*filters)
        ).one()
        
        # Simplified high-risk IP count - use subquery for better performance
        high_risk_filters = [Alert.risk_score >= 61, NormalizedLog.src_ip.is_not(None)]
        if source:
            source_filter = (NormalizedLog.source == source) | (NormalizedLog.source_type == source)
            high_risk_filters.append(source_filter)
        
        # Use a more efficient query for distinct IPs
        try:
            ip_query = select(func.count(func.distinct(NormalizedLog.src_ip))).join(
                Alert, Alert.normalized_log_id == NormalizedLog.id
            ).where(*high_risk_filters)
            
            high_risk_ip_count = ip_query.scalar_one()
        except Exception:
            # Fallback to simpler query if the complex one fails
            high_risk_ip_count = 0
        
        result = {
            "total_logs": total_logs,
            "total_normalized_logs": total_norm,
            "total_alerts": int(stats[0] or 0),
            "open_alerts": int(stats[1] or 0),
            "critical_alerts": int(stats[2] or 0),
            "high_risk_ips": int(high_risk_ip_count or 0),
            "average_risk_score": round(float(stats[3] or 0), 2),
        }
        
        # Cache the result for 15 minutes (long cache for summary)
        long_cache.set(cache_key, result, ttl=900)
        return result

    @classmethod
    def alerts_timeline(cls, *, db: Session, start_date=None, end_date=None, severity=None, source=None, status=None):
        # Create cache key
        cache_key = f"dashboard_timeline_{md5(str([start_date, end_date, severity, source, status]).encode()).hexdigest()}"
        
        # Try cache first
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        try:
            filters = cls._filters_with_source(db, start_date, end_date, severity, source, status)
            data = defaultdict(lambda: {"total":0,"low":0,"medium":0,"high":0,"critical":0})
            rows = db.execute(select(func.date(Alert.created_at), Alert.severity, func.count(Alert.id)).where(*filters).group_by(func.date(Alert.created_at), Alert.severity)).all()
            for day_value, alert_severity, count in rows:
                day = day_value.isoformat() if hasattr(day_value, "isoformat") else str(day_value)
                data[day]["total"] += int(count)
                data[day][alert_severity] += int(count)
            
            result = {"items":[{"date": d, **vals} for d, vals in sorted(data.items())]}
            # Cache for 10 minutes (medium cache for timeline)
            cache.set(cache_key, result, ttl=600)
            return result
        except Exception:
            # Fallback to empty timeline
            return {"items": []}

    @classmethod
    def risk_distribution(cls, *, db: Session, start_date=None, end_date=None, severity=None, source=None, status=None):
        # Create cache key
        cache_key = f"dashboard_risk_{md5(str([start_date, end_date, severity, source, status]).encode()).hexdigest()}"
        
        # Try cache first
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        try:
            filters = cls._filters_with_source(db, start_date, end_date, severity, source, status)
            counts = {"low":0,"medium":0,"high":0,"critical":0}
            bucket = case(
                (Alert.risk_score <= 30, "low"),
                (Alert.risk_score <= 60, "medium"),
                (Alert.risk_score <= 85, "high"),
                else_="critical",
            )
            rows = db.execute(select(bucket.label("level"), func.count(Alert.id)).where(*filters).group_by(bucket)).all()
            for level, count in rows:
                counts[level] = int(count)
            
            result = {"total": sum(counts.values()), "items":[{"level":k,"count":v} for k,v in counts.items()]}
            # Cache for 10 minutes (medium cache for risk distribution)
            cache.set(cache_key, result, ttl=600)
            return result
        except Exception:
            # Fallback to empty distribution if query fails
            empty_result = {"total": 0, "items":[{"level":"low","count":0},{"level":"medium","count":0},{"level":"high","count":0},{"level":"critical","count":0}]}
            cache.set(cache_key, empty_result, ttl=60)  # Cache shorter for errors
            return empty_result

    @classmethod
    def top_attacked_users(cls, *, db: Session, limit=5, **filters):
        # Create cache key
        cache_key = f"dashboard_users_{md5(str([limit, filters.get('start_date'), filters.get('end_date'), filters.get('severity'), filters.get('source'), filters.get('status')]).encode()).hexdigest()}"
        
        # Try cache first
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        try:
            alert_filters = cls._filters_with_source(db, filters.get("start_date"), filters.get("end_date"), filters.get("severity"), filters.get("source"), filters.get("status"))
            source = filters.get("source")
            source_filter = None
            if source:
                source_filter = (NormalizedLog.source == source) | (NormalizedLog.source_type == source)

            direct_query = (
                select(
                    Alert.id.label("alert_id"),
                    Alert.risk_score.label("risk_score"),
                    NormalizedLog.id.label("log_id"),
                    NormalizedLog.username.label("username"),
                    func.coalesce(NormalizedLog.event_time, NormalizedLog.created_at).label("latest_seen"),
                )
                .join(NormalizedLog, Alert.normalized_log_id == NormalizedLog.id)
                .where(*alert_filters, NormalizedLog.username.is_not(None))
            )
            related_query = (
                select(
                    Alert.id.label("alert_id"),
                    Alert.risk_score.label("risk_score"),
                    NormalizedLog.id.label("log_id"),
                    NormalizedLog.username.label("username"),
                    func.coalesce(NormalizedLog.event_time, NormalizedLog.created_at).label("latest_seen"),
                )
                .join(AlertRelatedLog, AlertRelatedLog.alert_id == Alert.id)
                .join(NormalizedLog, AlertRelatedLog.normalized_log_id == NormalizedLog.id)
                .where(*alert_filters, NormalizedLog.username.is_not(None))
            )
            if source_filter is not None:
                direct_query = direct_query.where(source_filter)
                related_query = related_query.where(source_filter)

            rows = union_all(direct_query, related_query).subquery()
            alert_count = func.count(func.distinct(rows.c.alert_id)).label("alert_count")
            max_risk = func.max(rows.c.risk_score).label("max_risk_score")
            result = db.execute(
                select(
                    rows.c.username,
                    alert_count,
                    func.count(func.distinct(rows.c.log_id)).label("log_count"),
                    max_risk,
                    func.max(rows.c.latest_seen).label("latest_seen"),
                )
                .group_by(rows.c.username)
                .order_by(alert_count.desc(), max_risk.desc())
                .limit(limit)
            ).all()
            
            result_data = {
                "items": [
                    {"username": username, "alert_count": int(alerts), "log_count": int(logs), "max_risk_score": int(risk or 0), "latest_seen": latest_seen}
                    for username, alerts, logs, risk, latest_seen in result
                ]
            }
            # Cache for 10 minutes (medium cache for top users)
            cache.set(cache_key, result_data, ttl=600)
            return result_data
        except Exception:
            # Fallback to empty users
            empty_result = {"items": []}
            cache.set(cache_key, empty_result, ttl=60)
            return empty_result

    @staticmethod
    def recent_events(*, db: Session, start_date=None, end_date=None, severity=None, source=None, limit=10):
        # Create cache key
        cache_key = f"dashboard_events_{md5(str([start_date, end_date, severity, source, limit]).encode()).hexdigest()}"
        
        # Try cache first
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        try:
            query = select(NormalizedLog).order_by(NormalizedLog.event_time.desc(), NormalizedLog.id.desc())
            if severity: query = query.where(NormalizedLog.severity == severity)
            if source: query = query.where((NormalizedLog.source == source) | (NormalizedLog.source_type == source))
            if start_date: query = query.where(NormalizedLog.event_time >= start_date)
            if end_date: query = query.where(NormalizedLog.event_time <= end_date)
            logs = db.execute(query.limit(limit)).scalars().all()
            
            result = {"total":len(logs),"items":[{"id":l.id,"timestamp":l.event_time or l.created_at,"source":l.source,"source_type":l.source_type,"event_type":l.event_type,"severity":l.severity,"parser_status":l.parser_status,"ip_address":l.src_ip,"username":l.username,"message":l.message} for l in logs]}
            # Cache for 1 minute (short cache for recent events)
            short_cache.set(cache_key, result, ttl=60)
            return result
        except Exception:
            # Fallback to empty events
            empty_result = {"total":0,"items":[]}
            cache.set(cache_key, empty_result, ttl=60)
            return empty_result

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.normalized_log import NormalizedLog
from app.models.raw_log import RawLog
from app.services.audit_service import AuditService
from app.services.parser_service import ParserService


class NormalizationService:
    @staticmethod
    def to_response(log: NormalizedLog) -> dict:
        return {
            "id": log.id,
            "raw_log_id": log.raw_log_id,
            "timestamp": log.event_time,
            "source": log.source,
            "source_type": log.source_type,
            "event_type": log.event_type,
            "username": log.username,
            "ip_address": log.src_ip,
            "hostname": log.hostname,
            "user_agent": log.user_agent,
            "status": log.status,
            "http_method": log.http_method,
            "path": log.path,
            "status_code": log.status_code,
            "message": log.message,
            "severity": log.severity,
            "parser_status": log.parser_status,
            "metadata": log.event_metadata or {},
            "created_at": log.created_at,
        }

    @classmethod
    def normalize_single_raw_log(cls, *, db: Session, raw_log_id: int, current_user) -> NormalizedLog:
        raw_log = db.get(RawLog, raw_log_id)
        if raw_log is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Raw log was not found.")

        existing = db.execute(select(NormalizedLog).where(NormalizedLog.raw_log_id == raw_log.id)).scalar_one_or_none()
        if existing is not None:
            return existing

        parsed = ParserService.parse(raw_log)
        normalized = NormalizedLog(
            raw_log_id=raw_log.id,
            event_time=parsed["event_time"],
            source=parsed["source"],
            source_type=parsed["source_type"],
            event_type=parsed["event_type"],
            username=parsed.get("username"),
            src_ip=parsed.get("src_ip"),
            user_agent=parsed.get("user_agent"),
            hostname=parsed.get("hostname"),
            status=parsed.get("status"),
            http_method=parsed.get("http_method"),
            path=parsed.get("path"),
            status_code=parsed.get("status_code"),
            message=parsed["message"],
            severity=parsed["severity"],
            parser_status=parsed["parser_status"],
            event_metadata=parsed.get("metadata") or {},
        )
        raw_log.ingestion_status = "normalized"
        db.add(normalized)
        db.flush()
        AuditService.create_audit_log(db=db, actor_user_id=getattr(current_user, "id", None), action="logs.normalize", entity_type="normalized_log", entity_id=str(normalized.id), details={"raw_log_id": raw_log.id})
        db.commit()
        db.refresh(normalized)
        return normalized

    @classmethod
    def list_normalized(
        cls,
        *,
        db: Session,
        skip: int,
        limit: int,
        source: str | None,
        source_type: str | None,
        event_type: str | None,
        severity: str | None,
        parser_status: str | None,
        ip_address: str | None,
        username: str | None,
        start_date,
        end_date,
    ) -> tuple[int, list[dict]]:
        query = select(NormalizedLog)
        count_query = select(func.count(NormalizedLog.id))
        filters = []
        if source:
            filters.append(NormalizedLog.source == source)
        if source_type:
            filters.append(NormalizedLog.source_type == source_type)
        if event_type:
            filters.append(NormalizedLog.event_type == event_type)
        if severity:
            filters.append(NormalizedLog.severity == severity)
        if parser_status:
            filters.append(NormalizedLog.parser_status == parser_status)
        if ip_address:
            filters.append(NormalizedLog.src_ip == ip_address)
        if username:
            filters.append(NormalizedLog.username == username)
        if start_date:
            filters.append(NormalizedLog.event_time >= start_date)
        if end_date:
            filters.append(NormalizedLog.event_time <= end_date)
        for f in filters:
            query = query.where(f)
            count_query = count_query.where(f)

        total = db.execute(count_query).scalar_one()
        logs = db.execute(query.order_by(NormalizedLog.event_time.desc(), NormalizedLog.id.desc()).offset(skip).limit(limit)).scalars().all()
        return total, [cls.to_response(log) for log in logs]

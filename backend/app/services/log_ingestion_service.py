from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.raw_log import RawLog
from app.schemas.logs import RawLogCreate
from app.services.audit_service import AuditService


class LogIngestionService:
    @staticmethod
    def to_response(log: RawLog) -> dict:
        return {
            "id": log.id,
            "source": log.source,
            "source_type": log.source_type,
            "raw_message": log.raw_message,
            "received_at": log.received_at,
            "event_time": log.event_time,
            "parsed_json": log.parsed_json or {},
            "ingestion_status": log.ingestion_status,
            "error_message": log.error_message,
            "ip_address": log.ip_address,
            "hostname": log.hostname,
            "metadata": log.event_metadata or {},
            "created_at": log.created_at,
        }

    @staticmethod
    def ingest(db: Session, payload: RawLogCreate, actor_user_id: int | None = None) -> RawLog:
        received_at = payload.received_at or datetime.now(timezone.utc)
        log = RawLog(
            source=payload.source,
            source_type=payload.source_type,
            raw_message=payload.raw_message,
            received_at=received_at,
            event_time=received_at,
            parsed_json={"metadata": payload.metadata},
            ingestion_status="received",
            ip_address=payload.ip_address,
            hostname=payload.hostname,
            event_metadata=payload.metadata or {},
        )
        db.add(log)
        db.flush()
        AuditService.create_audit_log(db=db, actor_user_id=actor_user_id, action="logs.ingest", entity_type="raw_log", entity_id=str(log.id), details={"source": log.source, "source_type": log.source_type})
        db.commit()
        db.refresh(log)
        return log

    @classmethod
    def list_raw(
        cls,
        *,
        db: Session,
        skip: int,
        limit: int,
        source: str | None,
        source_type: str | None,
        start_date,
        end_date,
        ip_address: str | None,
    ) -> tuple[int, list[dict]]:
        query = select(RawLog)
        count_query = select(func.count(RawLog.id))
        for qname in ["query", "count_query"]:
            pass

        if source:
            query = query.where(RawLog.source == source)
            count_query = count_query.where(RawLog.source == source)
        if source_type:
            query = query.where(RawLog.source_type == source_type)
            count_query = count_query.where(RawLog.source_type == source_type)
        if ip_address:
            query = query.where(RawLog.ip_address == ip_address)
            count_query = count_query.where(RawLog.ip_address == ip_address)
        if start_date:
            query = query.where(RawLog.received_at >= start_date)
            count_query = count_query.where(RawLog.received_at >= start_date)
        if end_date:
            query = query.where(RawLog.received_at <= end_date)
            count_query = count_query.where(RawLog.received_at <= end_date)

        total = db.execute(count_query).scalar_one()
        logs = db.execute(query.order_by(RawLog.received_at.desc(), RawLog.id.desc()).offset(skip).limit(limit)).scalars().all()
        return total, [cls.to_response(log) for log in logs]

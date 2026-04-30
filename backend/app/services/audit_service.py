from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import AuditActorResponse, AuditLogResponse


class AuditService:
    @staticmethod
    def create_audit_log(
        *,
        db: Session,
        actor_user_id: int | None,
        action: str,
        entity_type: str | None = None,
        entity_id: str | None = None,
        details: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuditLog:
        audit_log = AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(audit_log)
        return audit_log

    @staticmethod
    def _actor_response(db: Session, actor_user_id: int | None) -> AuditActorResponse | None:
        if actor_user_id is None:
            return None
        user = db.get(User, actor_user_id)
        if user is None:
            return None
        return AuditActorResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            role_name=user.role.name if user.role else None,
        )

    @classmethod
    def _to_response(cls, db: Session, audit_log: AuditLog) -> AuditLogResponse:
        return AuditLogResponse(
            id=audit_log.id,
            actor_user_id=audit_log.actor_user_id,
            actor=cls._actor_response(db, audit_log.actor_user_id),
            action=audit_log.action,
            entity_type=audit_log.entity_type,
            entity_id=audit_log.entity_id,
            ip_address=audit_log.ip_address,
            user_agent=audit_log.user_agent,
            details=audit_log.details or {},
            created_at=audit_log.created_at,
        )

    @staticmethod
    def _apply_filters(
        *,
        query: Select,
        action: str | None,
        actor_user_id: int | None,
        entity_type: str | None,
        start_date: datetime | None,
        end_date: datetime | None,
    ) -> Select:
        if action:
            query = query.where(AuditLog.action.ilike(f"%{action.strip()}%"))
        if actor_user_id is not None:
            query = query.where(AuditLog.actor_user_id == actor_user_id)
        if entity_type:
            query = query.where(AuditLog.entity_type == entity_type.strip())
        if start_date:
            query = query.where(AuditLog.created_at >= start_date)
        if end_date:
            query = query.where(AuditLog.created_at <= end_date)
        return query

    @classmethod
    def list_audit_logs(
        cls,
        *,
        db: Session,
        skip: int,
        limit: int,
        action: str | None,
        actor_user_id: int | None,
        entity_type: str | None,
        start_date: datetime | None,
        end_date: datetime | None,
    ) -> tuple[int, list[AuditLogResponse]]:
        if start_date and end_date and start_date > end_date:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="start_date cannot be after end_date.")

        base_query = cls._apply_filters(
            query=select(AuditLog),
            action=action,
            actor_user_id=actor_user_id,
            entity_type=entity_type,
            start_date=start_date,
            end_date=end_date,
        )
        count_query = cls._apply_filters(
            query=select(func.count(AuditLog.id)),
            action=action,
            actor_user_id=actor_user_id,
            entity_type=entity_type,
            start_date=start_date,
            end_date=end_date,
        )
        total = db.execute(count_query).scalar_one()
        rows = db.execute(base_query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).offset(skip).limit(limit)).scalars().all()
        return total, [cls._to_response(db, item) for item in rows]

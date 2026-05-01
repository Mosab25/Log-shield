from __future__ import annotations

from datetime import datetime, timezone
from ipaddress import ip_address

from fastapi import HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ip_block import IPBlock
from app.services.audit_service import AuditService


def _normalize_ip_candidate(value: str | None) -> str | None:
    if not value:
        return None
    candidate = value.strip().strip('"').strip()
    if not candidate or candidate.lower() == "unknown":
        return None
    if candidate.startswith("[") and "]" in candidate:
        candidate = candidate[1:candidate.index("]")]
    elif candidate.count(":") == 1 and "." in candidate:
        candidate = candidate.split(":", 1)[0]
    try:
        return str(ip_address(candidate))
    except ValueError:
        return None


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    candidates: list[str] = []
    if forwarded_for:
        candidates.extend(forwarded_for.split(","))

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        candidates.append(real_ip)

    if request.client and request.client.host:
        candidates.append(request.client.host)

    for candidate in candidates:
        normalized = _normalize_ip_candidate(candidate)
        if normalized:
            return normalized
    return "unknown"


class IPBlockService:
    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _normalize_datetime(value: datetime | None) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)

    @classmethod
    def is_expired(cls, block: IPBlock, now: datetime | None = None) -> bool:
        blocked_until = cls._normalize_datetime(block.blocked_until)
        if blocked_until is None:
            return False
        return blocked_until <= (now or cls._now())

    @staticmethod
    def blocked_error_payload(block: IPBlock) -> dict[str, object]:
        blocked_until = block.blocked_until
        if blocked_until is not None and blocked_until.tzinfo is None:
            blocked_until = blocked_until.replace(tzinfo=timezone.utc)
        return {
            "detail": "Your IP address is blocked.",
            "code": "IP_BLOCKED",
            "ip_address": block.ip_address,
            "reason": block.reason or "Blocked by administrator",
            "blocked_until": blocked_until.isoformat().replace("+00:00", "Z") if blocked_until else None,
            "is_permanent": blocked_until is None,
        }

    @classmethod
    def get_active_block(cls, db: Session, ip_address: str) -> IPBlock | None:
        normalized_ip = _normalize_ip_candidate(ip_address)
        if normalized_ip is None:
            return None

        rows = db.execute(
            select(IPBlock)
            .where(IPBlock.ip_address == normalized_ip, IPBlock.is_active.is_(True))
            .order_by(IPBlock.created_at.desc(), IPBlock.id.desc())
        ).scalars().all()

        now = cls._now()
        changed = False
        for block in rows:
            if cls.is_expired(block, now):
                block.is_active = False
                changed = True
                continue
            if changed:
                db.commit()
                db.refresh(block)
            return block

        if changed:
            db.commit()
        return None

    @classmethod
    def deactivate_expired_blocks(cls, db: Session) -> None:
        expired_rows = db.execute(
            select(IPBlock).where(
                IPBlock.is_active.is_(True),
                IPBlock.blocked_until.is_not(None),
                IPBlock.blocked_until <= cls._now(),
            )
        ).scalars().all()
        if not expired_rows:
            return
        for block in expired_rows:
            block.is_active = False
        db.commit()

    @classmethod
    def list_blocks(cls, *, db: Session, skip: int, limit: int, active_only: bool | None) -> tuple[int, list[IPBlock]]:
        cls.deactivate_expired_blocks(db)
        base_query = select(IPBlock)
        count_query = select(func.count(IPBlock.id))
        if active_only is not None:
            base_query = base_query.where(IPBlock.is_active.is_(active_only))
            count_query = count_query.where(IPBlock.is_active.is_(active_only))
        total = db.execute(count_query).scalar_one()
        rows = db.execute(base_query.order_by(IPBlock.created_at.desc(), IPBlock.id.desc()).offset(skip).limit(limit)).scalars().all()
        return total, list(rows)

    @classmethod
    def create_block(
        cls,
        *,
        db: Session,
        ip_address: str,
        reason: str | None,
        blocked_until: datetime | None,
        actor_user_id: int,
    ) -> IPBlock:
        normalized_ip = _normalize_ip_candidate(ip_address)
        if normalized_ip is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="ip_address must be a valid IPv4 or IPv6 address.")

        if cls.get_active_block(db, normalized_ip) is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This IP address is already actively blocked.")

        block = IPBlock(
            ip_address=normalized_ip,
            reason=reason or "Blocked by administrator",
            blocked_until=cls._normalize_datetime(blocked_until),
            is_active=True,
            created_by_id=actor_user_id,
        )
        db.add(block)
        db.flush()
        AuditService.create_audit_log(
            db=db,
            actor_user_id=actor_user_id,
            action="ip_block_created",
            entity_type="ip_block",
            entity_id=str(block.id),
            ip_address=normalized_ip,
            details={
                "ip_address": normalized_ip,
                "reason": block.reason,
                "blocked_until": block.blocked_until.isoformat() if block.blocked_until else None,
                "is_permanent": block.blocked_until is None,
            },
        )
        db.commit()
        db.refresh(block)
        return block

    @classmethod
    def unblock(cls, *, db: Session, block_id: int, actor_user_id: int) -> IPBlock:
        block = db.get(IPBlock, block_id)
        if block is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP block was not found.")

        block.is_active = False
        block.unblocked_by_id = actor_user_id
        block.unblocked_at = cls._now()
        AuditService.create_audit_log(
            db=db,
            actor_user_id=actor_user_id,
            action="ip_block_removed",
            entity_type="ip_block",
            entity_id=str(block.id),
            ip_address=block.ip_address,
            details={"ip_address": block.ip_address, "reason": block.reason},
        )
        db.commit()
        db.refresh(block)
        return block

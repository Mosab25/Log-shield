from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr


class AuditActorResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role_name: str | None = None


class AuditLogResponse(BaseModel):
    id: int
    actor_user_id: int | None
    actor: AuditActorResponse | None
    action: str
    entity_type: str | None
    entity_id: str | None
    ip_address: str | None
    user_agent: str | None
    details: dict[str, Any]
    created_at: datetime


class AuditLogListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[AuditLogResponse]

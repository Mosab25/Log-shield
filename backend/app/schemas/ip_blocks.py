from __future__ import annotations

from datetime import datetime, timezone
from ipaddress import ip_address

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator


class IPBlockCreate(BaseModel):
    ip_address: str = Field(..., min_length=3, max_length=80)
    reason: str | None = Field(default="Blocked by administrator", max_length=500)
    blocked_until: datetime | None = None

    @field_validator("ip_address")
    @classmethod
    def validate_ip_address(cls, value: str) -> str:
        try:
            return str(ip_address(value.strip()))
        except ValueError as exc:
            raise ValueError("ip_address must be a valid IPv4 or IPv6 address.") from exc

    @field_validator("blocked_until")
    @classmethod
    def validate_blocked_until(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        normalized = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
        if normalized <= datetime.now(timezone.utc):
            raise ValueError("blocked_until must be in the future.")
        return normalized


class IPBlockResponse(BaseModel):
    id: int
    ip_address: str
    reason: str | None
    blocked_until: datetime | None
    is_active: bool
    created_by_id: int | None
    unblocked_by_id: int | None
    unblocked_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def is_permanent(self) -> bool:
        return self.blocked_until is None


class IPBlockListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[IPBlockResponse]


class IPBlockUnblockResponse(BaseModel):
    message: str
    block: IPBlockResponse


class SelfBlockCheckResponse(BaseModel):
    blocked: bool
    ip_address: str
    reason: str | None = None
    blocked_until: datetime | None = None
    is_permanent: bool = False

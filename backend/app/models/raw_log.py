from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Index, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.normalized_log import NormalizedLog


class RawLog(Base):
    __tablename__ = "raw_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    source: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    raw_message: Mapped[str] = mapped_column(Text, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    event_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    parsed_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    ingestion_status: Mapped[str] = mapped_column(String(40), default="received", server_default="received", nullable=False, index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    hostname: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    event_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    normalized_log: Mapped["NormalizedLog | None"] = relationship("NormalizedLog", back_populates="raw_log", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_raw_logs_source_type_received", "source_type", "received_at"),
    )

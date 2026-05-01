from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.alert import Alert
    from app.models.alert_related_log import AlertRelatedLog
    from app.models.raw_log import RawLog
    from app.models.risk_score import RiskScore


class NormalizedLog(Base):
    __tablename__ = "normalized_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    raw_log_id: Mapped[int] = mapped_column(ForeignKey("raw_logs.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    event_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    source: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    username: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    src_ip: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hostname: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    http_method: Mapped[str | None] = mapped_column(String(20), nullable=True)
    path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(30), default="low", server_default="low", nullable=False, index=True)
    parser_status: Mapped[str] = mapped_column(String(30), default="parsed", server_default="parsed", nullable=False, index=True)
    event_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    raw_log: Mapped["RawLog"] = relationship("RawLog", back_populates="normalized_log")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="normalized_log")
    related_alert_links: Mapped[list["AlertRelatedLog"]] = relationship("AlertRelatedLog", back_populates="normalized_log")
    risk_scores: Mapped[list["RiskScore"]] = relationship("RiskScore", back_populates="normalized_log")

    __table_args__ = (
        Index("ix_normalized_logs_type_ip_time", "event_type", "src_ip", "event_time"),
        Index("ix_normalized_logs_user_time", "username", "event_time"),
        Index("ix_normalized_logs_source_time", "source", "event_time"),
        Index("ix_normalized_logs_severity_time", "severity", "event_time"),
        Index("ix_normalized_logs_ip_user", "src_ip", "username"),
    )

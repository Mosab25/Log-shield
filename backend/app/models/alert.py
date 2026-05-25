from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.alert_related_log import AlertRelatedLog
    from app.models.alert_status_history import AlertStatusHistory
    from app.models.alert_threat_link import AlertThreatLink
    from app.models.analyst_note import AnalystNote
    from app.models.detection_rule import DetectionRule
    from app.models.incident_alert import IncidentAlert
    from app.models.normalized_log import NormalizedLog
    from app.models.risk_score import RiskScore
    from app.models.threat_entry import ThreatEntry
    from app.models.user import User


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(40), default="open", server_default="open", nullable=False, index=True)
    risk_score: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False, index=True)
    normalized_log_id: Mapped[int | None] = mapped_column(ForeignKey("normalized_logs.id", ondelete="SET NULL"), nullable=True, index=True)
    detection_rule_id: Mapped[int | None] = mapped_column(ForeignKey("detection_rules.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_to_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    detection_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    contained: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)

    normalized_log: Mapped["NormalizedLog | None"] = relationship("NormalizedLog", back_populates="alerts")
    detection_rule: Mapped["DetectionRule | None"] = relationship("DetectionRule", back_populates="alerts")
    assigned_to: Mapped["User | None"] = relationship("User", back_populates="assigned_alerts", foreign_keys=[assigned_to_id])
    related_log_links: Mapped[list["AlertRelatedLog"]] = relationship("AlertRelatedLog", back_populates="alert", cascade="all, delete-orphan")
    status_history: Mapped[list["AlertStatusHistory"]] = relationship("AlertStatusHistory", back_populates="alert", cascade="all, delete-orphan")
    analyst_notes: Mapped[list["AnalystNote"]] = relationship("AnalystNote", back_populates="alert", cascade="all, delete-orphan")
    risk_scores: Mapped[list["RiskScore"]] = relationship("RiskScore", back_populates="alert")
    threat_links: Mapped[list["AlertThreatLink"]] = relationship("AlertThreatLink", back_populates="alert", cascade="all, delete-orphan")
    incident_links: Mapped[list["IncidentAlert"]] = relationship("IncidentAlert", back_populates="alert", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_alerts_status_risk", "status", "risk_score"),
        Index("ix_alerts_severity_status", "severity", "status"),
        Index("ix_alerts_risk_created", "risk_score", "created_at"),
    )

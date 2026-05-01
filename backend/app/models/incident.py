from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.incident_alert import IncidentAlert
    from app.models.incident_evidence import IncidentEvidence
    from app.models.incident_note import IncidentNote
    from app.models.incident_timeline import IncidentTimeline
    from app.models.user import User


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="open", server_default="open", index=True)
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    owner: Mapped["User | None"] = relationship("User", foreign_keys=[owner_user_id])
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_user_id])
    alert_links: Mapped[list["IncidentAlert"]] = relationship("IncidentAlert", back_populates="incident", cascade="all, delete-orphan")
    timeline_events: Mapped[list["IncidentTimeline"]] = relationship("IncidentTimeline", back_populates="incident", cascade="all, delete-orphan")
    evidence_items: Mapped[list["IncidentEvidence"]] = relationship("IncidentEvidence", back_populates="incident", cascade="all, delete-orphan")
    notes: Mapped[list["IncidentNote"]] = relationship("IncidentNote", back_populates="incident", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_incidents_status_severity", "status", "severity"),
    )

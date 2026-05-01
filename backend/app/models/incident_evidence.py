from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.alert import Alert
    from app.models.incident import Incident
    from app.models.normalized_log import NormalizedLog
    from app.models.user import User


class IncidentEvidence(Base):
    __tablename__ = "incident_evidence"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    evidence_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    related_log_id: Mapped[int | None] = mapped_column(ForeignKey("normalized_logs.id", ondelete="SET NULL"), nullable=True, index=True)
    related_alert_id: Mapped[int | None] = mapped_column(ForeignKey("alerts.id", ondelete="SET NULL"), nullable=True, index=True)
    added_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    incident: Mapped["Incident"] = relationship("Incident", back_populates="evidence_items")
    related_log: Mapped["NormalizedLog | None"] = relationship("NormalizedLog")
    related_alert: Mapped["Alert | None"] = relationship("Alert")
    added_by: Mapped["User"] = relationship("User")

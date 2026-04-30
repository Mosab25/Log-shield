from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.alert import Alert
    from app.models.threat_entry import ThreatEntry


class AlertThreatLink(Base):
    __tablename__ = "alert_threat_links"

    alert_id: Mapped[int] = mapped_column(ForeignKey("alerts.id", ondelete="CASCADE"), primary_key=True)
    threat_entry_id: Mapped[int] = mapped_column(ForeignKey("threat_entries.id", ondelete="CASCADE"), primary_key=True)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    alert: Mapped["Alert"] = relationship("Alert", back_populates="threat_links")
    threat_entry: Mapped["ThreatEntry"] = relationship("ThreatEntry", back_populates="alert_links")

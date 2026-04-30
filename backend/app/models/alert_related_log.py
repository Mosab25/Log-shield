from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.alert import Alert
    from app.models.normalized_log import NormalizedLog


class AlertRelatedLog(Base):
    __tablename__ = "alert_related_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    alert_id: Mapped[int] = mapped_column(ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True)
    normalized_log_id: Mapped[int] = mapped_column(ForeignKey("normalized_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type: Mapped[str] = mapped_column(default="evidence", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    alert: Mapped["Alert"] = relationship("Alert", back_populates="related_log_links")
    normalized_log: Mapped["NormalizedLog"] = relationship("NormalizedLog", back_populates="related_alert_links")

    __table_args__ = (
        UniqueConstraint("alert_id", "normalized_log_id", name="uq_alert_related_log"),
    )

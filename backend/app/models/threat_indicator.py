from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.threat_entry import ThreatEntry


class ThreatIndicator(Base):
    __tablename__ = "threat_indicators"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    threat_entry_id: Mapped[int] = mapped_column(ForeignKey("threat_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    indicator_type: Mapped[str] = mapped_column(
        Enum("ip", "domain", "url", "hash", "email", "user_agent", "file_path", "registry_key", "other", name="threatindicatortype"),
        nullable=False, index=True,
    )
    indicator_value: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    threat_entry: Mapped["ThreatEntry"] = relationship("ThreatEntry", back_populates="indicators")

    __table_args__ = (
        UniqueConstraint("threat_entry_id", "indicator_type", "indicator_value", name="uq_threat_indicator_entry_type_value"),
    )

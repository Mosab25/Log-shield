from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.threat_entry import ThreatEntry


class ThreatReference(Base):
    __tablename__ = "threat_references"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    threat_entry_id: Mapped[int] = mapped_column(ForeignKey("threat_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    source_name: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    threat_entry: Mapped["ThreatEntry"] = relationship("ThreatEntry", back_populates="references")

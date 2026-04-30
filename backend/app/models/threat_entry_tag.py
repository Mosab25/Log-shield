from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.threat_entry import ThreatEntry
    from app.models.threat_tag import ThreatTag


class ThreatEntryTag(Base):
    __tablename__ = "threat_entry_tags"

    threat_entry_id: Mapped[int] = mapped_column(ForeignKey("threat_entries.id", ondelete="CASCADE"), primary_key=True)
    threat_tag_id: Mapped[int] = mapped_column(ForeignKey("threat_tags.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    threat_entry: Mapped["ThreatEntry"] = relationship("ThreatEntry", back_populates="tag_links")
    threat_tag: Mapped["ThreatTag"] = relationship("ThreatTag", back_populates="entry_links")

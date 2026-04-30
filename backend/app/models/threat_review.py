from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.threat_entry import ThreatEntry
    from app.models.user import User


class ThreatReview(Base):
    __tablename__ = "threat_reviews"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    threat_entry_id: Mapped[int] = mapped_column(ForeignKey("threat_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=False, index=True)
    decision: Mapped[str] = mapped_column(
        Enum("approved", "rejected", "changes_requested", "archived", name="threatreviewdecision"),
        nullable=False, index=True,
    )
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    threat_entry: Mapped["ThreatEntry"] = relationship("ThreatEntry", back_populates="reviews")
    reviewer: Mapped["User"] = relationship("User", back_populates="threat_reviews")

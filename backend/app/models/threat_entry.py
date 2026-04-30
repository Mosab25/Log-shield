from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, JSON, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.alert import Alert
    from app.models.alert_threat_link import AlertThreatLink
    from app.models.threat_indicator import ThreatIndicator
    from app.models.threat_entry_tag import ThreatEntryTag
    from app.models.threat_reference import ThreatReference
    from app.models.threat_review import ThreatReview
    from app.models.user import User


class ThreatEntry(Base):
    __tablename__ = "threat_entries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    type: Mapped[str] = mapped_column(
        Enum("vulnerability", "attack_pattern", "cve", "mitre_technique", "ioc", name="threatentrytype"),
        nullable=False, index=True,
    )
    category: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    severity: Mapped[str] = mapped_column(
        Enum("low", "medium", "high", "critical", name="threatseverity"),
        nullable=False, index=True,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    cve_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    cvss_score: Mapped[Decimal | None] = mapped_column(Numeric(3, 1), nullable=True)
    mitre_tactic: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    mitre_technique: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    affected_systems: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    detection_logic: Mapped[str | None] = mapped_column(Text, nullable=True)
    mitigation: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(
        Enum("manual", "nvd_api", "internal_seed", name="threatsource"),
        nullable=False, default="manual", server_default="manual", index=True,
    )
    status: Mapped[str] = mapped_column(
        Enum("draft", "pending_review", "approved", "rejected", "archived", name="threatstatus"),
        nullable=False, default="draft", server_default="draft", index=True,
    )
    submitted_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    external_published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    external_last_modified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    submitted_by: Mapped["User | None"] = relationship("User", back_populates="submitted_threats", foreign_keys=[submitted_by_id])
    reviewed_by: Mapped["User | None"] = relationship("User", back_populates="reviewed_threats", foreign_keys=[reviewed_by_id])
    indicators: Mapped[list["ThreatIndicator"]] = relationship("ThreatIndicator", back_populates="threat_entry", cascade="all, delete-orphan")
    references: Mapped[list["ThreatReference"]] = relationship("ThreatReference", back_populates="threat_entry", cascade="all, delete-orphan")
    reviews: Mapped[list["ThreatReview"]] = relationship("ThreatReview", back_populates="threat_entry", cascade="all, delete-orphan")
    tag_links: Mapped[list["ThreatEntryTag"]] = relationship("ThreatEntryTag", back_populates="threat_entry", cascade="all, delete-orphan")
    alert_links: Mapped[list["AlertThreatLink"]] = relationship("AlertThreatLink", back_populates="threat_entry", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_threat_entries_cvss", "cvss_score"),
    )

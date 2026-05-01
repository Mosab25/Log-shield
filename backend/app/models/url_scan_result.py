from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class URLScanResult(Base):
    """Model for storing URL reputation scan results."""
    
    __tablename__ = "url_scan_results"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    submitted_url: Mapped[str] = mapped_column(String(2048), nullable=False, index=True)
    normalized_url: Mapped[str] = mapped_column(String(2048), nullable=False, index=True)
    url_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # SHA-256 hash of normalized URL
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # safe, suspicious, malicious, unknown
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0-100 risk score
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # virustotal, etc.
    malicious_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    suspicious_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    harmless_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    undetected_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    categories: Mapped[str | None] = mapped_column(String(500), nullable=True)  # JSON string of categories
    provider_reference: Mapped[str | None] = mapped_column(String(200), nullable=True)  # Provider-specific ID
    raw_summary: Mapped[str | None] = mapped_column(String(2000), nullable=True)  # JSON string of summary data
    last_analysis_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    submitted_by: Mapped["User"] = relationship("User", backref="url_scans")

    __table_args__ = (
        # Indexes for common queries
        {"schema": None},
    )

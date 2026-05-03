from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.alert import Alert
    from app.models.alert_status_history import AlertStatusHistory
    from app.models.analyst_note import AnalystNote
    from app.models.audit_log import AuditLog
    from app.models.quiz import Quiz, QuizAttempt
    from app.models.refresh_token import RefreshToken
    from app.models.role import Role
    from app.models.threat_entry import ThreatEntry
    from app.models.threat_review import ThreatReview


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    role: Mapped["Role"] = relationship("Role", back_populates="users")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    assigned_alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="assigned_to", foreign_keys="Alert.assigned_to_id")
    alert_status_changes: Mapped[list["AlertStatusHistory"]] = relationship("AlertStatusHistory", back_populates="changed_by")
    analyst_notes: Mapped[list["AnalystNote"]] = relationship("AnalystNote", back_populates="analyst")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="actor")
    submitted_threats: Mapped[list["ThreatEntry"]] = relationship("ThreatEntry", back_populates="submitted_by", foreign_keys="ThreatEntry.submitted_by_id")
    reviewed_threats: Mapped[list["ThreatEntry"]] = relationship("ThreatEntry", back_populates="reviewed_by", foreign_keys="ThreatEntry.reviewed_by_id")
    threat_reviews: Mapped[list["ThreatReview"]] = relationship("ThreatReview", back_populates="reviewer")
    # Quiz relationships - will be added after Quiz model is properly imported
    # created_quizzes: Mapped[list["Quiz"]] = relationship("Quiz", back_populates="created_by")
    # quiz_attempts: Mapped[list["QuizAttempt"]] = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")

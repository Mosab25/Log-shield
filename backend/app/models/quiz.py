from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, index=True, default="beginner", server_default="beginner")
    question_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30, server_default="30")
    pass_percentage: Mapped[int] = mapped_column(Integer, nullable=False, default=70, server_default="70")
    is_active: Mapped[bool] = mapped_column(default=False, server_default="false", nullable=False, index=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    created_by: Mapped["User | None"] = relationship("User", foreign_keys=[created_by_user_id])
    questions: Mapped[list["QuizQuestion"]] = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")
    attempts: Mapped[list["QuizAttempt"]] = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_quizzes_category_active", "category", "is_active"),
        Index("ix_quizzes_type_active", "type", "is_active"),
        Index("ix_quizzes_difficulty_active", "difficulty", "is_active"),
    )


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    correct_option_index: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=True, index=True)
    topic: Mapped[str] = mapped_column(String(100), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="questions")
    answers: Mapped[list["QuizAnswer"]] = relationship("QuizAnswer", back_populates="question", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_quiz_questions_quiz_topic", "quiz_id", "topic"),
    )


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    percentage: Mapped[int] = mapped_column(Integer, nullable=False)
    passed: Mapped[bool] = mapped_column(default=False, server_default="false", nullable=False, index=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="attempts")
    answers: Mapped[list["QuizAnswer"]] = relationship("QuizAnswer", back_populates="attempt", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_quiz_attempts_user_quiz", "user_id", "quiz_id"),
        Index("ix_quiz_attempts_user_passed", "user_id", "passed"),
        Index("ix_quiz_attempts_submitted", "submitted_at"),
    )


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    selected_option_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_correct: Mapped[bool] = mapped_column(default=False, server_default="false", nullable=False)

    attempt: Mapped["QuizAttempt"] = relationship("QuizAttempt", back_populates="answers")
    question: Mapped["QuizQuestion"] = relationship("QuizQuestion", back_populates="answers")

    __table_args__ = (
        Index("ix_quiz_answers_attempt_question", "attempt_id", "question_id"),
    )

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class QuizOption(BaseModel):
    text: str
    is_correct: bool = False


class QuizQuestionResponse(BaseModel):
    id: int
    question_text: str
    options: list[str]
    correct_option_index: int | None = None
    explanation: str | None = None
    difficulty: str | None = None
    topic: str | None = None


class QuizResponse(BaseModel):
    id: int
    slug: str
    title: str
    description: str | None = None
    category: str
    type: str
    difficulty: str
    question_count: int
    estimated_minutes: int
    pass_percentage: int
    is_active: bool
    created_by_user_id: int | None = None
    created_at: datetime
    updated_at: datetime
    questions: list[QuizQuestionResponse] | None = None


class QuizListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[QuizResponse]


class QuizCreate(BaseModel):
    slug: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-z0-9-]+$")
    title: str = Field(..., min_length=3, max_length=200)
    description: str | None = Field(None, max_length=1000)
    category: str = Field(..., min_length=1, max_length=50)
    type: str = Field(..., min_length=1, max_length=50)
    difficulty: str = Field("beginner", pattern="^(beginner|intermediate|advanced)$")
    estimated_minutes: int = Field(30, ge=10, le=180)
    pass_percentage: int = Field(70, ge=50, le=100)
    is_active: bool = False


class QuizUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=200)
    description: str | None = Field(None, max_length=1000)
    category: str | None = Field(None, min_length=1, max_length=50)
    type: str | None = Field(None, min_length=1, max_length=50)
    difficulty: str | None = Field(None, pattern="^(beginner|intermediate|advanced)$")
    estimated_minutes: int | None = Field(None, ge=10, le=180)
    pass_percentage: int | None = Field(None, ge=50, le=100)
    is_active: bool | None = None


class QuizQuestionCreate(BaseModel):
    question_text: str = Field(..., min_length=10, max_length=2000)
    options: list[str] = Field(..., min_items=4, max_items=4)
    correct_option_index: int = Field(..., ge=0, le=3)
    explanation: str | None = Field(None, max_length=1000)
    difficulty: str | None = Field(None, pattern="^(beginner|intermediate|advanced)$")
    topic: str | None = Field(None, max_length=100)


class QuizQuestionUpdate(BaseModel):
    question_text: str | None = Field(None, min_length=10, max_length=2000)
    options: list[str] | None = Field(None, min_items=4, max_items=4)
    correct_option_index: int | None = Field(None, ge=0, le=3)
    explanation: str | None = Field(None, max_length=1000)
    difficulty: str | None = Field(None, pattern="^(beginner|intermediate|advanced)$")
    topic: str | None = Field(None, max_length=100)


class QuizBulkQuestionsCreate(BaseModel):
    questions: list[QuizQuestionCreate] = Field(..., min_items=1, max_items=100)


class QuizSubmissionAnswer(BaseModel):
    question_id: int
    selected_option_index: int = Field(..., ge=0, le=3)


class QuizSubmission(BaseModel):
    answers: list[QuizSubmissionAnswer] = Field(..., min_items=1)


class QuizSubmissionResponse(BaseModel):
    attempt_id: int
    score: int
    total_questions: int
    percentage: int
    passed: bool
    submitted_at: datetime
    answers: list[dict[str, Any]]


class QuizAttemptResponse(BaseModel):
    id: int
    quiz_id: int
    quiz_title: str
    quiz_category: str
    quiz_type: str
    score: int
    total_questions: int
    percentage: int
    passed: bool
    submitted_at: datetime


class QuizAttemptListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[QuizAttemptResponse]


class QuizMetadataResponse(BaseModel):
    categories: list[str]
    types: list[str]
    difficulties: list[str]


# Scores and Analytics Schemas
class QuizScoreResponse(BaseModel):
    attempt_id: int
    user_id: int
    user_email: str
    quiz_id: int
    quiz_title: str
    category: str
    type: str
    score: int
    total_questions: int
    percentage: int
    passed: bool
    submitted_at: datetime


class QuizScoreListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[QuizScoreResponse]


class QuizSummaryResponse(BaseModel):
    total_attempts: int
    unique_users: int
    average_score: float
    pass_rate: float
    top_quiz: dict[str, Any]
    weakest_quiz: dict[str, Any]
    best_user: dict[str, Any]
    most_active_user: dict[str, Any]
    attempts_today: int


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    user_email: str
    attempts: int
    average_percentage: float
    best_percentage: int
    passed_count: int
    last_attempt_at: datetime


class LeaderboardResponse(BaseModel):
    total_users: int
    skip: int
    limit: int
    items: list[LeaderboardEntry]

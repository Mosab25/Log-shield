from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_admin, require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.quiz import (
    QuizBulkQuestionsCreate,
    QuizCreate,
    QuizListResponse,
    QuizMetadataResponse,
    QuizQuestionCreate,
    QuizQuestionResponse,
    QuizQuestionUpdate,
    QuizResponse,
    QuizSubmission,
    QuizSubmissionResponse,
    QuizUpdate,
    QuizScoreResponse,
    QuizScoreListResponse,
    QuizSummaryResponse,
    LeaderboardEntry,
    LeaderboardResponse,
)
from app.services.audit_service import AuditService
from app.services.quiz_service import QuizService


def _ensure_awareness_schema(db: Annotated[Session, Depends(get_db)]) -> None:
    QuizService.ensure_schema(db)


router = APIRouter(dependencies=[Depends(_ensure_awareness_schema)])


# Quiz listing and retrieval
@router.get("/quizzes", response_model=QuizListResponse)
def list_quizzes(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category: str | None = None,
    type: str | None = None,
    difficulty: str | None = None,
    q: str | None = None,
    is_active: bool | None = None
):
    """List available quizzes with filters"""
    total, quizzes = QuizService.list_quizzes(
        db=db,
        skip=skip,
        limit=limit,
        category=category,
        type=type,
        difficulty=difficulty,
        q=q,
        is_active=is_active
    )
    
    quiz_responses = [QuizService.to_response(q, include_questions=False) for q in quizzes]
    return QuizListResponse(total=total, skip=skip, limit=limit, items=quiz_responses)


@router.get("/quizzes/metadata", response_model=QuizMetadataResponse)
def get_quiz_metadata(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))]
):
    """Get quiz metadata for filters"""
    return QuizService.get_metadata(db)


@router.get("/quizzes/{quiz_id}", response_model=QuizResponse)
def get_quiz(
    quiz_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))]
):
    """Get quiz details with questions (without correct answers)"""
    quiz = QuizService.get_quiz(db, quiz_id, include_questions=True)
    can_manage = bool(current_user.role and current_user.role.name in {"admin", "analyst"})
    return QuizService.to_response(quiz, include_questions=True, include_correct=can_manage)


@router.get("/quizzes/by-slug/{slug}", response_model=QuizResponse)
def get_quiz_by_slug(
    slug: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))]
):
    """Get quiz details with questions by slug (without correct answers)"""
    quiz = QuizService.get_quiz_by_slug(db, slug, include_questions=True)
    return QuizService.to_response(quiz, include_questions=True)


# Quiz submission
@router.post("/quizzes/{quiz_id}/submit", response_model=QuizSubmissionResponse)
def submit_quiz(
    quiz_id: int,
    submission: QuizSubmission,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))]
):
    """Submit quiz answers and get results"""
    result = QuizService.submit_quiz(db, quiz_id, submission, current_user)
    
    # Log quiz submission
    AuditService.create_audit_log(
        db=db,
        actor_user_id=current_user.id,
        action="awareness_quiz_submitted",
        entity_type="quiz",
        entity_id=str(quiz_id),
        details={
            "user_id": current_user.id,
            "score": result.score,
            "total_questions": result.total_questions,
            "percentage": result.percentage,
            "passed": result.passed
        }
    )
    db.commit()
    
    return result


# User scores
@router.get("/my-scores")
def get_my_scores(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """Get current user's quiz scores"""
    total, attempts = QuizService.get_user_attempts(db, current_user.id, skip=skip, limit=limit)
    
    attempt_responses = []
    for attempt in attempts:
        attempt_responses.append({
            "id": attempt.id,
            "quiz_id": attempt.quiz_id,
            "quiz_title": attempt.quiz.title,
            "quiz_category": attempt.quiz.category,
            "quiz_type": attempt.quiz.type,
            "score": attempt.score,
            "total_questions": attempt.total_questions,
            "percentage": attempt.percentage,
            "passed": attempt.passed,
            "submitted_at": attempt.submitted_at
        })
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": attempt_responses
    }


@router.get("/scores")
def get_all_scores(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin"))],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user_id: int | None = None,
    quiz_id: int | None = None,
    category: str | None = None,
    type: str | None = None,
    passed: bool | None = None,
    start_date: str | None = None,
    end_date: str | None = None
):
    """Get all users' quiz scores (admin only)"""
    total, attempts = QuizService.get_all_scores(
        db=db,
        skip=skip,
        limit=limit,
        user_id=user_id,
        quiz_id=quiz_id,
        category=category,
        type=type,
        passed=passed,
        start_date=start_date,
        end_date=end_date,
    )
    
    attempt_responses = []
    for attempt in attempts:
        attempt_responses.append({
            "id": attempt.id,
            "quiz_id": attempt.quiz_id,
            "quiz_title": attempt.quiz.title,
            "quiz_category": attempt.quiz.category,
            "quiz_type": attempt.quiz.type,
            "user_id": attempt.user_id,
            "user_email": attempt.user.email,
            "user_full_name": attempt.user.full_name,
            "score": attempt.score,
            "total_questions": attempt.total_questions,
            "percentage": attempt.percentage,
            "passed": attempt.passed,
            "submitted_at": attempt.submitted_at
        })
    
    # Log admin viewing scores
    AuditService.create_audit_log(
        db=db,
        actor_user_id=current_user.id,
        action="awareness_scores_viewed_admin",
        entity_type="quiz_scores",
        details={}
    )
    db.commit()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": attempt_responses
    }


# Quiz management (admin and analyst only)
@router.post("/quizzes", response_model=QuizResponse, status_code=201)
def create_quiz(
    quiz_data: QuizCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]
):
    """Create a new quiz"""
    quiz = QuizService.create_quiz(db, quiz_data, current_user)
    
    # Log quiz creation
    AuditService.create_audit_log(
        db=db,
        actor_user_id=current_user.id,
        action="awareness_quiz_created",
        entity_type="quiz",
        entity_id=str(quiz.id),
        details={
            "title": quiz.title,
            "category": quiz.category,
            "type": quiz.type
        }
    )
    db.commit()
    
    return QuizService.to_response(quiz)


@router.patch("/quizzes/{quiz_id}", response_model=QuizResponse)
def update_quiz(
    quiz_id: int,
    quiz_data: QuizUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]
):
    """Update quiz metadata"""
    quiz = QuizService.update_quiz(db, quiz_id, quiz_data)
    
    # Log quiz update
    AuditService.create_audit_log(
        db=db,
        actor_user_id=current_user.id,
        action="awareness_quiz_updated",
        entity_type="quiz",
        entity_id=str(quiz.id),
        details={}
    )
    db.commit()
    
    return QuizService.to_response(quiz)


@router.delete("/quizzes/{quiz_id}")
def delete_quiz(
    quiz_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]
):
    """Deactivate a quiz"""
    QuizService.delete_quiz(db, quiz_id)
    
    # Log quiz deactivation
    AuditService.create_audit_log(
        db=db,
        actor_user_id=current_user.id,
        action="awareness_quiz_deactivated",
        entity_type="quiz",
        entity_id=str(quiz_id),
        details={}
    )
    db.commit()
    
    return {"message": "Quiz deactivated successfully"}


@router.post("/quizzes/{quiz_id}/questions", response_model=QuizQuestionResponse, status_code=201)
def create_question(
    quiz_id: int,
    question_data: QuizQuestionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]
):
    """Add a question to a quiz"""
    question = QuizService.create_question(db, quiz_id, question_data)
    
    # Log question creation
    AuditService.create_audit_log(
        db=db,
        actor_user_id=current_user.id,
        action="awareness_question_created",
        entity_type="quiz_question",
        entity_id=str(question.id),
        details={
            "quiz_id": quiz_id
        }
    )
    db.commit()
    
    return QuizService.question_to_response(question)


@router.patch("/questions/{question_id}", response_model=QuizQuestionResponse)
def update_question(
    question_id: int,
    question_data: QuizQuestionUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]
):
    """Update a question"""
    question = QuizService.update_question(db, question_id, question_data)
    
    # Log question update
    AuditService.create_audit_log(
        db=db,
        actor_user_id=current_user.id,
        action="awareness_question_updated",
        entity_type="quiz_question",
        entity_id=str(question.id),
        details={}
    )
    db.commit()
    
    return QuizService.question_to_response(question)


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]
):
    """Delete a question"""
    QuizService.delete_question(db, question_id)
    
    # Log question deletion
    AuditService.create_audit_log(
        db=db,
        actor_user_id=current_user.id,
        action="awareness_question_deleted",
        entity_type="quiz_question",
        entity_id=str(question_id),
        details={}
    )
    db.commit()
    
    return {"message": "Question deleted successfully"}


@router.post("/quizzes/{quiz_id}/bulk-questions", status_code=201)
def bulk_create_questions(
    quiz_id: int,
    bulk_data: QuizBulkQuestionsCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst"))]
):
    """Add multiple questions to a quiz at once"""
    questions = []
    for question_data in bulk_data.questions:
        question = QuizService.create_question(db, quiz_id, question_data)
        questions.append(QuizService.question_to_response(question))
    
    # Log bulk question creation
    AuditService.create_audit_log(
        db=db,
        actor_user_id=current_user.id,
        action="awareness_bulk_questions_added",
        entity_type="quiz",
        entity_id=str(quiz_id),
        details={
            "question_count": len(questions)
        }
    )
    db.commit()
    
    return {
        "message": f"Added {len(questions)} questions to quiz",
        "questions": questions
    }


# Scores and Analytics APIs
@router.get("/my-scores", response_model=QuizScoreListResponse)
def get_my_scores(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles("admin", "analyst", "viewer"))],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    quiz_id: int | None = None,
    passed: bool | None = None
):
    """Get current user's quiz attempts"""
    total, attempts = QuizService.get_user_scores(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        quiz_id=quiz_id,
        passed=passed
    )
    
    score_responses = []
    for attempt in attempts:
        score_responses.append(QuizScoreResponse(
            attempt_id=attempt.id,
            user_id=attempt.user_id,
            user_email=current_user.email,
            quiz_id=attempt.quiz_id,
            quiz_title=attempt.quiz.title,
            category=attempt.quiz.category,
            type=attempt.quiz.type,
            score=attempt.score,
            total_questions=attempt.total_questions,
            percentage=attempt.percentage,
            passed=attempt.passed,
            submitted_at=attempt.submitted_at
        ))
    
    return QuizScoreListResponse(total=total, skip=skip, limit=limit, items=score_responses)


@router.get("/scores", response_model=QuizScoreListResponse)
def get_all_scores(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user_id: int | None = None,
    quiz_id: int | None = None,
    category: str | None = None,
    type: str | None = None,
    passed: bool | None = None,
    start_date: str | None = None,
    end_date: str | None = None
):
    """Get all quiz attempts (Admin only)"""
    
    # Log scores viewing
    AuditService.create_audit_log(
        db=db,
        actor_user_id=current_user.id,
        action="awareness_scores_viewed_admin",
        entity_type="quiz_scores",
        entity_id="all",
        details={}
    )
    db.commit()
    
    total, attempts = QuizService.get_all_scores(
        db=db,
        skip=skip,
        limit=limit,
        user_id=user_id,
        quiz_id=quiz_id,
        category=category,
        type=type,
        passed=passed,
        start_date=start_date,
        end_date=end_date
    )
    
    score_responses = []
    for attempt in attempts:
        score_responses.append(QuizScoreResponse(
            attempt_id=attempt.id,
            user_id=attempt.user_id,
            user_email=attempt.user.email,
            quiz_id=attempt.quiz_id,
            quiz_title=attempt.quiz.title,
            category=attempt.quiz.category,
            type=attempt.quiz.type,
            score=attempt.score,
            total_questions=attempt.total_questions,
            percentage=attempt.percentage,
            passed=attempt.passed,
            submitted_at=attempt.submitted_at
        ))
    
    return QuizScoreListResponse(total=total, skip=skip, limit=limit, items=score_responses)


@router.get("/summary", response_model=QuizSummaryResponse)
def get_quiz_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)]
):
    """Get quiz analytics summary (Admin only)"""
    summary = QuizService.get_quiz_summary(db)
    return summary


@router.get("/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    quiz_id: int | None = None,
    category: str | None = None,
    type: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None
):
    """Get user leaderboard (Admin only)"""
    
    # Log leaderboard viewing
    AuditService.create_audit_log(
        db=db,
        actor_user_id=current_user.id,
        action="awareness_leaderboard_viewed",
        entity_type="leaderboard",
        entity_id="all",
        details={}
    )
    db.commit()
    
    total, leaderboard_data = QuizService.get_leaderboard(
        db=db,
        skip=skip,
        limit=limit,
        quiz_id=quiz_id,
        category=category,
        type=type,
        start_date=start_date,
        end_date=end_date
    )
    
    leaderboard_entries = []
    for entry in leaderboard_data:
        leaderboard_entries.append(LeaderboardEntry(
            rank=entry["rank"],
            user_id=entry["user_id"],
            user_email=entry["user_email"],
            attempts=entry["attempts"],
            average_percentage=entry["average_percentage"],
            best_percentage=entry["best_percentage"],
            passed_count=entry["passed_count"],
            last_attempt_at=entry["last_attempt_at"]
        ))
    
    return LeaderboardResponse(total_users=total, skip=skip, limit=limit, items=leaderboard_entries)


@router.get("/scores/export/csv")
def export_scores_csv(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    user_id: int | None = None,
    quiz_id: int | None = None,
    category: str | None = None,
    type: str | None = None,
    passed: bool | None = None,
    start_date: str | None = None,
    end_date: str | None = None
):
    """Export scores as CSV (Admin only)"""
    
    # Log export action
    AuditService.create_audit_log(
        db=db,
        actor_user_id=current_user.id,
        action="awareness_scores_exported",
        entity_type="quiz_scores",
        entity_id="csv_export",
        details={}
    )
    db.commit()
    
    csv_data = QuizService.export_scores_csv(
        db=db,
        user_id=user_id,
        quiz_id=quiz_id,
        category=category,
        type=type,
        passed=passed,
        start_date=start_date,
        end_date=end_date
    )
    
    from fastapi.responses import Response
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=quiz_scores.csv"}
    )

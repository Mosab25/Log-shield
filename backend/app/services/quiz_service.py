from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import Integer, func, select
from sqlalchemy.orm import Session

from app.models.quiz import Quiz, QuizAttempt, QuizAnswer, QuizQuestion
from app.models.user import User
from app.schemas.quiz import (
    QuizCreate,
    QuizListResponse,
    QuizQuestionCreate,
    QuizQuestionResponse,
    QuizQuestionUpdate,
    QuizResponse,
    QuizSubmission,
    QuizSubmissionResponse,
    QuizUpdate,
    QuizSummaryResponse,
)


class QuizService:
    @staticmethod
    def to_response(quiz: Quiz, include_questions: bool = False, include_correct: bool = False) -> QuizResponse:
        questions = None
        if include_questions:
            questions = [QuizService.question_to_response(q, include_correct=include_correct) for q in quiz.questions]
        
        return QuizResponse(
            id=quiz.id,
            slug=quiz.slug,
            title=quiz.title,
            description=quiz.description,
            category=quiz.category,
            type=quiz.type,
            difficulty=quiz.difficulty,
            question_count=quiz.question_count,
            estimated_minutes=quiz.estimated_minutes,
            pass_percentage=quiz.pass_percentage,
            is_active=quiz.is_active,
            created_by_user_id=quiz.created_by_user_id,
            created_at=quiz.created_at,
            updated_at=quiz.updated_at,
            questions=questions
        )

    @staticmethod
    def question_to_response(question: QuizQuestion, include_correct: bool = True) -> QuizQuestionResponse:
        # Ensure options are in the correct order
        if isinstance(question.options, dict):
            # Extract options in order: option_0, option_1, option_2, option_3
            ordered_options = []
            for i in range(4):
                key = f"option_{i}"
                if key in question.options:
                    ordered_options.append(question.options[key])
            options = ordered_options
        else:
            options = question.options
            
        return QuizQuestionResponse(
            id=question.id,
            question_text=question.question_text,
            options=options,
            correct_option_index=question.correct_option_index if include_correct else None,
            explanation=question.explanation if include_correct else None,
            difficulty=question.difficulty,
            topic=question.topic
        )

    @staticmethod
    def create_quiz(db: Session, quiz_data: QuizCreate, current_user: User) -> Quiz:
        # Check if slug already exists
        existing = db.execute(select(Quiz).where(Quiz.slug == quiz_data.slug)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Quiz with this slug already exists")
        
        quiz = Quiz(
            slug=quiz_data.slug,
            title=quiz_data.title,
            description=quiz_data.description,
            category=quiz_data.category,
            type=quiz_data.type,
            difficulty=quiz_data.difficulty,
            estimated_minutes=quiz_data.estimated_minutes,
            pass_percentage=quiz_data.pass_percentage,
            is_active=quiz_data.is_active,
            created_by_user_id=current_user.id if current_user.role.name in ["admin", "analyst"] else None
        )
        
        db.add(quiz)
        db.flush()
        return quiz

    @staticmethod
    def update_quiz(db: Session, quiz_id: int, quiz_data: QuizUpdate) -> Quiz:
        quiz = db.get(Quiz, quiz_id)
        if not quiz:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
        
        # Update fields
        for field, value in quiz_data.dict(exclude_unset=True).items():
            setattr(quiz, field, value)
        
        db.flush()
        return quiz

    @staticmethod
    def delete_quiz(db: Session, quiz_id: int) -> bool:
        quiz = db.get(Quiz, quiz_id)
        if not quiz:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
        
        # Soft delete by deactivating
        quiz.is_active = False
        db.flush()
        return True

    @staticmethod
    def list_quizzes(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        category: str | None = None,
        type: str | None = None,
        difficulty: str | None = None,
        q: str | None = None,
        is_active: bool | None = None
    ) -> tuple[int, list[Quiz]]:
        query = select(Quiz)
        count_query = select(func.count(Quiz.id))
        filters = []
        
        if category:
            filters.append(Quiz.category == category)
        if type:
            filters.append(Quiz.type == type)
        if difficulty:
            filters.append(Quiz.difficulty == difficulty)
        if q:
            filters.append(Quiz.title.ilike(f"%{q}%"))
        if is_active is not None:
            filters.append(Quiz.is_active == is_active)
        
        for f in filters:
            query = query.where(f)
            count_query = count_query.where(f)
        
        total = db.execute(count_query).scalar_one()
        quizzes = db.execute(query.order_by(Quiz.created_at.desc()).offset(skip).limit(limit)).scalars().all()
        return total, quizzes

    @staticmethod
    def get_quiz(db: Session, quiz_id: int, include_questions: bool = True) -> Quiz:
        quiz = db.get(Quiz, quiz_id)
        if not quiz:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
        
        if include_questions:
            # Load questions with their answers
            quiz.questions  # This will trigger loading
        
        return quiz

    @staticmethod
    def get_quiz_by_slug(db: Session, slug: str, include_questions: bool = True) -> Quiz:
        quiz = db.execute(select(Quiz).where(Quiz.slug == slug)).scalar_one_or_none()
        if not quiz:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
        
        if include_questions:
            # Load questions with their answers
            quiz.questions  # This will trigger loading
        
        return quiz

    @staticmethod
    def create_question(db: Session, quiz_id: int, question_data: QuizQuestionCreate) -> QuizQuestion:
        quiz = db.get(Quiz, quiz_id)
        if not quiz:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
        
        question = QuizQuestion(
            quiz_id=quiz_id,
            question_text=question_data.question_text,
            options={"option_0": question_data.options[0], "option_1": question_data.options[1], "option_2": question_data.options[2], "option_3": question_data.options[3]},
            correct_option_index=question_data.correct_option_index,
            explanation=question_data.explanation,
            difficulty=question_data.difficulty,
            topic=question_data.topic
        )
        
        db.add(question)
        db.flush()
        
        # Update quiz question count
        quiz.question_count = db.execute(select(func.count(QuizQuestion.id)).where(QuizQuestion.quiz_id == quiz_id)).scalar_one()
        
        return question

    @staticmethod
    def update_question(db: Session, question_id: int, question_data: QuizQuestionUpdate) -> QuizQuestion:
        question = db.get(QuizQuestion, question_id)
        if not question:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        
        # Update fields
        for field, value in question_data.dict(exclude_unset=True).items():
            if field == "options" and value:
                # Convert list to dict format
                setattr(question, field, {"option_0": value[0], "option_1": value[1], "option_2": value[2], "option_3": value[3]})
            else:
                setattr(question, field, value)
        
        db.flush()
        return question

    @staticmethod
    def delete_question(db: Session, question_id: int) -> bool:
        question = db.get(QuizQuestion, question_id)
        if not question:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        
        quiz_id = question.quiz_id
        db.delete(question)
        db.flush()
        
        # Update quiz question count
        quiz = db.get(Quiz, quiz_id)
        if quiz:
            quiz.question_count = db.execute(select(func.count(QuizQuestion.id)).where(QuizQuestion.quiz_id == quiz_id)).scalar_one()
        
        return True

    @staticmethod
    def submit_quiz(db: Session, quiz_id: int, submission: QuizSubmission, current_user: User) -> QuizSubmissionResponse:
        quiz = db.get(Quiz, quiz_id)
        if not quiz:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
        
        if not quiz.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz is not active")
        
        # Get all questions for this quiz
        questions = db.execute(select(QuizQuestion).where(QuizQuestion.quiz_id == quiz_id)).scalars().all()
        
        if not questions:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz has no questions")
        
        # Calculate score
        correct_count = 0
        answer_results = []
        
        for question in questions:
            user_answer = next((a for a in submission.answers if a.question_id == question.id), None)
            if user_answer:
                is_correct = user_answer.selected_option_index == question.correct_option_index
                if is_correct:
                    correct_count += 1
                
                answer_results.append({
                    "question_id": question.id,
                    "question_text": question.question_text,
                    "selected_option": question.options.get(f"option_{user_answer.selected_option_index}", ""),
                    "correct_option": question.options.get(f"option_{question.correct_option_index}", ""),
                    "is_correct": is_correct,
                    "explanation": question.explanation
                })
        
        # Create attempt record
        percentage = int((correct_count / len(questions)) * 100)
        passed = percentage >= quiz.pass_percentage
        
        attempt = QuizAttempt(
            user_id=current_user.id,
            quiz_id=quiz_id,
            score=correct_count,
            total_questions=len(questions),
            percentage=percentage,
            passed=passed
        )
        
        db.add(attempt)
        db.flush()
        
        # Create answer records
        for question in questions:
            user_answer = next((a for a in submission.answers if a.question_id == question.id), None)
            if user_answer:
                answer = QuizAnswer(
                    attempt_id=attempt.id,
                    question_id=question.id,
                    selected_option_index=user_answer.selected_option_index,
                    is_correct=user_answer.selected_option_index == question.correct_option_index
                )
                db.add(answer)
        
        db.commit()
        
        return QuizSubmissionResponse(
            attempt_id=attempt.id,
            score=correct_count,
            total_questions=len(questions),
            percentage=percentage,
            passed=passed,
            submitted_at=attempt.submitted_at,
            answers=answer_results
        )

    @staticmethod
    def get_user_attempts(db: Session, user_id: int, skip: int = 0, limit: int = 50) -> tuple[int, list[QuizAttempt]]:
        query = select(QuizAttempt).where(QuizAttempt.user_id == user_id)
        count_query = select(func.count(QuizAttempt.id)).where(QuizAttempt.user_id == user_id)
        
        total = db.execute(count_query).scalar_one()
        attempts = db.execute(query.order_by(QuizAttempt.submitted_at.desc()).offset(skip).limit(limit)).scalars().all()
        return total, attempts

    @staticmethod
    def get_all_attempts(db: Session, skip: int = 0, limit: int = 50, quiz_id: int | None = None, passed: bool | None = None) -> tuple[int, list[QuizAttempt]]:
        query = select(QuizAttempt)
        count_query = select(func.count(QuizAttempt.id))
        filters = []
        
        if quiz_id:
            filters.append(QuizAttempt.quiz_id == quiz_id)
        if passed is not None:
            filters.append(QuizAttempt.passed == passed)
        
        for f in filters:
            query = query.where(f)
            count_query = count_query.where(f)
        
        total = db.execute(count_query).scalar_one()
        attempts = db.execute(query.order_by(QuizAttempt.submitted_at.desc()).offset(skip).limit(limit)).scalars().all()
        return total, attempts

    @staticmethod
    def get_metadata(db: Session) -> dict[str, Any]:
        categories = [row[0] for row in db.execute(select(Quiz.category).distinct()).all()]
        types = [row[0] for row in db.execute(select(Quiz.type).distinct()).all()]
        difficulties = [row[0] for row in db.execute(select(Quiz.difficulty).distinct()).all()]
        
        return {
            "categories": categories,
            "types": types,
            "difficulties": difficulties
        }

    @staticmethod
    def get_user_scores(
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
        quiz_id: int | None = None,
        passed: bool | None = None
    ) -> tuple[int, list[QuizAttempt]]:
        """Get user's quiz attempts with filters"""
        query = select(QuizAttempt).where(QuizAttempt.user_id == user_id)
        count_query = select(func.count(QuizAttempt.id)).where(QuizAttempt.user_id == user_id)
        filters = []
        
        if quiz_id:
            filters.append(QuizAttempt.quiz_id == quiz_id)
        if passed is not None:
            filters.append(QuizAttempt.passed == passed)
        
        for f in filters:
            query = query.where(f)
            count_query = count_query.where(f)
        
        total = db.execute(count_query).scalar_one()
        attempts = db.execute(query.order_by(QuizAttempt.submitted_at.desc()).offset(skip).limit(limit)).scalars().all()
        return total, attempts

    @staticmethod
    def get_all_scores(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        user_id: int | None = None,
        quiz_id: int | None = None,
        category: str | None = None,
        type: str | None = None,
        passed: bool | None = None,
        start_date: str | None = None,
        end_date: str | None = None
    ) -> tuple[int, list[QuizAttempt]]:
        """Get all quiz attempts with filters"""
        query = select(QuizAttempt).join(Quiz)
        count_query = select(func.count(QuizAttempt.id)).join(Quiz)
        filters = []
        
        if user_id:
            filters.append(QuizAttempt.user_id == user_id)
        if quiz_id:
            filters.append(QuizAttempt.quiz_id == quiz_id)
        if category:
            filters.append(Quiz.category == category)
        if type:
            filters.append(Quiz.type == type)
        if passed is not None:
            filters.append(QuizAttempt.passed == passed)
        if start_date:
            filters.append(QuizAttempt.submitted_at >= start_date)
        if end_date:
            filters.append(QuizAttempt.submitted_at <= end_date)
        
        for f in filters:
            query = query.where(f)
            count_query = count_query.where(f)
        
        total = db.execute(count_query).scalar_one()
        attempts = db.execute(query.order_by(QuizAttempt.submitted_at.desc()).offset(skip).limit(limit)).scalars().all()
        return total, attempts

    @staticmethod
    def get_quiz_summary(db: Session) -> dict[str, Any]:
        """Get quiz analytics summary"""
        total_attempts = db.execute(select(func.count(QuizAttempt.id))).scalar_one()
        unique_users = db.execute(select(func.count(func.distinct(QuizAttempt.user_id)))).scalar_one()
        
        avg_score_result = db.execute(select(func.avg(QuizAttempt.percentage))).scalar_one()
        average_score = round(avg_score_result, 1) if avg_score_result else 0.0
        
        passed_count = db.execute(select(func.count(QuizAttempt.id)).where(QuizAttempt.passed == True)).scalar_one()
        pass_rate = round((passed_count / total_attempts * 100), 1) if total_attempts > 0 else 0.0
        
        # Top quiz (highest average score)
        top_quiz_query = select(
            Quiz.title,
            func.avg(QuizAttempt.percentage).label('avg_score'),
            func.count(QuizAttempt.id).label('attempt_count')
        ).join(QuizAttempt).group_by(Quiz.id).order_by(func.avg(QuizAttempt.percentage).desc()).limit(1)
        top_quiz_result = db.execute(top_quiz_query).first()
        top_quiz = {
            "title": top_quiz_result.title,
            "average_score": round(top_quiz_result.avg_score, 1),
            "attempts": top_quiz_result.attempt_count
        } if top_quiz_result else {}
        
        # Weakest quiz (lowest average score)
        weakest_quiz_query = select(
            Quiz.title,
            func.avg(QuizAttempt.percentage).label('avg_score'),
            func.count(QuizAttempt.id).label('attempt_count')
        ).join(QuizAttempt).group_by(Quiz.id).order_by(func.avg(QuizAttempt.percentage).asc()).limit(1)
        weakest_quiz_result = db.execute(weakest_quiz_query).first()
        weakest_quiz = {
            "title": weakest_quiz_result.title,
            "average_score": round(weakest_quiz_result.avg_score, 1),
            "attempts": weakest_quiz_result.attempt_count
        } if weakest_quiz_result else {}
        
        # Best user (highest average score)
        best_user_query = select(
            User.email,
            func.avg(QuizAttempt.percentage).label('avg_score'),
            func.count(QuizAttempt.id).label('attempt_count')
        ).join(QuizAttempt, QuizAttempt.user_id == User.id).group_by(User.id).order_by(func.avg(QuizAttempt.percentage).desc()).limit(1)
        best_user_result = db.execute(best_user_query).first()
        best_user = {
            "email": best_user_result.email,
            "average_score": round(best_user_result.avg_score, 1),
            "attempts": best_user_result.attempt_count
        } if best_user_result else {}
        
        # Most active user (most attempts)
        most_active_query = select(
            User.email,
            func.count(QuizAttempt.id).label('attempt_count'),
            func.avg(QuizAttempt.percentage).label('avg_score')
        ).join(QuizAttempt, QuizAttempt.user_id == User.id).group_by(User.id).order_by(func.count(QuizAttempt.id).desc()).limit(1)
        most_active_result = db.execute(most_active_query).first()
        most_active_user = {
            "email": most_active_result.email,
            "attempts": most_active_result.attempt_count,
            "average_score": round(most_active_result.avg_score, 1)
        } if most_active_result else {}
        
        # Attempts today
        today = datetime.now().date()
        attempts_today = db.execute(
            select(func.count(QuizAttempt.id)).where(
                func.date(QuizAttempt.submitted_at) == today
            )
        ).scalar_one()
        
        return QuizSummaryResponse(
            total_attempts=total_attempts,
            unique_users=unique_users,
            average_score=average_score,
            pass_rate=pass_rate,
            top_quiz=top_quiz,
            weakest_quiz=weakest_quiz,
            best_user=best_user,
            most_active_user=most_active_user,
            attempts_today=attempts_today
        )

    @staticmethod
    def get_leaderboard(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        quiz_id: int | None = None,
        category: str | None = None,
        type: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None
    ) -> tuple[int, list[dict[str, Any]]]:
        """Get user leaderboard"""
        # Base query for user performance
        query = select(
            User.id.label('user_id'),
            User.email,
            func.count(QuizAttempt.id).label('attempts'),
            func.avg(QuizAttempt.percentage).label('avg_percentage'),
            func.max(QuizAttempt.percentage).label('best_percentage'),
            func.sum(func.cast(QuizAttempt.passed, Integer)).label('passed_count'),
            func.max(QuizAttempt.submitted_at).label('last_attempt_at')
        ).join(QuizAttempt, QuizAttempt.user_id == User.id).join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        
        count_query = select(func.count(func.distinct(User.id))).join(QuizAttempt, QuizAttempt.user_id == User.id).join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        
        filters = []
        if quiz_id:
            filters.append(QuizAttempt.quiz_id == quiz_id)
        if category:
            filters.append(Quiz.category == category)
        if type:
            filters.append(Quiz.type == type)
        if start_date:
            filters.append(QuizAttempt.submitted_at >= start_date)
        if end_date:
            filters.append(QuizAttempt.submitted_at <= end_date)
        
        for f in filters:
            query = query.where(f)
            count_query = count_query.where(f)
        
        # Group by user and order by average percentage
        query = query.group_by(User.id, User.email).order_by(func.avg(QuizAttempt.percentage).desc())
        
        total = db.execute(count_query).scalar_one()
        results = db.execute(query.offset(skip).limit(limit)).all()
        
        # Add rank
        leaderboard_data = []
        for idx, row in enumerate(results, start=skip + 1):
            leaderboard_data.append({
                "rank": idx,
                "user_id": row.user_id,
                "user_email": row.email,
                "attempts": row.attempts,
                "average_percentage": round(row.avg_percentage, 1),
                "best_percentage": row.best_percentage,
                "passed_count": row.passed_count,
                "last_attempt_at": row.last_attempt_at
            })
        
        return total, leaderboard_data

    @staticmethod
    def export_scores_csv(
        db: Session,
        user_id: int | None = None,
        quiz_id: int | None = None,
        category: str | None = None,
        type: str | None = None,
        passed: bool | None = None,
        start_date: str | None = None,
        end_date: str | None = None
    ) -> str:
        """Export scores to CSV"""
        total, attempts = QuizService.get_all_scores(
            db=db,
            user_id=user_id,
            quiz_id=quiz_id,
            category=category,
            type=type,
            passed=passed,
            start_date=start_date,
            end_date=end_date,
            skip=0,
            limit=10000  # Large limit for export
        )
        
        # CSV header
        csv_lines = [
            "Attempt ID,User Email,Quiz Title,Category,Type,Score,Total Questions,Percentage,Passed,Submitted At"
        ]
        
        # Add data rows
        for attempt in attempts:
            # Escape CSV injection by prefixing cells starting with =, +, -, @ with '
            user_email = attempt.user.email
            if user_email and user_email[0] in "=+-@":
                user_email = "'" + user_email
                
            quiz_title = attempt.quiz.title
            if quiz_title and quiz_title[0] in "=+-@":
                quiz_title = "'" + quiz_title
            
            csv_lines.append(
                f"{attempt.id},{user_email},{quiz_title},{attempt.quiz.category},"
                f"{attempt.quiz.type},{attempt.score},{attempt.total_questions},"
                f"{attempt.percentage},{attempt.passed},{attempt.submitted_at.isoformat()}"
            )
        
        return "\n".join(csv_lines)

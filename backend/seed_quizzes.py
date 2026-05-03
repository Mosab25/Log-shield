#!/usr/bin/env python3
"""
Script to seed quiz data for Security Awareness module
"""

import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.quiz import Quiz, QuizQuestion
from app.utils.quiz_seed_simple import QUIZ_SEED_DATA
from sqlalchemy.orm import Session

def seed_quizzes():
    """Seed quiz data into the database"""
    db = SessionLocal()
    try:
        print("Starting quiz data seeding...")
        
        # Check if quizzes already exist
        existing_count = db.query(Quiz).count()
        if existing_count > 0:
            print(f"Found {existing_count} existing quizzes. Skipping seeding.")
            return
        
        # Create quizzes and questions
        for quiz_data in QUIZ_SEED_DATA:
            # Create quiz
            quiz = Quiz(
                slug=quiz_data["slug"],
                title=quiz_data["title"],
                description=quiz_data["description"],
                category=quiz_data["category"],
                type=quiz_data["type"],
                difficulty=quiz_data["difficulty"],
                estimated_minutes=quiz_data["estimated_minutes"],
                pass_percentage=quiz_data["pass_percentage"],
                is_active=quiz_data["is_active"]
            )
            db.add(quiz)
            db.flush()  # Get the quiz ID
            
            # Create questions
            for question_data in quiz_data["questions"]:
                question = QuizQuestion(
                    quiz_id=quiz.id,
                    question_text=question_data["question_text"],
                    options=question_data["options"],
                    correct_option_index=question_data["correct_option_index"],
                    explanation=question_data["explanation"],
                    difficulty=question_data.get("difficulty"),
                    topic=question_data.get("topic")
                )
                db.add(question)
            
            print(f"Created quiz: {quiz.title} with {len(quiz_data['questions'])} questions")
        
        # Commit all changes
        db.commit()
        print(f"Successfully seeded {len(QUIZ_SEED_DATA)} quizzes!")
        
        # Verify seeding
        total_quizzes = db.query(Quiz).count()
        total_questions = db.query(QuizQuestion).count()
        print(f"Database now contains {total_quizzes} quizzes and {total_questions} questions")
        
    except Exception as e:
        print(f"Error seeding quizzes: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_quizzes()

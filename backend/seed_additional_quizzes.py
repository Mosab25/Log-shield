#!/usr/bin/env python3
"""
Script to seed additional quiz data for Security Awareness Module
"""

import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.quiz import Quiz, QuizQuestion
from app.utils.quiz_seed_additional import ADDITIONAL_QUIZ_DATA
from sqlalchemy.orm import Session

def seed_additional_quizzes():
    """Seed additional quiz data into the database"""
    db = SessionLocal()
    try:
        print("Starting additional quiz data seeding...")
        
        # Check existing quizzes
        existing_count = db.query(Quiz).count()
        print(f"Found {existing_count} existing quizzes")
        
        # Create additional quizzes and questions
        for quiz_data in ADDITIONAL_QUIZ_DATA:
            # Check if quiz already exists
            existing_quiz = db.query(Quiz).filter(Quiz.slug == quiz_data["slug"]).first()
            if existing_quiz:
                print(f"Quiz '{quiz_data['title']}' already exists. Skipping.")
                continue
            
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
        print(f"Successfully seeded {len(ADDITIONAL_QUIZ_DATA)} additional quizzes!")
        
        # Verify seeding
        total_quizzes = db.query(Quiz).count()
        total_questions = db.query(QuizQuestion).count()
        print(f"Database now contains {total_quizzes} quizzes and {total_questions} questions")
        
    except Exception as e:
        print(f"Error seeding additional quizzes: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_additional_quizzes()

"""Add quiz models for security awareness module

Revision ID: 2024_05_03_120000
Revises: 16eac868be71
Create Date: 2026-05-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2024_05_03_120000"
down_revision: Union[str, None] = "16eac868be71"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create quizzes table
    op.create_table(
        "quizzes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("difficulty", sa.String(length=20), nullable=False, server_default="beginner"),
        sa.Column("question_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("estimated_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("pass_percentage", sa.Integer(), nullable=False, server_default="70"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug")
    )
    op.create_index(op.f("ix_quizzes_category_active"), "quizzes", ["category", "is_active"], unique=False)
    op.create_index(op.f("ix_quizzes_difficulty_active"), "quizzes", ["difficulty", "is_active"], unique=False)
    op.create_index(op.f("ix_quizzes_id"), "quizzes", ["id"], unique=False)
    op.create_index(op.f("ix_quizzes_is_active"), "quizzes", ["is_active"], unique=False)
    op.create_index(op.f("ix_quizzes_type_active"), "quizzes", ["type", "is_active"], unique=False)

    # Create quiz_questions table
    op.create_table(
        "quiz_questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quiz_id", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("correct_option_index", sa.Integer(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("difficulty", sa.String(length=20), nullable=True),
        sa.Column("topic", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["quiz_id"], ["quizzes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_quiz_questions_id"), "quiz_questions", ["id"], unique=False)
    op.create_index(op.f("ix_quiz_questions_quiz_id"), "quiz_questions", ["quiz_id"], unique=False)
    op.create_index(op.f("ix_quiz_questions_quiz_topic"), "quiz_questions", ["quiz_id", "topic"], unique=False)
    op.create_index(op.f("ix_quiz_questions_topic"), "quiz_questions", ["topic"], unique=False)

    # Create quiz_attempts table
    op.create_table(
        "quiz_attempts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("quiz_id", sa.Integer(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=False),
        sa.Column("percentage", sa.Integer(), nullable=False),
        sa.Column("passed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["quiz_id"], ["quizzes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_quiz_attempts_id"), "quiz_attempts", ["id"], unique=False)
    op.create_index(op.f("ix_quiz_attempts_passed"), "quiz_attempts", ["passed"], unique=False)
    op.create_index(op.f("ix_quiz_attempts_quiz_id"), "quiz_attempts", ["quiz_id"], unique=False)
    op.create_index(op.f("ix_quiz_attempts_submitted"), "quiz_attempts", ["submitted_at"], unique=False)
    op.create_index(op.f("ix_quiz_attempts_user_passed"), "quiz_attempts", ["user_id", "passed"], unique=False)
    op.create_index(op.f("ix_quiz_attempts_user_quiz"), "quiz_attempts", ["user_id", "quiz_id"], unique=False)
    op.create_index(op.f("ix_quiz_attempts_user_id"), "quiz_attempts", ["user_id"], unique=False)

    # Create quiz_answers table
    op.create_table(
        "quiz_answers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("attempt_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("selected_option_index", sa.Integer(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False, server_default="false"),
        sa.ForeignKeyConstraint(["attempt_id"], ["quiz_attempts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["quiz_questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_quiz_answers_attempt_id"), "quiz_answers", ["attempt_id"], unique=False)
    op.create_index(op.f("ix_quiz_answers_attempt_question"), "quiz_answers", ["attempt_id", "question_id"], unique=False)
    op.create_index(op.f("ix_quiz_answers_id"), "quiz_answers", ["id"], unique=False)
    op.create_index(op.f("ix_quiz_answers_question_id"), "quiz_answers", ["question_id"], unique=False)


def downgrade() -> None:
    # Drop quiz_answers table
    op.drop_index(op.f("ix_quiz_answers_question_id"), table_name="quiz_answers")
    op.drop_index(op.f("ix_quiz_answers_attempt_question"), table_name="quiz_answers")
    op.drop_index(op.f("ix_quiz_answers_attempt_id"), table_name="quiz_answers")
    op.drop_index(op.f("ix_quiz_answers_id"), table_name="quiz_answers")
    op.drop_table("quiz_answers")

    # Drop quiz_attempts table
    op.drop_index(op.f("ix_quiz_attempts_user_id"), table_name="quiz_attempts")
    op.drop_index(op.f("ix_quiz_attempts_user_quiz"), table_name="quiz_attempts")
    op.drop_index(op.f("ix_quiz_attempts_user_passed"), table_name="quiz_attempts")
    op.drop_index(op.f("ix_quiz_attempts_submitted"), table_name="quiz_attempts")
    op.drop_index(op.f("ix_quiz_attempts_quiz_id"), table_name="quiz_attempts")
    op.drop_index(op.f("ix_quiz_attempts_passed"), table_name="quiz_attempts")
    op.drop_index(op.f("ix_quiz_attempts_id"), table_name="quiz_attempts")
    op.drop_table("quiz_attempts")

    # Drop quiz_questions table
    op.drop_index(op.f("ix_quiz_questions_topic"), table_name="quiz_questions")
    op.drop_index(op.f("ix_quiz_questions_quiz_topic"), table_name="quiz_questions")
    op.drop_index(op.f("ix_quiz_questions_quiz_id"), table_name="quiz_questions")
    op.drop_index(op.f("ix_quiz_questions_id"), table_name="quiz_questions")
    op.drop_table("quiz_questions")

    # Drop quizzes table
    op.drop_index(op.f("ix_quizzes_type_active"), table_name="quizzes")
    op.drop_index(op.f("ix_quizzes_is_active"), table_name="quizzes")
    op.drop_index(op.f("ix_quizzes_id"), table_name="quizzes")
    op.drop_index(op.f("ix_quizzes_difficulty_active"), table_name="quizzes")
    op.drop_index(op.f("ix_quizzes_category_active"), table_name="quizzes")
    op.drop_table("quizzes")

"""Create url_scan_results table

Revision ID: 002_url_scan_results
Revises: 0007
Create Date: 2026-05-01 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "002_url_scan_results"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create url_scan_results table
    op.create_table(
        "url_scan_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("submitted_url", sa.String(length=2048), nullable=False),
        sa.Column("normalized_url", sa.String(length=2048), nullable=False),
        sa.Column("url_hash", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("malicious_count", sa.Integer(), nullable=False),
        sa.Column("suspicious_count", sa.Integer(), nullable=False),
        sa.Column("harmless_count", sa.Integer(), nullable=False),
        sa.Column("undetected_count", sa.Integer(), nullable=False),
        sa.Column("categories", sa.String(length=500), nullable=True),
        sa.Column("provider_reference", sa.String(length=200), nullable=True),
        sa.Column("raw_summary", sa.String(length=2000), nullable=True),
        sa.Column("last_analysis_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["submitted_by_user_id"], ["users.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    
    # Create indexes
    op.create_index("ix_url_scan_results_id", "url_scan_results", ["id"], unique=False)
    op.create_index("ix_url_scan_results_submitted_url", "url_scan_results", ["submitted_url"], unique=False)
    op.create_index("ix_url_scan_results_normalized_url", "url_scan_results", ["normalized_url"], unique=False)
    op.create_index("ix_url_scan_results_url_hash", "url_scan_results", ["url_hash"], unique=False)
    op.create_index("ix_url_scan_results_status", "url_scan_results", ["status"], unique=False)
    op.create_index("ix_url_scan_results_provider", "url_scan_results", ["provider"], unique=False)
    op.create_index("ix_url_scan_results_created_at", "url_scan_results", ["created_at"], unique=False)
    op.create_index("ix_url_scan_results_submitted_by_user_id", "url_scan_results", ["submitted_by_user_id"], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_url_scan_results_submitted_by_user_id", table_name="url_scan_results")
    op.drop_index("ix_url_scan_results_created_at", table_name="url_scan_results")
    op.drop_index("ix_url_scan_results_provider", table_name="url_scan_results")
    op.drop_index("ix_url_scan_results_status", table_name="url_scan_results")
    op.drop_index("ix_url_scan_results_url_hash", table_name="url_scan_results")
    op.drop_index("ix_url_scan_results_normalized_url", table_name="url_scan_results")
    op.drop_index("ix_url_scan_results_submitted_url", table_name="url_scan_results")
    op.drop_index("ix_url_scan_results_id", table_name="url_scan_results")
    
    # Drop table
    op.drop_table("url_scan_results")

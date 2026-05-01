"""add_admin_otp_challenges

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if _table_exists("admin_otp_challenges"):
        return

    op.create_table(
        "admin_otp_challenges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("challenge_id", sa.String(length=120), nullable=False),
        sa.Column("otp_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("max_attempts", sa.Integer(), server_default="5", nullable=False),
        sa.Column("ip_address", sa.String(length=80), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("challenge_id"),
    )
    op.create_index(op.f("ix_admin_otp_challenges_id"), "admin_otp_challenges", ["id"], unique=False)
    op.create_index(op.f("ix_admin_otp_challenges_user_id"), "admin_otp_challenges", ["user_id"], unique=False)
    op.create_index(op.f("ix_admin_otp_challenges_challenge_id"), "admin_otp_challenges", ["challenge_id"], unique=False)
    op.create_index(op.f("ix_admin_otp_challenges_expires_at"), "admin_otp_challenges", ["expires_at"], unique=False)


def downgrade() -> None:
    if _table_exists("admin_otp_challenges"):
        op.drop_table("admin_otp_challenges")

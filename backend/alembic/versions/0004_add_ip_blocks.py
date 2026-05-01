"""add_ip_blocks

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if _table_exists("ip_blocks"):
        return

    op.create_table(
        "ip_blocks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ip_address", sa.String(length=80), nullable=False),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column("blocked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("unblocked_by_id", sa.Integer(), nullable=True),
        sa.Column("unblocked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["unblocked_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ip_blocks_id"), "ip_blocks", ["id"], unique=False)
    op.create_index(op.f("ix_ip_blocks_ip_address"), "ip_blocks", ["ip_address"], unique=False)
    op.create_index(op.f("ix_ip_blocks_blocked_until"), "ip_blocks", ["blocked_until"], unique=False)
    op.create_index(op.f("ix_ip_blocks_is_active"), "ip_blocks", ["is_active"], unique=False)
    op.create_index(op.f("ix_ip_blocks_created_by_id"), "ip_blocks", ["created_by_id"], unique=False)
    op.create_index(op.f("ix_ip_blocks_unblocked_by_id"), "ip_blocks", ["unblocked_by_id"], unique=False)


def downgrade() -> None:
    if _table_exists("ip_blocks"):
        op.drop_table("ip_blocks")

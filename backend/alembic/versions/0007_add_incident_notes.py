"""add_incident_notes

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if _table_exists("incident_notes"):
        return

    op.create_table(
        "incident_notes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("incident_id", sa.Integer(), nullable=False),
        sa.Column("author_user_id", sa.Integer(), nullable=True),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_incident_notes_id"), "incident_notes", ["id"], unique=False)
    op.create_index(op.f("ix_incident_notes_incident_id"), "incident_notes", ["incident_id"], unique=False)
    op.create_index(op.f("ix_incident_notes_author_user_id"), "incident_notes", ["author_user_id"], unique=False)
    op.create_index(op.f("ix_incident_notes_created_at"), "incident_notes", ["created_at"], unique=False)


def downgrade() -> None:
    if _table_exists("incident_notes"):
        op.drop_table("incident_notes")

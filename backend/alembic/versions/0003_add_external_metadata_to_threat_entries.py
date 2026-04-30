"""add_external_metadata_to_threat_entries

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-30
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = inspector.get_columns(table_name)
    return any(column["name"] == column_name for column in columns)


def upgrade() -> None:
    if not _column_exists("threat_entries", "external_published_at"):
        op.add_column(
            "threat_entries",
            sa.Column("external_published_at", sa.DateTime(timezone=True), nullable=True),
        )

    if not _column_exists("threat_entries", "external_last_modified_at"):
        op.add_column(
            "threat_entries",
            sa.Column("external_last_modified_at", sa.DateTime(timezone=True), nullable=True),
        )

    if not _column_exists("threat_entries", "external_source_url"):
        op.add_column(
            "threat_entries",
            sa.Column("external_source_url", sa.String(length=1024), nullable=True),
        )

    if not _column_exists("threat_entries", "external_metadata"):
        op.add_column(
            "threat_entries",
            sa.Column("external_metadata", sa.JSON(), nullable=True),
        )


def downgrade() -> None:
    if _column_exists("threat_entries", "external_metadata"):
        op.drop_column("threat_entries", "external_metadata")

    if _column_exists("threat_entries", "external_source_url"):
        op.drop_column("threat_entries", "external_source_url")

    if _column_exists("threat_entries", "external_last_modified_at"):
        op.drop_column("threat_entries", "external_last_modified_at")

    if _column_exists("threat_entries", "external_published_at"):
        op.drop_column("threat_entries", "external_published_at")
"""add_external_metadata_to_threat_entries

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-30 18:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('threat_entries', sa.Column('external_published_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('threat_entries', sa.Column('external_last_modified_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_threat_entries_external_published_at'), 'threat_entries', ['external_published_at'], unique=False)
    op.create_index(op.f('ix_threat_entries_external_last_modified_at'), 'threat_entries', ['external_last_modified_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_threat_entries_external_last_modified_at'), table_name='threat_entries')
    op.drop_index(op.f('ix_threat_entries_external_published_at'), table_name='threat_entries')
    op.drop_column('threat_entries', 'external_last_modified_at')
    op.drop_column('threat_entries', 'external_published_at')

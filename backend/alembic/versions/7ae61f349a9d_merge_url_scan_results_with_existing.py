"""merge url_scan_results with existing

Revision ID: 7ae61f349a9d
Revises: 002_url_scan_results, 16eac868be71
Create Date: 2026-05-01 20:52:46.882169

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7ae61f349a9d'
down_revision = ('002_url_scan_results', '16eac868be71')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

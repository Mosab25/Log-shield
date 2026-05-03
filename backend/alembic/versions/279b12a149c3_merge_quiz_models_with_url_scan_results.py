"""merge quiz models with url scan results

Revision ID: 279b12a149c3
Revises: 2024_05_03_120000, 7ae61f349a9d
Create Date: 2026-05-03 05:33:50.467536

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '279b12a149c3'
down_revision = ('2024_05_03_120000', '7ae61f349a9d')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

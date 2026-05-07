"""alert detection explanation and containment flag

Revision ID: 2026_05_07_140000
Revises: 2026_05_04_130000
Create Date: 2026-05-07

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "2026_05_07_140000"
down_revision: Union[str, Sequence[str], None] = "2026_05_04_130000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("alerts", sa.Column("detection_explanation", sa.Text(), nullable=True))
    op.add_column(
        "alerts",
        sa.Column("contained", sa.Boolean(), server_default="false", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("alerts", "contained")
    op.drop_column("alerts", "detection_explanation")

"""threat intelligence knowledge base

Revision ID: 0002_threat_intelligence
Revises: 0001_initial_schema
Create Date: 2026-04-30
"""

from typing import Sequence, Union

from alembic import op

from app.db.base import Base
import app.models  # noqa: F401 – ensure all models are registered on Base.metadata

revision: str = "0002"
down_revision: Union[str, Sequence[str], None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    # Only create the new threat intelligence tables
    from app.models.threat_entry import ThreatEntry
    from app.models.threat_indicator import ThreatIndicator
    from app.models.threat_tag import ThreatTag
    from app.models.threat_entry_tag import ThreatEntryTag
    from app.models.threat_reference import ThreatReference
    from app.models.threat_review import ThreatReview
    from app.models.alert_threat_link import AlertThreatLink

    tables = [
        ThreatEntry.__table__,
        ThreatIndicator.__table__,
        ThreatTag.__table__,
        ThreatEntryTag.__table__,
        ThreatReference.__table__,
        ThreatReview.__table__,
        AlertThreatLink.__table__,
    ]
    Base.metadata.create_all(bind, tables=[t for t in tables])


def downgrade() -> None:
    bind = op.get_bind()
    from app.models.alert_threat_link import AlertThreatLink
    from app.models.threat_review import ThreatReview
    from app.models.threat_reference import ThreatReference
    from app.models.threat_entry_tag import ThreatEntryTag
    from app.models.threat_tag import ThreatTag
    from app.models.threat_indicator import ThreatIndicator
    from app.models.threat_entry import ThreatEntry

    tables = [
        AlertThreatLink.__table__,
        ThreatReview.__table__,
        ThreatReference.__table__,
        ThreatEntryTag.__table__,
        ThreatTag.__table__,
        ThreatIndicator.__table__,
        ThreatEntry.__table__,
    ]
    Base.metadata.drop_all(bind, tables=[t for t in tables])

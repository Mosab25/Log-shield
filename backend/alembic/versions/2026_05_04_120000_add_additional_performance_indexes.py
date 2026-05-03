"""Add additional performance indexes for critical queries

Revision ID: 2026_05_04_120000
Revises: 16eac868be71
Create Date: 2026-05-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2026_05_04_120000'
down_revision = '16eac868be71'
branch_labels = None
depends_on = None


def _create_index_if_not_exists(index_name: str, table_name: str, columns: str) -> None:
    op.execute(f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({columns})")


def _drop_index_if_exists(index_name: str) -> None:
    op.execute(f"DROP INDEX IF EXISTS {index_name}")


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    # Additional indexes for logs table
    _create_index_if_not_exists("ix_raw_logs_received_at", "raw_logs", "received_at")
    _create_index_if_not_exists("ix_raw_logs_source_received", "raw_logs", "source, received_at")
    _create_index_if_not_exists("ix_raw_logs_ip_received", "raw_logs", "ip_address, received_at")

    # Additional indexes for alerts table
    _create_index_if_not_exists("ix_alerts_created_at", "alerts", "created_at")
    _create_index_if_not_exists("ix_alerts_status_created", "alerts", "status, created_at")
    _create_index_if_not_exists("ix_alerts_source_ip", "alerts", "normalized_log_id")

    # Indexes for audit logs table
    _create_index_if_not_exists("ix_audit_logs_created_at", "audit_logs", "created_at")
    _create_index_if_not_exists("ix_audit_logs_action_created", "audit_logs", "action, created_at")
    _create_index_if_not_exists("ix_audit_logs_actor_created", "audit_logs", "actor_user_id, created_at")
    _create_index_if_not_exists("ix_audit_logs_entity_created", "audit_logs", "entity_type, created_at")

    # Indexes for url scan results
    if _table_exists("url_scan_results"):
        _create_index_if_not_exists("ix_url_scan_results_created_at", "url_scan_results", "created_at")
        _create_index_if_not_exists("ix_url_scan_results_status_created", "url_scan_results", "status, created_at")

    # Indexes for awareness attempts
    if _table_exists("awareness_attempts"):
        _create_index_if_not_exists("ix_awareness_attempts_user_quiz", "awareness_attempts", "user_id, quiz_id")
        _create_index_if_not_exists("ix_awareness_attempts_submitted", "awareness_attempts", "submitted_at")
        _create_index_if_not_exists("ix_awareness_attempts_passed", "awareness_attempts", "passed, submitted_at")

    # Indexes for IOCs table (if exists)
    if _table_exists("iocs"):
        _create_index_if_not_exists("ix_iocs_type_status", "iocs", "type, status")
        _create_index_if_not_exists("ix_iocs_reputation", "iocs", "reputation")
        _create_index_if_not_exists("ix_iocs_last_seen", "iocs", "last_seen")


def downgrade() -> None:
    # Drop additional indexes for logs table
    _drop_index_if_exists("ix_raw_logs_received_at")
    _drop_index_if_exists("ix_raw_logs_source_received")
    _drop_index_if_exists("ix_raw_logs_ip_received")

    # Drop additional indexes for alerts table
    _drop_index_if_exists("ix_alerts_created_at")
    _drop_index_if_exists("ix_alerts_status_created")
    _drop_index_if_exists("ix_alerts_source_ip")

    # Drop indexes for audit logs table
    _drop_index_if_exists("ix_audit_logs_created_at")
    _drop_index_if_exists("ix_audit_logs_action_created")
    _drop_index_if_exists("ix_audit_logs_actor_created")
    _drop_index_if_exists("ix_audit_logs_entity_created")

    # Drop indexes for url scan results
    if _table_exists("url_scan_results"):
        _drop_index_if_exists("ix_url_scan_results_created_at")
        _drop_index_if_exists("ix_url_scan_results_status_created")

    # Drop indexes for awareness attempts
    if _table_exists("awareness_attempts"):
        _drop_index_if_exists("ix_awareness_attempts_user_quiz")
        _drop_index_if_exists("ix_awareness_attempts_submitted")
        _drop_index_if_exists("ix_awareness_attempts_passed")

    # Drop indexes for IOCs table
    if _table_exists("iocs"):
        _drop_index_if_exists("ix_iocs_type_status")
        _drop_index_if_exists("ix_iocs_reputation")
        _drop_index_if_exists("ix_iocs_last_seen")

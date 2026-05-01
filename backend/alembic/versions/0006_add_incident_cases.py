"""add_incident_cases

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if not _table_exists("incidents"):
        op.create_table(
            "incidents",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("severity", sa.String(length=30), nullable=False),
            sa.Column("status", sa.String(length=40), server_default="open", nullable=False),
            sa.Column("owner_user_id", sa.Integer(), nullable=True),
            sa.Column("created_by_user_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_incidents_id"), "incidents", ["id"], unique=False)
        op.create_index(op.f("ix_incidents_severity"), "incidents", ["severity"], unique=False)
        op.create_index(op.f("ix_incidents_status"), "incidents", ["status"], unique=False)
        op.create_index(op.f("ix_incidents_owner_user_id"), "incidents", ["owner_user_id"], unique=False)
        op.create_index(op.f("ix_incidents_created_by_user_id"), "incidents", ["created_by_user_id"], unique=False)
        op.create_index(op.f("ix_incidents_created_at"), "incidents", ["created_at"], unique=False)
        op.create_index(op.f("ix_incidents_updated_at"), "incidents", ["updated_at"], unique=False)
        op.create_index("ix_incidents_status_severity", "incidents", ["status", "severity"], unique=False)

    if not _table_exists("incident_alerts"):
        op.create_table(
            "incident_alerts",
            sa.Column("incident_id", sa.Integer(), nullable=False),
            sa.Column("alert_id", sa.Integer(), nullable=False),
            sa.Column("linked_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("linked_by_user_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["alert_id"], ["alerts.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["linked_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("incident_id", "alert_id"),
        )
        op.create_index(op.f("ix_incident_alerts_linked_by_user_id"), "incident_alerts", ["linked_by_user_id"], unique=False)
        op.create_index(op.f("ix_incident_alerts_alert_id"), "incident_alerts", ["alert_id"], unique=False)

    if not _table_exists("incident_timeline"):
        op.create_table(
            "incident_timeline",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("incident_id", sa.Integer(), nullable=False),
            sa.Column("event_type", sa.String(length=80), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("actor_user_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_incident_timeline_id"), "incident_timeline", ["id"], unique=False)
        op.create_index(op.f("ix_incident_timeline_incident_id"), "incident_timeline", ["incident_id"], unique=False)
        op.create_index(op.f("ix_incident_timeline_event_type"), "incident_timeline", ["event_type"], unique=False)
        op.create_index(op.f("ix_incident_timeline_actor_user_id"), "incident_timeline", ["actor_user_id"], unique=False)
        op.create_index(op.f("ix_incident_timeline_created_at"), "incident_timeline", ["created_at"], unique=False)

    if not _table_exists("incident_evidence"):
        op.create_table(
            "incident_evidence",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("incident_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("evidence_type", sa.String(length=40), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("related_log_id", sa.Integer(), nullable=True),
            sa.Column("related_alert_id", sa.Integer(), nullable=True),
            sa.Column("added_by_user_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["related_log_id"], ["normalized_logs.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["related_alert_id"], ["alerts.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["added_by_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_incident_evidence_id"), "incident_evidence", ["id"], unique=False)
        op.create_index(op.f("ix_incident_evidence_incident_id"), "incident_evidence", ["incident_id"], unique=False)
        op.create_index(op.f("ix_incident_evidence_evidence_type"), "incident_evidence", ["evidence_type"], unique=False)
        op.create_index(op.f("ix_incident_evidence_related_log_id"), "incident_evidence", ["related_log_id"], unique=False)
        op.create_index(op.f("ix_incident_evidence_related_alert_id"), "incident_evidence", ["related_alert_id"], unique=False)
        op.create_index(op.f("ix_incident_evidence_added_by_user_id"), "incident_evidence", ["added_by_user_id"], unique=False)
        op.create_index(op.f("ix_incident_evidence_created_at"), "incident_evidence", ["created_at"], unique=False)


def downgrade() -> None:
    if _table_exists("incident_evidence"):
        op.drop_table("incident_evidence")
    if _table_exists("incident_timeline"):
        op.drop_table("incident_timeline")
    if _table_exists("incident_alerts"):
        op.drop_table("incident_alerts")
    if _table_exists("incidents"):
        op.drop_table("incidents")

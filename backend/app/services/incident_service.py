from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.alert import Alert
from app.models.incident import Incident
from app.models.incident_alert import IncidentAlert
from app.models.incident_evidence import IncidentEvidence
from app.models.incident_note import IncidentNote
from app.models.incident_timeline import IncidentTimeline
from app.models.normalized_log import NormalizedLog
from app.models.user import User
from app.schemas.incidents import IncidentCreate, IncidentEvidenceCreate, IncidentNoteCreate, IncidentUpdate
from app.services.audit_service import AuditService
from app.services.risk_scoring_service import RiskScoringService


class IncidentService:
    OWNER_ROLES = {"admin", "analyst"}

    @staticmethod
    def _now_utc() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _user_mini(user: User | None) -> dict | None:
        if not user:
            return None
        return {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role_name": user.role.name if user.role else None,
        }

    @classmethod
    def _require_owner_candidate(cls, db: Session, owner_user_id: int) -> User:
        owner = db.get(User, owner_user_id)
        if owner is None or not owner.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner user was not found.")
        role_name = owner.role.name if owner.role else None
        if role_name not in cls.OWNER_ROLES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner must be an admin or analyst.")
        return owner

    @staticmethod
    def _get_incident_or_404(db: Session, incident_id: int) -> Incident:
        incident = db.get(Incident, incident_id)
        if incident is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident was not found.")
        return incident

    @classmethod
    def _apply_status_timestamps(cls, incident: Incident, *, new_status: str) -> None:
        now = cls._now_utc()
        if new_status in {"resolved", "false_positive"}:
            incident.resolved_at = incident.resolved_at or now
        elif new_status in {"open", "investigating"}:
            incident.resolved_at = None

        if new_status == "closed":
            incident.closed_at = incident.closed_at or now
        else:
            incident.closed_at = None

    @staticmethod
    def _add_timeline_event(
        *,
        db: Session,
        incident_id: int,
        event_type: str,
        message: str,
        actor_user_id: int | None,
        metadata: dict | None = None,
    ) -> IncidentTimeline:
        event = IncidentTimeline(
            incident_id=incident_id,
            event_type=event_type,
            message=message,
            actor_user_id=actor_user_id,
            event_metadata=metadata or None,
        )
        db.add(event)
        return event

    @classmethod
    def _timeline_response(cls, event: IncidentTimeline) -> dict:
        return {
            "id": event.id,
            "incident_id": event.incident_id,
            "event_type": event.event_type,
            "message": event.message,
            "actor": cls._user_mini(event.actor),
            "created_at": event.created_at,
            "metadata": event.event_metadata,
        }

    @classmethod
    def _evidence_response(cls, evidence: IncidentEvidence) -> dict:
        return {
            "id": evidence.id,
            "incident_id": evidence.incident_id,
            "title": evidence.title,
            "evidence_type": evidence.evidence_type,
            "content": evidence.content,
            "related_log_id": evidence.related_log_id,
            "related_alert_id": evidence.related_alert_id,
            "added_by": cls._user_mini(evidence.added_by),
            "created_at": evidence.created_at,
        }

    @classmethod
    def _note_response(cls, note: IncidentNote) -> dict:
        return {
            "id": note.id,
            "incident_id": note.incident_id,
            "author": cls._user_mini(note.author),
            "note": note.note,
            "created_at": note.created_at,
            "updated_at": note.updated_at,
        }

    @classmethod
    def _linked_alert_response(cls, link: IncidentAlert) -> dict:
        alert = link.alert
        normalized_log = alert.normalized_log if alert else None
        source_ip = normalized_log.src_ip if normalized_log else None
        username = normalized_log.username if normalized_log else None
        return {
            "id": alert.id if alert else 0,
            "title": alert.title if alert else "Unknown alert",
            "severity": alert.severity if alert else "unknown",
            "status": alert.status if alert else "unknown",
            "risk_score": alert.risk_score if alert else 0,
            "source_ip": source_ip,
            "username": username,
            "linked_at": link.linked_at,
            "linked_by": cls._user_mini(link.linked_by),
        }

    @classmethod
    def _list_item_response(cls, incident: Incident, linked_alerts_count: int) -> dict:
        return {
            "id": incident.id,
            "title": incident.title,
            "description": incident.description,
            "severity": incident.severity,
            "status": incident.status,
            "owner": cls._user_mini(incident.owner),
            "created_by": cls._user_mini(incident.created_by),
            "linked_alerts_count": linked_alerts_count,
            "created_at": incident.created_at,
            "updated_at": incident.updated_at,
            "resolved_at": incident.resolved_at,
            "closed_at": incident.closed_at,
        }

    @classmethod
    def _recalculate_incident_severity_from_alerts(cls, *, db: Session, incident: Incident, actor_user_id: int | None = None) -> None:
        linked = db.execute(
            select(Alert.severity, Alert.risk_score)
            .join(IncidentAlert, IncidentAlert.alert_id == Alert.id)
            .where(IncidentAlert.incident_id == incident.id)
        ).all()
        if not linked:
            return
        max_alert_severity = RiskScoringService.max_severity(*[str(severity) for severity, _ in linked])
        max_alert_risk = max(int(risk or 0) for _, risk in linked)

        new_severity = max_alert_severity
        if new_severity == "high" and len([1 for severity, _ in linked if str(severity).lower() in {"high", "critical"}]) >= 2:
            new_severity = "critical"

        if RiskScoringService.SEVERITY_ORDER.get(new_severity, 0) > RiskScoringService.SEVERITY_ORDER.get(incident.severity, 0):
            old_severity = incident.severity
            incident.severity = new_severity
            cls._add_timeline_event(
                db=db,
                incident_id=incident.id,
                event_type="severity_inherited",
                message=f"Incident severity updated from {old_severity} to {new_severity} based on linked alert risk context.",
                actor_user_id=actor_user_id,
                metadata={"old_severity": old_severity, "new_severity": new_severity, "max_alert_risk": max_alert_risk},
            )

    @classmethod
    def list_incidents(
        cls,
        *,
        db: Session,
        skip: int,
        limit: int,
        status_filter: str | None,
        severity: str | None,
        owner_user_id: int | None,
        search: str | None,
        alert_id: int | None = None,
    ) -> tuple[int, list[dict]]:
        query = select(Incident).options(
            joinedload(Incident.owner).joinedload(User.role),
            joinedload(Incident.created_by).joinedload(User.role),
        )
        count_query = select(func.count(Incident.id))
        if alert_id is not None:
            query = query.join(IncidentAlert, IncidentAlert.incident_id == Incident.id).where(IncidentAlert.alert_id == alert_id)
            count_query = count_query.join(IncidentAlert, IncidentAlert.incident_id == Incident.id).where(IncidentAlert.alert_id == alert_id)
        if status_filter:
            query = query.where(Incident.status == status_filter)
            count_query = count_query.where(Incident.status == status_filter)
        if severity:
            query = query.where(Incident.severity == severity)
            count_query = count_query.where(Incident.severity == severity)
        if owner_user_id is not None:
            query = query.where(Incident.owner_user_id == owner_user_id)
            count_query = count_query.where(Incident.owner_user_id == owner_user_id)
        if search and search.strip():
            term = f"%{search.strip()}%"
            condition = or_(Incident.title.ilike(term), Incident.description.ilike(term))
            query = query.where(condition)
            count_query = count_query.where(condition)

        total = db.execute(count_query).scalar_one()
        incidents = db.execute(query.order_by(Incident.updated_at.desc(), Incident.id.desc()).offset(skip).limit(limit)).scalars().all()
        if not incidents:
            return total, []

        incident_ids = [incident.id for incident in incidents]
        link_counts = db.execute(
            select(IncidentAlert.incident_id, func.count(IncidentAlert.alert_id))
            .where(IncidentAlert.incident_id.in_(incident_ids))
            .group_by(IncidentAlert.incident_id)
        ).all()
        counts_map = {incident_id: int(count) for incident_id, count in link_counts}
        items = [cls._list_item_response(incident, counts_map.get(incident.id, 0)) for incident in incidents]
        return total, items

    @classmethod
    def get_incident_detail(cls, *, db: Session, incident_id: int) -> dict:
        incident = db.execute(
            select(Incident)
            .options(
                joinedload(Incident.owner).joinedload(User.role),
                joinedload(Incident.created_by).joinedload(User.role),
            )
            .where(Incident.id == incident_id)
        ).scalar_one_or_none()
        if incident is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident was not found.")

        links = db.execute(
            select(IncidentAlert)
            .options(
                joinedload(IncidentAlert.alert).joinedload(Alert.normalized_log),
                joinedload(IncidentAlert.linked_by).joinedload(User.role),
            )
            .where(IncidentAlert.incident_id == incident.id)
            .order_by(IncidentAlert.linked_at.asc())
        ).scalars().all()
        linked_alerts = [cls._linked_alert_response(link) for link in links]

        timeline_rows = db.execute(
            select(IncidentTimeline)
            .options(joinedload(IncidentTimeline.actor).joinedload(User.role))
            .where(IncidentTimeline.incident_id == incident.id)
            .order_by(IncidentTimeline.created_at.asc(), IncidentTimeline.id.asc())
        ).scalars().all()
        timeline = [cls._timeline_response(event) for event in timeline_rows]

        evidence_rows = db.execute(
            select(IncidentEvidence)
            .options(joinedload(IncidentEvidence.added_by).joinedload(User.role))
            .where(IncidentEvidence.incident_id == incident.id)
            .order_by(IncidentEvidence.created_at.desc(), IncidentEvidence.id.desc())
        ).scalars().all()
        evidence = [cls._evidence_response(row) for row in evidence_rows]

        note_rows = db.execute(
            select(IncidentNote)
            .options(joinedload(IncidentNote.author).joinedload(User.role))
            .where(IncidentNote.incident_id == incident.id)
            .order_by(IncidentNote.created_at.asc(), IncidentNote.id.asc())
        ).scalars().all()
        notes = [cls._note_response(row) for row in note_rows]

        detail = cls._list_item_response(incident, len(linked_alerts))
        detail["linked_alerts"] = linked_alerts
        detail["timeline"] = timeline
        detail["evidence"] = evidence
        detail["notes"] = notes
        return detail

    @classmethod
    def create_incident(
        cls,
        *,
        db: Session,
        payload: IncidentCreate,
        current_user: User,
        source_ip: str | None,
        user_agent: str | None,
    ) -> dict:
        owner_user_id = payload.owner_user_id
        if owner_user_id is not None:
            cls._require_owner_candidate(db, owner_user_id)

        incident = Incident(
            title=payload.title,
            description=payload.description,
            severity=payload.severity,
            status=payload.status,
            owner_user_id=owner_user_id,
            created_by_user_id=current_user.id,
        )
        cls._apply_status_timestamps(incident, new_status=payload.status)
        db.add(incident)
        db.flush()

        cls._add_timeline_event(
            db=db,
            incident_id=incident.id,
            event_type="incident_created",
            message="Incident case created.",
            actor_user_id=current_user.id,
            metadata={"status": incident.status, "severity": incident.severity},
        )
        if owner_user_id is not None:
            cls._add_timeline_event(
                db=db,
                incident_id=incident.id,
                event_type="owner_changed",
                message=f"Incident owner assigned to user #{owner_user_id}.",
                actor_user_id=current_user.id,
                metadata={"old_owner_user_id": None, "new_owner_user_id": owner_user_id},
            )

        AuditService.create_audit_log(
            db=db,
            actor_user_id=current_user.id,
            action="incident_created",
            entity_type="incident",
            entity_id=str(incident.id),
            ip_address=source_ip,
            user_agent=user_agent,
            details={
                "title": incident.title,
                "status": incident.status,
                "severity": incident.severity,
                "owner_user_id": incident.owner_user_id,
            },
        )
        db.commit()
        return cls.get_incident_detail(db=db, incident_id=incident.id)

    @classmethod
    def update_incident(
        cls,
        *,
        db: Session,
        incident_id: int,
        payload: IncidentUpdate,
        current_user: User,
        source_ip: str | None,
        user_agent: str | None,
    ) -> dict:
        incident = cls._get_incident_or_404(db, incident_id)
        data = payload.model_dump(exclude_unset=True)
        if not data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No updates were provided.")

        changed_fields: list[str] = []
        status_transition: tuple[str, str] | None = None
        owner_transition: tuple[int | None, int | None] | None = None

        if "title" in data and data["title"] != incident.title:
            incident.title = data["title"]
            changed_fields.append("title")
        if "description" in data and data["description"] != incident.description:
            incident.description = data["description"]
            changed_fields.append("description")
        if "severity" in data and data["severity"] != incident.severity:
            incident.severity = data["severity"]
            changed_fields.append("severity")
        if "status" in data and data["status"] != incident.status:
            old_status = incident.status
            incident.status = data["status"]
            cls._apply_status_timestamps(incident, new_status=incident.status)
            status_transition = (old_status, incident.status)
            changed_fields.append("status")
        if "owner_user_id" in data:
            new_owner_user_id = data["owner_user_id"]
            if new_owner_user_id is not None:
                cls._require_owner_candidate(db, new_owner_user_id)
            if new_owner_user_id != incident.owner_user_id:
                old_owner_user_id = incident.owner_user_id
                incident.owner_user_id = new_owner_user_id
                owner_transition = (old_owner_user_id, new_owner_user_id)
                changed_fields.append("owner_user_id")

        if not changed_fields:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No incident fields changed.")

        if status_transition is not None:
            old_status, new_status = status_transition
            cls._add_timeline_event(
                db=db,
                incident_id=incident.id,
                event_type="status_changed",
                message=f"Status changed from {old_status} to {new_status}.",
                actor_user_id=current_user.id,
                metadata={"old_status": old_status, "new_status": new_status},
            )
            AuditService.create_audit_log(
                db=db,
                actor_user_id=current_user.id,
                action="incident_status_changed",
                entity_type="incident",
                entity_id=str(incident.id),
                ip_address=source_ip,
                user_agent=user_agent,
                details={"old_status": old_status, "new_status": new_status},
            )

        if owner_transition is not None:
            old_owner, new_owner = owner_transition
            cls._add_timeline_event(
                db=db,
                incident_id=incident.id,
                event_type="owner_changed",
                message=f"Owner changed from {old_owner or 'unassigned'} to {new_owner or 'unassigned'}.",
                actor_user_id=current_user.id,
                metadata={"old_owner_user_id": old_owner, "new_owner_user_id": new_owner},
            )
            AuditService.create_audit_log(
                db=db,
                actor_user_id=current_user.id,
                action="incident_owner_changed",
                entity_type="incident",
                entity_id=str(incident.id),
                ip_address=source_ip,
                user_agent=user_agent,
                details={"old_owner_user_id": old_owner, "new_owner_user_id": new_owner},
            )

        non_transition_fields = [field for field in changed_fields if field not in {"status", "owner_user_id"}]
        if non_transition_fields:
            cls._add_timeline_event(
                db=db,
                incident_id=incident.id,
                event_type="incident_updated",
                message=f"Incident fields updated: {', '.join(non_transition_fields)}.",
                actor_user_id=current_user.id,
                metadata={"changed_fields": non_transition_fields},
            )

        AuditService.create_audit_log(
            db=db,
            actor_user_id=current_user.id,
            action="incident_updated",
            entity_type="incident",
            entity_id=str(incident.id),
            ip_address=source_ip,
            user_agent=user_agent,
            details={"changed_fields": changed_fields},
        )

        db.commit()
        return cls.get_incident_detail(db=db, incident_id=incident.id)

    @classmethod
    def link_alert(
        cls,
        *,
        db: Session,
        incident_id: int,
        alert_id: int,
        current_user: User,
        source_ip: str | None,
        user_agent: str | None,
    ) -> dict:
        cls._get_incident_or_404(db, incident_id)
        alert = db.get(Alert, alert_id)
        if alert is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert was not found.")

        existing = db.get(IncidentAlert, {"incident_id": incident_id, "alert_id": alert_id})
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Alert is already linked to this incident.")

        db.add(IncidentAlert(incident_id=incident_id, alert_id=alert_id, linked_by_user_id=current_user.id))
        incident = cls._get_incident_or_404(db, incident_id)
        cls._recalculate_incident_severity_from_alerts(db=db, incident=incident, actor_user_id=current_user.id)
        cls._add_timeline_event(
            db=db,
            incident_id=incident_id,
            event_type="alert_linked",
            message=f"Alert #{alert_id} linked to incident.",
            actor_user_id=current_user.id,
            metadata={"alert_id": alert_id},
        )
        AuditService.create_audit_log(
            db=db,
            actor_user_id=current_user.id,
            action="incident_alert_linked",
            entity_type="incident",
            entity_id=str(incident_id),
            ip_address=source_ip,
            user_agent=user_agent,
            details={"alert_id": alert_id},
        )
        db.commit()
        return cls.get_incident_detail(db=db, incident_id=incident_id)

    @classmethod
    def unlink_alert(
        cls,
        *,
        db: Session,
        incident_id: int,
        alert_id: int,
        current_user: User,
        source_ip: str | None,
        user_agent: str | None,
    ) -> dict:
        cls._get_incident_or_404(db, incident_id)
        link = db.get(IncidentAlert, {"incident_id": incident_id, "alert_id": alert_id})
        if link is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked alert was not found in this incident.")

        db.delete(link)
        incident = cls._get_incident_or_404(db, incident_id)
        cls._recalculate_incident_severity_from_alerts(db=db, incident=incident, actor_user_id=current_user.id)
        cls._add_timeline_event(
            db=db,
            incident_id=incident_id,
            event_type="alert_unlinked",
            message=f"Alert #{alert_id} removed from incident.",
            actor_user_id=current_user.id,
            metadata={"alert_id": alert_id},
        )
        AuditService.create_audit_log(
            db=db,
            actor_user_id=current_user.id,
            action="incident_alert_unlinked",
            entity_type="incident",
            entity_id=str(incident_id),
            ip_address=source_ip,
            user_agent=user_agent,
            details={"alert_id": alert_id},
        )
        db.commit()
        return cls.get_incident_detail(db=db, incident_id=incident_id)

    @classmethod
    def add_evidence(
        cls,
        *,
        db: Session,
        incident_id: int,
        payload: IncidentEvidenceCreate,
        current_user: User,
        source_ip: str | None,
        user_agent: str | None,
    ) -> dict:
        cls._get_incident_or_404(db, incident_id)
        if payload.related_alert_id is not None and db.get(Alert, payload.related_alert_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Related alert was not found.")
        if payload.related_log_id is not None and db.get(NormalizedLog, payload.related_log_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Related log was not found.")

        evidence = IncidentEvidence(
            incident_id=incident_id,
            title=payload.title,
            evidence_type=payload.evidence_type,
            content=payload.content,
            related_log_id=payload.related_log_id,
            related_alert_id=payload.related_alert_id,
            added_by_user_id=current_user.id,
        )
        db.add(evidence)
        db.flush()

        cls._add_timeline_event(
            db=db,
            incident_id=incident_id,
            event_type="evidence_added",
            message=f"Evidence added: {payload.title}.",
            actor_user_id=current_user.id,
            metadata={"evidence_id": evidence.id, "evidence_type": payload.evidence_type},
        )
        AuditService.create_audit_log(
            db=db,
            actor_user_id=current_user.id,
            action="incident_evidence_added",
            entity_type="incident",
            entity_id=str(incident_id),
            ip_address=source_ip,
            user_agent=user_agent,
            details={
                "evidence_id": evidence.id,
                "evidence_type": evidence.evidence_type,
                "related_alert_id": evidence.related_alert_id,
                "related_log_id": evidence.related_log_id,
            },
        )
        db.commit()
        return cls._evidence_response(
            db.execute(
                select(IncidentEvidence)
                .options(joinedload(IncidentEvidence.added_by).joinedload(User.role))
                .where(IncidentEvidence.id == evidence.id)
            ).scalar_one()
        )

    @classmethod
    def add_note(
        cls,
        *,
        db: Session,
        incident_id: int,
        payload: IncidentNoteCreate,
        current_user: User,
        source_ip: str | None,
        user_agent: str | None,
    ) -> dict:
        cls._get_incident_or_404(db, incident_id)
        note = IncidentNote(
            incident_id=incident_id,
            author_user_id=current_user.id,
            note=payload.note,
        )
        db.add(note)
        db.flush()

        cls._add_timeline_event(
            db=db,
            incident_id=incident_id,
            event_type="note_added",
            message="Investigation note added.",
            actor_user_id=current_user.id,
            metadata={"note_id": note.id},
        )
        AuditService.create_audit_log(
            db=db,
            actor_user_id=current_user.id,
            action="incident_note_added",
            entity_type="incident",
            entity_id=str(incident_id),
            ip_address=source_ip,
            user_agent=user_agent,
            details={"note_id": note.id},
        )
        db.commit()
        return cls._note_response(
            db.execute(
                select(IncidentNote)
                .options(joinedload(IncidentNote.author).joinedload(User.role))
                .where(IncidentNote.id == note.id)
            ).scalar_one()
        )

    @classmethod
    def list_timeline(cls, *, db: Session, incident_id: int) -> list[dict]:
        cls._get_incident_or_404(db, incident_id)
        rows = db.execute(
            select(IncidentTimeline)
            .options(joinedload(IncidentTimeline.actor).joinedload(User.role))
            .where(IncidentTimeline.incident_id == incident_id)
            .order_by(IncidentTimeline.created_at.asc(), IncidentTimeline.id.asc())
        ).scalars().all()
        return [cls._timeline_response(row) for row in rows]

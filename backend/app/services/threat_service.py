from __future__ import annotations

import re
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.alert_threat_link import AlertThreatLink
from app.models.threat_entry import ThreatEntry
from app.models.threat_entry_tag import ThreatEntryTag
from app.models.threat_indicator import ThreatIndicator
from app.models.threat_reference import ThreatReference
from app.models.threat_review import ThreatReview
from app.models.threat_tag import ThreatTag
from app.models.user import User
from app.services.audit_service import AuditService


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:240] or "untitled"


class ThreatService:

    # ── helpers ───────────────────────────────────────────
    @staticmethod
    def user_mini(user: User | None) -> dict | None:
        if not user:
            return None
        return {"id": user.id, "full_name": user.full_name, "email": user.email, "role_name": user.role.name if user.role else None}

    @staticmethod
    def _get_entry(db: Session, entry_id: int) -> ThreatEntry:
        entry = db.get(ThreatEntry, entry_id)
        if not entry:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Threat entry not found.")
        return entry

    @staticmethod
    def _get_tag(db: Session, tag_id: int) -> ThreatTag:
        tag = db.get(ThreatTag, tag_id)
        if not tag:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found.")
        return tag

    # ── tag helpers ──────────────────────────────────────
    @classmethod
    def _ensure_tags(cls, db: Session, tag_names: list[str]) -> list[ThreatTag]:
        tags: list[ThreatTag] = []
        for name in tag_names:
            name = name.strip()
            if not name:
                continue
            existing = db.execute(select(ThreatTag).where(ThreatTag.name == name)).scalar_one_or_none()
            if existing:
                tags.append(existing)
            else:
                tag = ThreatTag(name=name, slug=_slugify(name))
                db.add(tag)
                db.flush()
                tags.append(tag)
        return tags

    # ── list item ────────────────────────────────────────
    @classmethod
    def list_item(cls, db: Session, entry: ThreatEntry) -> dict:
        tag_links = db.execute(select(ThreatEntryTag).where(ThreatEntryTag.threat_entry_id == entry.id)).scalars().all()
        tag_ids = [tl.threat_tag_id for tl in tag_links]
        tags = []
        if tag_ids:
            for t in db.execute(select(ThreatTag).where(ThreatTag.id.in_(tag_ids))).scalars().all():
                tags.append({"id": t.id, "name": t.name, "slug": t.slug, "created_at": t.created_at})
        indicator_count = db.execute(select(func.count(ThreatIndicator.id)).where(ThreatIndicator.threat_entry_id == entry.id)).scalar_one()
        return {
            "id": entry.id,
            "title": entry.title,
            "slug": entry.slug,
            "type": entry.type,
            "category": entry.category,
            "severity": entry.severity,
            "cve_id": entry.cve_id,
            "cvss_score": entry.cvss_score,
            "mitre_tactic": entry.mitre_tactic,
            "mitre_technique": entry.mitre_technique,
            "source": entry.source,
            "status": entry.status,
            "submitted_by": cls.user_mini(entry.submitted_by),
            "reviewed_by": cls.user_mini(entry.reviewed_by),
            "tags": tags,
            "indicator_count": indicator_count,
            "created_at": entry.created_at,
            "updated_at": entry.updated_at,
        }

    # ── detail ───────────────────────────────────────────
    @classmethod
    def detail(cls, db: Session, entry: ThreatEntry) -> dict:
        item = cls.list_item(db, entry)
        item["description"] = entry.description
        item["affected_systems"] = entry.affected_systems
        item["detection_logic"] = entry.detection_logic
        item["mitigation"] = entry.mitigation
        item["review_comment"] = entry.review_comment
        item["approved_at"] = entry.approved_at

        indicators = db.execute(select(ThreatIndicator).where(ThreatIndicator.threat_entry_id == entry.id)).scalars().all()
        item["indicators"] = [{"id": i.id, "threat_entry_id": i.threat_entry_id, "indicator_type": i.indicator_type, "indicator_value": i.indicator_value, "description": i.description, "created_at": i.created_at} for i in indicators]

        references = db.execute(select(ThreatReference).where(ThreatReference.threat_entry_id == entry.id)).scalars().all()
        item["references"] = [{"id": r.id, "threat_entry_id": r.threat_entry_id, "title": r.title, "url": r.url, "source_name": r.source_name, "created_at": r.created_at} for r in references]

        reviews = db.execute(select(ThreatReview).where(ThreatReview.threat_entry_id == entry.id).order_by(ThreatReview.created_at.desc())).scalars().all()
        item["reviews"] = [{"id": rv.id, "threat_entry_id": rv.threat_entry_id, "reviewer": cls.user_mini(rv.reviewer), "decision": rv.decision, "comment": rv.comment, "created_at": rv.created_at} for rv in reviews]

        links = db.execute(select(AlertThreatLink).where(AlertThreatLink.threat_entry_id == entry.id)).scalars().all()
        item["linked_alerts"] = [{"alert_id": l.alert_id, "threat_entry_id": l.threat_entry_id, "confidence": l.confidence, "reason": l.reason, "created_at": l.created_at} for l in links]

        return item

    # ── list ─────────────────────────────────────────────
    @classmethod
    def list_entries(cls, *, db: Session, skip: int, limit: int, type_filter: str | None, severity: str | None, status_filter: str | None, source: str | None, search: str | None) -> tuple[int, list[dict]]:
        query = select(ThreatEntry)
        count_query = select(func.count(ThreatEntry.id))
        filters = []
        if type_filter:
            filters.append(ThreatEntry.type == type_filter)
        if severity:
            filters.append(ThreatEntry.severity == severity)
        if status_filter:
            filters.append(ThreatEntry.status == status_filter)
        if source:
            filters.append(ThreatEntry.source == source)
        if search:
            filters.append(ThreatEntry.title.ilike(f"%{search}%"))
        for f in filters:
            query = query.where(f)
            count_query = count_query.where(f)
        total = db.execute(count_query).scalar_one()
        entries = db.execute(query.order_by(ThreatEntry.created_at.desc()).offset(skip).limit(limit)).scalars().all()
        return total, [cls.list_item(db, e) for e in entries]

    # ── create ───────────────────────────────────────────
    @classmethod
    def create_entry(cls, *, db: Session, payload: dict, current_user: User) -> dict:
        slug = _slugify(payload["title"])
        existing = db.execute(select(ThreatEntry).where(ThreatEntry.slug == slug)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="A threat entry with a similar title already exists.")

        entry = ThreatEntry(
            title=payload["title"],
            slug=slug,
            type=payload["type"],
            category=payload.get("category"),
            severity=payload["severity"],
            description=payload["description"],
            cve_id=payload.get("cve_id"),
            cvss_score=payload.get("cvss_score"),
            mitre_tactic=payload.get("mitre_tactic"),
            mitre_technique=payload.get("mitre_technique"),
            affected_systems=payload.get("affected_systems"),
            detection_logic=payload.get("detection_logic"),
            mitigation=payload.get("mitigation"),
            source=payload.get("source", "manual"),
            submitted_by_id=current_user.id,
        )
        db.add(entry)
        db.flush()

        for ind in payload.get("indicators", []):
            db.add(ThreatIndicator(
                threat_entry_id=entry.id,
                indicator_type=ind["indicator_type"],
                indicator_value=ind["indicator_value"],
                description=ind.get("description"),
            ))

        for ref in payload.get("references", []):
            db.add(ThreatReference(
                threat_entry_id=entry.id,
                title=ref.get("title"),
                url=ref["url"],
                source_name=ref.get("source_name"),
            ))

        tags = cls._ensure_tags(db, payload.get("tag_names", []))
        for tag in tags:
            db.add(ThreatEntryTag(threat_entry_id=entry.id, threat_tag_id=tag.id))

        AuditService.create_audit_log(db=db, actor_user_id=current_user.id, action="threats.create", entity_type="threat_entry", entity_id=str(entry.id), details={"title": entry.title})
        db.commit()
        db.refresh(entry)
        return cls.detail(db, entry)

    # ── update ───────────────────────────────────────────
    @classmethod
    def update_entry(cls, *, db: Session, entry_id: int, payload: dict, current_user: User) -> dict:
        entry = cls._get_entry(db, entry_id)
        if "title" in payload and payload["title"]:
            entry.title = payload["title"]
            entry.slug = _slugify(payload["title"])
        for field in ("category", "severity", "description", "cve_id", "cvss_score", "mitre_tactic", "mitre_technique", "affected_systems", "detection_logic", "mitigation"):
            if field in payload and payload[field] is not None:
                setattr(entry, field, payload[field])
        if "status" in payload and payload["status"]:
            entry.status = payload["status"]
            if payload["status"] == "approved" and not entry.approved_at:
                entry.approved_at = datetime.now(timezone.utc)
                entry.reviewed_by_id = current_user.id
        AuditService.create_audit_log(db=db, actor_user_id=current_user.id, action="threats.update", entity_type="threat_entry", entity_id=str(entry.id), details=payload)
        db.commit()
        db.refresh(entry)
        return cls.detail(db, entry)

    # ── delete ───────────────────────────────────────────
    @classmethod
    def delete_entry(cls, *, db: Session, entry_id: int, current_user: User) -> dict:
        entry = cls._get_entry(db, entry_id)
        AuditService.create_audit_log(db=db, actor_user_id=current_user.id, action="threats.delete", entity_type="threat_entry", entity_id=str(entry.id), details={"title": entry.title})
        db.delete(entry)
        db.commit()
        return {"message": "Threat entry deleted."}

    # ── add indicator ────────────────────────────────────
    @classmethod
    def add_indicator(cls, *, db: Session, entry_id: int, payload: dict, current_user: User) -> dict:
        entry = cls._get_entry(db, entry_id)
        existing = db.execute(
            select(ThreatIndicator).where(
                ThreatIndicator.threat_entry_id == entry_id,
                ThreatIndicator.indicator_type == payload["indicator_type"],
                ThreatIndicator.indicator_value == payload["indicator_value"],
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="This indicator already exists on this entry.")
        ind = ThreatIndicator(threat_entry_id=entry_id, indicator_type=payload["indicator_type"], indicator_value=payload["indicator_value"], description=payload.get("description"))
        db.add(ind)
        db.commit()
        db.refresh(ind)
        return {"id": ind.id, "threat_entry_id": ind.threat_entry_id, "indicator_type": ind.indicator_type, "indicator_value": ind.indicator_value, "description": ind.description, "created_at": ind.created_at}

    # ── add reference ────────────────────────────────────
    @classmethod
    def add_reference(cls, *, db: Session, entry_id: int, payload: dict, current_user: User) -> dict:
        cls._get_entry(db, entry_id)
        ref = ThreatReference(threat_entry_id=entry_id, title=payload.get("title"), url=payload["url"], source_name=payload.get("source_name"))
        db.add(ref)
        db.commit()
        db.refresh(ref)
        return {"id": ref.id, "threat_entry_id": ref.threat_entry_id, "title": ref.title, "url": ref.url, "source_name": ref.source_name, "created_at": ref.created_at}

    # ── add review ───────────────────────────────────────
    @classmethod
    def add_review(cls, *, db: Session, entry_id: int, payload: dict, current_user: User) -> dict:
        entry = cls._get_entry(db, entry_id)
        review = ThreatReview(threat_entry_id=entry_id, reviewer_id=current_user.id, decision=payload["decision"], comment=payload.get("comment"))
        db.add(review)
        entry.status = "approved" if payload["decision"] == "approved" else "rejected" if payload["decision"] == "rejected" else "pending_review"
        entry.reviewed_by_id = current_user.id
        entry.review_comment = payload.get("comment")
        if payload["decision"] == "approved":
            entry.approved_at = datetime.now(timezone.utc)
        AuditService.create_audit_log(db=db, actor_user_id=current_user.id, action="threats.review", entity_type="threat_entry", entity_id=str(entry_id), details={"decision": payload["decision"]})
        db.commit()
        db.refresh(review)
        return {"id": review.id, "threat_entry_id": review.threat_entry_id, "reviewer": cls.user_mini(review.reviewer), "decision": review.decision, "comment": review.comment, "created_at": review.created_at}

    # ── link alert ───────────────────────────────────────
    @classmethod
    def link_alert(cls, *, db: Session, entry_id: int, payload: dict, current_user: User) -> dict:
        cls._get_entry(db, entry_id)
        existing = db.execute(select(AlertThreatLink).where(AlertThreatLink.alert_id == payload["alert_id"], AlertThreatLink.threat_entry_id == entry_id)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Alert is already linked to this threat entry.")
        link = AlertThreatLink(alert_id=payload["alert_id"], threat_entry_id=entry_id, confidence=payload.get("confidence"), reason=payload.get("reason"))
        db.add(link)
        db.commit()
        db.refresh(link)
        return {"alert_id": link.alert_id, "threat_entry_id": link.threat_entry_id, "confidence": link.confidence, "reason": link.reason, "created_at": link.created_at}

    # ── stats ────────────────────────────────────────────
    @classmethod
    def stats(cls, db: Session) -> dict:
        entries = db.execute(select(ThreatEntry)).scalars().all()
        by_type: dict[str, int] = {}
        by_severity: dict[str, int] = {}
        by_status: dict[str, int] = {}
        by_source: dict[str, int] = {}
        for e in entries:
            by_type[e.type] = by_type.get(e.type, 0) + 1
            by_severity[e.severity] = by_severity.get(e.severity, 0) + 1
            by_status[e.status] = by_status.get(e.status, 0) + 1
            by_source[e.source] = by_source.get(e.source, 0) + 1
        return {"total_entries": len(entries), "by_type": by_type, "by_severity": by_severity, "by_status": by_status, "by_source": by_source}

    # ── tags list ────────────────────────────────────────
    @classmethod
    def list_tags(cls, db: Session) -> list[dict]:
        tags = db.execute(select(ThreatTag).order_by(ThreatTag.name)).scalars().all()
        return [{"id": t.id, "name": t.name, "slug": t.slug, "created_at": t.created_at} for t in tags]

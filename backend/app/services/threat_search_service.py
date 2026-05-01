from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.threat_entry import ThreatEntry
from app.models.threat_indicator import ThreatIndicator
from app.models.threat_reference import ThreatReference
from app.models.threat_entry_tag import ThreatEntryTag
from app.models.threat_tag import ThreatTag
from app.models.user import User
from app.services.nvd_client import NVDClient, NVDClientError, NVDRateLimitError
from app.services.threat_normalization import create_threat_entry_from_nvd, normalize_nvd_cve
from app.core.config import settings


class ThreatSearchService:

    @staticmethod
    def _get_local_entries(db: Session, query: str, severity: str | None, status_filter: str | None = None) -> list[dict]:
        filters = [ThreatEntry.type == "cve"]
        if query:
            search_term = f"%{query}%"
            filters.append(or_(ThreatEntry.title.ilike(search_term), ThreatEntry.cve_id.ilike(search_term)))
        if severity:
            filters.append(ThreatEntry.severity == severity)
        if status_filter:
            filters.append(ThreatEntry.status == status_filter)

        stmt = select(ThreatEntry).where(*filters).order_by(ThreatEntry.created_at.desc()).limit(50)

        entries = db.execute(stmt).scalars().all()
        results = []
        for e in entries:
            tag_links = db.execute(select(ThreatEntryTag).where(ThreatEntryTag.threat_entry_id == e.id)).scalars().all()
            tag_ids = [tl.threat_tag_id for tl in tag_links]
            tags = []
            if tag_ids:
                for t in db.execute(select(ThreatTag).where(ThreatTag.id.in_(tag_ids))).scalars().all():
                    tags.append({"id": t.id, "name": t.name, "slug": t.slug})
            indicator_count = db.execute(select(func.count(ThreatIndicator.id)).where(ThreatIndicator.threat_entry_id == e.id)).scalar_one()
            results.append({
                "id": e.id,
                "title": e.title,
                "slug": e.slug,
                "type": e.type,
                "category": e.category,
                "severity": e.severity,
                "cve_id": e.cve_id,
                "cvss_score": e.cvss_score,
                "source": e.source,
                "status": e.status,
                "tags": tags,
                "indicator_count": indicator_count,
                "external_published_at": e.external_published_at,
                "external_last_modified_at": e.external_last_modified_at,
                "created_at": e.created_at,
            })
        return results

    @staticmethod
    def _get_cached_entry(db: Session, cve_id: str) -> ThreatEntry | None:
        ttl_hours = settings.nvd_cache_ttl_hours
        cutoff = datetime.now(timezone.utc) - timedelta(hours=ttl_hours)
        return db.execute(
            select(ThreatEntry).where(
                ThreatEntry.cve_id == cve_id,
                ThreatEntry.source == "nvd_api",
                ThreatEntry.created_at >= cutoff,
            )
        ).scalar_one_or_none()

    @staticmethod
    async def search(db: Session, query: str, severity: str | None, source: str | None, include_external: bool, current_user: User | None) -> dict[str, Any]:
        local_results = ThreatSearchService._get_local_entries(db, query, severity, status_filter="approved" if source == "local" else None)
        source_summary = {"local": len(local_results), "cached": 0, "nvd_api": 0}
        external_unavailable = False
        message = None

        if not include_external or source == "local":
            return {
                "query": query,
                "results": local_results,
                "total": len(local_results),
                "source_summary": source_summary,
                "external_source_unavailable": False,
                "message": None,
            }

        nvd_client = NVDClient()
        nvd_results = []

        try:
            if NVDClient.is_cve_id(query):
                nvd_data = await nvd_client.search_by_cve_id(query)
                vulnerabilities = nvd_data.get("vulnerabilities", [])
                if vulnerabilities:
                    nvd_results = [normalize_nvd_cve(v) for v in vulnerabilities]
                    source_summary["nvd_api"] = len(nvd_results)
            else:
                nvd_data = await nvd_client.search_by_keyword(query, severity=severity)
                vulnerabilities = nvd_data.get("vulnerabilities", [])
                if vulnerabilities:
                    nvd_results = [normalize_nvd_cve(v) for v in vulnerabilities[:20]]
                    source_summary["nvd_api"] = len(nvd_results)
        except NVDRateLimitError:
            external_unavailable = True
            message = "NVD API rate limit exceeded. Showing local results only."
        except NVDClientError:
            external_unavailable = True
            message = "NVD API is currently unavailable. Showing local results only."
        except Exception:
            external_unavailable = True
            message = "External threat intelligence source is temporarily unavailable. Showing local results only."

        merged = {}
        for r in local_results:
            key = r.get("cve_id") or r.get("slug")
            if key:
                merged[key] = {**r, "result_source": "local"}

        for r in nvd_results:
            cve_id = r.get("cve_id")
            if cve_id:
                cached = ThreatSearchService._get_cached_entry(db, cve_id)
                if cached:
                    source_summary["cached"] += 1
                    merged[cve_id] = {
                        "id": cached.id,
                        "title": cached.title,
                        "slug": cached.slug,
                        "type": cached.type,
                        "category": cached.category,
                        "severity": cached.severity,
                        "cve_id": cached.cve_id,
                        "cvss_score": cached.cvss_score,
                        "source": cached.source,
                        "status": cached.status,
                        "tags": [],
                        "indicator_count": 0,
                        "external_published_at": cached.external_published_at,
                        "external_last_modified_at": cached.external_last_modified_at,
                        "created_at": cached.created_at,
                        "result_source": "cached",
                    }
                else:
                    merged[cve_id] = {**r, "result_source": "nvd_api", "id": None, "status": "pending_review", "tags": [], "indicator_count": 0}

        final_results = list(merged.values())
        return {
            "query": query,
            "results": final_results,
            "total": len(final_results),
            "source_summary": source_summary,
            "external_source_unavailable": external_unavailable,
            "message": message,
        }

    @staticmethod
    async def get_cve_exact(db: Session, cve_id: str, current_user: User | None) -> dict[str, Any]:
        cached = ThreatSearchService._get_cached_entry(db, cve_id)
        if cached:
            return {"found": True, "source": "cached", "entry_id": cached.id, "cve_id": cached.cve_id, "created_at": cached.created_at}

        local = db.execute(select(ThreatEntry).where(ThreatEntry.cve_id == cve_id)).scalar_one_or_none()
        if local:
            return {"found": True, "source": "local", "entry_id": local.id, "cve_id": local.cve_id, "created_at": local.created_at}

        nvd_client = NVDClient()
        try:
            nvd_data = await nvd_client.search_by_cve_id(cve_id)
            vulnerabilities = nvd_data.get("vulnerabilities", [])
            if not vulnerabilities:
                return {"found": False, "source": "nvd_api", "cve_id": cve_id, "message": "CVE not found in NVD"}
            normalized = normalize_nvd_cve(vulnerabilities[0])
            return {"found": True, "source": "nvd_api", "cve_id": cve_id, "created_at": normalized["created_at"], "nvd_data": vulnerabilities[0]}
        except NVDClientError:
            return {"found": False, "source": "nvd_api", "cve_id": cve_id, "message": "NVD API is currently unavailable."}

    @staticmethod
    async def import_cve(db: Session, cve_id: str, current_user: User) -> dict[str, Any]:
        existing = db.execute(select(ThreatEntry).where(ThreatEntry.cve_id == cve_id)).scalar_one_or_none()
        if existing:
            return {"message": "CVE already exists in local database", "entry_id": existing.id, "cve_id": existing.cve_id, "created_at": existing.created_at}

        nvd_client = NVDClient()
        try:
            nvd_data = await nvd_client.search_by_cve_id(cve_id)
            vulnerabilities = nvd_data.get("vulnerabilities", [])
            if not vulnerabilities:
                raise ValueError("CVE not found in NVD")
            entry = create_threat_entry_from_nvd(db, vulnerabilities[0], current_user.id)
            db.commit()
            db.refresh(entry)
            return {"message": "CVE imported successfully", "entry_id": entry.id, "cve_id": entry.cve_id, "created_at": entry.created_at}
        except NVDClientError as e:
            raise ValueError(f"NVD API error: {e}")

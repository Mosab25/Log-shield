from __future__ import annotations

import re
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from app.models.threat_entry import ThreatEntry
from app.models.threat_reference import ThreatReference
from app.models.threat_indicator import ThreatIndicator


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:240] or "untitled"


def _parse_cvss(metrics: list[dict[str, Any]]) -> tuple[Decimal | None, str]:
    if not metrics:
        return None, "medium"
    for metric in metrics:
        if "cvssData" in metric:
            cvss_data = metric["cvssData"]
            base_score = cvss_data.get("baseScore")
            base_severity = cvss_data.get("baseSeverity", "MEDIUM").upper()
            if base_score is not None:
                return Decimal(str(base_score)), _map_severity(base_severity)
    return None, "medium"


def _map_severity(nvd_severity: str) -> str:
    mapping = {
        "LOW": "low",
        "MEDIUM": "medium",
        "HIGH": "high",
        "CRITICAL": "critical",
    }
    return mapping.get(nvd_severity.upper(), "medium")


def _extract_description(descriptions: list[dict[str, Any]]) -> str:
    for desc in descriptions:
        if desc.get("lang") == "en":
            return desc.get("value", "").strip()
    return descriptions[0].get("value", "").strip() if descriptions else "No description available."


def _extract_cwe(weaknesses: list[dict[str, Any]]) -> str | None:
    if not weaknesses:
        return None
    for w in weaknesses:
        for desc in w.get("description", []):
            if desc.get("lang") == "en":
                return desc.get("value", "").strip()
    return None


def _extract_affected_systems(configurations: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not configurations:
        return None
    products = []
    for config in configurations:
        for node in config.get("nodes", []):
            for cpe in node.get("cpeMatch", []):
                cpe_str = cpe.get("criteria", "")
                if cpe_str:
                    parts = cpe_str.split(":")
                    if len(parts) >= 6:
                        vendor = parts[3]
                        product = parts[4]
                        version = parts[5] if len(parts) > 5 else "*"
                        products.append(f"{vendor}:{product}:{version}")
    if products:
        return {"cpe_matches": products[:20]}
    return None


def _extract_references(references: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not references:
        return []
    refs = []
    for ref in references:
        url = ref.get("url", "")
        source = ref.get("source", "")
        tags = ref.get("tags", [])
        if url:
            refs.append({"url": url, "source_name": source, "title": None})
    return refs[:20]


def _parse_datetime(dt_str: str | None) -> datetime | None:
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def normalize_nvd_cve(nvd_item: dict[str, Any]) -> dict[str, Any]:
    cve = nvd_item.get("cve", {})
    cve_id = cve.get("id", "")
    if not cve_id:
        raise ValueError("NVD item missing CVE ID")

    metrics = cve.get("metrics", {})
    cvss_metrics = metrics.get("cvssMetricV31", []) or metrics.get("cvssMetricV30", [])
    cvss_score, severity = _parse_cvss(cvss_metrics)

    descriptions = cve.get("descriptions", [])
    description = _extract_description(descriptions)

    weaknesses = cve.get("weaknesses", [])
    cwe = _extract_cwe(weaknesses)

    configurations = cve.get("configurations", [])
    affected_systems = _extract_affected_systems(configurations)

    references = cve.get("references", [])
    ref_data = _extract_references(references)

    published = cve.get("published")
    last_modified = cve.get("lastModified")

    title = cwe if cwe else description[:100] if description else cve_id

    return {
        "title": title,
        "slug": _slugify(cve_id),
        "type": "cve",
        "category": cwe,
        "severity": severity,
        "description": description,
        "cve_id": cve_id,
        "cvss_score": cvss_score,
        "mitre_tactic": None,
        "mitre_technique": None,
        "affected_systems": affected_systems,
        "detection_logic": None,
        "mitigation": None,
        "source": "nvd_api",
        "status": "pending_review",
        "external_published_at": _parse_datetime(published),
        "external_last_modified_at": _parse_datetime(last_modified),
        "created_at": datetime.now(timezone.utc),
        "references": ref_data,
        "indicators": [],
    }


def create_threat_entry_from_nvd(db, nvd_data: dict[str, Any], current_user_id: int | None) -> ThreatEntry:
    normalized = normalize_nvd_cve(nvd_data)
    entry = ThreatEntry(
        title=normalized["title"],
        slug=normalized["slug"],
        type=normalized["type"],
        category=normalized["category"],
        severity=normalized["severity"],
        description=normalized["description"],
        cve_id=normalized["cve_id"],
        cvss_score=normalized["cvss_score"],
        mitre_tactic=normalized["mitre_tactic"],
        mitre_technique=normalized["mitre_technique"],
        affected_systems=normalized["affected_systems"],
        detection_logic=normalized["detection_logic"],
        mitigation=normalized["mitigation"],
        source=normalized["source"],
        status=normalized["status"],
        submitted_by_id=current_user_id,
        external_published_at=normalized["external_published_at"],
        external_last_modified_at=normalized["external_last_modified_at"],
    )
    db.add(entry)
    db.flush()

    for ref in normalized["references"]:
        db.add(ThreatReference(
            threat_entry_id=entry.id,
            title=ref.get("title"),
            url=ref["url"],
            source_name=ref.get("source_name"),
        ))

    return entry

from __future__ import annotations

import asyncio
import ipaddress
import re
import socket
from urllib.parse import urlparse

DNS_TIMEOUT_SECONDS = 3.0
SENSITIVE_KEYWORDS = (
    "login",
    "secure",
    "verify",
    "account",
    "support",
    "update",
    "admin",
    "auth",
    "billing",
    "password",
)
SEVERITY_PRIORITY = {"informational": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}


def normalize_domain_input(raw: str) -> str:
    value = str(raw or "").strip().lower()
    if not value:
        raise ValueError("Please enter a valid domain.")

    if "@" in value and not value.startswith(("http://", "https://")):
        raise ValueError("Please enter a domain, not an email address.")

    parsed = urlparse(value if value.startswith(("http://", "https://")) else f"https://{value}")
    hostname = (parsed.hostname or "").strip().lower()
    if not hostname:
        raise ValueError("Please enter a valid domain.")

    if hostname in {"localhost"} or hostname.endswith(".local") or hostname.endswith(".internal"):
        raise ValueError("Local or internal hostnames are not allowed.")

    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            raise ValueError("IP addresses are not allowed for this check.")
        raise ValueError("Please enter a domain, not an IP address.")
    except ValueError as exc:
        message = str(exc)
        if "not allowed" in message or "not an IP" in message or "IP addresses are not allowed" in message:
            raise
        # hostname is not an IP; continue.

    if "." not in hostname:
        raise ValueError("Please enter a root domain like example.com.")

    if re.search(r"[^a-z0-9\.\-]", hostname):
        raise ValueError("Domain contains unsupported characters.")

    labels = hostname.split(".")
    if any(not label or label.startswith("-") or label.endswith("-") for label in labels):
        raise ValueError("Domain format is invalid.")

    return hostname


def split_brand_tld(domain: str) -> tuple[str, str]:
    root, tld = domain.rsplit(".", 1)
    if not root or not tld:
        raise ValueError("Please enter a valid root domain.")
    brand = root.split(".")[-1]
    if len(brand) < 3:
        raise ValueError("Domain brand label is too short for safe variant analysis.")
    return brand, tld


def generate_variants(domain: str, brand: str, tld: str, max_variants: int) -> list[tuple[str, str]]:
    substitutions = {"o": "0", "l": "1", "i": "1", "e": "3", "s": "5"}
    variants: list[tuple[str, str]] = []
    seen: set[str] = {domain}

    def push(label: str, technique: str) -> None:
        if len(variants) >= max_variants:
            return
        if not re.fullmatch(r"[a-z0-9\-]{1,63}", label):
            return
        if label.startswith("-") or label.endswith("-"):
            return
        candidate = f"{label}.{tld}"
        if candidate in seen:
            return
        seen.add(candidate)
        variants.append((candidate, technique))

    # 1) Character substitution
    for i, ch in enumerate(brand):
        sub = substitutions.get(ch)
        if sub:
            push(f"{brand[:i]}{sub}{brand[i + 1:]}", "character_substitution")

    # 2) Missing character
    for i in range(len(brand)):
        if len(brand) - 1 >= 3:
            push(f"{brand[:i]}{brand[i + 1:]}", "missing_character")

    # 3) Repeated character
    for i, ch in enumerate(brand):
        push(f"{brand[:i + 1]}{ch}{brand[i + 1:]}", "repeated_character")

    # 4) Adjacent swap
    for i in range(len(brand) - 1):
        swapped = list(brand)
        swapped[i], swapped[i + 1] = swapped[i + 1], swapped[i]
        push("".join(swapped), "adjacent_swap")

    # 5) Hyphen insertion
    for i in range(1, len(brand)):
        push(f"{brand[:i]}-{brand[i:]}", "hyphen_insertion")

    # 6) Extra keyword
    keyword_labels = [
        f"{brand}-login",
        f"secure-{brand}",
        f"{brand}-verify",
        f"{brand}-account",
        f"{brand}-support",
        f"{brand}-update",
    ]
    for label in keyword_labels:
        push(label, "extra_keyword")

    return variants[:max_variants]


def _query_dns_records_sync(hostname: str, record_type: str) -> list[str]:
    try:
        import dns.resolver  # type: ignore
    except Exception:
        return []

    try:
        resolver = dns.resolver.Resolver()
        resolver.timeout = DNS_TIMEOUT_SECONDS
        resolver.lifetime = DNS_TIMEOUT_SECONDS
        answers = resolver.resolve(hostname, record_type)
        out: list[str] = []
        for answer in answers:
            out.append(str(answer).rstrip("."))
        return sorted(set(out))
    except Exception:
        return []


async def _query_dns_records(hostname: str, record_type: str) -> list[str]:
    try:
        return await asyncio.wait_for(asyncio.to_thread(_query_dns_records_sync, hostname, record_type), timeout=DNS_TIMEOUT_SECONDS)
    except Exception:
        return []


def _dnspython_available() -> bool:
    cached = getattr(_dnspython_available, "_cached", None)
    if cached is not None:
        return bool(cached)
    try:
        import dns.resolver  # type: ignore # noqa: F401

        setattr(_dnspython_available, "_cached", True)
        return True
    except Exception:
        setattr(_dnspython_available, "_cached", False)
        return False


async def _safe_getaddrinfo_split(hostname: str) -> tuple[list[str], list[str]]:
    def _resolve() -> tuple[list[str], list[str]]:
        ipv4: set[str] = set()
        ipv6: set[str] = set()
        infos = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for info in infos:
            address = info[4][0]
            try:
                parsed = ipaddress.ip_address(address)
            except ValueError:
                continue
            if parsed.version == 4:
                ipv4.add(address)
            else:
                ipv6.add(address)
        return sorted(ipv4), sorted(ipv6)

    try:
        return await asyncio.wait_for(asyncio.to_thread(_resolve), timeout=DNS_TIMEOUT_SECONDS)
    except Exception:
        return [], []


async def _resolve_variant_dns(hostname: str) -> tuple[list[str], list[str], list[str], list[str], list[str], list[str]]:
    if _dnspython_available():
        a_records, aaaa_records, cname_records, mx_records, txt_records, ns_records = await asyncio.gather(
            _query_dns_records(hostname, "A"),
            _query_dns_records(hostname, "AAAA"),
            _query_dns_records(hostname, "CNAME"),
            _query_dns_records(hostname, "MX"),
            _query_dns_records(hostname, "TXT"),
            _query_dns_records(hostname, "NS"),
        )
        return a_records, aaaa_records, cname_records, mx_records, txt_records, ns_records

    a_records, aaaa_records = await _safe_getaddrinfo_split(hostname)
    return a_records, aaaa_records, [], [], [], []


def _variant_risk(domain: str, dns_resolves: bool, has_mx: bool) -> tuple[str, str, str]:
    has_sensitive_keyword = any(keyword in domain for keyword in SENSITIVE_KEYWORDS)

    if has_mx and has_sensitive_keyword:
        return (
            "critical",
            "This lookalike domain includes a sensitive keyword and has mail records, which may indicate elevated phishing risk.",
            "Potential brand impersonation risk. Prioritize investigation and consider registrar/provider abuse reporting if malicious use is confirmed.",
        )
    if has_mx:
        return (
            "high",
            "This lookalike domain has mail exchange records and could potentially be used for email impersonation.",
            "Potential brand impersonation risk. Investigate ownership and monitor for spoofing attempts.",
        )
    if dns_resolves and has_sensitive_keyword:
        return (
            "high",
            "This lookalike domain includes a sensitive keyword and resolves in DNS.",
            "Potential brand impersonation risk. This domain requires investigation.",
        )
    if dns_resolves:
        return (
            "medium",
            "This lookalike domain resolves in DNS and may require investigation.",
            "Potential brand impersonation risk. Track this active lookalike domain and assess defensive controls.",
        )
    return (
        "informational",
        "No active DNS records were observed.",
        "Keep monitoring over time because domain registration and DNS status can change.",
    )


def _highest_risk(levels: list[str]) -> str:
    if not levels:
        return "low"
    return max(levels, key=lambda value: SEVERITY_PRIORITY.get(value, 1))


def _make_finding(
    idx: int,
    title: str,
    severity: str,
    evidence: str,
    impact: str,
    recommendation: str,
    priority: int,
) -> dict:
    return {
        "id": f"DSP-{idx}",
        "title": title,
        "severity": severity,
        "category": "Brand Protection",
        "owasp_category": "Security Logging and Monitoring Failures",
        "evidence": evidence,
        "impact": impact,
        "recommendation": recommendation,
        "priority": priority,
    }


async def run_domain_spoofing_check(domain_input: str, max_variants: int) -> dict:
    normalized_domain = normalize_domain_input(domain_input)
    brand, tld = split_brand_tld(normalized_domain)

    variants = generate_variants(normalized_domain, brand, tld, max_variants=max_variants)
    variant_rows: list[dict] = []
    findings: list[dict] = []
    resolving_count = 0
    mx_count = 0

    finding_index = 0
    for variant_domain, technique in variants:
        a_records, aaaa_records, cname_records, mx_records, txt_records, ns_records = await _resolve_variant_dns(variant_domain)
        dns_resolves = bool(a_records or aaaa_records or cname_records)
        has_mx = bool(mx_records)
        has_spf_like_txt = any("v=spf1" in value.lower() for value in txt_records)
        risk_level, reason, recommendation = _variant_risk(
            variant_domain,
            dns_resolves=dns_resolves,
            has_mx=has_mx,
        )
        if has_spf_like_txt:
            reason = f"{reason} TXT records include SPF-like values, which may indicate email authentication configuration."

        if dns_resolves:
            resolving_count += 1
        if has_mx:
            mx_count += 1

        variant_rows.append(
            {
                "domain": variant_domain,
                "technique": technique,
                "dns_resolves": dns_resolves,
                "a_records": a_records[:4],
                "aaaa_records": aaaa_records[:4],
                "cname_records": cname_records[:4],
                "mx_records": mx_records[:4],
                "txt_records": txt_records[:6],
                "ns_records": ns_records[:6],
                "has_mx": has_mx,
                "has_spf_like_txt": has_spf_like_txt,
                "risk_level": risk_level,
                "reason": reason,
                "recommendation": recommendation,
            }
        )

        if risk_level in {"high", "critical"}:
            finding_index += 1
            findings.append(
                _make_finding(
                    finding_index,
                    f"Potential impersonation risk: {variant_domain}",
                    "critical" if risk_level == "critical" else "high",
                    reason,
                    "This lookalike domain is active and may require investigation.",
                    recommendation,
                    1,
                )
            )

    highest = _highest_risk([row["risk_level"] for row in variant_rows])
    high_or_critical_count = sum(1 for row in variant_rows if row["risk_level"] in {"high", "critical"})
    if highest == "high" and high_or_critical_count >= 3:
        highest = "critical"

    if not findings:
        findings.append(
            _make_finding(
                1,
                "No high-risk active lookalike domains were observed in this limited check",
                "informational",
                "Generated variants did not produce high-risk DNS/MX combinations in this run.",
                "This does not guarantee absence of impersonation risk because domain states can change over time.",
                "Repeat passive monitoring regularly and enforce DMARC/SPF/DKIM on the official domain.",
                3,
            )
        )

    top_priorities: list[str] = []
    if high_or_critical_count:
        top_priorities.append("Investigate active lookalike domains flagged as high risk.")
    if mx_count:
        top_priorities.append("Monitor MX-enabled lookalike domains for potential email impersonation.")
    top_priorities.append("Enforce DMARC, SPF, and DKIM on the official domain.")
    top_priorities.append("Warn employees and customers about the official domain naming pattern.")
    top_priorities.append("Consider defensive registration for high-risk variants.")

    return {
        "mode": "domain_spoofing_defense",
        "target": {
            "domain": normalized_domain,
            "brand": brand,
            "tld": tld,
        },
        "summary": {
            "variants_generated": len(variant_rows),
            "registered_or_resolving": resolving_count,
            "mx_enabled": mx_count,
            "highest_risk": highest,
            "top_priorities": top_priorities[:5],
        },
        "variants": variant_rows,
        "findings": findings,
        "safety_model": {
            "authorized_confirmed": True,
            "passive_dns_only": True,
            "phishing_content_generated": False,
            "domains_registered": False,
            "high_volume_scan": False,
            "note": "This tool performs limited defensive lookalike-domain monitoring only.",
        },
    }

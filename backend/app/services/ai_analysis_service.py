from __future__ import annotations

import json
import re
from dataclasses import dataclass
from urllib.error import URLError
from urllib.request import Request, urlopen

from app.core.config import settings
from app.schemas.ai_analysis import AiAnalysisResult, MitreMapping

IOC_IP_PATTERN = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
IOC_DOMAIN_PATTERN = re.compile(r"\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b")
IOC_URL_PATTERN = re.compile(r"\bhttps?://[^\s\"'<>]+")
IOC_HASH_PATTERN = re.compile(r"\b[a-fA-F0-9]{32,64}\b")


@dataclass
class DetectionSignal:
    reason: str
    score: int
    attack_type: str
    severity: str
    mitre: list[MitreMapping]
    actions: list[str]


class AiAnalysisService:
    @staticmethod
    def analyze_logs(raw_logs: str, context: str | None = None) -> AiAnalysisResult:
        prepared = _sanitize_input(f"{raw_logs}\n{context or ''}")
        provider_result = _try_provider_result(prepared)
        if provider_result is not None:
            return provider_result
        return _local_fallback_analysis(prepared)

    @staticmethod
    def summarize_incident(
        incident_text: str,
        incident_title: str | None = None,
        incident_severity: str | None = None,
        incident_status: str | None = None,
    ) -> AiAnalysisResult:
        composed = (
            f"Incident title: {incident_title or 'Untitled incident'}\n"
            f"Severity: {incident_severity or 'unknown'}\n"
            f"Status: {incident_status or 'unknown'}\n"
            f"Evidence:\n{incident_text}"
        )
        provider_result = _try_provider_result(_sanitize_input(composed))
        if provider_result is not None:
            return provider_result
        result = _local_fallback_analysis(_sanitize_input(composed))
        result.summary = (
            f"Incident summary: {incident_title or 'Untitled incident'} is currently "
            f"{incident_status or 'unknown'} with {result.severity} severity indicators."
        )
        result.analyst_notes = "AI summary generated from supplied incident evidence text."
        return result

    @staticmethod
    def generate_report_draft(title: str | None, source_text: str, context: str | None = None) -> AiAnalysisResult:
        composed = f"Report title: {title or 'Investigation Report'}\n{context or ''}\n{source_text}"
        provider_result = _try_provider_result(_sanitize_input(composed))
        if provider_result is not None:
            return provider_result
        result = _local_fallback_analysis(_sanitize_input(composed))
        report_title = title or "Investigation Report"
        result.report_draft.executive_summary = (
            f"{report_title}: This draft summarizes suspicious activity and recommended defensive actions."
        )
        result.report_draft.technical_summary = result.summary
        result.report_draft.timeline = [
            "Event evidence was collected and normalized.",
            "Suspicious indicators were triaged with local fallback analysis.",
            "MITRE mapping and response recommendations were drafted.",
        ]
        result.report_draft.iocs = (
            result.extracted_iocs.ips
            + result.extracted_iocs.domains
            + result.extracted_iocs.urls
            + result.extracted_iocs.hashes
        )
        result.report_draft.mitre = [f"{m.technique_id} - {m.technique_name}" for m in result.mitre_mappings]
        result.report_draft.recommendations = result.recommended_actions
        result.report_draft.conclusion = (
            "Continue containment and correlation across alerts, logs, and incident history."
            if result.verdict != "benign"
            else "No high-confidence malicious behavior was detected in the supplied context."
        )
        return result


def _safe_json_load(raw: str) -> dict | None:
    try:
        payload = json.loads(raw)
    except Exception:
        return None
    return payload if isinstance(payload, dict) else None


def _try_provider_result(prepared_text: str) -> AiAnalysisResult | None:
    provider = (getattr(settings, "ai_provider", "") or "").strip().lower()
    api_key = (getattr(settings, "openai_api_key", "") or "").strip()
    model = (getattr(settings, "openai_model", "") or "gpt-4o-mini").strip()
    timeout_seconds = int(getattr(settings, "ai_timeout_seconds", 8) or 8)
    if provider != "openai" or not api_key:
        return None

    user_prompt = (
        "Analyze the following cybersecurity evidence strictly for defensive use. "
        "Return JSON only matching the required schema keys exactly.\n\n"
        f"Evidence:\n{prepared_text[:18000]}"
    )
    system_prompt = (
        "You are a defensive SOC assistant. Never provide exploit instructions. "
        "Output strict JSON only."
    )
    body = json.dumps(
        {
            "model": model,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
    ).encode("utf-8")
    request = Request(
        url="https://api.openai.com/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except (URLError, TimeoutError, ValueError):
        return None

    choices = response_data.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    content = (((choices[0] or {}).get("message") or {}).get("content") or "").strip()
    parsed = _safe_json_load(content)
    if not parsed:
        return None
    parsed["mode"] = "ai_provider"
    try:
        return AiAnalysisResult.model_validate(parsed)
    except Exception:
        return None


def _extract_iocs(text: str) -> dict[str, list[str]]:
    ips = sorted(set(IOC_IP_PATTERN.findall(text)))[:30]
    urls = sorted(set(IOC_URL_PATTERN.findall(text)))[:30]
    domains = sorted(set(IOC_DOMAIN_PATTERN.findall(text)))[:30]
    hashes = sorted(set(IOC_HASH_PATTERN.findall(text)))[:30]
    return {"ips": ips, "domains": domains, "urls": urls, "hashes": hashes}


def _detect_signals(text_lower: str) -> list[DetectionSignal]:
    signals: list[DetectionSignal] = []
    if re.search(r"failed login|invalid password|4625|brute force|password spray", text_lower):
        signals.append(
            DetectionSignal(
                reason="Repeated failed authentication patterns were detected.",
                score=30,
                attack_type="credential_attack",
                severity="high",
                mitre=[MitreMapping(technique_id="T1110", technique_name="Brute Force", tactic="Credential Access", reason="Multiple failed authentication indicators.")],
                actions=["Rate-limit login attempts.", "Lock or monitor affected accounts.", "Review source IP reputation."],
            )
        )
    if re.search(r"successful login after failures|login success|valid account", text_lower):
        signals.append(
            DetectionSignal(
                reason="Successful authentication after suspicious failures may indicate compromised credentials.",
                score=20,
                attack_type="credential_attack",
                severity="medium",
                mitre=[MitreMapping(technique_id="T1078", technique_name="Valid Accounts", tactic="Defense Evasion", reason="Potential account abuse sequence found.")],
                actions=["Force credential reset.", "Check MFA and session anomalies."],
            )
        )
    if re.search(r"union\s+select|or\s+1=1|drop\s+table|sqlmap|xss|<script|onerror=|path traversal|\.\./|cmd\.exe|powershell|bash -c", text_lower):
        signals.append(
            DetectionSignal(
                reason="Web exploitation or command injection clues are present in payload-like text.",
                score=32,
                attack_type="web_attack",
                severity="high",
                mitre=[MitreMapping(technique_id="T1190", technique_name="Exploit Public-Facing Application", tactic="Initial Access", reason="Injection/probing pattern detected.")],
                actions=["Inspect targeted endpoints.", "Block malicious payload sources.", "Review WAF and application logs."],
            )
        )
    if re.search(r"sudo|privilege|role changed|added to admin|4672|4732|account manipulation", text_lower):
        signals.append(
            DetectionSignal(
                reason="Privilege escalation or account manipulation indicators were found.",
                score=34,
                attack_type="privilege_escalation",
                severity="critical",
                mitre=[
                    MitreMapping(technique_id="T1098", technique_name="Account Manipulation", tactic="Persistence", reason="Account or role manipulation clues found."),
                    MitreMapping(technique_id="T1087", technique_name="Account Discovery", tactic="Discovery", reason="Account enumeration/manipulation sequence suggested."),
                ],
                actions=["Review IAM/admin changes.", "Validate approver trail.", "Revoke unexpected elevated permissions."],
            )
        )
    if re.search(r"scan|masscan|nmap|nikto|dirbuster|gobuster|probing|/admin|/wp-admin", text_lower):
        signals.append(
            DetectionSignal(
                reason="Reconnaissance or scanning behavior appears in the evidence.",
                score=24,
                attack_type="reconnaissance",
                severity="medium",
                mitre=[MitreMapping(technique_id="T1595", technique_name="Active Scanning", tactic="Reconnaissance", reason="Repeated probing/scanning signatures detected.")],
                actions=["Rate-limit and block suspicious scanners.", "Monitor repeated probes by IP/user-agent."],
            )
        )
    if re.search(r"malware|trojan|ransomware|c2|beacon|payload hash", text_lower):
        signals.append(
            DetectionSignal(
                reason="Malware-related wording or indicators were found.",
                score=28,
                attack_type="malware_indicator",
                severity="high",
                mitre=[MitreMapping(technique_id="T1059", technique_name="Command and Scripting Interpreter", tactic="Execution", reason="Script/command execution clues may indicate malware activity.")],
                actions=["Isolate affected host.", "Collect forensic artifacts.", "Pivot on IOC hashes/domains/URLs."],
            )
        )
    return signals


def _local_fallback_analysis(prepared_text: str) -> AiAnalysisResult:
    lower = prepared_text.lower()
    signals = _detect_signals(lower)
    score = min(100, sum(signal.score for signal in signals))
    if not prepared_text.strip():
        verdict = "insufficient_data"
        severity = "informational"
    elif score >= 70:
        verdict = "attack_detected"
        severity = "critical" if score >= 90 else "high"
    elif score >= 35:
        verdict = "suspicious"
        severity = "medium"
    elif score > 0:
        verdict = "suspicious"
        severity = "low"
    else:
        verdict = "benign"
        severity = "informational"

    attack_type = signals[0].attack_type if signals else "unknown"
    mitre: list[MitreMapping] = []
    for signal in signals:
        for mapping in signal.mitre:
            if mapping.technique_id not in {existing.technique_id for existing in mitre}:
                mitre.append(mapping)

    reasons = [signal.reason for signal in signals] or ["No high-confidence malicious pattern was found in the supplied text."]
    actions = []
    for signal in signals:
        actions.extend(signal.actions)
    if not actions:
        actions = ["Monitor for repeated patterns.", "Correlate with adjacent logs and alert context."]

    iocs = _extract_iocs(prepared_text)
    confidence = 0.2 if verdict == "benign" else min(0.98, 0.35 + (score / 120))
    summary = (
        "Local fallback analysis detected suspicious indicators with mapped defensive actions."
        if verdict != "benign"
        else "Local fallback analysis did not detect strong malicious indicators."
    )
    return AiAnalysisResult(
        mode="local_fallback",
        verdict=verdict,
        attack_type=attack_type,  # type: ignore[arg-type]
        severity=severity,  # type: ignore[arg-type]
        confidence=round(confidence, 2),
        risk_score=score,
        summary=summary,
        risk_reasons=reasons,
        mitre_mappings=mitre,
        extracted_iocs=iocs,
        recommended_actions=list(dict.fromkeys(actions))[:8],
        analyst_notes="AI-assisted analysis is using local fallback mode",
    )


def _sanitize_input(raw_text: str) -> str:
    limited = raw_text[: int(getattr(settings, "ai_max_input_chars", 20000) or 20000)]
    redacted = re.sub(r"(?i)(password|passwd|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+", r"\1=[REDACTED]", limited)
    redacted = re.sub(r"eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+", "[REDACTED_JWT]", redacted)
    return redacted

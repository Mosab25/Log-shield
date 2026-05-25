from __future__ import annotations

from typing import Any


def _unfold_header_lines(raw_input: str) -> list[str]:
    lines = raw_input.replace("\r\n", "\n").split("\n")
    unfolded: list[str] = []
    for line in lines:
        if line.startswith((" ", "\t")) and unfolded:
            unfolded[-1] = f"{unfolded[-1]} {line.strip()}"
        elif line.strip():
            unfolded.append(line.strip())
    return unfolded


def _parse_headers(raw_input: str) -> dict[str, list[str]]:
    parsed: dict[str, list[str]] = {}
    for line in _unfold_header_lines(raw_input):
        separator_index = line.find(":")
        if separator_index <= 0:
            continue
        key = line[:separator_index].strip().lower()
        value = line[separator_index + 1 :].strip()
        parsed[key] = [*(parsed.get(key, [])), value]
    return parsed


def _get_header(headers: dict[str, list[str]], key: str) -> str:
    values = headers.get(key.lower(), [])
    if not values:
        return ""
    return " | ".join(values)


def _is_likely_header_block(value: str) -> bool:
    lines = [line.strip() for line in value.replace("\r\n", "\n").split("\n") if line.strip()]
    if len(lines) < 3:
        return False
    header_like = [line for line in lines if ":" in line and line.split(":", 1)[0].replace("-", "").isalnum()]
    return len(header_like) >= 3


class EmailAnalysisService:
    @staticmethod
    def analyze_headers(raw_headers: str) -> dict[str, Any]:
        if not _is_likely_header_block(raw_headers):
            raise ValueError("Input does not look like raw email headers. Paste header lines in 'Key: Value' format.")

        headers = _parse_headers(raw_headers)
        received = headers.get("received", [])
        auth = _get_header(headers, "authentication-results").lower()
        suspicious: list[str] = []

        if "spf=pass" not in auth:
            suspicious.append("SPF did not clearly pass.")
        if "dkim=pass" not in auth:
            suspicious.append("DKIM did not clearly pass.")
        if "dmarc=pass" not in auth:
            suspicious.append("DMARC did not clearly pass.")
        if not _get_header(headers, "return-path"):
            suspicious.append("Return-Path is missing.")
        if len(received) > 5:
            suspicious.append("Long Received chain. Review hops for forwarding or relay abuse.")

        risk_score = 82 if len(suspicious) >= 4 else 58 if len(suspicious) >= 2 else 32 if len(suspicious) == 1 else 10
        severity = "high" if len(suspicious) >= 4 else "medium" if len(suspicious) >= 2 else "low"
        verdict = "malicious" if len(suspicious) >= 4 else "suspicious" if suspicious else "safe"

        return {
            "summary": {
                "from": _get_header(headers, "from") or "not found",
                "reply_to": _get_header(headers, "reply-to") or "not found",
                "return_path": _get_header(headers, "return-path") or "not found",
                "subject": _get_header(headers, "subject") or "not found",
                "date": _get_header(headers, "date") or "not found",
                "message_id": _get_header(headers, "message-id") or "not found",
                "received_hops": len(received),
            },
            "authentication": {
                "spf": "pass" if "spf=pass" in auth else "review" if "spf=" in auth else "not found",
                "dkim": "pass" if "dkim=pass" in auth else "review" if "dkim=" in auth else "not found",
                "dmarc": "pass" if "dmarc=pass" in auth else "review" if "dmarc=" in auth else "not found",
            },
            "suspicious_signals": suspicious
            if suspicious
            else ["No obvious header anomaly found. Continue with URL/attachment checks."],
            "next_steps": [
                "Compare From, Reply-To, and Return-Path domains.",
                "Extract URLs and domains with IOC Extractor.",
                "Check sending IPs in logs or threat intelligence.",
                "Preserve the full header as incident evidence if suspicious.",
            ],
            "verdict": verdict,
            "severity": severity,
            "risk_score": risk_score,
            "safety_model": {
                "rendered_as_html": False,
                "external_requests": False,
                "note": "Headers are analyzed as untrusted plain text only.",
            },
        }


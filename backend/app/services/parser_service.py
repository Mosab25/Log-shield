from __future__ import annotations

import re
from typing import Any

from app.models.raw_log import RawLog


class ParserService:
    SQL_LIKE_PATTERNS = ["' OR '1'='1", "UNION SELECT", " OR 1=1", "--", "/*"]

    @staticmethod
    def parse(raw_log: RawLog) -> dict[str, Any]:
        metadata = raw_log.event_metadata or {}
        message = raw_log.raw_message
        lower = message.lower()

        result: dict[str, Any] = {
            "event_time": raw_log.event_time or raw_log.received_at,
            "source": raw_log.source,
            "source_type": raw_log.source_type,
            "username": metadata.get("username") or metadata.get("target_user"),
            "src_ip": raw_log.ip_address,
            "hostname": raw_log.hostname,
            "user_agent": metadata.get("user_agent"),
            "status": metadata.get("result"),
            "http_method": metadata.get("method"),
            "path": metadata.get("path"),
            "status_code": metadata.get("status_code"),
            "message": message,
            "severity": "low",
            "parser_status": "parsed",
            "metadata": {"original_metadata": metadata},
        }

        if raw_log.source_type == "auth_service":
            if "failed login" in lower or metadata.get("event_name") == "login_failed":
                result.update(event_type="failed_login", status="failed", severity="medium")
            elif "logged in successfully" in lower or metadata.get("event_name") == "login_success":
                result.update(event_type="successful_login", status="success", severity="low")
            else:
                result.update(event_type="auth_event", severity="low", parser_status="partial")

        elif raw_log.source_type == "web_server":
            status_code = result["status_code"]
            if status_code is None:
                m = re.search(r"\s(\d{3})\s", message)
                if m:
                    status_code = int(m.group(1))
                    result["status_code"] = status_code

            if raw_log.ip_address is None:
                m = re.search(r"from\s+([0-9a-fA-F:\.]+)", message)
                if m:
                    result["src_ip"] = m.group(1)

            if any(pattern.lower() in lower for pattern in ParserService.SQL_LIKE_PATTERNS):
                result.update(event_type="suspicious_web_request", severity="high")
                result["metadata"]["contains_suspicious_text_pattern"] = True
            elif status_code == 404:
                result.update(event_type="http_404", severity="low")
            elif status_code and status_code >= 500:
                result.update(event_type="server_error", severity="medium")
            else:
                result.update(event_type="web_request", severity="low", parser_status="partial")

        elif raw_log.source_type == "application":
            if metadata.get("event_name") == "privilege_change" or "role changed" in lower:
                result.update(event_type="privilege_change", severity="critical", username=metadata.get("target_user"))
            else:
                result.update(event_type="application_event", severity="low", parser_status="partial")
        else:
            result.update(event_type="unknown_event", severity="low", parser_status="failed")

        return result

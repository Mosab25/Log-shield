from __future__ import annotations

import json
import logging
from urllib import error, request

from app.core.config import settings
from app.models.alert import Alert
from app.services.email_service import EmailService

logger = logging.getLogger("logshield.alert_notify")


class AlertNotificationService:
    @staticmethod
    def notify_if_severe(*, alert: Alert) -> None:
        if alert.severity not in {"high", "critical"}:
            return
        title = f"[LogShield] {alert.severity.upper()} alert #{alert.id}"
        body_lines = [
            title,
            "",
            f"Title: {alert.title}",
            f"Severity: {alert.severity}",
            f"Status: {alert.status}",
            "",
            alert.description or "",
            "",
            f"Open in SOC UI: alert ID {alert.id}",
        ]
        text_body = "\n".join(body_lines)

        if settings.alert_webhook_configured:
            payload = {
                "source": "logshield",
                "alert_id": alert.id,
                "severity": alert.severity,
                "title": alert.title,
                "description": alert.description,
                "status": alert.status,
            }
            data = json.dumps(payload).encode("utf-8")
            req = request.Request(
                settings.alert_webhook_url.strip(),
                data=data,
                method="POST",
                headers={"Content-Type": "application/json", "User-Agent": "LogShield/1.0"},
            )
            try:
                with request.urlopen(req, timeout=8) as resp:
                    if getattr(resp, "status", 200) >= 400:
                        logger.warning("Alert webhook returned HTTP %s for alert %s.", getattr(resp, "status", "?"), alert.id)
            except (error.HTTPError, error.URLError, TimeoutError, OSError) as exc:
                logger.warning("Alert webhook failed for alert %s: %s", alert.id, exc)

        if settings.alert_email_notification_configured:
            try:
                EmailService.send_alert_notification(subject=title, text_body=text_body)
            except Exception:
                logger.exception("Alert email notification failed for alert %s.", alert.id)

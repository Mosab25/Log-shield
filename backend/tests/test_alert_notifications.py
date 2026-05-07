from __future__ import annotations

from types import SimpleNamespace

from app.services.alert_notification_service import AlertNotificationService


def test_notify_skips_non_severe():
    alert = SimpleNamespace(severity="low", id=1, title="x", description="", status="open")
    AlertNotificationService.notify_if_severe(alert=alert)

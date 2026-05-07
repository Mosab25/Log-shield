from __future__ import annotations

from app.services.alert_service import AlertService


def test_investigating_may_close_as_false_positive():
    assert "false_positive" in AlertService.ALLOWED_TRANSITIONS["investigating"]


def test_open_may_enter_investigating():
    assert "investigating" in AlertService.ALLOWED_TRANSITIONS["open"]

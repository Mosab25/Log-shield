from __future__ import annotations

from types import SimpleNamespace

from app.services.detection_suppression import should_suppress_detection


def test_suppresses_trusted_ip():
    log = SimpleNamespace(src_ip="10.10.10.10", username="anyone")
    settings = SimpleNamespace(detection_trusted_ips_list=["10.10.10.10"], detection_ignore_usernames_set=set())
    assert should_suppress_detection(log, settings) is True


def test_suppresses_ignored_username():
    log = SimpleNamespace(src_ip="198.51.100.5", username="svc_backup")
    settings = SimpleNamespace(detection_trusted_ips_list=[], detection_ignore_usernames_set={"svc_backup"})
    assert should_suppress_detection(log, settings) is True


def test_does_not_suppress_normal_activity():
    log = SimpleNamespace(src_ip="198.51.100.5", username="jdoe")
    settings = SimpleNamespace(detection_trusted_ips_list=[], detection_ignore_usernames_set=set())
    assert should_suppress_detection(log, settings) is False

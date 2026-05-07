from __future__ import annotations

from app.core.config import Settings
from app.models.normalized_log import NormalizedLog


def should_suppress_detection(log: NormalizedLog, settings: Settings) -> bool:
    """Skip detection for trusted scanners or service accounts (noise reduction)."""
    trusted = settings.detection_trusted_ips_list
    if log.src_ip and log.src_ip.strip() in trusted:
        return True
    ignored = settings.detection_ignore_usernames_set
    if log.username and log.username.strip().lower() in ignored:
        return True
    return False

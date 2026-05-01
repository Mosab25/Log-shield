from __future__ import annotations

import json
import logging
from urllib import error, request

from app.core.config import settings

logger = logging.getLogger("logshield.email")


class EmailService:
    _RESEND_ENDPOINT = "https://api.resend.com/emails"

    @staticmethod
    def ensure_admin_2fa_delivery_ready() -> None:
        if settings.normalized_email_provider != "resend":
            if settings.is_development:
                logger.warning("Unsupported email provider configured for admin 2FA: %s", settings.normalized_email_provider)
            raise RuntimeError("Admin 2FA is enabled but email delivery is not configured.")
        if settings.admin_email_delivery_configured:
            return
        if settings.is_development:
            logger.warning("Admin 2FA email delivery is not configured for the current environment.")
        raise RuntimeError("Admin 2FA is enabled but email delivery is not configured.")

    @staticmethod
    def send_admin_verification_code(*, code: str, expires_in_minutes: int) -> None:
        EmailService.ensure_admin_2fa_delivery_ready()

        payload = {
            "from": settings.resend_from_email.strip(),
            "to": [settings.admin_security_email.strip()],
            "subject": "LogShield Admin Verification Code",
            "text": "\n".join(
                [
                    "Your LogShield admin verification code is:",
                    "",
                    code,
                    "",
                    f"This code expires in {expires_in_minutes} minutes.",
                    "",
                    "If you did not request this login, change your admin password and review audit logs immediately.",
                ]
            ),
        }
        body = json.dumps(payload).encode("utf-8")
        req = request.Request(
            EmailService._RESEND_ENDPOINT,
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key.strip()}",
                "Content-Type": "application/json",
                "User-Agent": "LogShield/1.0",
            },
        )
        timeout = max(5, settings.email_request_timeout_seconds)
        try:
            with request.urlopen(req, timeout=timeout) as response:
                status_code = getattr(response, "status", 0)
                if status_code >= 400:
                    raise RuntimeError("Unable to send the admin verification code. Please try again later.")
        except error.HTTPError as exc:
            logger.error("Admin 2FA email delivery failed via Resend with status %s.", exc.code)
            raise RuntimeError("Unable to send the admin verification code. Please try again later.") from exc
        except error.URLError as exc:
            logger.error("Admin 2FA email delivery failed: Resend unreachable.")
            raise RuntimeError("Unable to send the admin verification code. Please try again later.") from exc

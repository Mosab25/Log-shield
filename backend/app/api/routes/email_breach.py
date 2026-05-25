from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, HTTPException

from app.schemas.email_breach import (
    EmailBreachCheckRequest,
    EmailBreachCheckResponse,
    EmailBreachFinding,
    EmailBreachResult,
)
from app.services.breach_provider_service import BreachProviderConfigError, BreachProviderService

router = APIRouter()

EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
ADMIN_LIKE_PREFIXES = ("admin", "security", "support", "owner", "info", "contact", "webmaster", "billing")
SENSITIVE_CLASS_TOKENS = ("password", "pass", "auth", "token", "security question", "credential")
RISK_PRIORITY = {"low": 1, "medium": 2, "high": 3, "critical": 4}


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not local or not domain:
        return "***"
    if len(local) == 1:
        masked_local = "*"
    elif len(local) == 2:
        masked_local = f"{local[0]}*"
    else:
        masked_local = f"{local[0]}***{local[-1]}"
    return f"{masked_local}@{domain}"


def validate_and_normalize_emails(emails: list[str]) -> tuple[list[str], int]:
    normalized: list[str] = []
    seen: set[str] = set()
    invalid_count = 0
    for raw in emails:
        candidate = str(raw or "").strip().lower()
        if not candidate:
            invalid_count += 1
            continue
        if not EMAIL_REGEX.match(candidate):
            invalid_count += 1
            continue
        if candidate in seen:
            continue
        seen.add(candidate)
        normalized.append(candidate)
        if len(normalized) >= 100:
            break
    return normalized, invalid_count


def build_recommendations(
    exposed: bool,
    risk_level: str,
    admin_like: bool,
    sensitive_types_found: bool,
    status: str,
) -> list[str]:
    if status in {"unknown", "provider_error"}:
        return [
            "Retry the check later when provider connectivity is stable.",
            "Use account-level protections such as MFA and unique passwords.",
        ]
    if not exposed:
        return [
            "No known breach entries were returned for this email in the configured provider.",
            "Keep MFA enabled and avoid password reuse across services.",
        ]

    recommendations = [
        "Change reused passwords immediately.",
        "Enable 2FA on the account and related admin services.",
        "Use a password manager with unique passwords per service.",
        "Monitor suspicious login attempts and unusual account activity.",
    ]
    if admin_like:
        recommendations.append("Review privileged/admin mailbox access and recovery settings.")
    if sensitive_types_found:
        recommendations.append("Review sessions and revoke active tokens where supported.")
    if risk_level in {"high", "critical"}:
        recommendations.append("Prioritize this mailbox in your incident response workflow.")
    return recommendations


def assess_risk(email: str, status: str, breach_count: int, breaches: list[dict[str, Any]]) -> tuple[str, list[str]]:
    local = email.split("@", 1)[0].lower()
    admin_like = any(local.startswith(prefix) for prefix in ADMIN_LIKE_PREFIXES)
    classes = [cls.lower() for breach in breaches for cls in breach.get("data_classes", [])]
    sensitive_types_found = any(token in item for item in classes for token in SENSITIVE_CLASS_TOKENS)

    if status in {"unknown", "provider_error"}:
        risk = "low"
    elif status == "not_found":
        risk = "low"
    else:
        if breach_count >= 6 or (breach_count >= 3 and sensitive_types_found and admin_like):
            risk = "critical"
        elif breach_count >= 2 or sensitive_types_found or admin_like:
            risk = "high"
        else:
            risk = "medium"

    return risk, build_recommendations(True if status == "exposed" else False, risk, admin_like, sensitive_types_found, status)


def highest_risk(results: list[EmailBreachResult]) -> str:
    if not results:
        return "low"
    return max((result.risk_level for result in results), key=lambda value: RISK_PRIORITY.get(value, 1))


@router.post("/check", response_model=EmailBreachCheckResponse)
async def check_email_breach(request: EmailBreachCheckRequest) -> EmailBreachCheckResponse:
    if not request.authorized:
        raise HTTPException(status_code=400, detail="Please confirm you are authorized to check these email addresses.")

    normalized_emails, invalid_count = validate_and_normalize_emails(request.emails)
    if not normalized_emails:
        raise HTTPException(status_code=400, detail="No valid email addresses were found.")
    if invalid_count > 0:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if len(normalized_emails) > 100:
        raise HTTPException(status_code=400, detail="More than 100 emails were detected. Only the first 100 will be checked.")

    provider = BreachProviderService()
    if not provider.provider_settings_complete:
        raise HTTPException(status_code=503, detail="RapidAPI breach provider settings are incomplete.")
    if not provider.provider_configured:
        raise HTTPException(
            status_code=503,
            detail="RapidAPI breach provider is not configured. Add RAPIDAPI_BREACH_KEY to enable live checks.",
        )

    results: list[EmailBreachResult] = []
    findings: list[EmailBreachFinding] = []
    exposed_count = 0
    not_found_count = 0
    unknown_count = 0

    for idx, email in enumerate(normalized_emails, start=1):
        try:
            provider_result = await provider.check_email(email)
        except BreachProviderConfigError as exc:
            raise HTTPException(status_code=503, detail=str(exc))
        except Exception:
            provider_result = {
                "status": "provider_error",
                "exposed": False,
                "breach_count": 0,
                "breaches": [],
                "error": "The breach provider is currently unavailable. Please try again later.",
            }

        status = str(provider_result.get("status") or "unknown")
        breaches_raw = provider_result.get("breaches") if isinstance(provider_result.get("breaches"), list) else []
        breaches = [item for item in breaches_raw if isinstance(item, dict)]
        breach_count = int(provider_result.get("breach_count") or len(breaches))
        exposed = bool(provider_result.get("exposed")) and status == "exposed"
        risk_level, recommendations = assess_risk(email, status, breach_count, breaches)

        if status == "exposed":
            exposed_count += 1
        elif status == "not_found":
            not_found_count += 1
        else:
            unknown_count += 1

        result_item = EmailBreachResult(
            email=mask_email(email),
            email_normalized=email,
            exposed=exposed,
            status=status if status in {"exposed", "not_found", "unknown", "provider_error"} else "unknown",
            breach_count=breach_count,
            breaches=breaches,
            risk_level=risk_level,
            recommendations=recommendations,
        )
        results.append(result_item)

        if status == "exposed":
            findings.append(
                EmailBreachFinding(
                    id=f"EBR-{idx}",
                    title=f"Email exposure found for {result_item.email}",
                    severity="critical" if risk_level == "critical" else "high" if risk_level == "high" else "medium",
                    evidence=f"Breach records found: {breach_count}.",
                    impact=(
                        "This email appeared in breach records. If the same password was reused, "
                        "the account may be at risk."
                    ),
                    recommendation="Enable MFA and reset reused passwords across related services.",
                    priority=1 if risk_level in {"critical", "high"} else 2,
                )
            )
        elif status in {"unknown", "provider_error"}:
            findings.append(
                EmailBreachFinding(
                    id=f"EBR-U-{idx}",
                    title=f"Exposure check inconclusive for {result_item.email}",
                    severity="informational",
                    evidence=provider_result.get("note") or provider_result.get("error") or "Provider response was inconclusive.",
                    impact="The provider did not return a definitive exposure result for this email.",
                    recommendation="Retry later or verify against another authorized breach intelligence source.",
                    priority=3,
                )
            )

    top_priorities: list[str] = []
    if any(item.risk_level == "critical" for item in results):
        top_priorities.append("Reset passwords and enforce MFA immediately for critical-risk exposed emails.")
    if any(item.risk_level in {"high", "critical"} for item in results):
        top_priorities.append("Review admin/support mailbox access and monitor suspicious login activity.")
    if unknown_count > 0:
        top_priorities.append("Re-run unknown or provider-error entries once provider availability recovers.")
    if not top_priorities:
        top_priorities.append("Maintain strong account hygiene with MFA and unique passwords.")

    return EmailBreachCheckResponse(
        provider_configured=provider.provider_configured,
        summary={
            "total_checked": len(results),
            "exposed_count": exposed_count,
            "not_found_count": not_found_count,
            "unknown_count": unknown_count,
            "highest_risk": highest_risk(results),
            "top_priorities": top_priorities[:4],
        },
        results=results,
        findings=findings,
        safety_model={
            "authorized_confirmed": True,
            "passwords_collected": False,
            "credentials_tested": False,
            "emails_stored": False,
            "uploaded_files_stored": False,
            "external_provider_used": True,
            "note": "This tool checks email exposure using a configured provider and does not test credentials.",
        },
    )

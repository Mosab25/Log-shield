from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.alert import Alert
from app.models.audit_log import AuditLog
from app.models.incident import Incident
from app.models.ip_block import IPBlock
from app.models.user import User
from app.schemas.security_center import (
    Admin2FAInfo,
    Recommendation,
    RecentBlockedIP,
    RecentEvent,
    SecurityControl,
    SecurityMetrics,
    SecurityCenterSummary,
)


class SecurityCenterService:
    """Service for aggregating security posture data for admin dashboard."""

    @staticmethod
    def get_security_summary(db: Session) -> SecurityCenterSummary:
        """Get comprehensive security center summary."""
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        # Get security controls status
        controls = SecurityControlService.get_controls_status()

        # Get security metrics
        metrics = SecurityMetricsService.get_metrics(db, today)

        # Get recent security events
        recent_events = RecentEventsService.get_recent_events(db, limit=20)

        # Get recent blocked IPs
        recent_blocked_ips = BlockedIPsService.get_recent_blocked_ips(db, limit=10)

        # Get admin 2FA info
        admin_2fa = Admin2FAService.get_2fa_info()

        # Generate recommendations
        recommendations = RecommendationsService.generate_recommendations(controls, metrics)

        return SecurityCenterSummary(
            controls=controls,
            metrics=metrics,
            recent_events=recent_events,
            recent_blocked_ips=recent_blocked_ips,
            admin_2fa=admin_2fa,
            recommendations=recommendations,
        )


class SecurityControlService:
    """Service for checking security control status."""

    @staticmethod
    def get_controls_status() -> SecurityControl:
        """Get status of all security controls."""
        return SecurityControl(
            admin_2fa_enabled=settings.admin_2fa_enabled,
            root_admin_protected=bool(settings.root_admin_email),
            ip_blocking_enabled=True,  # IP blocks model exists
            rate_limiting_enabled=True,  # Rate limiting configured
            rbac_enabled=True,  # Role-based access control exists
            audit_logging_enabled=True,  # Audit logs model exists
        )


class SecurityMetricsService:
    """Service for calculating security metrics."""

    @staticmethod
    def get_metrics(db: Session, today: datetime) -> SecurityMetrics:
        """Calculate security metrics for today."""
        # Failed logins today
        failed_logins_today = (
            db.query(AuditLog)
            .filter(
                AuditLog.created_at >= today,
                AuditLog.action.in_(
                    [
                        "failed_login",
                        "failed_login_unknown_email", 
                        "failed_login_wrong_password",
                        "login_failed",
                    ]
                ),
            )
            .count()
        )

        # Admin logins today
        admin_logins_today = (
            db.query(AuditLog)
            .filter(
                AuditLog.created_at >= today,
                AuditLog.action.in_(
                    [
                        "admin_login_success",
                        "admin_2fa_success",
                    ]
                ),
            )
            .count()
        )

        # Active blocked IPs
        active_blocked_ips = (
            db.query(IPBlock)
            .filter(
                IPBlock.is_active == True,
                IPBlock.blocked_until.is_(None) | (IPBlock.blocked_until > datetime.now(timezone.utc)),
            )
            .count()
        )

        # Sensitive actions today
        sensitive_actions_today = (
            db.query(AuditLog)
            .filter(
                AuditLog.created_at >= today,
                AuditLog.action.in_(
                    [
                        "ip_block_created",
                        "ip_block_removed",
                        "role_changed",
                        "user_deactivated",
                        "user_deleted",
                        "root_admin_modification_blocked",
                        "root_admin_self_ip_block_denied",
                        "detection_rule_disabled",
                        "report_exported",
                        "user_sessions_revoked",
                        "admin_2fa_failed",
                        "admin_2fa_success",
                    ]
                ),
            )
            .count()
        )

        # Open critical alerts
        open_critical_alerts = (
            db.query(Alert)
            .filter(
                Alert.severity == "critical",
                Alert.status.in_(["open", "investigating"]),
            )
            .count()
        )

        # Open incidents
        open_incidents = (
            db.query(Incident)
            .filter(
                Incident.status.in_(["open", "investigating", "contained"]),
            )
            .count()
        )

        return SecurityMetrics(
            failed_logins_today=failed_logins_today,
            admin_logins_today=admin_logins_today,
            active_blocked_ips=active_blocked_ips,
            sensitive_actions_today=sensitive_actions_today,
            open_critical_alerts=open_critical_alerts,
            open_incidents=open_incidents,
        )


class RecentEventsService:
    """Service for getting recent security events."""

    @staticmethod
    def get_recent_events(db: Session, limit: int = 20) -> list[RecentEvent]:
        """Get recent security-relevant audit events."""
        security_actions = [
            "admin_login_success",
            "admin_2fa_success",
            "admin_2fa_failed",
            "failed_login",
            "failed_login_unknown_email",
            "failed_login_wrong_password",
            "ip_block_created",
            "ip_block_removed",
            "role_changed",
            "user_deactivated",
            "user_deleted",
            "root_admin_modification_blocked",
            "root_admin_self_ip_block_denied",
            "detection_rule_disabled",
            "report_exported",
            "user_sessions_revoked",
            "login_success",
        ]

        events = (
            db.query(AuditLog)
            .filter(AuditLog.action.in_(security_actions))
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )

        recent_events = []
        for event in events:
            # Generate summary based on action
            summary = RecentEventsService._generate_event_summary(event.action, event.details)

            recent_events.append(
                RecentEvent(
                    id=event.id,
                    action=event.action,
                    actor=event.actor.email if event.actor else None,
                    ip_address=event.ip_address,
                    entity_type=event.entity_type,
                    created_at=event.created_at,
                    summary=summary,
                )
            )

        return recent_events

    @staticmethod
    def _generate_event_summary(action: str, details: dict[str, Any]) -> str:
        """Generate human-readable summary for audit event."""
        summaries = {
            "admin_login_success": "Admin login completed successfully",
            "admin_2fa_success": "Admin 2FA verification completed",
            "admin_2fa_failed": "Admin 2FA verification failed",
            "failed_login": "Login attempt failed",
            "failed_login_unknown_email": "Login failed - unknown email",
            "failed_login_wrong_password": "Login failed - incorrect password",
            "ip_block_created": "IP address blocked",
            "ip_block_removed": "IP block removed",
            "role_changed": "User role modified",
            "user_deactivated": "User account deactivated",
            "user_deleted": "User account deleted",
            "root_admin_modification_blocked": "Root admin modification attempt blocked",
            "root_admin_self_ip_block_denied": "Root admin self IP block denied",
            "detection_rule_disabled": "Detection rule disabled",
            "report_exported": "Security report exported",
            "user_sessions_revoked": "User sessions revoked",
            "login_success": "User login successful",
        }

        return summaries.get(action, f"Security action: {action}")


class BlockedIPsService:
    """Service for getting recent blocked IPs."""

    @staticmethod
    def get_recent_blocked_ips(db: Session, limit: int = 10) -> list[RecentBlockedIP]:
        """Get recent active blocked IPs."""
        blocks = (
            db.query(IPBlock)
            .filter(
                IPBlock.is_active == True,
                IPBlock.blocked_until.is_(None) | (IPBlock.blocked_until > datetime.now(timezone.utc)),
            )
            .order_by(IPBlock.created_at.desc())
            .limit(limit)
            .all()
        )

        recent_blocks = []
        for block in blocks:
            # Determine source based on creation context
            source = "manual"  # Default to manual
            if block.reason and "automatic" in block.reason.lower():
                source = "automatic"

            recent_blocks.append(
                RecentBlockedIP(
                    id=block.id,
                    ip_address=block.ip_address,
                    reason=block.reason,
                    source=source,
                    is_active=block.is_active,
                    created_at=block.created_at,
                    expires_at=block.blocked_until,
                )
            )

        return recent_blocks


class Admin2FAService:
    """Service for admin 2FA configuration."""

    @staticmethod
    def get_2fa_info() -> Admin2FAInfo:
        """Get admin 2FA configuration info."""
        if not settings.admin_2fa_enabled or not settings.admin_security_email:
            return Admin2FAInfo(enabled=False, security_email_masked=None)

        # Mask the security email
        email = settings.admin_security_email
        if "@" in email:
            local, domain = email.split("@", 1)
            masked_local = local[0] + "*" * (len(local) - 2) + local[-1] if len(local) > 2 else local[0] + "*"
            masked_email = f"{masked_local}@{domain}"
        else:
            masked_email = email

        return Admin2FAInfo(
            enabled=True,
            method="Email OTP",
            security_email_masked=masked_email,
        )


class RecommendationsService:
    """Service for generating security recommendations."""

    @staticmethod
    def generate_recommendations(controls: SecurityControl, metrics: SecurityMetrics) -> list[Recommendation]:
        """Generate security recommendations based on controls and metrics."""
        recommendations = []

        # Admin 2FA recommendations
        if controls.admin_2fa_enabled:
            recommendations.append(
                Recommendation(
                    level="success",
                    title="Admin 2FA is enabled",
                    description="Administrator accounts have additional two-factor authentication protection.",
                )
            )
        else:
            recommendations.append(
                Recommendation(
                    level="warning",
                    title="Enable Admin 2FA",
                    description="Enable two-factor authentication for administrator accounts to enhance security.",
                )
            )

        # Root admin protection recommendations
        if controls.root_admin_protected:
            recommendations.append(
                Recommendation(
                    level="success",
                    title="Root admin protection is active",
                    description="The main administrator account is protected against deletion, deactivation, and privilege downgrade.",
                )
            )
        else:
            recommendations.append(
                Recommendation(
                    level="info",
                    title="Configure root admin protection",
                    description="Set up root admin email protection to prevent accidental or malicious modification of admin accounts.",
                )
            )

        # IP blocking recommendations
        if controls.ip_blocking_enabled:
            recommendations.append(
                Recommendation(
                    level="success",
                    title="IP blocking is active",
                    description="Defensive IP blocking is available to block suspicious source addresses.",
                )
            )

        # Rate limiting recommendations
        if controls.rate_limiting_enabled:
            recommendations.append(
                Recommendation(
                    level="success",
                    title="Rate limiting is enabled",
                    description="Login rate limiting helps reduce brute-force attack attempts.",
                )
            )

        # RBAC recommendations
        if controls.rbac_enabled:
            recommendations.append(
                Recommendation(
                    level="success",
                    title="Role-based access control is active",
                    description="User permissions are enforced through role-based access control.",
                )
            )

        # Audit logging recommendations
        if controls.audit_logging_enabled:
            recommendations.append(
                Recommendation(
                    level="success",
                    title="Audit logging is active",
                    description="Security-relevant actions are tracked for investigation and accountability.",
                )
            )

        # Failed logins recommendations
        if metrics.failed_logins_today > 10:
            recommendations.append(
                Recommendation(
                    level="warning",
                    title="High failed login count detected",
                    description=f"{metrics.failed_logins_today} failed login attempts today. Consider reviewing security logs.",
                )
            )
        elif metrics.failed_logins_today > 0:
            recommendations.append(
                Recommendation(
                    level="info",
                    title="Failed login attempts detected",
                    description=f"{metrics.failed_logins_today} failed login attempts today. Monitor for suspicious patterns.",
                )
            )

        # Critical alerts recommendations
        if metrics.open_critical_alerts > 0:
            recommendations.append(
                Recommendation(
                    level="critical",
                    title="Open critical alerts require attention",
                    description=f"{metrics.open_critical_alerts} critical alerts are currently open and need investigation.",
                )
            )

        # Open incidents recommendations
        if metrics.open_incidents > 5:
            recommendations.append(
                Recommendation(
                    level="warning",
                    title="Multiple open incidents",
                    description=f"{metrics.open_incidents} incidents are currently open. Consider resource allocation.",
                )
            )

        return recommendations

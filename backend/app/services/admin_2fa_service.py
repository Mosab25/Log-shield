from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_numeric_otp, hash_otp_code, verify_otp_code
from app.models.admin_otp_challenge import AdminOTPChallenge
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import Login2FARequiredResponse
from app.services.audit_service import AuditService
from app.services.email_service import EmailService


class Admin2FAService:
    @staticmethod
    def _now_utc() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def is_required_for_user(user: User) -> bool:
        return settings.admin_2fa_enabled and bool(user.role and user.role.name == "admin")

    @staticmethod
    def _expiry_minutes() -> int:
        return max(1, settings.admin_otp_expire_minutes)

    @staticmethod
    def _max_attempts() -> int:
        return max(1, settings.admin_otp_max_attempts)

    @staticmethod
    def mask_delivery_target() -> str | None:
        email = settings.admin_security_email.strip()
        if "@" not in email:
            return None
        username, domain = email.split("@", 1)
        first = username[:1] if username else "*"
        return f"{first}***@{domain}"

    @classmethod
    def _invalidate_existing_challenges(cls, db: Session, user_id: int) -> None:
        active_rows = db.execute(
            select(AdminOTPChallenge).where(
                AdminOTPChallenge.user_id == user_id,
                AdminOTPChallenge.used_at.is_(None),
                AdminOTPChallenge.expires_at > cls._now_utc(),
            )
        ).scalars().all()
        if not active_rows:
            return
        now = cls._now_utc()
        for row in active_rows:
            row.used_at = now

    @classmethod
    def create_challenge(
        cls,
        *,
        db: Session,
        user: User,
        source_ip: str,
        user_agent: str | None,
    ) -> Login2FARequiredResponse:
        try:
            EmailService.ensure_admin_2fa_delivery_ready()
        except RuntimeError as exc:
            AuditService.create_audit_log(
                db=db,
                actor_user_id=user.id,
                action="admin_2fa_email_failed",
                entity_type="user",
                entity_id=str(user.id),
                ip_address=source_ip,
                user_agent=user_agent,
                details={"email": user.email, "reason": "delivery_not_configured"},
            )
            db.commit()
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

        cls._invalidate_existing_challenges(db, user.id)

        code = generate_numeric_otp(6)
        challenge_id = secrets.token_urlsafe(24)
        challenge = AdminOTPChallenge(
            user_id=user.id,
            challenge_id=challenge_id,
            otp_hash=hash_otp_code(challenge_id, code),
            expires_at=cls._now_utc() + timedelta(minutes=cls._expiry_minutes()),
            max_attempts=cls._max_attempts(),
            ip_address=source_ip,
            user_agent=user_agent,
        )
        db.add(challenge)
        db.flush()
        AuditService.create_audit_log(
            db=db,
            actor_user_id=user.id,
            action="admin_2fa_challenge_created",
            entity_type="admin_otp_challenge",
            entity_id=str(challenge.id),
            ip_address=source_ip,
            user_agent=user_agent,
            details={
                "email": user.email,
                "challenge_id": challenge.challenge_id,
                "expires_at": challenge.expires_at.isoformat(),
            },
        )
        db.commit()

        try:
            EmailService.send_admin_verification_code(code=code, expires_in_minutes=cls._expiry_minutes())
        except Exception as exc:  # pragma: no cover - manual/runtime integration
            challenge = db.execute(select(AdminOTPChallenge).where(AdminOTPChallenge.challenge_id == challenge_id)).scalar_one()
            challenge.used_at = cls._now_utc()
            AuditService.create_audit_log(
                db=db,
                actor_user_id=user.id,
                action="admin_2fa_email_failed",
                entity_type="admin_otp_challenge",
                entity_id=str(challenge.id),
                ip_address=source_ip,
                user_agent=user_agent,
                details={"email": user.email, "challenge_id": challenge.challenge_id, "error": exc.__class__.__name__},
            )
            db.commit()
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to send the admin verification code. Please try again later.") from exc

        challenge = db.execute(select(AdminOTPChallenge).where(AdminOTPChallenge.challenge_id == challenge_id)).scalar_one()
        AuditService.create_audit_log(
            db=db,
            actor_user_id=user.id,
            action="admin_2fa_email_sent",
            entity_type="admin_otp_challenge",
            entity_id=str(challenge.id),
            ip_address=source_ip,
            user_agent=user_agent,
            details={"email": user.email, "challenge_id": challenge.challenge_id},
        )
        db.commit()

        return Login2FARequiredResponse(
            message="Verification code sent to the admin security email.",
            challenge_id=challenge.challenge_id,
            delivery_target=cls.mask_delivery_target(),
        )

    @classmethod
    def verify_challenge(
        cls,
        *,
        db: Session,
        challenge_id: str,
        code: str,
        source_ip: str,
        user_agent: str | None,
    ) -> tuple[str, str, User]:
        challenge = db.execute(select(AdminOTPChallenge).where(AdminOTPChallenge.challenge_id == challenge_id)).scalar_one_or_none()
        if challenge is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification challenge.")

        user = db.get(User, challenge.user_id)
        if user is None or not user.is_active:
            challenge.used_at = challenge.used_at or cls._now_utc()
            db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

        now = cls._now_utc()
        if challenge.used_at is not None:
            AuditService.create_audit_log(
                db=db,
                actor_user_id=user.id,
                action="admin_2fa_failed",
                entity_type="admin_otp_challenge",
                entity_id=str(challenge.id),
                ip_address=source_ip,
                user_agent=user_agent,
                details={"email": user.email, "challenge_id": challenge.challenge_id, "reason": "used_challenge"},
            )
            db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code has already been used.")

        if challenge.expires_at <= now:
            challenge.used_at = now
            AuditService.create_audit_log(
                db=db,
                actor_user_id=user.id,
                action="admin_2fa_expired",
                entity_type="admin_otp_challenge",
                entity_id=str(challenge.id),
                ip_address=source_ip,
                user_agent=user_agent,
                details={"email": user.email, "challenge_id": challenge.challenge_id},
            )
            db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired. Please sign in again.")

        if challenge.attempts >= challenge.max_attempts:
            challenge.used_at = now
            AuditService.create_audit_log(
                db=db,
                actor_user_id=user.id,
                action="admin_2fa_max_attempts_exceeded",
                entity_type="admin_otp_challenge",
                entity_id=str(challenge.id),
                ip_address=source_ip,
                user_agent=user_agent,
                details={"email": user.email, "challenge_id": challenge.challenge_id},
            )
            db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum verification attempts exceeded. Please sign in again.")

        if not verify_otp_code(challenge.challenge_id, code, challenge.otp_hash):
            challenge.attempts += 1
            AuditService.create_audit_log(
                db=db,
                actor_user_id=user.id,
                action="admin_2fa_failed",
                entity_type="admin_otp_challenge",
                entity_id=str(challenge.id),
                ip_address=source_ip,
                user_agent=user_agent,
                details={
                    "email": user.email,
                    "challenge_id": challenge.challenge_id,
                    "attempts": challenge.attempts,
                    "max_attempts": challenge.max_attempts,
                    "reason": "invalid_code",
                },
            )
            if challenge.attempts >= challenge.max_attempts:
                challenge.used_at = now
                AuditService.create_audit_log(
                    db=db,
                    actor_user_id=user.id,
                    action="admin_2fa_max_attempts_exceeded",
                    entity_type="admin_otp_challenge",
                    entity_id=str(challenge.id),
                    ip_address=source_ip,
                    user_agent=user_agent,
                    details={"email": user.email, "challenge_id": challenge.challenge_id},
                )
                db.commit()
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum verification attempts exceeded. Please sign in again.")
            db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid verification code.")

        challenge.used_at = now
        user.last_login_at = now
        from app.core.security import create_access_token, create_refresh_token

        access_token = create_access_token(user.id, {"role": user.role.name if user.role else None})
        refresh_token, expires_at = create_refresh_token(user.id)
        db.add(RefreshToken(user_id=user.id, token=refresh_token, expires_at=expires_at, revoked=False))
        AuditService.create_audit_log(
            db=db,
            actor_user_id=user.id,
            action="admin_2fa_success",
            entity_type="admin_otp_challenge",
            entity_id=str(challenge.id),
            ip_address=source_ip,
            user_agent=user_agent,
            details={"email": user.email, "challenge_id": challenge.challenge_id},
        )
        AuditService.create_audit_log(
            db=db,
            actor_user_id=user.id,
            action="login_success",
            entity_type="user",
            entity_id=str(user.id),
            ip_address=source_ip,
            user_agent=user_agent,
            details={"email": user.email, "two_factor": True},
        )
        db.commit()
        db.refresh(user)
        return access_token, refresh_token, user

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_password_hash,
    validate_password_strength,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.role import Role
from app.models.user import User
from app.models.raw_log import RawLog
from app.models.normalized_log import NormalizedLog
from app.models.alert import Alert
from app.models.detection_rule import DetectionRule
from app.schemas.auth import Login2FARequiredResponse, LoginRequest, RegisterRequest
from app.services.admin_2fa_service import Admin2FAService
from app.services.audit_service import AuditService
from app.services.detection_engine import DetectionEngine
from app.services.parser_service import ParserService


@dataclass
class FailedLoginIPState:
    failed_attempts: int = 0
    blocked_until: datetime | None = None
    last_failed_at: datetime | None = None


_ip_failures: dict[str, FailedLoginIPState] = {}


class AuthService:
    INVALID_CREDENTIALS_MESSAGE = "Invalid email or password."
    TEMP_BLOCK_MESSAGE = "Too many failed attempts. Please try again later."

    @staticmethod
    def _now_utc() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _max_failed_attempts() -> int:
        return max(1, settings.login_max_failed_attempts)

    @staticmethod
    def _ip_block_minutes() -> int:
        return max(1, settings.login_ip_block_minutes)

    @staticmethod
    def _attempt_window_seconds() -> int:
        return AuthService._ip_block_minutes() * 60

    @staticmethod
    def _check_ip_block(source_ip: str) -> int | None:
        state = _ip_failures.get(source_ip)
        if not state:
            return None
        now = AuthService._now_utc()

        if state.last_failed_at and (now - state.last_failed_at).total_seconds() > AuthService._attempt_window_seconds():
            state.failed_attempts = 0

        if state.blocked_until and now < state.blocked_until:
            remaining = int((state.blocked_until - now).total_seconds()) + 1
            return max(1, remaining)
        if state.blocked_until and now >= state.blocked_until:
            state.blocked_until = None
            state.failed_attempts = 0
        return None

    @staticmethod
    def _record_ip_failure(
        *,
        db: Session,
        source_ip: str,
        email: str,
        user_agent: str | None,
    ) -> FailedLoginIPState:
        now = AuthService._now_utc()
        state = _ip_failures.get(source_ip) or FailedLoginIPState()

        if state.last_failed_at and (now - state.last_failed_at).total_seconds() > AuthService._attempt_window_seconds():
            state.failed_attempts = 0

        state.failed_attempts += 1
        state.last_failed_at = now

        if state.failed_attempts >= AuthService._max_failed_attempts():
            state.blocked_until = now + timedelta(minutes=AuthService._ip_block_minutes())

        _ip_failures[source_ip] = state

        AuthService._emit_failed_login_security_event(
            db=db,
            source_ip=source_ip,
            email=email,
            user_agent=user_agent,
            failed_attempts=state.failed_attempts,
            blocked_until=state.blocked_until,
        )

        AuditService.create_audit_log(
            db=db,
            actor_user_id=None,
            action="failed_login_wrong_password",
            entity_type="ip_address",
            entity_id=source_ip,
            ip_address=source_ip,
            user_agent=user_agent,
            details={
                "email": email,
                "failed_attempts": state.failed_attempts,
                "blocked_until": state.blocked_until.isoformat() if state.blocked_until else None,
                "last_failed_at": state.last_failed_at.isoformat() if state.last_failed_at else None,
            },
        )

        if state.blocked_until:
            AuditService.create_audit_log(
                db=db,
                actor_user_id=None,
                action="ip_temporarily_blocked",
                entity_type="ip_address",
                entity_id=source_ip,
                ip_address=source_ip,
                user_agent=user_agent,
                details={
                    "email": email,
                    "failed_attempts": state.failed_attempts,
                    "blocked_until": state.blocked_until.isoformat(),
                    "last_failed_at": state.last_failed_at.isoformat() if state.last_failed_at else None,
                },
            )

        return state

    @staticmethod
    def _emit_failed_login_security_event(
        *,
        db: Session,
        source_ip: str,
        email: str,
        user_agent: str | None,
        failed_attempts: int,
        blocked_until: datetime | None,
    ) -> None:
        """Emit auth failure into logs/normalization/detection pipeline for SOC visibility."""
        now = AuthService._now_utc()
        username = email.split("@", 1)[0] if "@" in email else email
        raw = RawLog(
            source="auth-login",
            source_type="auth_service",
            raw_message=f"Failed login for user {username} from {source_ip}",
            received_at=now,
            event_time=now,
            parsed_json={
                "metadata": {
                    "event_name": "login_failed",
                    "username": username,
                    "result": "failed",
                    "user_agent": user_agent,
                    "failed_attempts": failed_attempts,
                    "blocked_until": blocked_until.isoformat() if blocked_until else None,
                    "auth_origin": "auth_service",
                }
            },
            ingestion_status="received",
            ip_address=source_ip,
            hostname="auth-service",
            event_metadata={
                "event_name": "login_failed",
                "username": username,
                "result": "failed",
                "user_agent": user_agent,
                "failed_attempts": failed_attempts,
                "blocked_until": blocked_until.isoformat() if blocked_until else None,
                "auth_origin": "auth_service",
            },
        )
        db.add(raw)
        db.flush()

        parsed = ParserService.parse(raw)
        normalized = NormalizedLog(
            raw_log_id=raw.id,
            event_time=parsed["event_time"],
            source=parsed["source"],
            source_type=parsed["source_type"],
            event_type=parsed["event_type"],
            username=parsed.get("username"),
            src_ip=parsed.get("src_ip"),
            user_agent=parsed.get("user_agent"),
            hostname=parsed.get("hostname"),
            status=parsed.get("status"),
            http_method=parsed.get("http_method"),
            path=parsed.get("path"),
            status_code=parsed.get("status_code"),
            message=parsed["message"],
            severity=parsed["severity"],
            parser_status=parsed["parser_status"],
            event_metadata=parsed.get("metadata") or {},
        )
        raw.ingestion_status = "normalized"
        db.add(normalized)
        db.flush()
        created = DetectionEngine.run_single(db=db, normalized_log_id=normalized.id, current_user=None)
        should_force_bruteforce_alert = (
            blocked_until is not None
            or failed_attempts >= settings.detection_brute_force_threshold
        )
        if not created and should_force_bruteforce_alert:
            AuthService._create_bruteforce_fallback_alert(
                db=db,
                normalized_log=normalized,
                failed_attempts=failed_attempts,
            )

    @staticmethod
    def _create_bruteforce_fallback_alert(*, db: Session, normalized_log: NormalizedLog, failed_attempts: int) -> None:
        rule = db.execute(
            select(DetectionRule).where(
                DetectionRule.name == "Brute Force Login",
                DetectionRule.is_active.is_(True),
            )
        ).scalar_one_or_none()

        existing = db.execute(
            select(Alert).where(
                Alert.normalized_log_id == normalized_log.id,
                Alert.title == f"Brute Force Login: {normalized_log.source}",
            )
        ).scalar_one_or_none()
        if existing is not None:
            return

        alert = Alert(
            title=f"Brute Force Login: {normalized_log.source}",
            description=(
                f"{failed_attempts} failed login attempts detected for "
                f"{normalized_log.username or 'unknown user'} from {normalized_log.src_ip or 'unknown ip'}."
            ),
            severity="critical",
            status="open",
            risk_score=85,
            normalized_log_id=normalized_log.id,
            detection_rule_id=rule.id if rule is not None else None,
            detection_explanation=(
                "Auth-service fallback detection: repeated failed login attempts reached "
                f"threshold {settings.detection_brute_force_threshold} within authentication flow."
            ),
        )
        db.add(alert)
        db.commit()

    @staticmethod
    def _clear_ip_failures(source_ip: str) -> None:
        _ip_failures.pop(source_ip, None)

    @staticmethod
    def authenticate(db: Session, payload: LoginRequest, source_ip: str, user_agent: str | None) -> User:
        user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
        if user is None:
            state = AuthService._record_ip_failure(
                db=db,
                source_ip=source_ip,
                email=str(payload.email),
                user_agent=user_agent,
            )
            AuditService.create_audit_log(
                db=db,
                actor_user_id=None,
                action="failed_login_unknown_email",
                entity_type="user",
                entity_id=str(payload.email),
                ip_address=source_ip,
                user_agent=user_agent,
                details={"email": str(payload.email)},
            )
            db.commit()
            if state.blocked_until:
                remaining_seconds = int((state.blocked_until - AuthService._now_utc()).total_seconds()) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=AuthService.TEMP_BLOCK_MESSAGE,
                    headers={"Retry-After": str(max(1, remaining_seconds))},
                )
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=AuthService.INVALID_CREDENTIALS_MESSAGE)

        remaining_block_seconds = AuthService._check_ip_block(source_ip)
        state = _ip_failures.get(source_ip)
        if remaining_block_seconds and state and state.blocked_until:
            AuditService.create_audit_log(
                db=db,
                actor_user_id=user.id,
                action="ip_temporarily_blocked",
                entity_type="user",
                entity_id=str(user.id),
                ip_address=source_ip,
                user_agent=user_agent,
                details={"email": user.email, "blocked_until": state.blocked_until.isoformat()},
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=AuthService.TEMP_BLOCK_MESSAGE,
                headers={"Retry-After": str(remaining_block_seconds)},
            )

        if not verify_password(payload.password, user.hashed_password):
            state = AuthService._record_ip_failure(
                db=db,
                source_ip=source_ip,
                email=str(payload.email),
                user_agent=user_agent,
            )
            db.commit()

            if state.blocked_until:
                remaining_seconds = int((state.blocked_until - AuthService._now_utc()).total_seconds()) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=AuthService.TEMP_BLOCK_MESSAGE,
                    headers={"Retry-After": str(max(1, remaining_seconds))},
                )

            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=AuthService.INVALID_CREDENTIALS_MESSAGE)
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive.")
        AuthService._clear_ip_failures(source_ip)
        return user

    @staticmethod
    def register(
        db: Session,
        payload: RegisterRequest,
        *,
        source_ip: str,
        user_agent: str | None,
    ) -> User:
        full_name = payload.full_name.strip()
        if len(full_name) < 2:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Full name is required")
        try:
            validate_password_strength(payload.password)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password does not meet security requirements") from exc

        existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        viewer_role = db.execute(select(Role).where(Role.name == "viewer")).scalar_one_or_none()
        if viewer_role is None:
            viewer_role = Role(name="viewer", description="Read-only access.")
            db.add(viewer_role)
            db.flush()

        user = User(
            email=str(payload.email),
            full_name=full_name,
            hashed_password=get_password_hash(payload.password),
            role_id=viewer_role.id,
            is_active=True,
        )
        db.add(user)
        db.flush()
        AuditService.create_audit_log(
            db=db,
            actor_user_id=None,
            action="user_registered",
            entity_type="user",
            entity_id=str(user.id),
            ip_address=source_ip,
            user_agent=user_agent,
            details={"email": user.email, "role": "viewer"},
        )
        db.commit()
        db.refresh(user)
        return user

    @classmethod
    def login(
        cls,
        db: Session,
        payload: LoginRequest,
        *,
        source_ip: str,
        user_agent: str | None,
    ) -> tuple[str, str, User] | Login2FARequiredResponse:
        user = cls.authenticate(db, payload, source_ip=source_ip, user_agent=user_agent)
        if Admin2FAService.is_required_for_user(user):
            return Admin2FAService.create_challenge(db=db, user=user, source_ip=source_ip, user_agent=user_agent)
        user.last_login_at = datetime.now(timezone.utc)
        access_token = create_access_token(user.id, {"role": user.role.name if user.role else None})
        refresh_token, expires_at = create_refresh_token(user.id)
        db.add(RefreshToken(user_id=user.id, token=refresh_token, expires_at=expires_at, revoked=False))
        AuditService.create_audit_log(
            db=db,
            actor_user_id=user.id,
            action="login_success",
            entity_type="user",
            entity_id=str(user.id),
            ip_address=source_ip,
            user_agent=user_agent,
            details={"email": user.email},
        )
        db.commit()
        db.refresh(user)
        return access_token, refresh_token, user

    @staticmethod
    def refresh(db: Session, refresh_token: str) -> str:
        try:
            payload = decode_refresh_token(refresh_token)
        except JWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.") from exc

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

        token_row = db.execute(select(RefreshToken).where(RefreshToken.token == refresh_token, RefreshToken.revoked.is_(False))).scalar_one_or_none()
        if token_row is None or token_row.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired or revoked.")

        user = db.get(User, int(payload["sub"]))
        if user is None or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

        return create_access_token(user.id, {"role": user.role.name if user.role else None})

    @staticmethod
    def logout(db: Session, refresh_token: str) -> None:
        token_row = db.execute(select(RefreshToken).where(RefreshToken.token == refresh_token)).scalar_one_or_none()
        if token_row:
            token_row.revoked = True
            AuditService.create_audit_log(db=db, actor_user_id=token_row.user_id, action="auth.logout", entity_type="user", entity_id=str(token_row.user_id), details={})
            db.commit()

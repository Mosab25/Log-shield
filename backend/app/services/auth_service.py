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
from app.schemas.auth import Login2FARequiredResponse, LoginRequest, RegisterRequest
from app.services.admin_2fa_service import Admin2FAService
from app.services.audit_service import AuditService


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

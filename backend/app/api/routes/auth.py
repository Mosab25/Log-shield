from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, LogoutRequest, MessageResponse, RefreshResponse, RegisterRequest, RegisterResponse, TokenRefreshRequest
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter()


def _extract_source_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()
        if ip:
            return ip
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Annotated[Session, Depends(get_db)]) -> LoginResponse:
    source_ip = _extract_source_ip(request)
    user_agent = request.headers.get("user-agent")
    access, refresh, user = AuthService.login(db, payload, source_ip=source_ip, user_agent=user_agent)
    return LoginResponse(access_token=access, refresh_token=refresh, expires_in=settings.access_token_expire_minutes * 60, user=UserResponse.model_validate(user))


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(payload: RegisterRequest, request: Request, db: Annotated[Session, Depends(get_db)]) -> RegisterResponse:
    source_ip = _extract_source_ip(request)
    user_agent = request.headers.get("user-agent")
    user = AuthService.register(db, payload, source_ip=source_ip, user_agent=user_agent)
    return RegisterResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.name if user.role else "viewer",
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.post("/refresh", response_model=RefreshResponse)
def refresh(payload: TokenRefreshRequest, db: Annotated[Session, Depends(get_db)]) -> RefreshResponse:
    access = AuthService.refresh(db, payload.refresh_token)
    return RefreshResponse(access_token=access, expires_in=settings.access_token_expire_minutes * 60)


@router.post("/logout", response_model=MessageResponse)
def logout(payload: LogoutRequest, db: Annotated[Session, Depends(get_db)]) -> MessageResponse:
    AuthService.logout(db, payload.refresh_token)
    return MessageResponse(message="Logged out successfully.")


@router.get("/me", response_model=UserResponse)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user

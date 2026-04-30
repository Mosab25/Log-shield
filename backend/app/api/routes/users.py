from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserActivationResponse, UserCreate, UserDeleteResponse, UserListResponse, UserResponse, UserRoleUpdate, UserUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.post("", response_model=UserResponse, status_code=201)
def create_user(payload: UserCreate, db: Annotated[Session, Depends(get_db)], current_admin: Annotated[User, Depends(require_admin)]):
    return UserService.create_user(db=db, payload=payload, actor_user_id=current_admin.id)


@router.get("", response_model=UserListResponse)
def list_users(db: Annotated[Session, Depends(get_db)], current_admin: Annotated[User, Depends(require_admin)], skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), role_name: str | None = None, is_active: bool | None = None):
    total, users = UserService.list_users(db=db, skip=skip, limit=limit, role_name=role_name, is_active=is_active)
    return UserListResponse(total=total, items=[UserResponse.model_validate(user) for user in users])


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Annotated[Session, Depends(get_db)], current_admin: Annotated[User, Depends(require_admin)]):
    return UserService.get_user_by_id(db=db, user_id=user_id)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, payload: UserUpdate, db: Annotated[Session, Depends(get_db)], current_admin: Annotated[User, Depends(require_admin)]):
    return UserService.update_user(db=db, user_id=user_id, payload=payload, actor_user_id=current_admin.id)


@router.patch("/{user_id}/activate", response_model=UserActivationResponse)
def activate_user(user_id: int, db: Annotated[Session, Depends(get_db)], current_admin: Annotated[User, Depends(require_admin)]):
    user = UserService.activate_user(db=db, user_id=user_id, actor_user_id=current_admin.id)
    return UserActivationResponse(message="User activated successfully.", user=UserResponse.model_validate(user))


@router.patch("/{user_id}/deactivate", response_model=UserActivationResponse)
def deactivate_user(user_id: int, db: Annotated[Session, Depends(get_db)], current_admin: Annotated[User, Depends(require_admin)]):
    user = UserService.deactivate_user(db=db, user_id=user_id, actor_user_id=current_admin.id)
    return UserActivationResponse(message="User deactivated successfully.", user=UserResponse.model_validate(user))


@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(user_id: int, payload: UserRoleUpdate, db: Annotated[Session, Depends(get_db)], current_admin: Annotated[User, Depends(require_admin)]):
    return UserService.update_user_role(db=db, user_id=user_id, role_name=payload.role_name, actor_user_id=current_admin.id)


@router.delete("/{user_id}", response_model=UserDeleteResponse)
def delete_user(user_id: int, db: Annotated[Session, Depends(get_db)], current_admin: Annotated[User, Depends(require_admin)]):
    user = UserService.deactivate_user(db=db, user_id=user_id, actor_user_id=current_admin.id)
    return UserDeleteResponse(message="User account deactivated successfully.", user_id=user.id, is_active=user.is_active)

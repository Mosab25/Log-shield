from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.audit_service import AuditService


class UserService:
    @staticmethod
    def get_role_by_name(db: Session, role_name: str) -> Role:
        role = db.execute(select(Role).where(Role.name == role_name)).scalar_one_or_none()
        if role is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role '{role_name}' was not found.")
        return role

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> User:
        user = db.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User was not found.")
        return user

    @classmethod
    def create_default_roles(cls, db: Session) -> None:
        defaults = {
            "admin": "Full administrative access.",
            "analyst": "SOC analyst with investigation access.",
            "viewer": "Read-only access.",
        }
        for name, description in defaults.items():
            if db.execute(select(Role).where(Role.name == name)).scalar_one_or_none() is None:
                db.add(Role(name=name, description=description))
        db.commit()

    @classmethod
    def create_user(cls, *, db: Session, payload: UserCreate, actor_user_id: int | None) -> User:
        existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")

        role = cls.get_role_by_name(db, payload.role_name)
        user = User(
            email=str(payload.email),
            full_name=payload.full_name,
            hashed_password=get_password_hash(payload.password),
            role_id=role.id,
            is_active=payload.is_active,
        )
        db.add(user)
        db.flush()
        AuditService.create_audit_log(
            db=db,
            actor_user_id=actor_user_id,
            action="users.create",
            entity_type="user",
            entity_id=str(user.id),
            details={"email": user.email, "role": role.name},
        )
        db.commit()
        db.refresh(user)
        return user

    @classmethod
    def list_users(cls, *, db: Session, skip: int, limit: int, role_name: str | None, is_active: bool | None) -> tuple[int, list[User]]:
        query = select(User)
        count_query = select(func.count(User.id))

        if role_name:
            role = cls.get_role_by_name(db, role_name)
            query = query.where(User.role_id == role.id)
            count_query = count_query.where(User.role_id == role.id)

        if is_active is not None:
            query = query.where(User.is_active == is_active)
            count_query = count_query.where(User.is_active == is_active)

        total = db.execute(count_query).scalar_one()
        users = db.execute(query.order_by(User.created_at.desc()).offset(skip).limit(limit)).scalars().all()
        return total, list(users)

    @classmethod
    def update_user(cls, *, db: Session, user_id: int, payload: UserUpdate, actor_user_id: int) -> User:
        user = cls.get_user_by_id(db, user_id)

        if payload.email is not None and payload.email != user.email:
            exists = db.execute(select(User).where(User.email == payload.email, User.id != user.id)).scalar_one_or_none()
            if exists:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")
            user.email = str(payload.email)

        if payload.full_name is not None:
            user.full_name = payload.full_name
        if payload.password:
            user.hashed_password = get_password_hash(payload.password)
        if payload.is_active is not None:
            user.is_active = payload.is_active

        AuditService.create_audit_log(
            db=db,
            actor_user_id=actor_user_id,
            action="users.update",
            entity_type="user",
            entity_id=str(user.id),
            details={"email": user.email},
        )
        db.commit()
        db.refresh(user)
        return user

    @classmethod
    def activate_user(cls, *, db: Session, user_id: int, actor_user_id: int) -> User:
        user = cls.get_user_by_id(db, user_id)
        user.is_active = True
        AuditService.create_audit_log(db=db, actor_user_id=actor_user_id, action="users.activate", entity_type="user", entity_id=str(user.id), details={"email": user.email})
        db.commit()
        db.refresh(user)
        return user

    @classmethod
    def deactivate_user(cls, *, db: Session, user_id: int, actor_user_id: int) -> User:
        user = cls.get_user_by_id(db, user_id)
        if user.id == actor_user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admins cannot deactivate their own account.")
        user.is_active = False
        AuditService.create_audit_log(db=db, actor_user_id=actor_user_id, action="users.deactivate", entity_type="user", entity_id=str(user.id), details={"email": user.email})
        db.commit()
        db.refresh(user)
        return user

    @classmethod
    def update_user_role(cls, *, db: Session, user_id: int, role_name: str, actor_user_id: int) -> User:
        user = cls.get_user_by_id(db, user_id)
        if user.id == actor_user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admins cannot change their own role.")
        role = cls.get_role_by_name(db, role_name)
        old_role = user.role.name if user.role else None
        user.role_id = role.id
        AuditService.create_audit_log(
            db=db,
            actor_user_id=actor_user_id,
            action="users.role_update",
            entity_type="user",
            entity_id=str(user.id),
            details={"email": user.email, "old_role": old_role, "new_role": role.name},
        )
        db.commit()
        db.refresh(user)
        return user

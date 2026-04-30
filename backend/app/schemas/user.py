from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator

from app.core.security import validate_password_strength

RoleName = Literal["admin", "analyst", "viewer"]
ALLOWED_ROLE_NAMES = {"admin", "analyst", "viewer"}


class RoleResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=150)
    password: str = Field(..., min_length=10)
    role_name: RoleName = "viewer"
    is_active: bool = True

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        validate_password_strength(value)
        return value


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    password: str | None = Field(default=None, min_length=10)
    is_active: bool | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str | None) -> str | None:
        if value:
            validate_password_strength(value)
        return value


class UserRoleUpdate(BaseModel):
    role_name: RoleName


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    role: RoleResponse
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    total: int
    items: list[UserResponse]


class UserDeleteResponse(BaseModel):
    message: str
    user_id: int
    is_active: bool


class UserActivationResponse(BaseModel):
    message: str
    user: UserResponse

from datetime import datetime, timedelta
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, EmailStr, Field

from app.core.database import get_db
from app.core.security import (
    create_access_token, create_refresh_token, decode_token,
    verify_password, get_password_hash, oauth2_scheme,
    blacklist_token, is_token_blacklisted,
)
from app.core.config import settings
from app.models import User, UserRole, PsychologistProfile, School, Student
from app.api.dependencies import get_current_active_user, require_roles  # noqa: F401

router = APIRouter()


def _role_value(role: UserRole | str) -> str:
    return role.value if hasattr(role, "value") else str(role)


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    class StudentProfileResponse(BaseModel):
        id: UUID
        internal_id: str

        class Config:
            from_attributes = True

    class PsychologistProfileResponse(BaseModel):
        id: UUID

        class Config:
            from_attributes = True

    id: UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime]
    created_at: datetime
    school_id: Optional[UUID]
    student_profile: Optional[StudentProfileResponse] = None
    psychologist_profile: Optional[PsychologistProfileResponse] = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    user: UserResponse
    token: Token


class LogoutResponse(BaseModel):
    message: str


@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .options(selectinload(User.student_profile), selectinload(User.psychologist_profile))
        .where(User.email == credentials.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    user.last_login = datetime.utcnow()
    await db.commit()

    token_data = {"sub": str(user.id), "role": _role_value(user.role)}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    return LoginResponse(
        user=UserResponse.model_validate(user),
        token=Token(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .options(selectinload(User.student_profile), selectinload(User.psychologist_profile))
        .where(User.id == current_user.id)
    )
    user = result.scalar_one()
    return UserResponse.model_validate(user)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    if is_token_blacklisted(body.refresh_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type, expected refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(
        select(User)
        .options(selectinload(User.student_profile), selectinload(User.psychologist_profile))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    blacklist_token(body.refresh_token)

    token_data = {"sub": str(user.id), "role": _role_value(user.role)}
    new_access = create_access_token(data=token_data)
    new_refresh = create_refresh_token(data=token_data)

    return Token(
        access_token=new_access,
        refresh_token=new_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    token: str = Depends(oauth2_scheme),
):
    blacklist_token(token)
    return LogoutResponse(message="Logged out successfully")

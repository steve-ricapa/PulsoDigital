from datetime import datetime, timedelta
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, EmailStr, Field

from app.core.database import get_db
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.config import settings
from app.models import User, UserRole, PsychologistProfile, School, Student
from app.api.dependencies import get_current_active_user, require_roles  # noqa: F401

router = APIRouter()


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime]
    created_at: datetime
    school_id: Optional[UUID]
    
    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    user: UserResponse
    token: Token


@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.email == credentials.email)
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
    
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    
    return LoginResponse(
        user=UserResponse.model_validate(user),
        token=Token(
            access_token=access_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
):
    return UserResponse.model_validate(current_user)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: User = Depends(get_current_active_user),
):
    access_token = create_access_token(
        data={"sub": str(current_user.id), "role": current_user.role.value}
    )
    return Token(access_token=access_token, expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
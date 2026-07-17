from datetime import datetime
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel, Field


class StudentBase(BaseModel):
    internal_id: str = Field(..., min_length=1, max_length=50)
    classroom_id: UUID
    birth_date: Optional[datetime] = None
    gender: Optional[str] = Field(None, max_length=20)


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    internal_id: Optional[str] = Field(None, min_length=1, max_length=50)
    classroom_id: Optional[UUID] = None
    birth_date: Optional[datetime] = None
    gender: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None


class StudentResponse(StudentBase):
    id: UUID
    school_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StudentListResponse(BaseModel):
    students: List[StudentResponse]
    total: int
    page: int
    size: int
    pages: int


class StudentDetailResponse(StudentResponse):
    classroom: Optional[dict] = None
    school: Optional[dict] = None
    recent_wellbeing: Optional[List[dict]] = None
    risk_level: Optional[str] = None
    pending_support_requests: int = 0

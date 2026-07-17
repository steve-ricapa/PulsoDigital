from datetime import datetime
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models import SurveyStatus


class QuestionBase(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    question_type: str
    category: str = Field(..., min_length=1, max_length=50)
    options: Optional[str] = None
    min_value: Optional[int] = None
    max_value: Optional[int] = None
    is_required: bool = True


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    text: Optional[str] = Field(None, min_length=1, max_length=500)
    question_type: Optional[str] = None
    category: Optional[str] = None
    options: Optional[str] = None
    min_value: Optional[int] = None
    max_value: Optional[int] = None
    is_required: Optional[bool] = None
    is_active: Optional[bool] = None


class QuestionResponse(QuestionBase):
    id: UUID
    survey_id: UUID
    order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SurveyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    school_id: UUID
    start_date: datetime
    end_date: datetime
    frequency_weeks: int = 1
    is_anonymous: bool = False


class SurveyCreate(SurveyBase):
    pass


class SurveyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[SurveyStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    frequency_weeks: Optional[int] = None
    is_anonymous: Optional[bool] = None


class SurveyResponse(SurveyBase):
    id: UUID
    status: SurveyStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SurveyDetailResponse(SurveyResponse):
    questions: Optional[List[QuestionResponse]] = None


class SurveyListResponse(BaseModel):
    surveys: List[SurveyResponse]
    total: int
    page: int
    size: int
    pages: int

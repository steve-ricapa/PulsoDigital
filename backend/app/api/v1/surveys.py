from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_active_user, require_roles
from app.models import Survey, Question, QuestionType, SurveyStatus, User
from app.schemas.survey import (
    SurveyCreate,
    SurveyUpdate,
    SurveyResponse,
    SurveyListResponse,
    SurveyDetailResponse,
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
)


router = APIRouter()


@router.post("", response_model=SurveyResponse, status_code=status.HTTP_201_CREATED)
async def create_survey(
    request: Request,
    survey_data: SurveyCreate,
    current_user: User = Depends(require_roles("admin", "school_admin")),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == "school_admin":
        survey_data.school_id = current_user.school_id
    
    school = await db.get(School, survey_data.school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    survey = Survey(**survey_data.model_dump())
    db.add(survey)
    await db.commit()
    await db.refresh(survey)
    
    return SurveyResponse.model_validate(survey)


@router.get("", response_model=SurveyListResponse)
async def list_surveys(
    school_id: Optional[UUID] = Query(None),
    status: Optional[SurveyStatus] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Survey).options(selectinload(Survey.school))
    
    if current_user.role == "school_admin":
        query = query.where(Survey.school_id == current_user.school_id)
    elif current_user.role == "psychologist":
        psychologist_schools = await db.execute(
            select(School.id).join(School.psychologists).where(PsychologistProfile.user_id == current_user.id)
        )
        school_ids = [row[0] for row in psychologist_schools.all()]
        query = query.where(Survey.school_id.in_(school_ids))
    elif school_id:
        query = query.where(Survey.school_id == school_id)
    
    if status:
        query = query.where(Survey.status == status)
    
    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query) or 0
    
    query = query.order_by(Survey.created_at.desc())
    query = query.offset((page - 1) * size).limit(size)
    
    result = await db.execute(query)
    surveys = result.scalars().all()
    
    return SurveyListResponse(
        surveys=[SurveyResponse.model_validate(s) for s in surveys],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


@router.get("/current", response_model=SurveyDetailResponse)
async def get_current_survey(
    school_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Survey)
        .options(selectinload(Survey.questions))
        .where(
            and_(
                Survey.school_id == school_id,
                Survey.status == SurveyStatus.ACTIVE,
                Survey.start_date <= datetime.utcnow(),
                Survey.end_date >= datetime.utcnow(),
            )
        )
        .order_by(Survey.start_date.desc())
        .limit(1)
    )
    
    result = await db.execute(query)
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="No active survey found")
    
    return SurveyDetailResponse.model_validate(survey)


@router.get("/{survey_id}", response_model=SurveyDetailResponse)
async def get_survey(
    survey_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    survey = await db.get(Survey, survey_id, options=[selectinload(Survey.questions)])
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    return SurveyDetailResponse.model_validate(survey)


@router.patch("/{survey_id}", response_model=SurveyResponse)
async def update_survey(
    survey_id: UUID,
    survey_data: SurveyUpdate,
    request: Request,
    current_user: User = Depends(require_roles("admin", "school_admin")),
    db: AsyncSession = Depends(get_db),
):
    survey = await db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    if current_user.role == "school_admin" and survey.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = survey_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(survey, field, value)
    
    await db.commit()
    await db.refresh(survey)
    
    return SurveyResponse.model_validate(survey)


@router.post("/{survey_id}/questions", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def add_question(
    survey_id: UUID,
    question_data: QuestionCreate,
    request: Request,
    current_user: User = Depends(require_roles("admin", "school_admin")),
    db: AsyncSession = Depends(get_db),
):
    survey = await db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    if current_user.role == "school_admin" and survey.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    max_order = await db.scalar(
        select(func.max(Question.order)).where(Question.survey_id == survey_id)
    ) or 0
    
    question = Question(
        survey_id=survey_id,
        order=max_order + 1,
        **question_data.model_dump(),
    )
    
    db.add(question)
    await db.commit()
    await db.refresh(question)
    
    return QuestionResponse.model_validate(question)


@router.patch("/{survey_id}/questions/{question_id}", response_model=QuestionResponse)
async def update_question(
    survey_id: UUID,
    question_id: UUID,
    question_data: QuestionUpdate,
    request: Request,
    current_user: User = Depends(require_roles("admin", "school_admin")),
    db: AsyncSession = Depends(get_db),
):
    question = await db.get(Question, question_id)
    if not question or question.survey_id != survey_id:
        raise HTTPException(status_code=404, detail="Question not found")
    
    survey = await db.get(Survey, survey_id)
    if current_user.role == "school_admin" and survey.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = question_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(question, field, value)
    
    await db.commit()
    await db.refresh(question)
    
    return QuestionResponse.model_validate(question)
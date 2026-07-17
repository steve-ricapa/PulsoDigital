from datetime import datetime, date
from uuid import UUID, uuid4
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_active_user, require_roles
from app.models import Response, Student, Survey, Question, User, UserRole, SurveyStatus, DailyCheckin, Classroom

router = APIRouter()


class ResponseBase(BaseModel):
    survey_id: UUID
    question_id: UUID
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None
    value_json: Optional[str] = None


class ResponseCreate(ResponseBase):
    pass


class ResponseBulkCreate(BaseModel):
    responses: List[ResponseCreate]


class ResponseResponse(ResponseBase):
    id: UUID
    student_id: UUID
    responded_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class ResponseListResponse(BaseModel):
    responses: List[ResponseResponse]
    total: int
    page: int
    size: int
    pages: int


@router.post("", response_model=ResponseResponse, status_code=status.HTTP_201_CREATED)
async def create_response(
    request: Request,
    response_data: ResponseCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can submit responses")
    
    student = await db.get(Student, current_user.student_profile.id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    survey = await db.get(Survey, response_data.survey_id)
    if not survey or survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Survey not active")
    
    question = await db.get(Question, response_data.question_id)
    if not question or question.survey_id != survey.id:
        raise HTTPException(status_code=400, detail="Question not found in this survey")
    
    existing = await db.execute(
        select(Response).where(
            and_(
                Response.survey_id == response_data.survey_id,
                Response.question_id == response_data.question_id,
                Response.student_id == student.id,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Response already exists")
    
    response = Response(
        student_id=student.id,
        **response_data.model_dump(),
    )
    
    db.add(response)
    await db.commit()
    await db.refresh(response)
    
    return ResponseResponse.model_validate(response)


@router.post("/bulk", response_model=List[ResponseResponse], status_code=status.HTTP_201_CREATED)
async def create_responses_bulk(
    request: Request,
    bulk_data: ResponseBulkCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can submit responses")
    
    student = await db.get(Student, current_user.student_profile.id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    if not bulk_data.responses:
        raise HTTPException(status_code=400, detail="No responses provided")
    
    survey_id = bulk_data.responses[0].survey_id
    survey = await db.get(Survey, survey_id)
    if not survey or survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Survey not active")
    
    created_responses = []
    for resp_data in bulk_data.responses:
        if resp_data.survey_id != survey_id:
            raise HTTPException(status_code=400, detail="All responses must be for the same survey")
        
        question = await db.get(Question, resp_data.question_id)
        if not question or question.survey_id != survey_id:
            raise HTTPException(status_code=400, detail=f"Question {resp_data.question_id} not in survey")
        
        existing = await db.execute(
            select(Response).where(
                and_(
                    Response.survey_id == survey_id,
                    Response.question_id == resp_data.question_id,
                    Response.student_id == student.id,
                )
            )
        )
        if existing.scalar_one_or_none():
            continue
        
        response = Response(
            student_id=student.id,
            **resp_data.model_dump(),
        )
        db.add(response)
        created_responses.append(response)
    
    await db.commit()
    for r in created_responses:
        await db.refresh(r)
    
    return [ResponseResponse.model_validate(r) for r in created_responses]


@router.get("", response_model=ResponseListResponse)
async def list_responses(
    survey_id: Optional[UUID] = Query(None),
    student_id: Optional[UUID] = Query(None),
    question_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Response).options(
        selectinload(Response.student),
        selectinload(Response.survey),
        selectinload(Response.question),
    )
    
    if current_user.role == UserRole.STUDENT:
        query = query.where(Response.student_id == current_user.student_profile.id)
    elif current_user.role == UserRole.PSYCHOLOGIST:
        psychologist_students = await db.execute(
            select(Student.id).join(Classroom).where(Classroom.psychologist_id == current_user.psychologist_profile.id)
        )
        student_ids = [row[0] for row in psychologist_students.all()]
        query = query.where(Response.student_id.in_(student_ids))
    elif current_user.role == UserRole.SCHOOL_ADMIN:
        school_students = await db.execute(
            select(Student.id).where(Student.school_id == current_user.school_id)
        )
        student_ids = [row[0] for row in school_students.all()]
        query = query.where(Response.student_id.in_(student_ids))
    else:
        if student_id:
            query = query.where(Response.student_id == student_id)
        if survey_id:
            query = query.where(Response.survey_id == survey_id)
    
    if question_id:
        query = query.where(Response.question_id == question_id)
    
    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query) or 0
    
    query = query.order_by(Response.responded_at.desc())
    query = query.offset((page - 1) * size).limit(size)
    
    result = await db.execute(query)
    responses = result.scalars().all()
    
    return ResponseListResponse(
        responses=[ResponseResponse.model_validate(r) for r in responses],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


# ─── Daily Quick Check-in ────────────────────────────────────────────────────

class DailyCheckinCreate(BaseModel):
    student_id: Optional[UUID] = None
    date: str
    answers: dict


class DailyCheckinResponse(BaseModel):
    id: UUID
    status: str
    message: str


class DailyCheckinCalendarResponse(BaseModel):
    completions: List[str]
    total: int
    month: int
    year: int


@router.post("/quick", response_model=DailyCheckinResponse, status_code=status.HTTP_201_CREATED)
async def create_daily_checkin(
    payload: DailyCheckinCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can submit daily check-ins")

    student = await db.get(Student, current_user.student_profile.id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    try:
        checkin_date = date.fromisoformat(payload.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    answers = payload.answers
    mood = answers.get("mood")
    sleep = answers.get("sleep")
    energy = answers.get("energy")
    message = answers.get("message")

    if mood is None or sleep is None or energy is None:
        raise HTTPException(status_code=400, detail="mood, sleep, and energy are required")

    existing = await db.execute(
        select(DailyCheckin).where(
            and_(DailyCheckin.student_id == student.id, DailyCheckin.checkin_date == checkin_date)
        )
    )
    existing_checkin = existing.scalar_one_or_none()

    if existing_checkin:
        existing_checkin.mood = int(mood)
        existing_checkin.sleep = int(sleep)
        existing_checkin.energy = int(energy)
        existing_checkin.message = message
        existing_checkin.responded_at = datetime.utcnow()
        checkin_id = existing_checkin.id
    else:
        checkin = DailyCheckin(
            id=uuid4(),
            student_id=student.id,
            checkin_date=checkin_date,
            mood=int(mood),
            sleep=int(sleep),
            energy=int(energy),
            message=message,
        )
        db.add(checkin)
        checkin_id = checkin.id

    await db.commit()

    return DailyCheckinResponse(id=checkin_id, status="saved", message="Check-in diario registrado")


@router.get("/quick/calendar", response_model=DailyCheckinCalendarResponse)
async def get_checkin_calendar(
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None, ge=2020, le=2100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can view their calendar")

    student_id = current_user.student_profile.id

    now = datetime.utcnow()
    target_month = month or now.month
    target_year = year or now.year

    result = await db.execute(
        select(DailyCheckin.checkin_date).where(
            and_(
                DailyCheckin.student_id == student_id,
                extract("month", DailyCheckin.checkin_date) == target_month,
                extract("year", DailyCheckin.checkin_date) == target_year,
            )
        ).order_by(DailyCheckin.checkin_date)
    )
    dates = [row[0].isoformat() for row in result.all()]

    return DailyCheckinCalendarResponse(
        completions=dates,
        total=len(dates),
        month=target_month,
        year=target_year,
    )
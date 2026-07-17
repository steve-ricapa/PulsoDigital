from datetime import datetime, timedelta
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_active_user, require_roles
from app.models import (
    WellbeingScore, Student, Survey, User, UserRole,
    RiskLevel, Classroom, PsychologistProfile
)
from app.services.wellbeing import calculate_wellbeing_score, calculate_trend_score

router = APIRouter()


class WellbeingScoreResponse(BaseModel):
    id: UUID
    student_id: UUID
    survey_id: UUID
    emotional_score: float
    safety_score: float
    belonging_score: float
    trend_score: float
    overall_score: float
    risk_level: RiskLevel
    calculated_at: datetime
    
    class Config:
        from_attributes = True


class WellbeingListResponse(BaseModel):
    scores: List[WellbeingScoreResponse]
    total: int
    page: int
    size: int
    pages: int


@router.post("/calculate/{student_id}/{survey_id}", response_model=WellbeingScoreResponse)
async def calculate_student_wellbeing(
    student_id: UUID,
    survey_id: UUID,
    current_user: User = Depends(require_roles("admin", "school_admin", "psychologist")),
    db: AsyncSession = Depends(get_db),
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if current_user.role == UserRole.PSYCHOLOGIST:
        psych_students = await db.execute(
            select(Student.id).join(Classroom).where(
                and_(
                    Classroom.psychologist_id == current_user.psychologist_profile.id,
                    Student.id == student_id
                )
            )
        )
        if not psych_students.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == UserRole.SCHOOL_ADMIN:
        if student.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    survey = await db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    score = await calculate_wellbeing_score(db, student_id, survey_id)
    
    return WellbeingScoreResponse.model_validate(score)


@router.post("/calculate-bulk", response_model=List[WellbeingScoreResponse])
async def calculate_bulk_wellbeing(
    survey_id: UUID,
    classroom_id: Optional[UUID] = Query(None),
    current_user: User = Depends(require_roles("admin", "school_admin", "psychologist")),
    db: AsyncSession = Depends(get_db),
):
    survey = await db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    if current_user.role == UserRole.SCHOOL_ADMIN:
        if survey.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    query = select(Student).where(
        and_(
            Student.school_id == survey.school_id,
            Student.is_active == True,
        )
    )
    
    if classroom_id:
        query = query.where(Student.classroom_id == classroom_id)
    elif current_user.role == UserRole.PSYCHOLOGIST:
        query = query.join(Classroom).where(
            Classroom.psychologist_id == current_user.psychologist_profile.id
        )
    
    students = await db.execute(query)
    students = students.scalars().all()
    
    results = []
    for student in students:
        try:
            score = await calculate_wellbeing_score(db, student.id, survey_id)
            results.append(WellbeingScoreResponse.model_validate(score))
        except Exception as e:
            continue
    
    return results


@router.get("", response_model=WellbeingListResponse)
async def list_wellbeing_scores(
    student_id: Optional[UUID] = Query(None),
    survey_id: Optional[UUID] = Query(None),
    risk_level: Optional[RiskLevel] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(WellbeingScore).options(
        selectinload(WellbeingScore.student),
        selectinload(WellbeingScore.survey),
    )
    
    if current_user.role == UserRole.STUDENT:
        query = query.where(WellbeingScore.student_id == current_user.student_profile.id)
    elif current_user.role == UserRole.PSYCHOLOGIST:
        psych_students = await db.execute(
            select(Student.id).join(Classroom).where(
                Classroom.psychologist_id == current_user.psychologist_profile.id
            )
        )
        student_ids = [row[0] for row in psych_students.all()]
        query = query.where(WellbeingScore.student_id.in_(student_ids))
    elif current_user.role == UserRole.SCHOOL_ADMIN:
        school_students = await db.execute(
            select(Student.id).where(Student.school_id == current_user.school_id)
        )
        student_ids = [row[0] for row in school_students.all()]
        query = query.where(WellbeingScore.student_id.in_(student_ids))
    
    if student_id:
        query = query.where(WellbeingScore.student_id == student_id)
    if survey_id:
        query = query.where(WellbeingScore.survey_id == survey_id)
    if risk_level:
        query = query.where(WellbeingScore.risk_level == risk_level)
    
    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query) or 0
    
    query = query.order_by(desc(WellbeingScore.calculated_at))
    query = query.offset((page - 1) * size).limit(size)
    
    result = await db.execute(query)
    scores = result.scalars().all()
    
    return WellbeingListResponse(
        scores=[WellbeingScoreResponse.model_validate(s) for s in scores],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


@router.get("/student/{student_id}/latest", response_model=WellbeingScoreResponse)
async def get_latest_wellbeing(
    student_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if current_user.role == UserRole.PSYCHOLOGIST:
        psych_students = await db.execute(
            select(Student.id).join(Classroom).where(
                and_(
                    Classroom.psychologist_id == current_user.psychologist_profile.id,
                    Student.id == student_id
                )
            )
        )
        if not psych_students.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == UserRole.SCHOOL_ADMIN:
        if student.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == UserRole.STUDENT:
        if current_user.student_profile.id != student_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    score = await db.execute(
        select(WellbeingScore)
        .where(WellbeingScore.student_id == student_id)
        .order_by(desc(WellbeingScore.calculated_at))
        .limit(1)
    )
    score = score.scalar_one_or_none()
    
    if not score:
        raise HTTPException(status_code=404, detail="No wellbeing score found")
    
    return WellbeingScoreResponse.model_validate(score)
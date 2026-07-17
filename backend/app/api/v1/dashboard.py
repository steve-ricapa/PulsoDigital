from datetime import datetime, timedelta
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, case
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_active_user, require_roles
from app.models import (
    Student, Classroom, School, Survey, Response, Question,
    WellbeingScore, RiskPrediction, SupportRequest, Intervention,
    PsychologistProfile, User, UserRole, SurveyStatus, RiskLevel,
    SupportRequestType
)

router = APIRouter()


class SchoolOverviewResponse(BaseModel):
    total_students: int
    active_surveys: int
    avg_wellbeing_score: float
    students_by_risk: dict
    wellbeing_trend: List[dict]
    support_requests_pending: int
    completion_rate: float


class ClassroomSummaryResponse(BaseModel):
    classroom_id: UUID
    classroom_name: str
    grade: int
    section: str
    total_students: int
    avg_wellbeing: float
    risk_distribution: dict
    completion_rate: float


class PsychologistDashboardResponse(BaseModel):
    assigned_classrooms: List[ClassroomSummaryResponse]
    priority_students: List[dict]
    pending_requests: int
    upcoming_followups: List[dict]


@router.get("/school-overview", response_model=SchoolOverviewResponse)
async def get_school_overview(
    school_id: UUID,
    weeks: int = Query(8, ge=1, le=52),
    current_user: User = Depends(require_roles("admin", "school_admin")),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == UserRole.SCHOOL_ADMIN and current_user.school_id != school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    school = await db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    total_students = await db.scalar(
        select(func.count(Student.id)).where(
            and_(Student.school_id == school_id, Student.is_active == True)
        )
    ) or 0
    
    active_surveys = await db.scalar(
        select(func.count(Survey.id)).where(
            and_(
                Survey.school_id == school_id,
                Survey.status == SurveyStatus.ACTIVE,
                Survey.start_date <= datetime.utcnow(),
                Survey.end_date >= datetime.utcnow(),
            )
        )
    ) or 0
    
    wellbeing_avg = await db.scalar(
        select(func.avg(WellbeingScore.overall_score)).join(Survey).where(
            and_(
                Survey.school_id == school_id,
                WellbeingScore.calculated_at >= datetime.utcnow() - timedelta(weeks=weeks),
            )
        )
    ) or 0.0
    
    risk_distribution = await db.execute(
        select(
            WellbeingScore.risk_level,
            func.count(WellbeingScore.id)
        ).join(Survey).where(
            and_(
                Survey.school_id == school_id,
                WellbeingScore.calculated_at >= datetime.utcnow() - timedelta(weeks=weeks),
            )
        ).group_by(WellbeingScore.risk_level)
    )
    students_by_risk = {row[0].value: row[1] for row in risk_distribution.all()}
    
    weekly_trend = await db.execute(
        select(
            func.date_trunc('week', WellbeingScore.calculated_at).label('week'),
            func.avg(WellbeingScore.overall_score).label('avg_score')
        ).join(Survey).where(
            and_(
                Survey.school_id == school_id,
                WellbeingScore.calculated_at >= datetime.utcnow() - timedelta(weeks=weeks),
            )
        ).group_by(func.date_trunc('week', WellbeingScore.calculated_at))
        .order_by(func.date_trunc('week', WellbeingScore.calculated_at))
    )
    wellbeing_trend = [
        {"week": row[0].isoformat(), "average_wellbeing": round(float(row[1]), 3)}
        for row in weekly_trend.all()
    ]
    
    pending_requests = await db.scalar(
        select(func.count(SupportRequest.id)).join(Student).where(
            and_(
                Student.school_id == school_id,
                SupportRequest.status == "pending",
            )
        )
    ) or 0
    
    current_survey = await db.execute(
        select(Survey.id).where(
            and_(
                Survey.school_id == school_id,
                Survey.status == SurveyStatus.ACTIVE,
                Survey.start_date <= datetime.utcnow(),
                Survey.end_date >= datetime.utcnow(),
            )
        ).order_by(desc(Survey.start_date)).limit(1)
    )
    current_survey_id = current_survey.scalar_one_or_none()
    
    completion_rate = 0.0
    if current_survey_id:
        total_questions = await db.scalar(
            select(func.count(Question.id)).where(
                and_(Question.survey_id == current_survey_id, Question.is_active == True)
            )
        ) or 1
        expected_responses = total_students * total_questions
        actual_responses = await db.scalar(
            select(func.count(Response.id)).join(Survey).where(
                and_(
                    Survey.school_id == school_id,
                    Survey.status == SurveyStatus.ACTIVE,
                )
            )
        ) or 0
        completion_rate = round((actual_responses / expected_responses) * 100, 1) if expected_responses > 0 else 0.0
    
    return SchoolOverviewResponse(
        total_students=total_students,
        active_surveys=active_surveys,
        avg_wellbeing_score=round(float(wellbeing_avg), 3),
        students_by_risk=students_by_risk,
        wellbeing_trend=wellbeing_trend,
        support_requests_pending=pending_requests,
        completion_rate=completion_rate,
    )


@router.get("/classrooms", response_model=List[ClassroomSummaryResponse])
async def get_classroom_summaries(
    school_id: UUID,
    current_user: User = Depends(require_roles("admin", "school_admin", "psychologist")),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == UserRole.SCHOOL_ADMIN and current_user.school_id != school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if current_user.role == UserRole.PSYCHOLOGIST:
        classrooms = await db.execute(
            select(Classroom).where(
                and_(
                    Classroom.school_id == school_id,
                    Classroom.psychologist_id == current_user.psychologist_profile.id,
                    Classroom.is_active == True,
                )
            )
        )
    else:
        classrooms = await db.execute(
            select(Classroom).where(
                and_(Classroom.school_id == school_id, Classroom.is_active == True)
            )
        )
    classrooms = classrooms.scalars().all()
    
    summaries = []
    for classroom in classrooms:
        students = await db.execute(
            select(Student).where(
                and_(Student.classroom_id == classroom.id, Student.is_active == True)
            )
        )
        students = students.scalars().all()
        student_ids = [s.id for s in students]
        
        if not student_ids:
            summaries.append(ClassroomSummaryResponse(
                classroom_id=classroom.id,
                classroom_name=classroom.name,
                grade=classroom.grade,
                section=classroom.section,
                total_students=0,
                avg_wellbeing=0.0,
                risk_distribution={},
                completion_rate=0.0,
            ))
            continue
        
        wellbeing_avg = await db.scalar(
            select(func.avg(WellbeingScore.overall_score)).where(
                and_(
                    WellbeingScore.student_id.in_(student_ids),
                    WellbeingScore.calculated_at >= datetime.utcnow() - timedelta(weeks=4),
                )
            )
        ) or 0.0
        
        risk_dist = await db.execute(
            select(
                WellbeingScore.risk_level,
                func.count(WellbeingScore.id)
            ).where(
                and_(
                    WellbeingScore.student_id.in_(student_ids),
                    WellbeingScore.calculated_at >= datetime.utcnow() - timedelta(weeks=4),
                )
            ).group_by(WellbeingScore.risk_level)
        )
        risk_distribution = {row[0].value: row[1] for row in risk_dist.all()}
        
        summaries.append(ClassroomSummaryResponse(
            classroom_id=classroom.id,
            classroom_name=classroom.name,
            grade=classroom.grade,
            section=classroom.section,
            total_students=len(students),
            avg_wellbeing=round(float(wellbeing_avg), 3),
            risk_distribution=risk_distribution,
            completion_rate=0.0,
        ))
    
    return summaries


@router.get("/psychologist", response_model=PsychologistDashboardResponse)
async def get_psychologist_dashboard(
    current_user: User = Depends(require_roles("psychologist")),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.psychologist_profile:
        raise HTTPException(status_code=404, detail="Psychologist profile not found")
    
    psych = current_user.psychologist_profile
    
    classrooms = await db.execute(
        select(Classroom).where(
            and_(Classroom.psychologist_id == psych.id, Classroom.is_active == True)
        )
    )
    classrooms = classrooms.scalars().all()
    
    classroom_summaries = []
    for classroom in classrooms:
        students = await db.execute(
            select(Student).where(
                and_(Student.classroom_id == classroom.id, Student.is_active == True)
            )
        )
        students = students.scalars().all()
        student_ids = [s.id for s in students]
        
        if not student_ids:
            classroom_summaries.append(ClassroomSummaryResponse(
                classroom_id=classroom.id,
                classroom_name=classroom.name,
                grade=classroom.grade,
                section=classroom.section,
                total_students=0,
                avg_wellbeing=0.0,
                risk_distribution={},
                completion_rate=0.0,
            ))
            continue
        
        wellbeing_avg = await db.scalar(
            select(func.avg(WellbeingScore.overall_score)).where(
                and_(
                    WellbeingScore.student_id.in_(student_ids),
                    WellbeingScore.calculated_at >= datetime.utcnow() - timedelta(weeks=4),
                )
            )
        ) or 0.0
        
        risk_dist = await db.execute(
            select(
                WellbeingScore.risk_level,
                func.count(WellbeingScore.id)
            ).where(
                and_(
                    WellbeingScore.student_id.in_(student_ids),
                    WellbeingScore.calculated_at >= datetime.utcnow() - timedelta(weeks=4),
                )
            ).group_by(WellbeingScore.risk_level)
        )
        risk_distribution = {row[0].value: row[1] for row in risk_dist.all()}
        
        classroom_summaries.append(ClassroomSummaryResponse(
            classroom_id=classroom.id,
            classroom_name=classroom.name,
            grade=classroom.grade,
            section=classroom.section,
            total_students=len(students),
            avg_wellbeing=round(float(wellbeing_avg), 3),
            risk_distribution=risk_distribution,
            completion_rate=0.0,
        ))
    
    priority_students_query = await db.execute(
        select(Student, WellbeingScore.overall_score, WellbeingScore.risk_level)
        .join(WellbeingScore, Student.id == WellbeingScore.student_id)
        .join(Classroom, Student.classroom_id == Classroom.id)
        .where(
            and_(
                Classroom.psychologist_id == psych.id,
                Student.is_active == True,
                WellbeingScore.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL]),
                WellbeingScore.calculated_at >= datetime.utcnow() - timedelta(weeks=4),
            )
        )
        .order_by(WellbeingScore.overall_score.asc())
        .limit(10)
    )
    priority_students = [
        {
            "student_id": row[0].id,
            "internal_id": row[0].internal_id,
            "classroom": row[0].classroom.name,
            "wellbeing_score": round(float(row[1]), 3),
            "risk_level": row[2].value,
        }
        for row in priority_students_query.all()
    ]
    
    pending_requests = await db.scalar(
        select(func.count(SupportRequest.id)).where(
            and_(
                SupportRequest.assigned_psychologist_id == psych.id,
                SupportRequest.status == "pending",
            )
        )
    ) or 0
    
    upcoming_followups = await db.execute(
        select(Intervention).where(
            and_(
                Intervention.psychologist_id == psych.id,
                Intervention.is_completed == False,
                Intervention.follow_up_date != None,
                Intervention.follow_up_date >= datetime.utcnow(),
            )
        ).order_by(Intervention.follow_up_date.asc()).limit(10)
    )
    upcoming_followups = [
        {
            "intervention_id": i.id,
            "student_internal_id": i.student.internal_id,
            "type": i.intervention_type.value,
            "follow_up_date": i.follow_up_date.isoformat(),
        }
        for i in upcoming_followups.scalars().all()
    ]
    
    return PsychologistDashboardResponse(
        assigned_classrooms=classroom_summaries,
        priority_students=priority_students,
        pending_requests=pending_requests,
        upcoming_followups=upcoming_followups,
    )


@router.get("/student/{student_id}/trend")
async def get_student_trend(
    student_id: UUID,
    weeks: int = Query(12, ge=1, le=52),
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
    
    wellbeing_history = await db.execute(
        select(WellbeingScore).where(
            and_(
                WellbeingScore.student_id == student_id,
                WellbeingScore.calculated_at >= datetime.utcnow() - timedelta(weeks=weeks),
            )
        ).order_by(WellbeingScore.calculated_at.asc())
    )
    wellbeing_history = wellbeing_history.scalars().all()
    
    trend_data = [
        {
            "date": w.calculated_at.isoformat(),
            "overall": round(w.overall_score, 3),
            "emotional": round(w.emotional_score, 3),
            "safety": round(w.safety_score, 3),
            "belonging": round(w.belonging_score, 3),
            "trend": round(w.trend_score, 3),
            "risk_level": w.risk_level.value,
        }
        for w in wellbeing_history
    ]
    
    support_requests = await db.execute(
        select(SupportRequest).where(
            and_(
                SupportRequest.student_id == student_id,
                SupportRequest.created_at >= datetime.utcnow() - timedelta(weeks=weeks),
            )
        ).order_by(SupportRequest.created_at.desc())
    )
    support_requests = support_requests.scalars().all()
    
    interventions = await db.execute(
        select(Intervention).where(
            and_(
                Intervention.student_id == student_id,
                Intervention.created_at >= datetime.utcnow() - timedelta(weeks=weeks),
            )
        ).options(
            selectinload(Intervention.psychologist).selectinload(PsychologistProfile.user)
        ).order_by(Intervention.created_at.desc())
    )
    interventions = interventions.scalars().all()
    
    return {
        "student_internal_id": student.internal_id,
        "wellbeing_trend": trend_data,
        "support_requests": [
            {
                "id": r.id,
                "type": r.request_type.value,
                "status": r.status,
                "created_at": r.created_at.isoformat(),
                "is_anonymous": r.is_anonymous,
            } for r in support_requests
        ],
        "interventions": [
            {
                "id": i.id,
                "type": i.intervention_type.value,
                "description": i.description,
                "outcome": i.outcome,
                "completed": i.is_completed,
                "created_at": i.created_at.isoformat(),
                "psychologist": i.psychologist.user.full_name,
            } for i in interventions
        ],
    }
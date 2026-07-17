from datetime import datetime
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_active_user, require_roles
from app.models import (
    RiskPrediction, Student, Survey, RiskLevel, WellbeingScore,
    User, UserRole, PsychologistProfile, Classroom
)
from app.core.config import settings

router = APIRouter()


class RiskPredictionResponse(BaseModel):
    model_config = {"from_attributes": True, "protected_namespaces": ()}

    id: UUID
    student_id: UUID
    survey_id: UUID
    model_name: str
    model_version: str
    risk_probability: float
    risk_level: RiskLevel
    feature_importance: Optional[str] = None
    shap_values: Optional[str] = None
    recommended_action: Optional[str] = None
    predicted_at: datetime


class RiskAlertResponse(BaseModel):
    student_id: UUID
    student_internal_id: str
    classroom_name: str
    risk_level: RiskLevel
    risk_probability: float
    trend: str
    weeks_declining: int
    sudden_drop: bool
    last_survey_date: datetime
    recommended_action: str


class RiskListResponse(BaseModel):
    alerts: List[RiskAlertResponse]
    total: int
    page: int
    size: int
    pages: int


@router.get("/alerts", response_model=RiskListResponse)
async def get_risk_alerts(
    school_id: Optional[UUID] = Query(None),
    risk_level: Optional[RiskLevel] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles("admin", "school_admin", "psychologist")),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == UserRole.PSYCHOLOGIST:
        psychologist_classrooms = await db.execute(
            select(Classroom.id).where(Classroom.psychologist_id == current_user.psychologist_profile.id)
        )
        classroom_ids = [row[0] for row in psychologist_classrooms.all()]
        students_query = select(Student.id).where(
            and_(Student.classroom_id.in_(classroom_ids), Student.is_active == True)
        )
    elif current_user.role == UserRole.SCHOOL_ADMIN:
        students_query = select(Student.id).where(
            and_(Student.school_id == current_user.school_id, Student.is_active == True)
        )
    elif school_id:
        students_query = select(Student.id).where(
            and_(Student.school_id == school_id, Student.is_active == True)
        )
    else:
        students_query = select(Student.id).where(Student.is_active == True)
    
    student_ids_result = await db.execute(students_query)
    student_ids = [row[0] for row in student_ids_result.all()]
    
    if not student_ids:
        return RiskListResponse(alerts=[], total=0, page=page, size=size, pages=0)
    
    latest_predictions = await db.execute(
        select(RiskPrediction)
        .where(
            and_(
                RiskPrediction.student_id.in_(student_ids),
                RiskPrediction.model_name == "rule_based_v1",
            )
        )
        .order_by(desc(RiskPrediction.predicted_at))
    )
    predictions = latest_predictions.scalars().all()
    
    latest_by_student = {}
    for pred in predictions:
        if pred.student_id not in latest_by_student:
            latest_by_student[pred.student_id] = pred
    
    alerts = []
    for student_id, pred in latest_by_student.items():
        student = await db.get(Student, student_id, options=[selectinload(Student.classroom)])
        if not student:
            continue
        
        wellbeing_scores = await db.execute(
            select(WellbeingScore)
            .where(WellbeingScore.student_id == student_id)
            .order_by(desc(WellbeingScore.calculated_at))
            .limit(5)
        )
        scores = wellbeing_scores.scalars().all()
        
        weeks_declining = 0
        for i in range(len(scores) - 1):
            if scores[i].overall_score < scores[i + 1].overall_score:
                weeks_declining += 1
            else:
                break
        
        sudden_drop = False
        if len(scores) >= 2:
            drop = scores[1].overall_score - scores[0].overall_score
            if drop >= settings.SUDDEN_DROP_THRESHOLD:
                sudden_drop = True
        
        trend = "stable"
        if weeks_declining >= settings.TREND_DECLINE_WEEKS:
            trend = "declining"
        if sudden_drop:
            trend = "sudden_drop"
        
        last_survey_date = scores[0].calculated_at if scores else datetime.utcnow()
        
        if pred.risk_level == RiskLevel.CRITICAL:
            action = "Immediate psychologist review required"
        elif pred.risk_level == RiskLevel.HIGH:
            action = "Schedule check-in within 48 hours"
        elif pred.risk_level == RiskLevel.MODERATE:
            action = "Monitor closely, review next survey"
        else:
            action = "Continue routine monitoring"
        
        alerts.append(RiskAlertResponse(
            student_id=student.id,
            student_internal_id=student.internal_id,
            classroom_name=student.classroom.name if student.classroom else "Unknown",
            risk_level=pred.risk_level,
            risk_probability=round(pred.risk_probability, 3),
            trend=trend,
            weeks_declining=weeks_declining,
            sudden_drop=sudden_drop,
            last_survey_date=last_survey_date,
            recommended_action=action,
        ))
    
    if risk_level:
        alerts = [a for a in alerts if a.risk_level == risk_level]
    
    alerts.sort(key=lambda x: (x.risk_level.value, -x.risk_probability), reverse=True)
    
    total = len(alerts)
    start = (page - 1) * size
    end = start + size
    paginated = alerts[start:end]
    
    return RiskListResponse(
        alerts=paginated,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


@router.get("/predictions/{student_id}/{survey_id}", response_model=RiskPredictionResponse)
async def get_risk_prediction(
    student_id: UUID,
    survey_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    prediction = await db.execute(
        select(RiskPrediction).where(
            and_(
                RiskPrediction.student_id == student_id,
                RiskPrediction.survey_id == survey_id,
            )
        ).order_by(desc(RiskPrediction.predicted_at))
    )
    prediction = prediction.scalars().first()
    
    if not prediction:
        raise HTTPException(status_code=404, detail="Risk prediction not found")
    
    return RiskPredictionResponse.model_validate(prediction)


@router.post("/predict/{student_id}/{survey_id}", response_model=RiskPredictionResponse)
async def predict_risk(
    student_id: UUID,
    survey_id: UUID,
    current_user: User = Depends(require_roles("admin", "school_admin", "psychologist")),
    db: AsyncSession = Depends(get_db),
):
    if not settings.ML_ENABLED:
        raise HTTPException(status_code=503, detail="ML predictions not enabled")
    
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    survey = await db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    wellbeing = await db.execute(
        select(WellbeingScore).where(
            and_(
                WellbeingScore.student_id == student_id,
                WellbeingScore.survey_id == survey_id,
            )
        )
    )
    wellbeing = wellbeing.scalar_one_or_none()
    
    if not wellbeing:
        raise HTTPException(status_code=400, detail="Wellbeing score not calculated yet")
    
    risk_probability = 1.0 - wellbeing.overall_score
    
    if risk_probability >= 0.8:
        risk_level = RiskLevel.CRITICAL
    elif risk_probability >= 0.6:
        risk_level = RiskLevel.HIGH
    elif risk_probability >= 0.4:
        risk_level = RiskLevel.MODERATE
    else:
        risk_level = RiskLevel.LOW
    
    prediction = RiskPrediction(
        student_id=student_id,
        survey_id=survey_id,
        model_name="rule_based_v1",
        model_version="1.0.0",
        risk_probability=risk_probability,
        risk_level=risk_level,
        recommended_action=(
            "Immediate psychologist review required" if risk_level == RiskLevel.CRITICAL else
            "Schedule check-in within 48 hours" if risk_level == RiskLevel.HIGH else
            "Monitor closely" if risk_level == RiskLevel.MODERATE else
            "Continue routine monitoring"
        ),
    )
    
    db.add(prediction)
    await db.commit()
    await db.refresh(prediction)
    
    return RiskPredictionResponse.model_validate(prediction)
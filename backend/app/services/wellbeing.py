from datetime import datetime, timedelta
from uuid import UUID
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from app.models import (
    WellbeingScore, Response, Question, Survey, Student,
    QuestionType, RiskLevel
)
from app.core.config import settings


async def calculate_wellbeing_score(
    db: AsyncSession,
    student_id: UUID,
    survey_id: UUID,
) -> WellbeingScore:
    survey = await db.get(Survey, survey_id)
    if not survey:
        raise ValueError("Survey not found")
    
    questions = await db.execute(
        select(Question).where(
            and_(Question.survey_id == survey_id, Question.is_active == True)
        )
    )
    questions = questions.scalars().all()
    
    if not questions:
        raise ValueError("No active questions in survey")
    
    responses = await db.execute(
        select(Response).where(
            and_(
                Response.survey_id == survey_id,
                Response.student_id == student_id,
                Response.question_id.in_([q.id for q in questions]),
            )
        )
    )
    responses = {r.question_id: r for r in responses.scalars().all()}
    
    emotional_scores = []
    safety_scores = []
    belonging_scores = []
    
    for question in questions:
        response = responses.get(question.id)
        if not response:
            continue
        
        normalized_value = normalize_response(question, response)
        
        if question.category == "emotional":
            emotional_scores.append(normalized_value)
        elif question.category == "safety":
            safety_scores.append(normalized_value)
        elif question.category == "belonging":
            belonging_scores.append(normalized_value)
    
    emotional_avg = sum(emotional_scores) / len(emotional_scores) if emotional_scores else 0.5
    safety_avg = sum(safety_scores) / len(safety_scores) if safety_scores else 0.5
    belonging_avg = sum(belonging_scores) / len(belonging_scores) if belonging_scores else 0.5
    
    trend_score = await calculate_trend_score(db, student_id, survey_id)
    
    overall_score = (
        emotional_avg * settings.WELLBEING_EMOTIONAL_WEIGHT +
        safety_avg * settings.WELLBEING_SAFETY_WEIGHT +
        belonging_avg * settings.WELLBEING_BELONGING_WEIGHT +
        trend_score * settings.WELLBEING_TREND_WEIGHT
    )
    
    risk_level = determine_risk_level(overall_score)
    
    existing = await db.execute(
        select(WellbeingScore).where(
            and_(
                WellbeingScore.student_id == student_id,
                WellbeingScore.survey_id == survey_id,
            )
        )
    )
    existing = existing.scalar_one_or_none()
    
    if existing:
        existing.emotional_score = emotional_avg
        existing.safety_score = safety_avg
        existing.belonging_score = belonging_avg
        existing.trend_score = trend_score
        existing.overall_score = overall_score
        existing.risk_level = risk_level
        existing.calculated_at = datetime.utcnow()
        score = existing
    else:
        score = WellbeingScore(
            student_id=student_id,
            survey_id=survey_id,
            emotional_score=emotional_avg,
            safety_score=safety_avg,
            belonging_score=belonging_avg,
            trend_score=trend_score,
            overall_score=overall_score,
            risk_level=risk_level,
        )
        db.add(score)
    
    await db.commit()
    await db.refresh(score)
    
    return score


def normalize_response(question: Question, response: Response) -> float:
    if question.question_type == QuestionType.EMOJI_SCALE:
        if response.value_numeric is not None:
            return max(0.0, min(1.0, response.value_numeric / 5.0))
    elif question.question_type == QuestionType.SLIDER:
        if response.value_numeric is not None and question.min_value is not None and question.max_value is not None:
            return max(0.0, min(1.0, (response.value_numeric - question.min_value) / (question.max_value - question.min_value)))
    elif question.question_type in [QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE]:
        if response.value_numeric is not None and question.max_value is not None:
            return max(0.0, min(1.0, response.value_numeric / question.max_value))
    elif question.question_type == QuestionType.YES_NO:
        if response.value_numeric is not None:
            return 1.0 if response.value_numeric == 1 else 0.0
    return 0.5


async def calculate_trend_score(db: AsyncSession, student_id: UUID, survey_id: UUID) -> float:
    previous_scores = await db.execute(
        select(WellbeingScore.overall_score)
        .join(Survey, WellbeingScore.survey_id == Survey.id)
        .where(
            and_(
                WellbeingScore.student_id == student_id,
                Survey.end_date < datetime.utcnow(),
                WellbeingScore.survey_id != survey_id,
            )
        )
        .order_by(desc(Survey.end_date))
        .limit(settings.MIN_RESPONSES_FOR_TREND)
    )
    scores = [row[0] for row in previous_scores.all()]
    
    if len(scores) < settings.MIN_RESPONSES_FOR_TREND:
        return 0.5
    
    recent_avg = sum(scores[:settings.TREND_DECLINE_WEEKS]) / min(len(scores), settings.TREND_DECLINE_WEEKS)
    older_avg = sum(scores[settings.TREND_DECLINE_WEEKS:]) / max(1, len(scores) - settings.TREND_DECLINE_WEEKS)
    
    if older_avg == 0:
        return 0.5
    
    change = (recent_avg - older_avg) / older_avg
    
    if change <= -settings.SUDDEN_DROP_THRESHOLD:
        return 0.2
    elif change < 0:
        return max(0.3, 0.5 + change)
    else:
        return min(0.8, 0.5 + change * 0.5)


def determine_risk_level(overall_score: float) -> RiskLevel:
    if overall_score <= 0.3:
        return RiskLevel.CRITICAL
    elif overall_score <= 0.5:
        return RiskLevel.HIGH
    elif overall_score <= 0.7:
        return RiskLevel.MODERATE
    else:
        return RiskLevel.LOW


async def get_student_wellbeing_history(
    db: AsyncSession,
    student_id: UUID,
    weeks: int = 12,
) -> List[WellbeingScore]:
    cutoff = datetime.utcnow() - timedelta(weeks=weeks)
    result = await db.execute(
        select(WellbeingScore)
        .where(
            and_(
                WellbeingScore.student_id == student_id,
                WellbeingScore.calculated_at >= cutoff,
            )
        )
        .order_by(WellbeingScore.calculated_at.asc())
    )
    return result.scalars().all()


async def detect_sustained_decline(db: AsyncSession, student_id: UUID) -> bool:
    history = await get_student_wellbeing_history(db, student_id, weeks=12)
    
    if len(history) < settings.TREND_DECLINE_WEEKS:
        return False
    
    recent_scores = [h.overall_score for h in history[-settings.TREND_DECLINE_WEEKS:]]
    
    for i in range(1, len(recent_scores)):
        if recent_scores[i] >= recent_scores[i - 1]:
            return False
    
    return True


async def detect_sudden_drop(db: AsyncSession, student_id: UUID) -> bool:
    history = await get_student_wellbeing_history(db, student_id, weeks=4)
    
    if len(history) < 2:
        return False
    
    previous = history[-2].overall_score
    current = history[-1].overall_score
    
    if previous == 0:
        return False
    
    drop = (previous - current) / previous
    return drop >= settings.SUDDEN_DROP_THRESHOLD
"""FastAPI router for ML predictions."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.core.database import get_db
from app.core.security import get_current_active_user, require_roles
from app.models import User, Student, WellbeingScore, RiskPrediction, Classroom, UserRole
from app.ml.schemas import MLPredictRequest, MLPredictResponse
from app.ml.predictor import get_ml_predictor, MLPredictor

router = APIRouter()


@router.post("/predict", response_model=MLPredictResponse)
async def predict_wellbeing(
    request: MLPredictRequest,
    current_user: User = Depends(require_roles("admin", "school_admin", "psychologist")),
):
    predictor = get_ml_predictor()
    if not predictor or not predictor.is_ready:
        raise HTTPException(
            status_code=503,
            detail="ML model not loaded. Place rf_model.pkl in app/ml/config/. Using rule-based fallback.",
        )

    if request.responses is not None:
        result = predictor.predict_from_responses(
            student_data=request.student.model_dump(),
            responses=request.responses.model_dump(exclude_none=True),
            include_explanations=request.include_explanations,
        )
    elif request.wellbeing_scores is not None:
        result = predictor.predict_from_wellbeing(
            student_data=request.student.model_dump(),
            wellbeing_scores=request.wellbeing_scores.model_dump(),
            include_explanations=request.include_explanations,
        )
    else:
        raise HTTPException(status_code=400, detail="Provide either 'responses' or 'wellbeing_scores'.")

    return MLPredictResponse(**result)


@router.get("/model-info")
async def get_model_info():
    predictor = get_ml_predictor()
    if not predictor or not predictor.is_ready:
        return {
            "loaded": False,
            "model_name": "rule_based_v1",
            "description": "ML model (rf_model.pkl) not loaded. Using rule-based risk calculation.",
            "fallback_logic": "risk_probability = 1.0 - overall_wellbeing_score. Thresholds: >=0.8 CRITICAL, >=0.6 HIGH, >=0.4 MODERATE, <0.4 LOW.",
            "to_enable": "Place rf_model.pkl in backend/app/ml/config/ and set ML_ENABLED=True in .env",
        }
    return {
        "loaded": True,
        "model_name": "rf_v1",
        "features": predictor._loader.feature_names,
        "class_labels": predictor._loader.class_labels,
        "thresholds": predictor._loader.thresholds,
    }


@router.get("/student/{student_id}/explanation")
async def get_student_explanation(
    student_id: UUID,
    current_user: User = Depends(require_roles("psychologist")),
    db: AsyncSession = Depends(get_db),
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    psych_classrooms = await db.execute(
        select(Student.id).join(Classroom).where(
            and_(
                Classroom.psychologist_id == current_user.psychologist_profile.id,
                Student.id == student_id,
            )
        )
    )
    if not psych_classrooms.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not authorized")

    latest_prediction = await db.execute(
        select(RiskPrediction)
        .where(RiskPrediction.student_id == student_id)
        .order_by(desc(RiskPrediction.predicted_at))
        .limit(1)
    )
    prediction = latest_prediction.scalar_one_or_none()

    latest_wellbeing = await db.execute(
        select(WellbeingScore)
        .where(WellbeingScore.student_id == student_id)
        .order_by(desc(WellbeingScore.calculated_at))
        .limit(1)
    )
    wellbeing = latest_wellbeing.scalar_one_or_none()

    predictor = get_ml_predictor()
    ml_available = predictor is not None and predictor.is_ready

    result = {
        "student_id": str(student_id),
        "internal_id": student.internal_id,
        "ml_model_loaded": ml_available,
        "model_name": prediction.model_name if prediction else "rule_based_v1",
        "model_version": prediction.model_version if prediction else "1.0.0",
    }

    if prediction:
        import json
        feature_importance = None
        if prediction.feature_importance:
            try:
                feature_importance = json.loads(prediction.feature_importance)
            except (json.JSONDecodeError, TypeError):
                pass

        result["risk_prediction"] = {
            "risk_probability": round(prediction.risk_probability, 3),
            "risk_level": prediction.risk_level.value if hasattr(prediction.risk_level, "value") else str(prediction.risk_level),
            "recommended_action": prediction.recommended_action,
            "predicted_at": prediction.predicted_at.isoformat(),
        }
        if feature_importance:
            result["risk_prediction"]["probabilities"] = feature_importance

    if wellbeing:
        result["wellbeing_scores"] = {
            "emotional": round(wellbeing.emotional_score, 3),
            "safety": round(wellbeing.safety_score, 3),
            "belonging": round(wellbeing.belonging_score, 3),
            "trend": round(wellbeing.trend_score, 3),
            "overall": round(wellbeing.overall_score, 3),
        }

    if ml_available:
        try:
            ml_result = predictor.predict_from_wellbeing(
                student_data={
                    "gender": student.gender or "other",
                    "birth_date": student.birth_date.isoformat() if student.birth_date else None,
                    "grade": 7,
                    "school_type": "public",
                },
                wellbeing_scores={
                    "emotional_score": wellbeing.emotional_score if wellbeing else 0.5,
                    "safety_score": wellbeing.safety_score if wellbeing else 0.5,
                    "belonging_score": wellbeing.belonging_score if wellbeing else 0.5,
                    "trend_score": wellbeing.trend_score if wellbeing else 0.5,
                    "overall_score": wellbeing.overall_score if wellbeing else 0.5,
                },
                include_explanations=True,
            )
            result["ml_explanation"] = ml_result.get("explanation")
        except Exception:
            pass
    else:
        if wellbeing:
            score = wellbeing.overall_score
            result["rule_based_explanation"] = {
                "method": "inverse_wellbeing",
                "formula": "risk_probability = 1.0 - overall_score",
                "inputs": {"overall_score": round(score, 3)},
                "risk_probability": round(1.0 - score, 3),
                "factors": [
                    {"name": "Emocional", "score": round(wellbeing.emotional_score, 3), "contribution": "35%"},
                    {"name": "Seguridad", "score": round(wellbeing.safety_score, 3), "contribution": "25%"},
                    {"name": "Pertenencia", "score": round(wellbeing.belonging_score, 3), "contribution": "20%"},
                    {"name": "Tendencia", "score": round(wellbeing.trend_score, 3), "contribution": "20%"},
                ],
            }

    return result

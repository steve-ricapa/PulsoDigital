"""FastAPI router for ML predictions."""

from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_active_user, require_roles
from app.models import User
from app.ml.schemas import MLPredictRequest, MLPredictResponse
from app.ml.predictor import get_ml_predictor, MLPredictor

router = APIRouter()


def _get_predictor() -> MLPredictor:
    predictor = get_ml_predictor()
    if not predictor.is_ready:
        raise HTTPException(
            status_code=503,
            detail="ML model not loaded. Place rf_model.pkl and rf_config.json in app/ml/config/.",
        )
    return predictor


@router.post("/predict", response_model=MLPredictResponse)
async def predict_wellbeing(
    request: MLPredictRequest,
    current_user: User = Depends(require_roles("admin", "school_admin", "psychologist")),
    predictor: MLPredictor = Depends(_get_predictor),
):
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
        raise HTTPException(
            status_code=400,
            detail="Provide either 'responses' or 'wellbeing_scores'.",
        )

    return MLPredictResponse(**result)


@router.get("/model-info")
async def get_model_info(
    current_user: User = Depends(require_roles("admin", "school_admin", "psychologist")),
    predictor: MLPredictor = Depends(_get_predictor),
):
    return {
        "features": predictor._loader.feature_names,
        "class_labels": predictor._loader.class_labels,
        "thresholds": predictor._loader.thresholds,
    }

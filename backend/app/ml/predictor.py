"""High-level ML prediction interface."""

import logging
from typing import Any, Dict, Optional
import numpy as np

from app.ml.model_loader import load_model, ModelLoader
from app.ml.feature_builder import build_features, build_features_from_wellbeing_scores

logger = logging.getLogger(__name__)

ROUTINE = "routine"
MONITOR = "monitor"
FLAGGED = "flagged"


class MLPredictor:
    def __init__(self, loader: Optional[ModelLoader] = None):
        self._loader = loader or load_model()

    @property
    def is_ready(self) -> bool:
        return self._loader.is_loaded

    def predict_from_responses(
        self,
        student_data: Dict[str, Any],
        responses: Dict[str, Any],
        include_explanations: bool = True,
    ) -> Dict[str, Any]:
        features = build_features(student_data, responses)
        return self._run_prediction(features, include_explanations)

    def predict_from_wellbeing(
        self,
        student_data: Dict[str, Any],
        wellbeing_scores: Dict[str, float],
        include_explanations: bool = True,
    ) -> Dict[str, Any]:
        features = build_features_from_wellbeing_scores(student_data, wellbeing_scores)
        return self._run_prediction(features, include_explanations)

    def _run_prediction(self, features: np.ndarray, include_explanations: bool) -> Dict[str, Any]:
        result = self._loader.predict(features)

        class_label = result["predicted_class"]
        probabilities = result["probabilities"]

        thresholds = self._loader.thresholds
        monitor_threshold = thresholds.get("monitor_75th", 50.0) / 100.0
        flag_threshold = thresholds.get("flag_85th", 62.5) / 100.0

        high_prob = probabilities.get("high", 0.0)
        medium_prob = probabilities.get("medium", 0.0)

        if high_prob >= flag_threshold or class_label == "high":
            triage = FLAGGED
        elif medium_prob >= monitor_threshold or class_label == "medium":
            triage = MONITOR
        else:
            triage = ROUTINE

        explanation = None
        if include_explanations:
            explanation = self._loader.explain(features)

        return {
            "predicted_class": class_label,
            "probabilities": probabilities,
            "triage": triage,
            "explanation": explanation,
            "model_info": {
                "features": self._loader.feature_names,
                "class_labels": self._loader.class_labels,
                "thresholds": self._loader.thresholds,
            },
        }


_predictor: Optional[MLPredictor] = None
_predictor_attempted = False


def get_ml_predictor() -> Optional[MLPredictor]:
    global _predictor, _predictor_attempted
    if _predictor is not None and _predictor.is_ready:
        return _predictor
    if _predictor_attempted:
        return _predictor if _predictor and _predictor.is_ready else None
    _predictor_attempted = True
    try:
        _predictor = MLPredictor()
        if _predictor.is_ready:
            return _predictor
    except Exception as exc:
        logger.warning("Could not initialize ML predictor: %s", exc)
    return None

"""Load the pre-trained RF model, config, and SHAP explainer."""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np

logger = logging.getLogger(__name__)

CONFIG_DIR = Path(__file__).parent / "config"


class ModelLoader:
    def __init__(self):
        self._pipeline = None
        self._config: Optional[Dict[str, Any]] = None
        self._shap_explainer = None
        self._feature_names: List[str] = []
        self._class_labels: List[str] = []
        self._thresholds: Dict[str, float] = {}
        self._loaded = False

    def load(self) -> None:
        model_path = CONFIG_DIR / "rf_model.pkl"
        config_path = CONFIG_DIR / "rf_config.json"

        if not model_path.exists():
            raise FileNotFoundError(
                f"RF model not found at {model_path}. "
                "Download from https://huggingface.co/zhixinlim/student-wellbeing-ml "
                "or place rf_model.pkl manually."
            )
        if not config_path.exists():
            raise FileNotFoundError(
                f"RF config not found at {config_path}. "
                "Create rf_config.json with features, class_labels, and thresholds."
            )

        self._pipeline = joblib.load(model_path)

        with open(config_path) as f:
            self._config = json.load(f)

        self._feature_names = self._config.get("features", [])
        self._class_labels = self._config.get("class_labels", ["low", "medium", "high"])
        self._thresholds = self._config.get("thresholds", {})

        self._init_shap_explainer()
        self._loaded = True
        logger.info(
            "RF model loaded: %d features, classes=%s",
            len(self._feature_names),
            self._class_labels,
        )

    def _init_shap_explainer(self) -> None:
        try:
            import shap

            if hasattr(self._pipeline, "predict_proba"):
                self._shap_explainer = shap.TreeExplainer(self._pipeline)
                logger.info("SHAP TreeExplainer initialized")
            else:
                logger.warning("Pipeline lacks predict_proba, SHAP disabled")
        except ImportError:
            logger.warning("shap not installed, explanations disabled")
        except Exception as e:
            logger.warning("SHAP init failed: %s", e)

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def feature_names(self) -> List[str]:
        return list(self._feature_names)

    @property
    def class_labels(self) -> List[str]:
        return list(self._class_labels)

    @property
    def thresholds(self) -> Dict[str, float]:
        return dict(self._thresholds)

    def predict(self, features: np.ndarray) -> Dict[str, Any]:
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")

        if features.ndim == 1:
            features = features.reshape(1, -1)

        probabilities = self._pipeline.predict_proba(features)[0]
        predicted_idx = int(np.argmax(probabilities))
        predicted_label = self._class_labels[predicted_idx]

        return {
            "predicted_class": predicted_label,
            "probabilities": {
                label: round(float(prob), 4)
                for label, prob in zip(self._class_labels, probabilities)
            },
        }

    def explain(self, features: np.ndarray) -> Optional[Dict[str, Any]]:
        if self._shap_explainer is None:
            return None

        try:
            if features.ndim == 1:
                features = features.reshape(1, -1)

            shap_values = self._shap_explainer.shap_values(features)

            if isinstance(shap_values, list):
                values_per_class = []
                for class_idx, class_label in enumerate(self._class_labels):
                    if class_idx < len(shap_values):
                        values_per_class.append({
                            "class": class_label,
                            "values": [
                                {"feature": name, "shap_value": round(float(val), 4)}
                                for name, val in zip(self._feature_names, shap_values[class_idx][0])
                            ],
                        })
                top_factors = self._get_top_factors_multiclass(shap_values, features[0])
            else:
                values_flat = shap_values[0]
                top_factors = [
                    {"feature": name, "shap_value": round(float(val), 4)}
                    for name, val in zip(self._feature_names, values_flat)
                ]
                top_factors.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
                top_factors = top_factors[:5]
                values_per_class = None

            return {
                "top_factors": top_factors,
                "per_class": values_per_class,
                "base_value": round(float(self._shap_explainer.expected_value)
                                    if np.isscalar(self._shap_explainer.expected_value)
                                    else float(self._shap_explainer.expected_value[0]), 4),
            }
        except Exception as e:
            logger.error("SHAP explanation failed: %s", e)
            return None

    def _get_top_factors_multiclass(
        self, shap_values: list, features_row: np.ndarray, top_n: int = 5
    ) -> List[Dict[str, Any]]:
        all_abs = []
        for class_idx, class_label in enumerate(self._class_labels):
            if class_idx >= len(shap_values):
                continue
            vals = shap_values[class_idx][0]
            for name, val in zip(self._feature_names, vals):
                all_abs.append({
                    "feature": name,
                    "shap_value": round(float(val), 4),
                    "class": class_label,
                    "abs_value": abs(float(val)),
                })
        all_abs.sort(key=lambda x: x["abs_value"], reverse=True)
        for item in all_abs[:top_n]:
            item.pop("abs_value", None)
        return all_abs[:top_n]


_loader: Optional[ModelLoader] = None


def get_model_loader() -> ModelLoader:
    global _loader
    if _loader is None:
        _loader = ModelLoader()
    return _loader


def load_model() -> ModelLoader:
    loader = get_model_loader()
    if not loader.is_loaded:
        loader.load()
    return loader

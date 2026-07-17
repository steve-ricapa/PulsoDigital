from datetime import datetime, timedelta
from uuid import UUID
from typing import List, Optional, Dict, Any
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    precision_score, recall_score, f1_score, confusion_matrix,
    classification_report
)
from sklearn.preprocessing import StandardScaler
import joblib
import json
from pathlib import Path
from sqlalchemy import select, and_, desc, func
from sqlalchemy.orm import selectinload

from app.models import (
    WellbeingScore, RiskPrediction, Student, Response, Question,
    Survey, RiskLevel, Intervention, SupportRequest, InterventionType
)
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

MODEL_DIR = Path(settings.ML_MODEL_PATH)
MODEL_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_NAMES = [
    "emotional_score",
    "safety_score",
    "belonging_score",
    "trend_score",
    "overall_score",
    "weeks_since_last_survey",
    "consecutive_negative_weeks",
    "sudden_drop_flag",
    "support_requests_count",
    "interventions_count",
]


class WellbeingMLModel:
    def __init__(self, model_name: str = "logistic_regression"):
        self.model_name = model_name
        self.model = None
        self.scaler = StandardScaler()
        self.version = "1.0.0"
        self.trained_at = None
        self.metrics = {}
        
        if model_name == "logistic_regression":
            self.model = LogisticRegression(
                random_state=42,
                max_iter=1000,
                class_weight="balanced",
            )
        elif model_name == "random_forest":
            self.model = RandomForestClassifier(
                n_estimators=100,
                random_state=42,
                class_weight="balanced",
            )
        elif model_name == "xgboost":
            try:
                import xgboost as xgb
                self.model = xgb.XGBClassifier(
                    random_state=42,
                    scale_pos_weight=1,
                    eval_metric="logloss",
                )
            except ImportError:
                logger.warning("XGBoost not available, falling back to RandomForest")
                self.model = RandomForestClassifier(
                    n_estimators=100,
                    random_state=42,
                    class_weight="balanced",
                )
        else:
            raise ValueError(f"Unknown model: {model_name}")
    
    async def prepare_features(
        self,
        student_id: UUID,
        survey_id: UUID,
        db,
    ) -> Optional[np.ndarray]:
        result = await db.execute(
            select(WellbeingScore).where(
                and_(
                    WellbeingScore.student_id == student_id,
                    WellbeingScore.survey_id == survey_id,
                )
            )
        )
        wellbeing = result.scalar_one_or_none()

        if not wellbeing:
            return None

        prev_result = await db.execute(
            select(WellbeingScore)
            .join(Survey)
            .where(
                and_(
                    WellbeingScore.student_id == student_id,
                    Survey.end_date < datetime.utcnow(),
                )
            )
            .order_by(desc(Survey.end_date))
            .limit(10)
        )
        prev_scores = prev_result.scalars().all()

        weeks_since_last = 0
        if prev_scores:
            latest_survey = await db.get(Survey, prev_scores[0].survey_id)
            if latest_survey:
                weeks_since_last = (datetime.utcnow() - latest_survey.end_date).days // 7

        consecutive_negative = 0
        for score in prev_scores:
            if score.overall_score < 0.5:
                consecutive_negative += 1
            else:
                break

        sudden_drop = 0
        if len(prev_scores) >= 2:
            if prev_scores[0].overall_score - prev_scores[1].overall_score >= settings.SUDDEN_DROP_THRESHOLD:
                sudden_drop = 1

        support_requests = await db.scalar(
            select(func.count(SupportRequest.id)).where(
                and_(
                    SupportRequest.student_id == student_id,
                    SupportRequest.created_at >= datetime.utcnow() - timedelta(weeks=12),
                )
            )
        ) or 0

        interventions = await db.scalar(
            select(func.count(Intervention.id)).where(
                and_(
                    Intervention.student_id == student_id,
                    Intervention.created_at >= datetime.utcnow() - timedelta(weeks=12),
                )
            )
        ) or 0
        
        features = np.array([[
            wellbeing.emotional_score,
            wellbeing.safety_score,
            wellbeing.belonging_score,
            wellbeing.trend_score,
            wellbeing.overall_score,
            min(weeks_since_last, 52),
            consecutive_negative,
            sudden_drop,
            support_requests,
            interventions,
        ]])
        
        return features
    
    async def prepare_training_data(self, db) -> tuple:
        result = await db.execute(
            select(Intervention).where(Intervention.is_completed == True)
            .options(
                selectinload(Intervention.student).selectinload(Student.wellbeing_scores),
                selectinload(Intervention.student).selectinload(Student.responses),
            )
        )
        interventions = result.scalars().all()
        
        X = []
        y = []
        
        for intervention in interventions:
            student = intervention.student
            latest_wellbeing = max(student.wellbeing_scores, key=lambda w: w.calculated_at) if student.wellbeing_scores else None
            
            if not latest_wellbeing:
                continue
            
            features = self.prepare_features(student.id, latest_wellbeing.survey_id, db)
            if features is not None:
                X.append(features[0])
                y.append(1 if intervention.intervention_type in [
                    InterventionType.EXTERNAL_REFERRAL,
                    InterventionType.SESSION_SCHEDULED,
                ] else 0)
        
        if len(X) < 10:
            logger.warning("Insufficient training data for ML model")
            return None, None
        
        return np.array(X), np.array(y)
    
    def train(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        self.model.fit(X_train_scaled, y_train)
        
        y_pred = self.model.predict(X_test_scaled)
        y_prob = self.model.predict_proba(X_test_scaled)[:, 1]
        
        self.metrics = {
            "precision": float(precision_score(y_test, y_pred, zero_division=0)),
            "recall": float(recall_score(y_test, y_pred, zero_division=0)),
            "f1": float(f1_score(y_test, y_pred, zero_division=0)),
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
            "classification_report": classification_report(y_test, y_pred, output_dict=True),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "positive_class_ratio": float(sum(y) / len(y)),
        }
        
        self.trained_at = datetime.utcnow()
        
        self.save()
        
        return self.metrics
    
    def predict(self, features: np.ndarray) -> tuple:
        if self.model is None:
            raise ValueError("Model not trained")
        
        features_scaled = self.scaler.transform(features)
        probability = self.model.predict_proba(features_scaled)[0, 1]
        prediction = self.model.predict(features_scaled)[0]
        
        feature_importance = {}
        if hasattr(self.model, "coef_"):
            feature_importance = dict(zip(FEATURE_NAMES, self.model.coef_[0].tolist()))
        elif hasattr(self.model, "feature_importances_"):
            feature_importance = dict(zip(FEATURE_NAMES, self.model.feature_importances_.tolist()))
        
        return probability, prediction, feature_importance
    
    def save(self):
        model_path = MODEL_DIR / f"{self.model_name}_v{self.version}.joblib"
        scaler_path = MODEL_DIR / f"{self.model_name}_scaler_v{self.version}.joblib"
        meta_path = MODEL_DIR / f"{self.model_name}_meta_v{self.version}.json"
        
        joblib.dump(self.model, model_path)
        joblib.dump(self.scaler, scaler_path)
        
        meta = {
            "model_name": self.model_name,
            "version": self.version,
            "trained_at": self.trained_at.isoformat() if self.trained_at else None,
            "metrics": self.metrics,
            "feature_names": FEATURE_NAMES,
        }
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2)
        
        logger.info(f"Model saved to {model_path}")
    
    @classmethod
    def load(cls, model_name: str, version: str = "latest") -> "WellbeingMLModel":
        if version == "latest":
            models = list(MODEL_DIR.glob(f"{model_name}_v*.joblib"))
            if not models:
                raise FileNotFoundError(f"No model found for {model_name}")
            model_path = max(models, key=lambda p: p.stat().st_mtime)
            version = model_path.stem.split("_v")[-1]
        else:
            model_path = MODEL_DIR / f"{model_name}_v{version}.joblib"
        
        scaler_path = MODEL_DIR / f"{model_name}_scaler_v{version}.joblib"
        meta_path = MODEL_DIR / f"{model_name}_meta_v{version}.json"
        
        if not model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_path}")
        
        instance = cls(model_name)
        instance.model = joblib.load(model_path)
        instance.scaler = joblib.load(scaler_path)
        
        with open(meta_path) as f:
            meta = json.load(f)
        instance.version = meta["version"]
        instance.trained_at = datetime.fromisoformat(meta["trained_at"]) if meta["trained_at"] else None
        instance.metrics = meta.get("metrics", {})
        
        return instance
    
    def get_shap_explanation(self, features: np.ndarray) -> Optional[Dict]:
        try:
            import shap
            if hasattr(self.model, "predict_proba"):
                explainer = shap.Explainer(self.model.predict_proba, self.scaler.transform(features))
                shap_values = explainer(features)
                return {
                    "values": shap_values.values[0].tolist(),
                    "base_values": shap_values.base_values[0].tolist(),
                    "feature_names": FEATURE_NAMES,
                }
        except ImportError:
            logger.warning("SHAP not available for explanations")
        except Exception as e:
            logger.error(f"SHAP explanation failed: {e}")
        return None


async def train_models(db) -> Dict[str, Dict]:
    results = {}

    for model_name in ["logistic_regression", "random_forest"]:
        try:
            model = WellbeingMLModel(model_name)
            X, y = await model.prepare_training_data(db)

            if X is not None and len(X) >= 20:
                metrics = model.train(X, y)
                results[model_name] = {
                    "status": "trained",
                    "metrics": metrics,
                    "version": model.version,
                }
            else:
                results[model_name] = {
                    "status": "skipped",
                    "reason": "Insufficient training data",
                }
        except Exception as e:
            logger.error(f"Training failed for {model_name}: {e}")
            results[model_name] = {
                "status": "failed",
                "error": str(e),
            }
    
    return results


async def predict_risk(
    db,
    student_id: UUID,
    survey_id: UUID,
    model_name: str = "logistic_regression",
) -> RiskPrediction:
    model = WellbeingMLModel.load(model_name)
    
    features = await model.prepare_features(student_id, survey_id, db)
    if features is None:
        raise ValueError("Insufficient data for prediction")
    
    probability, prediction, feature_importance = model.predict(features)
    shap_explanation = model.get_shap_explanation(features)
    
    risk_level = determine_risk_level_from_probability(probability)
    action = get_recommended_action(risk_level)
    
    prediction_record = RiskPrediction(
        student_id=student_id,
        survey_id=survey_id,
        model_name=model_name,
        model_version=model.version,
        risk_probability=probability,
        risk_level=risk_level,
        feature_importance=json.dumps(feature_importance),
        shap_values=json.dumps(shap_explanation) if shap_explanation else None,
        recommended_action=action,
    )
    
    db.add(prediction_record)
    await db.commit()
    await db.refresh(prediction_record)
    
    return prediction_record


def determine_risk_level_from_probability(probability: float) -> RiskLevel:
    if probability >= 0.8:
        return RiskLevel.CRITICAL
    elif probability >= 0.6:
        return RiskLevel.HIGH
    elif probability >= 0.4:
        return RiskLevel.MODERATE
    else:
        return RiskLevel.LOW


def get_recommended_action(risk_level: RiskLevel) -> str:
    actions = {
        RiskLevel.CRITICAL: "Immediate psychologist review required - schedule emergency consultation",
        RiskLevel.HIGH: "Schedule check-in within 48 hours - priority monitoring",
        RiskLevel.MODERATE: "Monitor closely - review at next scheduled survey",
        RiskLevel.LOW: "Continue routine monitoring",
    }
    return actions.get(risk_level, "Continue routine monitoring")
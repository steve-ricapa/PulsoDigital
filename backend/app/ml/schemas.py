"""Pydantic schemas for ML prediction requests/responses."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class StudentInput(BaseModel):
    gender: str = Field(default="F", description="Student gender: M/F/other")
    birth_date: Optional[str] = Field(default=None, description="ISO date string")
    grade: int = Field(default=7, ge=1, le=12)
    school_type: str = Field(default="public", description="public/private/state")


class ResponseInput(BaseModel):
    emotional_wellbeing: Optional[float] = Field(default=None, ge=0, le=1)
    belonging: Optional[float] = Field(default=None, ge=0, le=1)
    bullying_victim: Optional[float] = Field(default=None, ge=0, le=1)
    support_seeking: Optional[float] = Field(default=None, ge=0, le=1)
    sleep_quality: Optional[float] = Field(default=None, ge=0, le=1)
    academic_stress: Optional[float] = Field(default=None, ge=0, le=1)
    peer_relationships: Optional[float] = Field(default=None, ge=0, le=1)
    teacher_relationships: Optional[float] = Field(default=None, ge=0, le=1)
    safety_at_school: Optional[float] = Field(default=None, ge=0, le=1)
    physical_wellbeing: Optional[float] = Field(default=None, ge=0, le=1)
    extracurricular: Optional[float] = Field(default=None, ge=0, le=1)
    family_support: Optional[float] = Field(default=None, ge=0, le=1)
    social_media_impact: Optional[float] = Field(default=None, ge=0, le=1)
    self_esteem: Optional[float] = Field(default=None, ge=0, le=1)
    future_outlook: Optional[float] = Field(default=None, ge=0, le=1)
    life_satisfaction: Optional[float] = Field(default=None, ge=0, le=1)
    help_seeking_attitude: Optional[float] = Field(default=None, ge=0, le=1)


class WellbeingScoresInput(BaseModel):
    emotional_score: float = Field(ge=0, le=1)
    safety_score: float = Field(ge=0, le=1)
    belonging_score: float = Field(ge=0, le=1)
    trend_score: float = Field(ge=0, le=1)
    overall_score: float = Field(ge=0, le=1)


class MLPredictRequest(BaseModel):
    student: StudentInput = Field(default_factory=StudentInput)
    responses: Optional[ResponseInput] = None
    wellbeing_scores: Optional[WellbeingScoresInput] = None
    include_explanations: bool = Field(default=True)


class ProbabilityOutput(BaseModel):
    low: float
    medium: float
    high: float


class ShapFactorOutput(BaseModel):
    feature: str
    shap_value: float
    class_value: Optional[str] = None


class ExplanationOutput(BaseModel):
    top_factors: List[ShapFactorOutput]
    per_class: Optional[List[Dict[str, Any]]] = None
    base_value: Optional[float] = None


class ModelInfoOutput(BaseModel):
    model_config = {"protected_namespaces": ()}

    features: List[str]
    class_labels: List[str]
    thresholds: Dict[str, float]


class MLPredictResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    predicted_class: str
    probabilities: ProbabilityOutput
    triage: str = Field(description="routine / monitor / flagged")
    explanation: Optional[ExplanationOutput] = None
    model_info: ModelInfoOutput

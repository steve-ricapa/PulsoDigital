"""Map Pulso Digital survey responses to the 21 RF model features."""

import logging
from typing import Any, Dict, List, Optional
import numpy as np

logger = logging.getLogger(__name__)


FEATURE_ORDER = [
    "gender",
    "age",
    "grade_level",
    "school_type",
    "q1_1", "q1_2", "q1_3", "q1_4", "q1_5",
    "q2_1", "q2_2", "q2_3",
    "q3_1", "q3_2", "q3_3",
    "q4_1", "q4_2",
    "q5_1", "q5_2", "q5_3",
    "q6_1",
]


GENDER_MAP = {"M": 0, "F": 1, "male": 0, "female": 1, "other": 2}
GRADE_MAP = {1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3, 11: 3, 12: 3}
SCHOOL_TYPE_MAP = {"public": 0, "private": 1, "state": 0}


def build_features(
    student_data: Dict[str, Any],
    responses: Dict[str, Any],
) -> np.ndarray:
    features = {}

    gender_raw = str(student_data.get("gender", "F")).strip()
    features["gender"] = GENDER_MAP.get(gender_raw, 1)

    birth_date = student_data.get("birth_date")
    if birth_date:
        from datetime import datetime, date
        if isinstance(birth_date, str):
            try:
                bd = datetime.fromisoformat(birth_date.replace("Z", "")).date()
            except (ValueError, TypeError):
                bd = date(2010, 1, 1)
        elif isinstance(birth_date, date):
            bd = birth_date
        else:
            bd = date(2010, 1, 1)
        today = date.today()
        features["age"] = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
    else:
        features["age"] = 14

    grade = student_data.get("grade", 7)
    features["grade_level"] = GRADE_MAP.get(int(grade) if grade else 7, 2)
    features["school_type"] = SCHOOL_TYPE_MAP.get(
        str(student_data.get("school_type", "public")).lower(), 0
    )

    q_keys = {
        "q1_1": "emotional_wellbeing",
        "q1_2": "belonging",
        "q1_3": "bullying_victim",
        "q1_4": "support_seeking",
        "q1_5": "sleep_quality",
        "q2_1": "academic_stress",
        "q2_2": "peer_relationships",
        "q2_3": "teacher_relationships",
        "q3_1": "safety_at_school",
        "q3_2": "physical_wellbeing",
        "q3_3": "extracurricular",
        "q4_1": "family_support",
        "q4_2": "social_media_impact",
        "q5_1": "self_esteem",
        "q5_2": "future_outlook",
        "q5_3": "life_satisfaction",
        "q6_1": "help_seeking_attitude",
    }

    for feature_name, response_key in q_keys.items():
        raw_val = responses.get(response_key)
        features[feature_name] = _normalize_feature(raw_val)

    return np.array([features[name] for name in FEATURE_ORDER], dtype=np.float64).reshape(1, -1)


def build_features_from_wellbeing_scores(
    student_data: Dict[str, Any],
    wellbeing_scores: Dict[str, float],
) -> np.ndarray:
    mapped_responses = {
        "emotional_wellbeing": wellbeing_scores.get("emotional_score", 0.5),
        "belonging": wellbeing_scores.get("belonging_score", 0.5),
        "bullying_victim": 1.0 - wellbeing_scores.get("safety_score", 0.5),
        "support_seeking": wellbeing_scores.get("trend_score", 0.5),
        "sleep_quality": wellbeing_scores.get("emotional_score", 0.5),
        "academic_stress": 1.0 - wellbeing_scores.get("overall_score", 0.5),
        "peer_relationships": wellbeing_scores.get("belonging_score", 0.5),
        "teacher_relationships": wellbeing_scores.get("belonging_score", 0.5),
        "safety_at_school": wellbeing_scores.get("safety_score", 0.5),
        "physical_wellbeing": wellbeing_scores.get("overall_score", 0.5),
        "extracurricular": wellbeing_scores.get("belonging_score", 0.5),
        "family_support": wellbeing_scores.get("belonging_score", 0.5),
        "social_media_impact": 1.0 - wellbeing_scores.get("emotional_score", 0.5),
        "self_esteem": wellbeing_scores.get("emotional_score", 0.5),
        "future_outlook": wellbeing_scores.get("trend_score", 0.5),
        "life_satisfaction": wellbeing_scores.get("overall_score", 0.5),
        "help_seeking_attitude": wellbeing_scores.get("trend_score", 0.5),
    }
    return build_features(student_data, mapped_responses)


def _normalize_feature(value: Any) -> float:
    if value is None:
        return 0.5

    if isinstance(value, (int, float)):
        if 0.0 <= value <= 1.0:
            return float(value)
        if 0 <= value <= 5:
            return value / 5.0
        if 0 <= value <= 10:
            return value / 10.0
        return max(0.0, min(1.0, float(value)))

    if isinstance(value, str):
        value_lower = value.lower().strip()
        scale_5 = {
            "muy mal": 0.0, "mal": 0.25, "regular": 0.5, "bien": 0.75, "muy bien": 1.0,
            "1": 0.0, "2": 0.25, "3": 0.5, "4": 0.75, "5": 1.0,
        }
        if value_lower in scale_5:
            return scale_5[value_lower]

        scale_emoji = {"😞": 0.0, "😟": 0.25, "😐": 0.5, "🙂": 0.75, "😊": 1.0}
        if value_lower in scale_emoji:
            return scale_emoji[value_lower]

        yes_no = {"yes": 1.0, "no": 0.0, "sí": 1.0, "si": 1.0, "true": 1.0, "false": 0.0}
        if value_lower in yes_no:
            return yes_no[value_lower]

    return 0.5

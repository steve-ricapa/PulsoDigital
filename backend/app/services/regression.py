from typing import List, Dict
import numpy as np
from scipy.stats import linregress


def compute_wellbeing_regression(scores: List[float]) -> Dict:
    """Compute linear regression on a sequence of wellbeing scores (0.0–1.0).

    Returns slope, R², direction, and projected next-week value.
    Requires at least 3 data points; returns None-safe defaults otherwise.
    """
    if len(scores) < 3:
        return {
            "slope": 0.0,
            "r_squared": 0.0,
            "p_value": 1.0,
            "direction": "stable",
            "projected_next_week": scores[-1] if scores else 0.5,
        }

    x = np.arange(len(scores), dtype=float)
    y = np.array(scores, dtype=float)
    slope, intercept, r_value, p_value, _std_err = linregress(x, y)
    projected = float(np.clip(slope * len(scores) + intercept, 0.0, 1.0))

    if slope > 0.005:
        direction = "improving"
    elif slope < -0.005:
        direction = "declining"
    else:
        direction = "stable"

    return {
        "slope": round(float(slope), 4),
        "r_squared": round(float(r_value ** 2), 4),
        "p_value": round(float(p_value), 4),
        "direction": direction,
        "projected_next_week": round(projected, 3),
    }

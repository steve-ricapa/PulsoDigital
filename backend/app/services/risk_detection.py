from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import List

from app.models import RiskLevel

logger = logging.getLogger(__name__)

CRITICAL_KEYWORDS = [
    "suicidio", "suicidarme", "matarme", "quitarme la vida", "no quiero vivir",
    "autolesión", "autolesionarme", "hacerme daño", "hacerme daño a mi mismo",
    "acabar con todo", "terminar con todo", "que me muera", "quiero morir",
    "cortarme", "lastimarme", "arme", "pastillas para morir",
]

HIGH_KEYWORDS = [
    "abuso", "abuso sexual", "me tocan", "me tocaron", "violaron", "violar",
    "violencia", "me golpean", "me golpearon", "me pegan", "me pegaron",
    "amenaza", "amenazan", "amenazaron", "me amenazan", "me amenazó",
    "armas", "cuchillo", "navaja", "drogas", "sustancias",
    "novio golpea", "padre golpea", "madre golpea", "me encierran",
    "no me dejan salir", "me quitan las cosas", "me castigan feo",
]

MODERATE_KEYWORDS = [
    "triste hace tiempo", "triste mucho tiempo", "no aguanto más", "no aguanto",
    "soledad extrema", "me siento solo", "me siento sola", "nadie me quiere",
    "nadie me habla", "me excluyen", "me ignoran", "no tengo amigos",
    "bullying", "acoso", "me molestan", "me ridiculizan",
    "me aburre vivir", "para qué vivo", "no le veo sentido",
    "estoy cansado de todo", "cansado de vivir", "no quiero estar aquí",
    "me siento vacío", "me siento vacía", "nada tiene sentido",
    "lloro todo el tiempo", "no puedo dormir", "no como",
]


@dataclass
class RiskDetectionResult:
    risk_level: RiskLevel = RiskLevel.LOW
    signals: List[str] = field(default_factory=list)
    conversation_snapshot: List[dict] = field(default_factory=list)


def detect_risk(user_message: str, session_messages: list) -> RiskDetectionResult:
    msg_lower = user_message.lower()
    detected: List[str] = []
    level = RiskLevel.LOW

    for kw in CRITICAL_KEYWORDS:
        if kw in msg_lower:
            detected.append(kw)
            level = RiskLevel.CRITICAL

    for kw in HIGH_KEYWORDS:
        if kw in msg_lower:
            detected.append(kw)
            if level.value not in ("critical",):
                level = RiskLevel.HIGH

    for kw in MODERATE_KEYWORDS:
        if kw in msg_lower:
            detected.append(kw)
            if level == RiskLevel.LOW:
                level = RiskLevel.MODERATE

    snapshot = []
    for msg in session_messages:
        role = "user" if hasattr(msg, "content") and type(msg).__name__ == "HumanMessage" else "assistant"
        snapshot.append({"role": role, "content": str(msg.content)})

    return RiskDetectionResult(
        risk_level=level,
        signals=detected,
        conversation_snapshot=snapshot,
    )


def build_summary_prompt(conversation_snapshot: List[dict]) -> str:
    lines = []
    for m in conversation_snapshot:
        role = "Estudiante" if m["role"] == "user" else "Asistente"
        lines.append(f"{role}: {m['content']}")
    transcript = "\n".join(lines)

    return (
        "Eres un asistente que genera un resumen conciso para un psicólogo escolar.\n"
        "Resume de forma empática y detallada esta conversación entre un estudiante y el asistente de bienestar.\n"
        "El res debe incluir:\n"
        "- Qué situacion cuenta el estudiante\n"
        "- Cómo se siente\n"
        "- Quienes están involucrados\n"
        "- Nivel de urgencia percibido\n"
        "- Cualquier señal de riesgo observada\n\n"
        "Sé directo pero comprensivo. El psicólogo necesita entender la situation rápidamente.\n\n"
        f"Conversación:\n{transcript}"
    )

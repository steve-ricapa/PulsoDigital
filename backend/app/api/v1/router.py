from fastapi import APIRouter

from app.api.v1 import (
    auth, students, surveys, responses, wellbeing, risk,
    interventions, dashboard, notifications, audit,
)
from app.ml.router import router as ml_router
from app.chat.router import router as chat_router

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(surveys.router, prefix="/surveys", tags=["surveys"])
api_router.include_router(responses.router, prefix="/responses", tags=["responses"])
api_router.include_router(wellbeing.router, prefix="/wellbeing", tags=["wellbeing"])
api_router.include_router(risk.router, prefix="/risk", tags=["risk"])
api_router.include_router(interventions.router, prefix="/interventions", tags=["interventions"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(ml_router, prefix="/ml", tags=["ml"])
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])

from __future__ import annotations

import json
import logging
import uuid as _uuid
from datetime import datetime, timezone

from app.chat.config import SESSION_TTL_MINUTES
from app.chat.llm import get_llm
from app.chat.memory import get_session_store, ChatSession
from app.services.risk_detection import detect_risk, build_summary_prompt, RiskDetectionResult
from app.models import RiskLevel, ChatReportStatus

logger = logging.getLogger(__name__)


class ChatServiceError(Exception):
    pass


class SessionNotFoundError(ChatServiceError):
    pass


class SessionExpiredError(ChatServiceError):
    pass


class SessionOwnershipError(ChatServiceError):
    pass


class LLMServiceError(ChatServiceError):
    pass


class ChatService:
    def __init__(self) -> None:
        self._store = get_session_store()

    def create_session(self, user_id: str) -> ChatSession:
        return self._store.create(user_id)

    def get_session(self, session_id: str, user_id: str) -> ChatSession:
        session = self._store.get(session_id)
        if session is None:
            raise SessionNotFoundError("Session not found or expired")
        if session.user_id != user_id:
            raise SessionOwnershipError("Session does not belong to this user")
        return session

    def send_message(self, session_id: str, user_id: str, message: str) -> str:
        session = self.get_session(session_id, user_id)

        session.add_user_message(message)

        risk_result = detect_risk(message, session.messages)

        llm = get_llm()
        try:
            response = llm.invoke(session.get_messages_for_llm())
            reply = response.content
        except Exception as e:
            logger.error("LLM invocation failed: %s", type(e).__name__)
            session.messages.pop()
            raise LLMServiceError("No se pudo generar una respuesta. Intenta de nuevo.") from e

        session.add_ai_message(reply)

        if risk_result.risk_level in (RiskLevel.MODERATE, RiskLevel.HIGH, RiskLevel.CRITICAL):
            self._create_chat_report(session, risk_result)

        return reply

    def _create_chat_report(self, session: ChatSession, risk_result: RiskDetectionResult) -> None:
        try:
            from app.core.database import _get_session_maker
            from sqlalchemy import select
            from app.models import ChatReport, Student

            summary = self._generate_summary(risk_result.conversation_snapshot)

            async def _insert():
                session_factory = _get_session_maker()
                async with session_factory() as db:
                    student_result = await db.execute(
                        select(Student).where(Student.user_id == session.user_id)
                    )
                    student = student_result.scalar_one_or_none()
                    if not student:
                        logger.warning("No student found for user %s", session.user_id)
                        return

                    report = ChatReport(
                        id=_uuid.uuid4(),
                        student_id=student.id,
                        session_id=session.session_id,
                        risk_level=risk_result.risk_level,
                        risk_signals=json.dumps(risk_result.signals, ensure_ascii=False),
                        messages_snapshot=json.dumps(risk_result.conversation_snapshot, ensure_ascii=False),
                        summary=summary,
                        status=ChatReportStatus.PENDING,
                    )
                    db.add(report)
                    await db.commit()
                    logger.info("Chat report created for student %s, risk=%s", student.id, risk_result.risk_level)

            import asyncio
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(_insert())
            except RuntimeError:
                asyncio.run(_insert())

        except Exception as e:
            logger.error("Failed to create chat report: %s", e)

    def _generate_summary(self, conversation_snapshot: list) -> str:
        try:
            llm = get_llm()
            prompt = build_summary_prompt(conversation_snapshot)
            response = llm.invoke([{"role": "user", "content": prompt}])
            return response.content
        except Exception as e:
            logger.error("Failed to generate summary: %s", e)
            lines = []
            for m in conversation_snapshot:
                role = "Estudiante" if m["role"] == "user" else "Asistente"
                lines.append(f"{role}: {m['content'][:200]}")
            return "\n".join(lines)

    def delete_session(self, session_id: str, user_id: str) -> bool:
        session = self._store.get(session_id)
        if session and session.user_id != user_id:
            return False
        return self._store.delete(session_id)

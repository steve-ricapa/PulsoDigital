from __future__ import annotations

import logging

from app.chat.config import SESSION_TTL_MINUTES
from app.chat.llm import get_llm
from app.chat.memory import get_session_store, ChatSession

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

        llm = get_llm()
        try:
            response = llm.invoke(session.get_messages_for_llm())
            reply = response.content
        except Exception as e:
            logger.error("LLM invocation failed: %s", type(e).__name__)
            session.messages.pop()
            raise LLMServiceError("No se pudo generar una respuesta. Intenta de nuevo.") from e

        session.add_ai_message(reply)
        return reply

    def delete_session(self, session_id: str, user_id: str) -> bool:
        session = self._store.get(session_id)
        if session and session.user_id != user_id:
            return False
        return self._store.delete(session_id)

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import List
from uuid import uuid4

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage

from app.chat.config import SESSION_TTL_MINUTES, MEMORY_WINDOW
from app.chat.config import SYSTEM_PROMPT


@dataclass
class ChatSession:
    session_id: str
    user_id: str
    messages: List[BaseMessage] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)

    @property
    def is_expired(self) -> bool:
        return (time.time() - self.last_activity) > SESSION_TTL_MINUTES * 60

    def touch(self) -> None:
        self.last_activity = time.time()

    def add_user_message(self, content: str) -> None:
        self.messages.append(HumanMessage(content=content))
        self._trim()
        self.touch()

    def add_ai_message(self, content: str) -> None:
        self.messages.append(AIMessage(content=content))
        self._trim()
        self.touch()

    def get_messages_for_llm(self) -> List[BaseMessage]:
        return [SystemMessage(content=SYSTEM_PROMPT)] + list(self.messages)

    def _trim(self) -> None:
        max_pairs = MEMORY_WINDOW
        if len(self.messages) > max_pairs * 2:
            self.messages = self.messages[-(max_pairs * 2):]


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, ChatSession] = {}

    def create(self, user_id: str) -> ChatSession:
        self.cleanup_expired()
        session_id = str(uuid4())
        session = ChatSession(session_id=session_id, user_id=user_id)
        self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> ChatSession | None:
        session = self._sessions.get(session_id)
        if session and session.is_expired:
            self.delete(session_id)
            return None
        return session

    def delete(self, session_id: str) -> bool:
        session = self._sessions.pop(session_id, None)
        return session is not None

    def cleanup_expired(self) -> int:
        expired = [
            sid for sid, s in self._sessions.items()
            if s.is_expired
        ]
        for sid in expired:
            del self._sessions[sid]
        return len(expired)


_store: SessionStore | None = None


def get_session_store() -> SessionStore:
    global _store
    if _store is None:
        _store = SessionStore()
    return _store

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_active_user
from app.models import User
from app.chat.config import SESSION_TTL_MINUTES
from app.chat.schemas import (
    CreateSessionResponse,
    SendMessageRequest,
    SendMessageResponse,
    DeleteSessionResponse,
)
from app.chat.service import (
    ChatService,
    SessionNotFoundError,
    SessionOwnershipError,
    LLMServiceError,
)

router = APIRouter()


def get_chat_service() -> ChatService:
    return ChatService()


@router.post("/session", response_model=CreateSessionResponse)
async def create_chat_session(
    current_user: User = Depends(get_current_active_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    session = chat_service.create_session(str(current_user.id))
    return CreateSessionResponse(
        session_id=session.session_id,
        expires_in_minutes=SESSION_TTL_MINUTES,
    )


@router.post("/message", response_model=SendMessageResponse)
async def send_chat_message(
    payload: SendMessageRequest,
    current_user: User = Depends(get_current_active_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    try:
        reply = chat_service.send_message(
            session_id=payload.session_id,
            user_id=str(current_user.id),
            message=payload.message,
        )
    except SessionNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired",
        )
    except SessionOwnershipError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session does not belong to this user",
        )
    except LLMServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )

    return SendMessageResponse(
        session_id=payload.session_id,
        message=reply,
        expires_in_minutes=SESSION_TTL_MINUTES,
    )


@router.delete("/session/{session_id}", response_model=DeleteSessionResponse)
async def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    chat_service.delete_session(session_id, str(current_user.id))
    return DeleteSessionResponse(message="Session deleted")

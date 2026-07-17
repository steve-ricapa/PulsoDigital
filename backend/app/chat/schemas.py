from pydantic import BaseModel, Field


class CreateSessionResponse(BaseModel):
    session_id: str
    expires_in_minutes: int


class SendMessageRequest(BaseModel):
    session_id: str
    message: str = Field(..., min_length=1, max_length=2000)


class SendMessageResponse(BaseModel):
    session_id: str
    message: str
    expires_in_minutes: int


class DeleteSessionResponse(BaseModel):
    message: str

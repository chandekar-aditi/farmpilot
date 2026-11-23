from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ChatRequest(BaseModel):
    message: str
    project_id: Optional[int] = None


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    reply: str
    sources: List[str] = []
    message_id: int

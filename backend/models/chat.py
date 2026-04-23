from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    context: Optional[str] = None  # "crop", "disease", "policy", "general"

class ChatResponse(BaseModel):
    response: str
    category: str
    language: str
    suggestions: List[str] = []

class ChatHistory(BaseModel):
    user_id: str
    messages: List[ChatMessage] = []
    category: str = "general"
    language: str = "en"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    password: str
    role: Optional[str] = "student"

class UserResponse(BaseModel):
    id: UUID
    username: str
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    uploaded_at: datetime
    uploaded_by: Optional[UUID] = None
    audience: Optional[str] = "all"

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []

class TextKnowledgeCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"
    audience: str = "all"

class VoiceSetting(BaseModel):
    voice_name: str
    voice_lang: str

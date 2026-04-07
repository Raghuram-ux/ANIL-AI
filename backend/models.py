import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID as psqlUUID
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"

    id = Column(psqlUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="student") # 'admin', 'faculty', or 'student'

class Document(Base):
    __tablename__ = "documents"

    id = Column(psqlUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    uploaded_by = Column(psqlUUID(as_uuid=True), ForeignKey("users.id"))
    
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(psqlUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(psqlUUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1536))
    
    document = relationship("Document", back_populates="chunks")

class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(psqlUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(psqlUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    query = Column(String, nullable=False)
    response = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", backref="messages")

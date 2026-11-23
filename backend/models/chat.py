from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend.core.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id                    = Column(Integer, primary_key=True, index=True)
    user_id               = Column(Integer, ForeignKey("users.id"),    nullable=False)
    project_id            = Column(Integer, ForeignKey("projects.id"), nullable=True)
    role                  = Column(String(20), nullable=False)   # user / assistant
    message               = Column(Text,       nullable=False)
    context_snapshot_json = Column(Text,       default="{}")
    created_at            = Column(DateTime(timezone=True), server_default=func.now())

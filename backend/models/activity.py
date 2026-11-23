from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend.core.database import Base


class Activity(Base):
    __tablename__ = "activities"

    id            = Column(Integer, primary_key=True, index=True)
    project_id    = Column(Integer, ForeignKey("projects.id"), nullable=True)
    user_id       = Column(Integer, ForeignKey("users.id"),    nullable=False)
    action_type   = Column(String(100), nullable=False)
    description   = Column(Text,        nullable=False)
    metadata_json = Column(Text,        default="{}")
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

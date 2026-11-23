from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend.core.database import Base


class Reminder(Base):
    __tablename__ = "reminders"

    id               = Column(Integer, primary_key=True, index=True)
    project_id       = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id          = Column(Integer, ForeignKey("users.id"),    nullable=False)
    reminder_type    = Column(String(20),  default="daily")    # daily / weekly
    phase_name       = Column(String(100), nullable=False)
    task_description = Column(Text,        nullable=False)
    cycle_day        = Column(Integer,     nullable=False)
    is_done          = Column(Boolean,     default=False)
    notes            = Column(Text,        default="")
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

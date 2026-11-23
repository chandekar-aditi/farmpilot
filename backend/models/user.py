from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from backend.core.database import Base


class User(Base):
    __tablename__ = "users"

    id               = Column(Integer, primary_key=True, index=True)
    email            = Column(String(255), unique=True, index=True, nullable=False)
    password_hash    = Column(String(255), nullable=False)
    name             = Column(String(255), nullable=False)
    experience_level = Column(String(50),  default="beginner")   # beginner / intermediate / expert
    daily_effort_min = Column(Integer,     default=30)
    power_reliability= Column(String(50),  default="stable")     # stable / occasional / frequent
    temperature_c    = Column(Float,       default=28.0)
    humidity_pct     = Column(Float,       default=60.0)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

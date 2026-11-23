from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False)
    name              = Column(String(255), nullable=False)
    crop_id           = Column(String(100), nullable=False)
    crop_name         = Column(String(100), nullable=False)
    kit_count         = Column(Integer, default=1)
    environment       = Column(String(20),  default="indoor")   # indoor / outdoor / both
    space_sqft        = Column(Float,       nullable=False)
    height_ft         = Column(Float,       nullable=False)
    max_budget_inr    = Column(Float,       nullable=False)
    primary_goals     = Column(Text,        default="[]")        # JSON array string
    # Per-project user inputs (can differ from user profile defaults)
    power_reliability = Column(String(50),  default="stable")
    daily_effort_min  = Column(Integer,     default=30)
    temperature_c     = Column(Float,       default=28.0)
    humidity_pct      = Column(Float,       default=60.0)
    experience_level  = Column(String(50),  default="beginner")
    # Calculated costs
    setup_cost_inr    = Column(Float,       default=0)
    cycle_cost_inr    = Column(Float,       default=0)
    expected_yield_kg = Column(Float,       default=0)
    cycle_days        = Column(Integer,     default=0)
    # Per-kit calculated values (stored for quick reference)
    yield_per_kit_kg  = Column(Float,       default=0)
    nutrient_cost_per_cycle = Column(Float, default=0)
    # Quantity overrides (JSON dict: item_id -> qty, set by user adjustments)
    addons_json       = Column(Text,        default="{}")
    status            = Column(String(20),  default="active")   # active / archived
    start_date        = Column(DateTime(timezone=True), server_default=func.now())
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), onupdate=func.now())

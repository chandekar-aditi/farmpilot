from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    crop_id: str
    crop_name: str
    kit_count: int
    environment: str
    space_sqft: float
    height_ft: float
    max_budget_inr: float
    primary_goals: List[str] = []
    # Per-project user inputs — collected fresh at project creation
    # (each project can have different values from user profile defaults)
    power_reliability: str  = "stable"
    daily_effort_min:  int  = 30
    temperature_c:     float = 28.0
    humidity_pct:      float = 60.0
    experience_level:  str  = "beginner"


class ProjectResponse(BaseModel):
    id: int
    name: str
    crop_id: str
    crop_name: str
    kit_count: int
    environment: str
    space_sqft: float
    height_ft: float
    max_budget_inr: float
    primary_goals: str              # JSON string — parse on frontend
    power_reliability: str
    daily_effort_min: int
    temperature_c: float
    humidity_pct: float
    experience_level: str
    setup_cost_inr: float
    cycle_cost_inr: float
    expected_yield_kg: float
    cycle_days: int
    yield_per_kit_kg: float
    nutrient_cost_per_cycle: float
    status: str
    start_date: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectUpdate(BaseModel):
    name:   Optional[str] = None
    status: Optional[str] = None


class QuantityAdjust(BaseModel):
    section: str    # A / B / C / D
    item_id: str
    new_qty: int

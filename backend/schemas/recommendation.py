from pydantic import BaseModel
from typing import List


class RecommendRequest(BaseModel):
    space_sqft: float
    height_ft: float
    environment: str           # indoor / outdoor / both
    max_budget_inr: float
    primary_goals: List[str]   # e.g. ["fast_harvest", "low_effort"]
    power_reliability: str     # stable / occasional / frequent
    daily_effort_min: int
    experience: str            # beginner / intermediate / expert
    temperature_c: float
    humidity_pct: float


class CropRecommendation(BaseModel):
    crop_id: str
    name: str
    system: str
    score: float
    rank: int
    kit_count: int
    estimated_setup_cost: float
    estimated_cycle_cost: float
    expected_yield_kg: float
    cycle_days: int
    first_harvest_day: int
    ai_explanation: str
    image_url: str
    tags: List[str]
    min_budget_inr: float


class RecommendResponse(BaseModel):
    top_3: List[CropRecommendation]
    also_consider: List[CropRecommendation]
    wizard_summary: dict

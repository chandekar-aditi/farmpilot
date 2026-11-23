from pydantic import BaseModel
from typing import List, Optional


class MixingStep(BaseModel):
    step_num: int
    instruction: str
    product_name: Optional[str] = None
    product_image_url: Optional[str] = None
    is_critical: bool = False


class PhaseDosage(BaseModel):
    grow_g: float
    bloom_g: float
    cal_g: float
    mg_g: float


class PhaseNutrientCard(BaseModel):
    phase_num: int
    name: str
    week_start: int
    week_end: int
    day_start: int
    day_end: int
    dosage_per_20L: PhaseDosage
    your_reservoir_L: float
    your_dosage: PhaseDosage
    ec_min: float
    ec_max: float
    tds_min: float
    tds_max: float
    notes: List[str]


class NutrientBuyItem(BaseModel):
    product_id: str
    name: str
    short_name: str
    total_grams_needed: float
    packs_to_buy: int
    pack_price: float
    total_price: float
    link: str
    image_url: str


class SolutionResponse(BaseModel):
    crop_name: str
    mixing_steps: List[MixingStep]
    phase_cards: List[PhaseNutrientCard]
    buy_list: List[NutrientBuyItem]
    total_nutrient_cost: float

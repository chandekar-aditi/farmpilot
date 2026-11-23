from pydantic import BaseModel
from typing import List


class LineItem(BaseModel):
    item_id: str
    label: str           # A, B, C... component label
    name: str
    qty: int
    unit_price: float
    total_price: float
    link: str
    image_url: str
    notes: str = ""
    included_in_kit: bool = False
    is_skipped: bool = False   # qty == 0


class SetupSection(BaseModel):
    section_id: str    # A / B / C / D
    title: str
    subtitle: str
    items: List[LineItem]
    section_total: float


class CostSummary(BaseModel):
    setup_total: float
    cycle_total: float
    grand_total: float
    budget_remaining: float
    is_within_budget: bool


class SetupResponse(BaseModel):
    sections: List[SetupSection]
    cost_summary: CostSummary
    expected_yield_kg: float
    kit_count: int
    crop_name: str
    diagram_url: str

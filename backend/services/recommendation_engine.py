"""
Recommendation Engine — hard filters then weighted scoring.
"""
import math
from typing import List, Tuple
from backend.schemas.recommendation import RecommendRequest, CropRecommendation
from backend.services.data_loader import all_crops_list
from backend.services.budget_calculator import estimate_total_cost

GOAL_TAGS = {
    "fast_harvest":      ["fast_cycle"],
    "low_effort":        ["low_effort", "beginner_friendly"],
    "high_yield":        ["high_yield"],
    "commercial_sale":   ["commercial"],
    "home_kitchen":      ["home_kitchen"],
    "learn_hydroponics": ["beginner_friendly"],
}
EXP = ["beginner", "intermediate", "expert"]


def _hard_filter(req: RecommendRequest, crop: dict) -> Tuple[bool, str]:
    if req.height_ft < crop["min_height_ft"]:
        return False, f"Ceiling {req.height_ft}ft < required {crop['min_height_ft']}ft"
    if req.environment == "outdoor" and crop["environment"] == ["indoor"]:
        return False, "Crop is indoor-only"
    if req.environment == "outdoor" and "mushroom" in crop["id"]:
        return False, "Mushrooms require indoor environment"
    if req.power_reliability == "frequent" and crop["power_required"]:
        return False, "Crop needs stable power"
    if crop["id"] == "kit_casing_button_mushroom" and req.temperature_c > 32:
        return False, f"Button mushroom needs AC to 14°C; ambient {req.temperature_c}°C too high"
    if req.max_budget_inr < crop["min_budget_inr"]:
        return False, f"Budget ₹{req.max_budget_inr:,.0f} below minimum ₹{crop['min_budget_inr']:,.0f}"
    return True, ""


def _score(req: RecommendRequest, crop: dict, kit_count: int, setup: float, cycle: float) -> float:
    s = 0.0
    # Budget fit (30 pts)
    s += min((req.max_budget_inr / max(setup + cycle, 1)), 1.5) / 1.5 * 30
    # Experience (20 pts)
    if req.experience in crop["experience_suitable"]:
        s += 20
    else:
        idx = EXP.index(req.experience) if req.experience in EXP else 0
        for d in [-1, 1]:
            nb = EXP[idx + d] if 0 <= idx + d < len(EXP) else None
            if nb and nb in crop["experience_suitable"]:
                s += 10; break
    # Effort (15 pts)
    s += max(0, 1 - abs(req.daily_effort_min - crop["daily_effort_min"]) / 60) * 15
    # Goals (20 pts)
    hits = sum(
        1 for g in req.primary_goals
        if any(t in crop.get("tags", []) for t in GOAL_TAGS.get(g, []))
    )
    s += min(hits / max(len(req.primary_goals), 1), 1.0) * 20
    # Cycle speed (15 pts)
    if "fast_harvest" in req.primary_goals:
        s += max(0, 1 - crop["cycle_days"] / 210) * 15
    else:
        s += 7.5
    return round(s, 2)


def run_recommendation(req: RecommendRequest):
    viable = []
    for crop in all_crops_list():
        ok, _ = _hard_filter(req, crop)
        if not ok:
            continue
        kit_count = max(1, int(req.space_sqft // crop["footprint_sqft"]))
        setup, cycle = estimate_total_cost(crop["id"], kit_count, req.environment)
        # Fit within budget
        while (setup + cycle) > req.max_budget_inr and kit_count > 1:
            kit_count -= 1
            setup, cycle = estimate_total_cost(crop["id"], kit_count, req.environment)
        if (setup + cycle) > req.max_budget_inr:
            continue
        sc = _score(req, crop, kit_count, setup, cycle)
        viable.append({"crop": crop, "kit_count": kit_count, "score": sc,
                        "setup": setup, "cycle": cycle,
                        "yield": kit_count * crop["yield_per_kit_kg"]})

    viable.sort(key=lambda x: x["score"], reverse=True)

    def to_rec(item, rank) -> CropRecommendation:
        c = item["crop"]
        return CropRecommendation(
            crop_id=c["id"], name=c["name"], system=c["system"],
            score=item["score"], rank=rank, kit_count=item["kit_count"],
            estimated_setup_cost=item["setup"], estimated_cycle_cost=item["cycle"],
            expected_yield_kg=item["yield"], cycle_days=c["cycle_days"],
            first_harvest_day=c["first_harvest_day"], ai_explanation="",
            image_url=c["image_url"], tags=c.get("tags", []),
            min_budget_inr=c["min_budget_inr"],
        )

    top_3 = [to_rec(v, i + 1) for i, v in enumerate(viable[:3])]
    also  = [to_rec(v, i + 4) for i, v in enumerate(viable[3:6])]
    return top_3, also

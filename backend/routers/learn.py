"""
Learn & Grow router
===================
GET  /learn/crops           — all 6 crops summary grid
GET  /learn/crops/{id}      — full crop detail (phases, nutrients, mixing)
GET  /learn/crops/{id}/budget-preview  — min budget + kit estimate for given inputs
POST /learn/start-project   — validate inputs, check min budget, create project
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.user import User
from backend.services.data_loader import all_crops_list, get_crop, get_nutrient
from backend.services.budget_calculator import estimate_total_cost, build_setup_response
from backend.schemas.project import ProjectCreate, ProjectResponse

router = APIRouter(prefix="/learn", tags=["Learn & Grow"])


# ─── Crop list ────────────────────────────────────────────────────────────────

@router.get("/crops")
def list_crops():
    """All 6 crops — summary cards for the Learn & Grow grid."""
    return [
        {
            "id":                 c["id"],
            "name":               c["name"],
            "system":             c["system"],
            "cycle_days":         c["cycle_days"],
            "first_harvest_day":  c["first_harvest_day"],
            "yield_per_kit_kg":   c["yield_per_kit_kg"],
            "yield_per_unit_kg":  c["yield_per_unit_kg"],
            "capacity_per_kit":   c["capacity_per_kit"],
            "difficulty":         c.get("difficulty", "Moderate"),
            "environment":        c["environment"],
            "image_url":          c["image_url"],
            "diagram_url":        c.get("diagram_url", c["image_url"]),
            "tags":               c.get("tags", []),
            "description":        c.get("description", ""),
            "min_budget_inr":     c.get("min_budget_inr", 0),
            "base_kit_price_inr": c["base_kit_price_inr"],
            "ph_min":             c.get("ph_min"),
            "ph_max":             c.get("ph_max"),
            "daily_effort_min":   c["daily_effort_min"],
            "experience_suitable":c["experience_suitable"],
            "power_required":     c["power_required"],
        }
        for c in all_crops_list()
    ]


# ─── Crop detail ──────────────────────────────────────────────────────────────

@router.get("/crops/{crop_id}")
def crop_detail(crop_id: str):
    """Full detail for one crop — used in Learn detail page."""
    crop = get_crop(crop_id)
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")

    nd = get_nutrient(crop_id)
    phases = []
    if nd:
        for phase in nd.get("phases", []):
            phases.append({
                "phase_num":      phase["phase"],
                "name":           phase["name"],
                "week_start":     phase["week_start"],
                "week_end":       phase["week_end"],
                "day_start":      phase["day_start"],
                "day_end":        phase["day_end"],
                "dosage_per_20L": phase["dosage_per_20L"],
                "ec_min":         phase["ec_min"],
                "ec_max":         phase["ec_max"],
                "tds_min":        phase["tds_min"],
                "tds_max":        phase["tds_max"],
                "daily_tasks":    phase.get("daily_tasks", []),
                "weekly_tasks":   phase.get("weekly_tasks", []),
                "observations":   phase.get("observations", []),
            })

    return {
        **crop,
        "phases":           phases,
        "mixing_sequence":  nd.get("mixing_sequence", []) if nd else [],
        "critical_rules":   nd.get("critical_rules",  []) if nd else [],
    }


# ─── Budget preview ───────────────────────────────────────────────────────────

class BudgetPreviewRequest(BaseModel):
    space_sqft:  float
    height_ft:   float
    environment: str
    kit_count:   Optional[int] = None   # if None, calculate max kits from space


@router.post("/crops/{crop_id}/budget-preview")
def budget_preview(crop_id: str, req: BudgetPreviewRequest):
    """
    Given user inputs, returns:
    - max kits that fit in the space
    - setup cost, cycle cost, total cost
    - minimum budget required (1 kit)
    - expected yield
    Used by Learn page to show min-budget gate before "Start Project".
    """
    crop = get_crop(crop_id)
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")

    # Validate height
    if req.height_ft < crop["min_height_ft"]:
        raise HTTPException(
            status_code=400,
            detail=f"{crop['name']} needs at least {crop['min_height_ft']}ft ceiling. You have {req.height_ft}ft."
        )

    # Validate environment
    if req.environment == "outdoor" and crop["environment"] == ["indoor"]:
        raise HTTPException(status_code=400, detail=f"{crop['name']} is indoor-only.")

    # Calculate kit count
    max_kits_from_space = max(1, int(req.space_sqft // crop["footprint_sqft"]))
    kit_count = req.kit_count if req.kit_count else max_kits_from_space
    kit_count = min(kit_count, max_kits_from_space)
    kit_count = max(1, kit_count)

    # Calculate costs
    setup, cycle = estimate_total_cost(crop_id, kit_count, req.environment, req.space_sqft)
    min_setup, min_cycle = estimate_total_cost(crop_id, 1, req.environment, req.space_sqft)

    return {
        "crop_id":          crop_id,
        "crop_name":        crop["name"],
        "kit_count":        kit_count,
        "max_kits_in_space":max_kits_from_space,
        "setup_cost":       setup,
        "cycle_cost":       cycle,
        "total_cost":       round(setup + cycle, 2),
        "min_budget_1kit":  round(min_setup + min_cycle, 2),
        "expected_yield_kg":round(kit_count * crop["yield_per_kit_kg"], 2),
        "yield_per_kit_kg": crop["yield_per_kit_kg"],
        "cycle_days":       crop["cycle_days"],
        "first_harvest_day":crop["first_harvest_day"],
    }


# ─── Start project from Learn page ───────────────────────────────────────────

class LearnStartRequest(BaseModel):
    """Inputs collected on Learn detail page when user clicks 'Start This Project'."""
    crop_id:          str
    name:             str
    kit_count:        int
    environment:      str
    space_sqft:       float
    height_ft:        float
    max_budget_inr:   float
    primary_goals:    List[str] = []
    power_reliability:str = "stable"
    daily_effort_min: int = 30
    temperature_c:    float = 28.0
    humidity_pct:     float = 60.0
    experience_level: str = "beginner"


@router.post("/start-project", response_model=ProjectResponse)
def start_project_from_learn(
    req: LearnStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Validates all constraints and creates the project.
    Identical validation to the recommendation flow but initiated from Learn page.
    """
    crop = get_crop(req.crop_id)
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")

    # Height check
    if req.height_ft < crop["min_height_ft"]:
        raise HTTPException(
            status_code=400,
            detail=f"{crop['name']} requires {crop['min_height_ft']}ft ceiling. Your space is {req.height_ft}ft."
        )

    # Environment check
    if req.environment == "outdoor" and crop["environment"] == ["indoor"]:
        raise HTTPException(status_code=400, detail=f"{crop['name']} requires indoor environment.")

    # Power check
    if req.power_reliability == "frequent" and crop.get("power_required", False):
        raise HTTPException(
            status_code=400,
            detail=f"{crop['name']} needs stable power. Frequent power cuts will harm this crop."
        )

    # Temperature check for button mushroom
    if crop["id"] == "kit_casing_button_mushroom" and req.temperature_c > 32:
        raise HTTPException(
            status_code=400,
            detail=f"Button mushroom fruiting needs AC to reach 14°C. Your ambient temp is {req.temperature_c}°C."
        )

    # Kit count vs space
    max_kits = max(1, int(req.space_sqft // crop["footprint_sqft"]))
    if req.kit_count > max_kits:
        raise HTTPException(
            status_code=400,
            detail=f"{req.space_sqft}sqft fits max {max_kits} kit(s) of {crop['name']} (footprint {crop['footprint_sqft']}sqft/kit)."
        )

    # Budget check — total cost must fit within max_budget
    setup, cycle = estimate_total_cost(req.crop_id, req.kit_count, req.environment, req.space_sqft)
    total_needed = setup + cycle
    if req.max_budget_inr < total_needed * 0.9:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Budget ₹{req.max_budget_inr:,.0f} is below minimum ₹{total_needed:,.0f} "
                f"({req.kit_count} kit(s) of {crop['name']}). "
                f"Try reducing kit count or increasing budget."
            )
        )

    # Delegate to projects router logic
    from backend.routers.projects import create_project
    project_req = ProjectCreate(
        name              = req.name,
        crop_id           = req.crop_id,
        crop_name         = crop["name"],
        kit_count         = req.kit_count,
        environment       = req.environment,
        space_sqft        = req.space_sqft,
        height_ft         = req.height_ft,
        max_budget_inr    = req.max_budget_inr,
        primary_goals     = req.primary_goals,
        power_reliability = req.power_reliability,
        daily_effort_min  = req.daily_effort_min,
        temperature_c     = req.temperature_c,
        humidity_pct      = req.humidity_pct,
        experience_level  = req.experience_level,
    )
    return create_project(project_req, db=db, current_user=current_user)

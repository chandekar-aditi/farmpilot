import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.user import User
from backend.models.project import Project
from backend.models.activity import Activity
from backend.schemas.project import QuantityAdjust
from backend.schemas.setup import SetupResponse
from backend.services.budget_calculator import build_setup_response

router = APIRouter(prefix="/projects", tags=["Setup"])


@router.get("/{project_id}/setup", response_model=SetupResponse)
def get_setup(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    overrides = json.loads(project.addons_json or "{}")
    return build_setup_response(
        crop_id=project.crop_id,
        kit_count=project.kit_count,
        environment=project.environment,
        max_budget=project.max_budget_inr,
        qty_overrides=overrides,
        space_sqft=project.space_sqft,
    )


@router.put("/{project_id}/setup/adjust", response_model=SetupResponse)
def adjust_quantities(
    project_id: int,
    adjustments: List[QuantityAdjust],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    overrides = json.loads(project.addons_json or "{}")
    for adj in adjustments:
        overrides[adj.item_id] = adj.new_qty

    project.addons_json = json.dumps(overrides)

    result = build_setup_response(
        crop_id=project.crop_id,
        kit_count=project.kit_count,
        environment=project.environment,
        max_budget=project.max_budget_inr,
        qty_overrides=overrides,
        space_sqft=project.space_sqft,
    )
    project.setup_cost_inr = result.cost_summary.setup_total
    project.cycle_cost_inr = result.cost_summary.cycle_total

    db.add(Activity(
        project_id=project.id,
        user_id=current_user.id,
        action_type="qty_adjusted",
        description=f"Adjusted {len(adjustments)} item quantity/quantities",
        metadata_json=json.dumps([a.model_dump() for a in adjustments]),
    ))
    db.commit()
    return result

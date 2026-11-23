"""
Projects router
===============
create_project stores ALL per-project user inputs so each project is fully
self-contained: different projects can have different budgets, environments,
temperatures, goals etc.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.user import User
from backend.models.project import Project
from backend.models.activity import Activity
from backend.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from backend.services.budget_calculator import estimate_total_cost
from backend.services.data_loader import get_crop

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", response_model=ProjectResponse)
def create_project(
    req: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    crop = get_crop(req.crop_id)
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")

    # Validate minimum budget
    setup_cost, cycle_cost = estimate_total_cost(
        req.crop_id, req.kit_count, req.environment, req.space_sqft
    )
    min_required = setup_cost + cycle_cost
    if req.max_budget_inr < min_required * 0.9:   # allow 10% tolerance
        raise HTTPException(
            status_code=400,
            detail=(
                f"Budget ₹{req.max_budget_inr:,.0f} is below the minimum required "
                f"₹{min_required:,.0f} for {req.kit_count} kit(s) of {crop['name']}. "
                f"Please increase budget or reduce kit count."
            )
        )

    project = Project(
        user_id           = current_user.id,
        name              = req.name,
        crop_id           = req.crop_id,
        crop_name         = req.crop_name,
        kit_count         = req.kit_count,
        environment       = req.environment,
        space_sqft        = req.space_sqft,
        height_ft         = req.height_ft,
        max_budget_inr    = req.max_budget_inr,
        primary_goals     = json.dumps(req.primary_goals),
        # Per-project user inputs (each project stores its own values)
        power_reliability = req.power_reliability,
        daily_effort_min  = req.daily_effort_min,
        temperature_c     = req.temperature_c,
        humidity_pct      = req.humidity_pct,
        experience_level  = req.experience_level,
        # Calculated values
        setup_cost_inr    = setup_cost,
        cycle_cost_inr    = cycle_cost,
        expected_yield_kg = req.kit_count * crop["yield_per_kit_kg"],
        cycle_days        = crop["cycle_days"],
        yield_per_kit_kg  = crop["yield_per_kit_kg"],
        nutrient_cost_per_cycle = cycle_cost,
    )
    db.add(project)
    db.flush()

    db.add(Activity(
        project_id  = project.id,
        user_id     = current_user.id,
        action_type = "project_created",
        description = (
            f"Created '{req.name}' — {req.crop_name}, {req.kit_count} kit(s), "
            f"{req.environment}, ₹{req.max_budget_inr:,.0f} budget"
        ),
        metadata_json = json.dumps({
            "crop_id":     req.crop_id,
            "kit_count":   req.kit_count,
            "environment": req.environment,
            "setup_cost":  setup_cost,
            "cycle_cost":  cycle_cost,
        }),
    ))
    db.commit()
    db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.get("", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    projects = (
        db.query(Project)
        .filter(Project.user_id == current_user.id, Project.status != "archived")
        .order_by(Project.created_at.desc())
        .all()
    )
    return [ProjectResponse.model_validate(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse.model_validate(project)


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    req: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if req.name:
        project.name = req.name
    if req.status:
        project.status = req.status
    db.commit()
    db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.status = "archived"
    db.commit()
    return {"message": "Project archived"}

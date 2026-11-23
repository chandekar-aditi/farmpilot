from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.user import User
from backend.models.project import Project
from backend.schemas.solution import SolutionResponse
from backend.services.nutrient_calculator import build_solution_response

router = APIRouter(prefix="/projects", tags=["Solution"])


@router.get("/{project_id}/solution", response_model=SolutionResponse)
def get_solution(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return build_solution_response(crop_id=project.crop_id, kit_count=project.kit_count)

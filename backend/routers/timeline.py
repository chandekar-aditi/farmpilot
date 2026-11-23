from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.user import User
from backend.models.project import Project
from backend.schemas.timeline import TimelineResponse
from backend.services.timeline_builder import build_timeline

router = APIRouter(prefix="/projects", tags=["Timeline"])


@router.get("/{project_id}/timeline", response_model=TimelineResponse)
def get_timeline(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return build_timeline(
        crop_id=project.crop_id,
        project_start_date=project.start_date,
        project_id=project.id,
        db=db,
    )

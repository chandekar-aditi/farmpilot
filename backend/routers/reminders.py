import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.user import User
from backend.models.project import Project
from backend.models.reminder import Reminder
from backend.models.activity import Activity
from backend.schemas.timeline import ReminderCreate, ReminderResponse

router = APIRouter(tags=["Reminders"])


@router.post("/projects/{project_id}/reminders", response_model=ReminderResponse)
def create_reminder(
    project_id: int,
    req: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    reminder = Reminder(
        project_id=project_id,
        user_id=current_user.id,
        reminder_type=req.reminder_type,
        phase_name=req.phase_name,
        task_description=req.task_description,
        cycle_day=req.cycle_day,
        notes=req.notes,
    )
    db.add(reminder)
    db.flush()
    db.add(Activity(
        project_id=project_id, user_id=current_user.id,
        action_type="reminder_created",
        description=f"Set reminder: {req.task_description[:60]}",
        metadata_json=json.dumps({"cycle_day": req.cycle_day, "phase": req.phase_name}),
    ))
    db.commit()
    db.refresh(reminder)
    return ReminderResponse.model_validate(reminder)


@router.get("/projects/{project_id}/reminders", response_model=List[ReminderResponse])
def list_reminders(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminders = (
        db.query(Reminder)
        .filter(Reminder.project_id == project_id, Reminder.user_id == current_user.id)
        .order_by(Reminder.cycle_day)
        .all()
    )
    return [ReminderResponse.model_validate(r) for r in reminders]


@router.put("/reminders/{reminder_id}", response_model=ReminderResponse)
def toggle_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = db.query(Reminder).filter(
        Reminder.id == reminder_id, Reminder.user_id == current_user.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.is_done = not reminder.is_done
    db.add(Activity(
        project_id=reminder.project_id, user_id=current_user.id,
        action_type="reminder_toggled",
        description=f"Marked {'done' if reminder.is_done else 'undone'}: {reminder.task_description[:50]}",
        metadata_json=json.dumps({"reminder_id": reminder_id, "is_done": reminder.is_done}),
    ))
    db.commit()
    db.refresh(reminder)
    return ReminderResponse.model_validate(reminder)


@router.delete("/reminders/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = db.query(Reminder).filter(
        Reminder.id == reminder_id, Reminder.user_id == current_user.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(reminder)
    db.commit()
    return {"message": "Reminder deleted"}

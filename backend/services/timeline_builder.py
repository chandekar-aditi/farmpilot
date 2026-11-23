"""
Timeline Builder — phase timeline with current-day detection and reminder integration.
"""
from datetime import date
from sqlalchemy.orm import Session
from backend.services.data_loader import get_crop, get_nutrient
from backend.schemas.timeline import PhaseTimeline, TaskItem, TimelineResponse

COLORS = ["#52B788","#40916C","#2D6A4F","#1B4332","#74C69D","#52B788","#40916C","#2D6A4F"]


def build_timeline(crop_id: str, project_start_date, project_id: int, db: Session) -> TimelineResponse:
    crop = get_crop(crop_id)
    nd   = get_nutrient(crop_id)

    start = project_start_date.date() if hasattr(project_start_date, "date") else project_start_date
    current_day = max(1, (date.today() - start).days + 1)

    from backend.models.reminder import Reminder
    reminders = db.query(Reminder).filter(Reminder.project_id == project_id).all()
    rmap = {f"{r.phase_name}::{r.task_description[:40]}": r.id for r in reminders}

    def make_tasks(task_list, phase_name):
        out = []
        for t in task_list:
            key = f"{phase_name}::{t[:40]}"
            rid = rmap.get(key)
            out.append(TaskItem(task_text=t, has_reminder=rid is not None, reminder_id=rid))
        return out

    phases_out = []
    current_phase_num = 1
    for i, phase in enumerate(nd.get("phases", [])):
        is_current   = phase["day_start"] <= current_day <= phase["day_end"]
        is_completed = current_day > phase["day_end"]
        if is_current:
            current_phase_num = phase["phase"]
        phases_out.append(PhaseTimeline(
            phase_num=phase["phase"], name=phase["name"],
            day_start=phase["day_start"], day_end=phase["day_end"],
            week_start=phase["week_start"], week_end=phase["week_end"],
            is_current=is_current, is_completed=is_completed,
            color_hex=COLORS[i % len(COLORS)],
            daily_tasks=make_tasks(phase.get("daily_tasks", []), phase["name"]),
            weekly_tasks=make_tasks(phase.get("weekly_tasks", []), phase["name"]),
            observations=phase.get("observations", []),
        ))

    return TimelineResponse(phases=phases_out, current_day=current_day,
                            current_phase_num=current_phase_num,
                            total_days=crop["cycle_days"], crop_name=crop["name"])

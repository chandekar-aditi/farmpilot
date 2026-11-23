from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class TaskItem(BaseModel):
    task_text: str
    has_reminder: bool = False
    reminder_id: Optional[int] = None


class PhaseTimeline(BaseModel):
    phase_num: int
    name: str
    day_start: int
    day_end: int
    week_start: int
    week_end: int
    is_current: bool
    is_completed: bool
    color_hex: str
    daily_tasks: List[TaskItem]
    weekly_tasks: List[TaskItem]
    observations: List[str]


class TimelineResponse(BaseModel):
    phases: List[PhaseTimeline]
    current_day: int
    current_phase_num: int
    total_days: int
    crop_name: str


class ReminderCreate(BaseModel):
    task_description: str
    phase_name: str
    cycle_day: int
    reminder_type: str = "daily"
    notes: str = ""


class ReminderResponse(BaseModel):
    id: int
    task_description: str
    phase_name: str
    cycle_day: int
    reminder_type: str
    is_done: bool
    notes: str
    created_at: datetime

    model_config = {"from_attributes": True}

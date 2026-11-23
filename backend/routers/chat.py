"""
Chat router
===========
project_id is REQUIRED for all chat messages.
History, activities, and reminders are ALL scoped to that one project.
RAG retrieval is filtered to that project's crop only.
"""
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.user import User
from backend.models.project import Project
from backend.models.activity import Activity
from backend.models.reminder import Reminder
from backend.models.chat import ChatMessage
from backend.schemas.chat import ChatRequest, ChatResponse, ChatMessageResponse
from backend.services.rag_service import retrieve_context, build_system_prompt
from backend.services.groq_service import chat_completion

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
def send_message(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # project_id is required — every chat message is scoped to a project
    if not req.project_id:
        raise HTTPException(
            status_code=400,
            detail="project_id is required. Every chat conversation must be linked to a project."
        )

    # Load and verify project belongs to this user
    project = db.query(Project).filter(
        Project.id == req.project_id,
        Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # ── Layer 6: Activities scoped to THIS project ────────────────────────────
    activities = (
        db.query(Activity)
        .filter(
            Activity.user_id   == current_user.id,
            Activity.project_id == project.id,
        )
        .order_by(Activity.created_at.desc())
        .limit(10)
        .all()
    )

    # ── Layer 6: Reminders scoped to THIS project ─────────────────────────────
    reminders = (
        db.query(Reminder)
        .filter(
            Reminder.project_id == project.id,
            Reminder.user_id    == current_user.id,
        )
        .order_by(Reminder.cycle_day)
        .all()
    )

    # ── Chat history scoped to THIS project (last 20) ─────────────────────────
    history = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.user_id    == current_user.id,
            ChatMessage.project_id == project.id,
        )
        .order_by(ChatMessage.created_at.asc())
        .limit(20)
        .all()
    )

    messages_for_llm = [{"role": m.role, "content": m.message} for m in history]
    messages_for_llm.append({"role": "user", "content": req.message})

    # ── Layer 7: RAG retrieval — STRICT to this project's crop ───────────────
    retrieved = retrieve_context(
        query   = req.message,
        crop_id = project.crop_id,   # always filtered to this crop
        top_k   = 5,
    )

    # ── Build system prompt with all 7 layers ─────────────────────────────────
    system_prompt = build_system_prompt(
        user             = current_user,
        project          = project,
        activities       = activities,
        reminders        = reminders,
        chat_history     = history,
        retrieved_chunks = retrieved,
    )

    # ── LLM call ─────────────────────────────────────────────────────────────
    reply = chat_completion(system_prompt, messages_for_llm)

    # ── Persist messages ──────────────────────────────────────────────────────
    user_msg = ChatMessage(
        user_id    = current_user.id,
        project_id = project.id,
        role       = "user",
        message    = req.message,
    )
    db.add(user_msg)
    db.flush()

    bot_msg = ChatMessage(
        user_id                = current_user.id,
        project_id             = project.id,
        role                   = "assistant",
        message                = reply,
        context_snapshot_json  = json.dumps({
            "retrieved_chunks": retrieved[:400],
            "current_day":      _current_day(project),
        }),
    )
    db.add(bot_msg)
    db.flush()

    db.add(Activity(
        project_id  = project.id,
        user_id     = current_user.id,
        action_type = "chat_message",
        description = f"Asked: {req.message[:80]}",
    ))
    db.commit()
    db.refresh(bot_msg)

    # Extract source labels from retrieved chunks
    sources = []
    for chunk in retrieved.split("\n---\n")[:3]:
        lines = chunk.strip().split("\n")
        if lines:
            sources.append(lines[0][:80])

    return ChatResponse(reply=reply, sources=sources, message_id=bot_msg.id)


@router.get("", response_model=List[ChatMessageResponse])
def get_history(
    project_id: int = Query(..., description="Project ID is required"),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns chat history for one specific project only."""
    # Verify project ownership
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    messages = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.user_id    == current_user.id,
            ChatMessage.project_id == project_id,
        )
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
        .all()
    )
    return [ChatMessageResponse.model_validate(m) for m in messages]


def _current_day(project) -> int:
    from datetime import date
    if not project:
        return 1
    start = project.start_date.date() if hasattr(project.start_date, "date") else project.start_date
    return max(1, (date.today() - start).days + 1)

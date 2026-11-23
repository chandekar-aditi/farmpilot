import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.user import User
from backend.models.activity import Activity
from backend.schemas.recommendation import RecommendRequest, RecommendResponse
from backend.services.recommendation_engine import run_recommendation
from backend.services.groq_service import get_recommendation_explanation

router = APIRouter(prefix="/recommend", tags=["Recommendation"])


@router.post("", response_model=RecommendResponse)
def recommend(
    req: RecommendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    top_3, also_consider = run_recommendation(req)

    # Enrich top 3 with Groq AI explanations
    for rec in top_3:
        rec.ai_explanation = get_recommendation_explanation(
            user_experience=req.experience,
            user_goals=req.primary_goals,
            user_budget=req.max_budget_inr,
            user_space=req.space_sqft,
            crop_name=rec.name,
            kit_count=rec.kit_count,
            setup_cost=rec.estimated_setup_cost,
            cycle_cost=rec.estimated_cycle_cost,
            expected_yield=rec.expected_yield_kg,
            cycle_days=rec.cycle_days,
        )

    db.add(Activity(
        user_id=current_user.id,
        action_type="recommendation_run",
        description=f"Ran recommendation — {req.space_sqft}sqft, ₹{req.max_budget_inr}",
        metadata_json=json.dumps({"top_crop": top_3[0].name if top_3 else None}),
    ))
    db.commit()

    return RecommendResponse(
        top_3=top_3,
        also_consider=also_consider,
        wizard_summary={
            "space_sqft": req.space_sqft,
            "height_ft": req.height_ft,
            "environment": req.environment,
            "max_budget_inr": req.max_budget_inr,
            "primary_goals": req.primary_goals,
            "experience": req.experience,
        },
    )

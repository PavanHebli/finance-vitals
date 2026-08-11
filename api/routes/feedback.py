from fastapi import APIRouter
from models import FeedbackRequest, FeedbackResponse
from core.feedback_db import submit_feedback
from config import get_config

router = APIRouter()


@router.post("/feedback", response_model=FeedbackResponse)
def feedback(req: FeedbackRequest):
    cfg     = get_config()
    success = submit_feedback(
        found_via=req.found_via,
        score_accuracy=req.score_accuracy,
        most_useful=req.most_useful,
        missing_or_confusing=req.missing_or_confusing,
        feature_suggestion=req.feature_suggestion,
        anything_else=req.anything_else,
        email=req.email,
        supabase_url=cfg.supabase_url,
        supabase_key=cfg.supabase_key,
    )
    return FeedbackResponse(success=success)

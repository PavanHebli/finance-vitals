from fastapi import APIRouter, HTTPException
from models import GoalExtractRequest, GoalExtractResponse
from core.goal import extract_goal

router = APIRouter()


@router.post("/goal/extract", response_model=GoalExtractResponse)
def goal_extract(req: GoalExtractRequest):
    result = extract_goal(
        req.narrative_text,
        req.metrics.model_dump(),
        req.provider,
        req.api_key,
    )
    if result is None:
        raise HTTPException(status_code=422, detail="Could not extract a goal from the narrative.")
    return GoalExtractResponse(**result)

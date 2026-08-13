from fastapi import APIRouter
from models import ScoreRequest, ScoreResponse
from core.health import calculate_metrics, score_metrics, calculate_overall_score, get_mirror_label

router = APIRouter()


@router.post("/score", response_model=ScoreResponse)
def calculate_score(req: ScoreRequest):
    state         = req.form_data.model_dump()
    metrics       = calculate_metrics(state)
    metric_scores = score_metrics(metrics)
    overall_score = calculate_overall_score(metric_scores)
    mirror        = get_mirror_label(overall_score)
    return ScoreResponse(
        metrics=metrics,
        metric_scores=metric_scores,
        overall_score=overall_score,
        mirror=mirror,
    )

from fastapi import APIRouter
from models import SimulateRequest, SimulateResponse
from core.health import calculate_metrics, score_metrics, calculate_overall_score

router = APIRouter()


@router.post("/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest):
    state = req.form_data.model_dump()
    overrides = {k: v for k, v in req.sim_overrides.model_dump().items() if v is not None}
    state.update(overrides)

    metrics       = calculate_metrics(state)
    metric_scores = score_metrics(metrics)
    sim_score     = calculate_overall_score(metric_scores)

    return SimulateResponse(
        sim_score=sim_score,
        sim_metrics=metrics,
        sim_metric_scores=metric_scores,
    )

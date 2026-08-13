from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from starlette.concurrency import iterate_in_threadpool
from models import NarrativeRequest
from core.narrative import call_llm, build_prompt
from config import get_config

router = APIRouter()


@router.post("/narrative")
def stream_narrative(req: NarrativeRequest):
    config  = get_config()
    if not req.api_key:
        provider = config.hosted_provider
        api_key  = config.hosted_api_key
    else:
        provider = req.provider or config.hosted_provider
        api_key  = req.api_key

    state  = req.form_data.model_dump()
    prompt = build_prompt(
        state,
        req.metrics.model_dump(),
        req.metric_scores.model_dump(),
        req.overall_score,
        req.mirror.model_dump(),
    )

    def generate():
        for chunk in call_llm(prompt, provider, api_key):
            yield chunk

    return StreamingResponse(
        iterate_in_threadpool(generate()),
        media_type="text/plain",
    )

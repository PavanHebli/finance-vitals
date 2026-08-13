from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from starlette.concurrency import iterate_in_threadpool
from models import ChatRequest
from core.chat import (
    is_out_of_scope, _OUT_OF_SCOPE_RESPONSE,
    classify_question, build_snapshot_context, build_messages,
    call_llm_chat, maybe_summarise, STARTER_QUESTIONS,
)
from config import get_config

router = APIRouter()


@router.get("/chat/starters")
def get_starters():
    return {"questions": STARTER_QUESTIONS}


@router.post("/chat")
def stream_chat(req: ChatRequest):
    config  = get_config()
    if not req.api_key:
        provider = config.hosted_provider
        api_key  = config.hosted_api_key
    else:
        provider = req.provider or config.hosted_provider
        api_key  = req.api_key

    if is_out_of_scope(req.message):
        def oos():
            yield _OUT_OF_SCOPE_RESPONSE
        return StreamingResponse(iterate_in_threadpool(oos()), media_type="text/plain")

    state         = req.form_data.model_dump()
    metrics       = req.metrics.model_dump()
    metric_scores = req.metric_scores.model_dump()
    history       = [m.model_dump() for m in req.history]

    history, summary = maybe_summarise(history, req.summarised_history, provider, api_key)

    categories       = classify_question(req.message, provider, api_key)
    snapshot_context = build_snapshot_context(state, metrics, metric_scores, req.overall_score, req.mirror.model_dump())
    messages         = build_messages(snapshot_context, history + [{"role": "user", "content": req.message}], categories, summary)

    def generate():
        for chunk in call_llm_chat(messages, provider, api_key, state=state, categories=categories):
            yield chunk
        if summary != req.summarised_history:
            import json
            yield f"\n\x00VITALS_SUMMARY\x00{json.dumps({'summary': summary})}"

    return StreamingResponse(
        iterate_in_threadpool(generate()),
        media_type="text/plain",
    )

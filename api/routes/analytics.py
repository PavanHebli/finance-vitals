from fastapi import APIRouter
from models import SessionUpsert, EventInsert
from core.analytics_db import upsert_session, insert_event
from config import get_config

router = APIRouter(prefix="/analytics")


@router.post("/session")
def session(req: SessionUpsert):
    cfg = get_config()
    upsert_session(req.session_id, req.data, cfg.supabase_url, cfg.supabase_key)
    return {"ok": True}


@router.post("/event")
def event(req: EventInsert):
    cfg = get_config()
    insert_event(req.session_id, req.event, req.properties, cfg.supabase_url, cfg.supabase_key)
    return {"ok": True}

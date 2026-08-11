"""
Session-level analytics via Supabase. All writes are upserts on a single row per session_id.
Fails silently — never breaks the app.
"""
from __future__ import annotations
import uuid


def _get_client(supabase_url: str, supabase_key: str):
    from supabase import create_client
    return create_client(supabase_url, supabase_key)


def _get_device(user_agent: str) -> str:
    ua = user_agent.lower()
    if any(x in ua for x in ["ipad", "tablet"]) or ("android" in ua and "mobile" not in ua):
        return "tablet"
    if any(x in ua for x in ["mobile", "iphone", "ipod", "android"]):
        return "mobile"
    return "desktop"


def _upsert(session_id: str, data: dict, supabase_url: str, supabase_key: str, debug: bool = False) -> None:
    if not supabase_url or not supabase_key:
        return
    try:
        client = _get_client(supabase_url, supabase_key)
        client.table("sessions").upsert(
            {"session_id": session_id, **data},
            on_conflict="session_id",
        ).execute()
        if debug:
            print(f"[ANALYTICS] upsert ok — session={session_id[:8]} data={data}")
    except Exception as e:
        if debug:
            print(f"[ANALYTICS] upsert failed — {e}")


def log_session_start(session_id: str, user_agent: str, supabase_url: str, supabase_key: str, debug: bool = False) -> None:
    _upsert(session_id, {"device": _get_device(user_agent), "started": True}, supabase_url, supabase_key, debug)


def log_score_calculated(session_id: str, overall_score: int, provider: str, supabase_url: str, supabase_key: str, debug: bool = False) -> None:
    _upsert(session_id, {"score": overall_score, "provider": provider, "calculated": True}, supabase_url, supabase_key, debug)


def log_narrative_generated(session_id: str, supabase_url: str, supabase_key: str, debug: bool = False) -> None:
    _upsert(session_id, {"narrative_generated": True}, supabase_url, supabase_key, debug)


def log_chat_used(session_id: str, supabase_url: str, supabase_key: str, debug: bool = False) -> None:
    _upsert(session_id, {"chat_used": True}, supabase_url, supabase_key, debug)


def new_session_id() -> str:
    return str(uuid.uuid4())

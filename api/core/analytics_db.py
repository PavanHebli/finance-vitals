def upsert_session(session_id: str, data: dict, supabase_url: str, supabase_key: str) -> bool:
    if not supabase_url or not supabase_key:
        return True
    try:
        from supabase import create_client
        from datetime import datetime, timezone
        client = create_client(supabase_url, supabase_key)
        client.table("sessions").upsert(
            {"session_id": session_id, "last_active": datetime.now(timezone.utc).isoformat(), **data},
            on_conflict="session_id",
        ).execute()
        return True
    except Exception as e:
        print(f"[analytics_db] upsert_session error: {e}")
        return False


def insert_event(session_id: str, event: str, properties: dict, supabase_url: str, supabase_key: str) -> bool:
    if not supabase_url or not supabase_key:
        return True
    try:
        from supabase import create_client
        client = create_client(supabase_url, supabase_key)
        client.table("events").insert({
            "session_id": session_id,
            "event":      event,
            "properties": properties or {},
        }).execute()
        return True
    except Exception as e:
        print(f"[analytics_db] insert_event error: {e}")
        return False

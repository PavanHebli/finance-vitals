def submit_feedback(
    found_via: str,
    score_accuracy: int,
    most_useful: str,
    missing_or_confusing: str,
    feature_suggestion: str,
    anything_else: str,
    email: str,
    supabase_url: str,
    supabase_key: str,
) -> bool:
    if not supabase_url or not supabase_key:
        return False
    try:
        from supabase import create_client
        client = create_client(supabase_url, supabase_key)
        client.table("feedback").insert({
            "found_via":             found_via,
            "score_accuracy":        score_accuracy,
            "most_useful":           most_useful,
            "missing_or_confusing":  missing_or_confusing or None,
            "feature_suggestion":    feature_suggestion or None,
            "anything_else":         anything_else or None,
            "email":                 email or None,
        }, returning="minimal").execute()
        return True
    except Exception:
        return False

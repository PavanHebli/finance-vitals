from __future__ import annotations
import base64
import json
from datetime import datetime
from cryptography.fernet import Fernet

SNAPSHOT_VERSION = "1"

_RAW_KEY    = b'vitals__secret_key_v1___2026_!!!'
_FERNET_KEY = base64.urlsafe_b64encode(_RAW_KEY)
_cipher     = Fernet(_FERNET_KEY)

_INPUT_KEYS = [
    "income_main", "income_additional",
    "expenses_rent", "expenses_groceries", "expenses_transport",
    "expenses_subscriptions", "expenses_dining", "expenses_shopping", "expenses_other",
    "savings_total", "investments_total",
    "debt_total", "debt_monthly",
    "age", "employment", "has_health_insurance", "has_emergency_fund", "contributing_401k",
]


def create_snapshot(
    state: dict,
    metrics: dict,
    metric_scores: dict,
    overall_score: int,
    mirror: dict,
    narrative: str,
    goal: dict | None = None,
) -> dict:
    return {
        "saved_at": datetime.now().strftime("%Y-%m"),
        "version":  SNAPSHOT_VERSION,
        "inputs":   {k: state.get(k) for k in _INPUT_KEYS},
        "outputs":  {
            "overall_score": overall_score,
            "mirror_label":  mirror["label"],
            "metrics":       metrics,
            "metric_scores": metric_scores,
            "narrative":     narrative or "",
            "goal":          goal,
        },
    }


def load_vit_bytes(data: bytes) -> list:
    """Decrypt and parse .vit bytes into a list of snapshots."""
    try:
        json_str = _cipher.decrypt(data).decode("utf-8")
        content  = json.loads(json_str)
        return [content] if isinstance(content, dict) else content
    except Exception:
        raise ValueError("Could not read this file. Make sure it's a valid Vitals (.vit) snapshot.")


def append_or_overwrite(snapshots: list, new_snapshot: dict) -> list:
    """Same-month saves overwrite; new months append."""
    result    = list(snapshots)
    new_month = new_snapshot["saved_at"]
    for i, snap in enumerate(result):
        if snap.get("saved_at") == new_month:
            result[i] = new_snapshot
            return result
    result.append(new_snapshot)
    return result


def get_latest(snapshots: list) -> dict:
    return snapshots[-1]


def to_vit(snapshots: list) -> bytes:
    return _cipher.encrypt(json.dumps(snapshots, indent=2).encode("utf-8"))

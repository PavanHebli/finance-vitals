import base64
import json
from datetime import datetime

from cryptography.fernet import Fernet


SNAPSHOT_VERSION = "1"

# App-level encryption key — protects against accidental exposure.
# Not password-based: zero user friction, guards against casual snooping.
# 32 bytes → base64url-encoded → valid Fernet key.
_RAW_KEY    = b'finfriend_secret_key_v1_2026_!!!'  # exactly 32 bytes
_FERNET_KEY = base64.urlsafe_b64encode(_RAW_KEY)
_cipher     = Fernet(_FERNET_KEY)

# All session state input keys that get saved and restored
_INPUT_KEYS = [
    "income_main", "income_additional",
    "expenses_rent", "expenses_groceries", "expenses_transport",
    "expenses_subscriptions", "expenses_dining", "expenses_shopping", "expenses_other",
    "savings_total", "investments_total",
    "debt_total", "debt_monthly",
    "age", "employment", "has_health_insurance", "has_emergency_fund", "contributing_401k",
]


def create_snapshot(state: dict, metrics: dict, metric_scores: dict, overall_score: int, mirror: dict, narrative: str) -> dict:
    """
    Builds a snapshot dict from the current session.
    saved_at uses YYYY-MM so same-month saves overwrite each other.
    """
    return {
        "saved_at": datetime.now().strftime("%Y-%m"),
        "version": SNAPSHOT_VERSION,
        "inputs": {k: state.get(k) for k in _INPUT_KEYS},
        "outputs": {
            "overall_score": overall_score,
            "mirror_label": mirror["label"],
            "metrics": metrics,
            "metric_scores": metric_scores,
            "narrative": narrative or "",
        },
    }


def load_finfd(uploaded_file) -> list:
    """
    Decrypts and parses an uploaded .finfd file into a list of snapshots.
    Handles both array format (normal) and single-object format (legacy).
    Raises ValueError with a user-friendly message if decryption fails.
    """
    try:
        encrypted = uploaded_file.read()
        json_str  = _cipher.decrypt(encrypted).decode("utf-8")
        content   = json.loads(json_str)
        if isinstance(content, dict):
            content = [content]
        return content
    except Exception:
        raise ValueError("Could not read this file. Make sure it's a valid FinFriend (.finfd) snapshot.")


def append_or_overwrite(snapshots: list, new_snapshot: dict) -> list:
    """
    Appends new_snapshot to the list.
    If an entry with the same YYYY-MM already exists, overwrites it.
    Returns a new list — does not mutate the original.
    """
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


def to_finfd(snapshots: list) -> bytes:
    """Serializes and encrypts a snapshot list into .finfd bytes."""
    json_str = json.dumps(snapshots, indent=2)
    return _cipher.encrypt(json_str.encode("utf-8"))


def populate_state_from_snapshot(snapshot: dict, session_state) -> None:
    """
    Writes the inputs from a snapshot into session_state.
    Only writes keys defined in _INPUT_KEYS — never touches UI or nav keys.
    """
    for key, value in snapshot["inputs"].items():
        if key in _INPUT_KEYS:
            session_state[key] = value

from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel


# ── Shared ────────────────────────────────────────────────────────────────────

class FormData(BaseModel):
    income_main: float = 0.0
    income_additional: float = 0.0
    expenses_rent: float = 0.0
    expenses_groceries: float = 0.0
    expenses_transport: float = 0.0
    expenses_subscriptions: float = 0.0
    expenses_dining: float = 0.0
    expenses_shopping: float = 0.0
    expenses_other: float = 0.0
    expenses_total_estimate: float = 0.0
    savings_total: float = 0.0
    investments_total: float = 0.0
    debt_total: float = 0.0
    debt_monthly: float = 0.0
    age: Optional[int] = None
    employment: Optional[str] = None
    has_health_insurance: bool = False
    has_emergency_fund: Optional[str] = None
    contributing_401k: Optional[str] = None
    section2_visible: bool = False
    section3_visible: bool = False
    section4_visible: bool = False


class MetricScore(BaseModel):
    score: int
    status: str


class NetFlowScore(BaseModel):
    value: float


class MetricScores(BaseModel):
    savings_rate: MetricScore
    debt_to_income: MetricScore
    emergency_fund_months: MetricScore
    housing_ratio: MetricScore
    net_monthly_flow: NetFlowScore


class Metrics(BaseModel):
    savings_rate: float
    debt_to_income: float
    emergency_fund_months: float
    housing_ratio: float
    net_monthly_flow: float
    debt_payment_missing: bool = False


class Mirror(BaseModel):
    label: str
    description: str


# ── /score ────────────────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    form_data: FormData


class ScoreResponse(BaseModel):
    metrics: Metrics
    metric_scores: MetricScores
    overall_score: int
    mirror: Mirror


# ── /narrative ────────────────────────────────────────────────────────────────

class NarrativeRequest(BaseModel):
    form_data: FormData
    metrics: Metrics
    metric_scores: MetricScores
    overall_score: int
    mirror: Mirror
    provider: str
    api_key: str


# ── /simulate ─────────────────────────────────────────────────────────────────

class SimOverrides(BaseModel):
    income_main: Optional[float] = None
    income_additional: Optional[float] = None
    expenses_rent: Optional[float] = None
    expenses_groceries: Optional[float] = None
    expenses_transport: Optional[float] = None
    expenses_subscriptions: Optional[float] = None
    expenses_dining: Optional[float] = None
    expenses_shopping: Optional[float] = None
    expenses_other: Optional[float] = None
    debt_monthly: Optional[float] = None
    savings_total: Optional[float] = None


class SimulateRequest(BaseModel):
    form_data: FormData
    sim_overrides: SimOverrides


class SimulateResponse(BaseModel):
    sim_score: int
    sim_metrics: Metrics
    sim_metric_scores: MetricScores


# ── /simulate/interpret ───────────────────────────────────────────────────────

class InterpretRequest(BaseModel):
    scenario: str
    form_data: FormData
    provider: str = ""
    api_key: str = ""


class InterpretAdjustments(BaseModel):
    income_main:             Optional[float] = None
    expenses_rent:           Optional[float] = None
    expenses_groceries:      Optional[float] = None
    expenses_transport:      Optional[float] = None
    expenses_subscriptions:  Optional[float] = None
    expenses_dining:         Optional[float] = None
    expenses_shopping:       Optional[float] = None
    expenses_other:          Optional[float] = None
    debt_monthly:            Optional[float] = None
    savings_total:           Optional[float] = None


class InterpretResponse(BaseModel):
    adjustments:    InterpretAdjustments
    scenario_label: str


# ── /chat ─────────────────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []
    form_data: FormData
    metrics: Metrics
    metric_scores: MetricScores
    overall_score: int
    mirror: Mirror
    provider: str
    api_key: str
    summarised_history: str = ""
    budget_context: str = ""


# ── /goal/extract ─────────────────────────────────────────────────────────────

class GoalExtractRequest(BaseModel):
    narrative_text: str
    metrics: Metrics
    provider: str
    api_key: str


class GoalExtractResponse(BaseModel):
    action: str
    metric: str
    direction: str
    baseline_value: float


# ── /snapshot/encode & /snapshot/decode ──────────────────────────────────────

class SnapshotEncodeRequest(BaseModel):
    form_data: FormData
    metrics: Metrics
    metric_scores: MetricScores
    overall_score: int
    mirror: Mirror
    narrative: str = ""
    goal: Optional[dict[str, Any]] = None


# ── /feedback ─────────────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    found_via: str = ""
    score_accuracy: int = 3
    most_useful: str = ""
    missing_or_confusing: str = ""
    feature_suggestion: str = ""
    anything_else: str = ""
    email: str = ""


class FeedbackResponse(BaseModel):
    success: bool


# ── /analytics ────────────────────────────────────────────────────────────────

class SessionUpsert(BaseModel):
    session_id: str
    data: dict[str, Any] = {}


class EventInsert(BaseModel):
    session_id: str
    event: str
    properties: dict[str, Any] = {}

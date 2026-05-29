"""Schemas for multi-hop travel planning checkpoints."""

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from huaxia_tourismrag.schemas.evidence import DetailLevel


RequestMode = Literal["general", "diy"]
IntentType = Literal[
    "general_question",
    "conventional_itinerary",
    "diy_itinerary",
    "operational_status",
]
CheckpointReason = Literal[
    "endpoint_diy_mode",
    "explicit_concise_detail",
    "explicit_detail_general_preferences",
    "answered_preference_checkpoint",
    "answered_feasibility_checkpoint",
    "typed_short_single_destination",
    "complete_form_preferences",
]


class IntentDecision(BaseModel):
    """Intent checkpoint result for routing and endpoint fit."""

    request_mode: RequestMode

    intent: IntentType

    should_redirect: bool = False

    recommended_endpoint: str | None = None

    reason: str = Field(min_length=1, max_length=500)


class PreferenceProfile(BaseModel):
    """Compact preference profile extracted before planning."""

    travel_mode: Literal["self_drive", "train", "flight", "mixed", "unknown"] = (
        "unknown"
    )

    pace: Literal["relaxed", "balanced", "intensive", "unknown"] = "unknown"

    attraction_mix: Literal[
        "cultural",
        "natural",
        "balanced",
        "theme_pure",
        "unknown",
    ] = "unknown"

    food_preference: Literal[
        "local",
        "fine_dining",
        "balanced",
        "unknown",
    ] = "unknown"

    accommodation_preference: Literal[
        "luxury",
        "boutique",
        "convenient",
        "budget",
        "unknown",
    ] = "unknown"

    detail_level: DetailLevel = "standard"

    theme_strictness: Literal[
        "theme_pure",
        "balanced_city",
        "unknown",
    ] = "unknown"

    missing_critical_preferences: list[str] = Field(default_factory=list, max_length=8)

    assumed_defaults: list[str] = Field(default_factory=list, max_length=8)


class ClarificationDecision(BaseModel):
    """Preference checkpoint result."""

    should_ask: bool

    question: str | None = Field(default=None, max_length=500)

    reason: str = Field(min_length=1, max_length=500)

    profile: PreferenceProfile

    assumed_defaults: list[str] = Field(default_factory=list, max_length=8)

    @model_validator(mode="after")
    def validate_question_when_asking(self) -> "ClarificationDecision":
        """Require a user-facing question when the checkpoint asks."""

        if self.should_ask and not self.question:
            raise ValueError("question is required when should_ask is true")
        return self


class FeasibilityIssue(BaseModel):
    """One issue found by the feasibility checkpoint."""

    issue_type: Literal[
        "route_order",
        "travel_time",
        "weak_theme_match",
        "safety",
        "booking",
        "seasonality",
        "missing_evidence",
    ]

    description: str = Field(min_length=1, max_length=500)

    stop: str | None = Field(default=None, max_length=80)


class CheckpointResponseOption(BaseModel):
    """One concrete user-selectable response to a checkpoint."""

    label: str = Field(min_length=1, max_length=40)

    message: str = Field(min_length=1, max_length=200)


class FeasibilityReport(BaseModel):
    """Post-planning feasibility checkpoint result."""

    is_feasible: bool

    should_ask: bool = False

    question: str | None = Field(default=None, max_length=500)

    issues: list[FeasibilityIssue] = Field(default_factory=list, max_length=20)

    recommended_adjustments: list[str] = Field(default_factory=list, max_length=12)

    response_options: list[CheckpointResponseOption] = Field(
        default_factory=list,
        max_length=4,
    )

    @model_validator(mode="after")
    def validate_question_when_blocked(self) -> "FeasibilityReport":
        """Require a question when feasibility blocks the pipeline."""

        if self.should_ask and not self.question:
            raise ValueError("question is required when should_ask is true")
        return self


class CheckpointContext(BaseModel):
    """DTO-only facts that deterministic checkpoint policy is allowed to inspect."""

    request_mode: RequestMode

    detail_level: DetailLevel | None = None

    has_destination: bool = False

    has_start_date: bool = False

    has_end_date: bool = False

    duration_days: int | None = Field(default=None, ge=0, le=366)

    travelers: int | None = Field(default=None, ge=1, le=20)

    budget_level: Literal["budget", "mid_range", "luxury"] | None = None

    interest_count: int = Field(default=0, ge=0, le=12)

    from_form_template: bool = False

    has_origin_city: bool = False

    has_return_city: bool = False

    required_stop_count: int = Field(default=0, ge=0, le=12)

    has_traveler_composition: bool = False

    has_transport_preference: bool = False

    has_pace_preference: bool = False

    has_route_strictness: bool = False

    has_food_preference: bool = False

    has_accommodation_preference: bool = False

    form_travel_mode: Literal[
        "self_drive",
        "train",
        "flight",
        "mixed",
        "unknown",
    ] | None = None

    form_pace: Literal["relaxed", "balanced", "intensive", "unknown"] | None = None

    form_theme_strictness: Literal[
        "theme_pure",
        "balanced_city",
        "unknown",
    ] | None = None

    form_food_preference: Literal[
        "local",
        "fine_dining",
        "balanced",
        "unknown",
    ] | None = None

    form_accommodation_preference: Literal[
        "luxury",
        "boutique",
        "convenient",
        "budget",
        "unknown",
    ] | None = None

    continuation_pending_kind: Literal[
        "preference",
        "feasibility",
        "detail_level",
    ] | None = None

    continuation_quick_reply_action_id: Literal[
        "preference_option_a",
        "preference_option_b",
        "default_preferences",
        "detail_concise",
        "detail_standard",
        "detail_deep",
        "feasibility_accept_adjustment",
        "feasibility_keep_original",
    ] | None = None


class CheckpointPolicyDecision(BaseModel):
    """Deterministic checkpoint routing decision from typed context only."""

    run_intent_checkpoint: bool = True

    run_preference_checkpoint: bool = True

    run_feasibility_checkpoint: bool = True

    synthesized_intent: IntentType | None = None

    synthesized_preference_profile: PreferenceProfile | None = None

    synthesized_feasibility_report: FeasibilityReport | None = None

    reasons: list[CheckpointReason] = Field(default_factory=list)

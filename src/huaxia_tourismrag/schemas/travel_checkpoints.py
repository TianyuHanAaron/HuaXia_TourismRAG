"""Schemas for multi-hop travel planning checkpoints."""

from typing import Literal

from pydantic import BaseModel, Field, model_validator


RequestMode = Literal["general", "diy"]
IntentType = Literal[
    "general_question",
    "conventional_itinerary",
    "diy_itinerary",
    "operational_status",
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


class FeasibilityReport(BaseModel):
    """Post-planning feasibility checkpoint result."""

    is_feasible: bool

    should_ask: bool = False

    question: str | None = Field(default=None, max_length=500)

    issues: list[FeasibilityIssue] = Field(default_factory=list, max_length=20)

    recommended_adjustments: list[str] = Field(default_factory=list, max_length=12)

    @model_validator(mode="after")
    def validate_question_when_blocked(self) -> "FeasibilityReport":
        """Require a question when feasibility blocks the pipeline."""

        if self.should_ask and not self.question:
            raise ValueError("question is required when should_ask is true")
        return self

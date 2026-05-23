"""Internal schemas for user-defined DIY itinerary planning."""

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from huaxia_tourismrag.schemas.research import TravelResearchTask


TravelMode = Literal["self_drive", "train", "flight", "mixed", "unknown"]
RouteOrderPolicy = Literal["preserve_user_order", "optimize_for_transport"]


class DIYRouteStop(BaseModel):
    """One user-required or planner-added stop in a DIY route."""

    city: str = Field(min_length=1, max_length=80)

    required: bool = True

    theme_relevance: str | None = Field(default=None, max_length=500)


class DIYRouteSegment(BaseModel):
    """One transport segment between two route stops."""

    origin: str = Field(min_length=1, max_length=80)

    destination: str = Field(min_length=1, max_length=80)

    transport_focus: str = Field(min_length=1, max_length=500)


class DIYThemeAnchor(BaseModel):
    """Theme evidence the final itinerary should explain for one stop."""

    stop: str = Field(min_length=1, max_length=80)

    keywords: list[str] = Field(default_factory=list, max_length=12)

    reason: str = Field(min_length=1, max_length=500)


class DIYFeasibilityIssue(BaseModel):
    """Potential feasibility problem discovered during planning."""

    issue_type: Literal[
        "route_order",
        "travel_time",
        "weak_theme_match",
        "safety",
        "booking",
        "seasonality",
    ]

    stop: str | None = Field(default=None, max_length=80)

    description: str = Field(min_length=1, max_length=500)


class DIYItineraryPlan(BaseModel):
    """Structured plan for non-standard, user-defined thematic itineraries."""

    original_question: str = Field(min_length=5, max_length=1000)

    theme: str = Field(min_length=1, max_length=160)

    origin: str | None = Field(default=None, min_length=1, max_length=80)

    return_city: str | None = Field(default=None, min_length=1, max_length=80)

    required_stops: list[str] = Field(min_length=2, max_length=24)

    proposed_route: list[str] = Field(min_length=2, max_length=30)

    route_order_policy: RouteOrderPolicy = "optimize_for_transport"

    travel_mode: TravelMode = "unknown"

    days: int | None = Field(default=None, ge=1, le=60)

    stops: list[DIYRouteStop] = Field(default_factory=list, max_length=30)

    route_segments: list[DIYRouteSegment] = Field(default_factory=list, max_length=30)

    theme_anchors: list[DIYThemeAnchor] = Field(default_factory=list, max_length=30)

    feasibility_issues: list[DIYFeasibilityIssue] = Field(
        default_factory=list,
        max_length=20,
    )

    tasks: list[TravelResearchTask] = Field(min_length=3, max_length=20)

    @model_validator(mode="after")
    def validate_route_contains_required_context(self) -> "DIYItineraryPlan":
        """Ensure user-mandated stops and endpoints remain visible."""

        missing_stops = [
            stop for stop in self.required_stops if stop not in self.proposed_route
        ]
        if missing_stops:
            raise ValueError(
                f"proposed_route must include every required_stops item: {missing_stops}"
            )

        if self.origin and self.proposed_route[0] != self.origin:
            raise ValueError("proposed_route must start with origin when origin is set")

        if self.return_city and self.proposed_route[-1] != self.return_city:
            raise ValueError(
                "proposed_route must end with return_city when return_city is set"
            )

        return self

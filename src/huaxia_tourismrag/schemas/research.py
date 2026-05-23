"""Research planning schemas for tourism RAG."""

from typing import Literal

from pydantic import BaseModel, Field

from huaxia_tourismrag.schemas.search import SearchOptions


ResearchTaskType = Literal[
    "route",
    "attraction",
    "food",
    "accommodation",
    "transport",
    "booking",
    "risk",
]

EvidenceUse = Literal[
    "official_status",
    "route_feasibility",
    "mainstream_attraction",
    "hidden_gem",
    "local_food",
    "hotel_zone",
    "risk_warning",
]

SourcePreference = Literal["official", "local_experience", "mixed"]


class TravelResearchTask(BaseModel):
    """One focused retrieval task created from the user's travel question."""

    task_type: ResearchTaskType

    evidence_use: EvidenceUse = "route_feasibility"

    query: str = Field(min_length=5, max_length=300)

    reason: str = Field(min_length=1, max_length=500)

    max_results: int = Field(default=5, ge=1, le=10)

    freshness_required: bool = False

    recency_days: int | None = Field(default=None, ge=1, le=366)

    source_preference: SourcePreference = "mixed"

    def to_search_options(self) -> SearchOptions:
        """Convert task metadata into provider-agnostic search options."""

        return SearchOptions(
            freshness_required=self.freshness_required,
            recency_days=self.recency_days,
            source_preference=self.source_preference,
            topic="general",
        )


class TravelResearchPlan(BaseModel):
    """Structured research plan used to drive deterministic tool execution."""

    original_question: str = Field(min_length=5, max_length=1000)

    destination: str | None = Field(default=None, min_length=1, max_length=120)

    origin: str | None = Field(default=None, min_length=1, max_length=120)

    trip_days: int | None = Field(default=None, ge=1, le=60)

    travelers_summary: str | None = Field(default=None, min_length=1, max_length=300)

    budget_level: Literal["budget", "mid_range", "luxury"] | None = None

    interests: list[str] = Field(default_factory=list, max_length=12)

    answer_language: Literal["zh-CN", "en"] = "zh-CN"

    tasks: list[TravelResearchTask] = Field(min_length=3, max_length=12)

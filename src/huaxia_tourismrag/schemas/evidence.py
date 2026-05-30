"""Evidence schemas for retrieval and citation."""

from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, model_validator

from huaxia_tourismrag.schemas.performance import PerformanceTrace
from huaxia_tourismrag.schemas.service_enrichment import ServiceEnrichmentContext


# =========================================================
# Source Types
# =========================================================

SourceType = Literal[
    "internal",
    "web",
    "maps",
    "booking",
    "review_site",
]

DetailLevel = Literal["concise", "standard", "deep"]
TravelerGroup = Literal["solo", "couple", "family", "friends", "parents", "business"]
TravelPace = Literal["relaxed", "balanced", "intensive"]
TravelModePreference = Literal[
    "train_first",
    "flight_first",
    "self_drive",
    "charter_when_needed",
    "mixed",
]
AttractionPreference = Literal[
    "history_culture",
    "nature",
    "food",
    "family_friendly",
    "photography",
    "theme_route",
    "heritage",
    "city_classics",
]
RouteStrictness = Literal["flexible", "must_cover_all", "theme_pure", "balanced_city"]
AccommodationPreference = Literal["convenient", "luxury", "boutique", "budget"]
FoodPreference = Literal[
    "local_snacks",
    "classic_restaurants",
    "fine_dining",
    "balanced",
]

QuickReplyActionId = Literal[
    "preference_option_a",
    "preference_option_b",
    "default_preferences",
    "detail_concise",
    "detail_standard",
    "detail_deep",
    "feasibility_accept_adjustment",
    "feasibility_keep_original",
]


ContentType = Literal[
    "destination",
    "attraction",
    "heritage_site",
    "accommodation",
    "local_cuisine",
    "local_specialty",
    "activity",
    "transport",
    "railway",
    "aviation",
    "road_transport",
    "shopping",
    "entertainment",
    "travel_guide",
    "legal",
    "regulation",
    "contract",
    "complaint",
    "consumer_protection",
    "finance",
    "insurance",
    "medical",
    "customs",
    "visa_exit_entry",
    "tourism_safety",
    "scenic_quality",
]


# =========================================================
# Question Request
# =========================================================

class TravelQuestion(BaseModel):
    """Validated user request for a tourism RAG answer."""

    question: str = Field(min_length=5, max_length=1000)

    destination: str | None = Field(default=None, min_length=1, max_length=120)

    start_date: date | None = None

    end_date: date | None = None

    travelers: int | None = Field(default=None, ge=1, le=20)

    budget_level: Literal["budget", "mid_range", "luxury"] | None = None

    detail_level: DetailLevel | None = None

    interests: list[str] = Field(default_factory=list, max_length=12)

    language: Literal["zh-CN", "en"] = "zh-CN"

    continuation_pending_kind: Literal[
        "preference",
        "feasibility",
        "detail_level",
    ] | None = Field(default=None, exclude=True)

    continuation_quick_reply_action_id: QuickReplyActionId | None = Field(
        default=None,
        exclude=True,
    )

    @model_validator(mode="after")
    def validate_date_range(self) -> "TravelQuestion":
        """Ensure travel dates are in chronological order."""

        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self

    def to_retrieval_query(self) -> str:
        """Combine the user sentence and optional validated travel context."""

        context_lines = [
            f"目的地: {self.destination}" if self.destination else None,
            f"开始日期: {self.start_date.isoformat()}" if self.start_date else None,
            f"结束日期: {self.end_date.isoformat()}" if self.end_date else None,
            f"出行人数: {self.travelers}" if self.travelers else None,
            f"预算等级: {self.budget_level}" if self.budget_level else None,
            f"回答详细度: {self.detail_level}" if self.detail_level else None,
            f"兴趣: {', '.join(self.interests)}" if self.interests else None,
            f"回答语言: {self.language}",
        ]
        context = "\n".join(line for line in context_lines if line)
        return f"{self.question}\n\n旅行上下文:\n{context}"


class TravelerComposition(BaseModel):
    """Structured traveler counts captured by the quick form."""

    adults: int = Field(default=1, ge=0, le=20)

    elders: int = Field(default=0, ge=0, le=10)

    children: int = Field(default=0, ge=0, le=10)

    @property
    def total(self) -> int:
        """Return total travelers without inferring from free text."""

        return self.adults + self.elders + self.children


class TravelFormRequest(BaseModel):
    """Typed travel-intake form that serializes into the existing question DTO."""

    request_mode: Literal["normal", "diy"] = "normal"

    origin_city: str | None = Field(default=None, max_length=80)

    destination: str | None = Field(default=None, max_length=120)

    return_city: str | None = Field(default=None, max_length=80)

    required_stops: list[str] = Field(default_factory=list, max_length=12)

    start_date: date | None = None

    end_date: date | None = None

    duration_days: int | None = Field(default=None, ge=1, le=60)

    traveler_group: TravelerGroup | None = None

    traveler_composition: TravelerComposition = Field(
        default_factory=TravelerComposition
    )

    budget_level: Literal["budget", "mid_range", "luxury"] | None = None

    travel_mode_preference: TravelModePreference = "mixed"

    pace: TravelPace = "balanced"

    route_strictness: RouteStrictness = "flexible"

    attraction_preferences: list[AttractionPreference] = Field(
        default_factory=list,
        max_length=8,
    )

    accommodation_preference: AccommodationPreference = "convenient"

    food_preference: FoodPreference = "balanced"

    must_have: list[str] = Field(default_factory=list, max_length=12)

    avoid: list[str] = Field(default_factory=list, max_length=12)

    extra_notes: str | None = Field(default=None, max_length=500)

    detail_level: DetailLevel = "deep"

    language: Literal["zh-CN", "en"] = "zh-CN"

    @model_validator(mode="after")
    def validate_form_dates(self) -> "TravelFormRequest":
        """Keep form date semantics aligned with TravelQuestion."""

        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self

    def to_travel_question(self) -> TravelQuestion:
        """Convert validated form state into the existing RAG request DTO."""

        if self.traveler_composition.total <= 0:
            raise ValueError("at least one traveler is required")

        return TravelQuestion(
            question=self.to_request_summary(),
            destination=self.destination,
            start_date=self.start_date,
            end_date=self.end_date,
            travelers=self.traveler_composition.total,
            budget_level=self.budget_level,
            detail_level=self.detail_level,
            interests=self.to_interests(),
            language=self.language,
        )

    def to_interests(self) -> list[str]:
        """Return structured interests for retrieval, capped by TravelQuestion."""

        values: list[object] = []
        values.extend(self.attraction_preferences)
        values.extend(self.must_have)
        values.extend(self.required_stops)
        return _dedupe_text(values)[:12]

    def to_request_summary(self) -> str:
        """Serialize typed form fields into a readable user request."""

        lines = ["快速表单旅行需求"]
        self._append_line(lines, "规划类型", self.request_mode)
        self._append_line(lines, "出发城市", self.origin_city)
        self._append_line(lines, "目的地", self.destination)
        self._append_line(lines, "返回城市", self.return_city)
        self._append_list_line(lines, "必须覆盖", self.required_stops)
        if self.start_date:
            self._append_line(lines, "开始日期", self.start_date.isoformat())
        if self.end_date:
            self._append_line(lines, "结束日期", self.end_date.isoformat())
        self._append_line(lines, "天数", self.duration_days)
        self._append_line(
            lines,
            "同行人",
            (
                f"成人{self.traveler_composition.adults}，"
                f"老人{self.traveler_composition.elders}，"
                f"儿童{self.traveler_composition.children}"
            ),
        )
        self._append_line(lines, "出行人群", self.traveler_group)
        self._append_line(lines, "预算等级", self.budget_level)
        self._append_line(lines, "交通偏好", self.travel_mode_preference)
        self._append_line(lines, "节奏", self.pace)
        self._append_line(lines, "路线严格度", self.route_strictness)
        self._append_list_line(lines, "兴趣偏好", self.attraction_preferences)
        self._append_line(lines, "住宿偏好", self.accommodation_preference)
        self._append_line(lines, "餐饮偏好", self.food_preference)
        self._append_list_line(lines, "不可删除项", self.must_have)
        self._append_list_line(lines, "避开事项", self.avoid)
        self._append_line(lines, "补充说明", self.extra_notes)
        return "\n".join(lines)

    def has_complete_preferences(self) -> bool:
        """Return whether form fields cover the main preference checkpoint facts."""

        return (
            self.traveler_composition.total > 0
            and self.budget_level is not None
            and self.travel_mode_preference is not None
            and self.pace is not None
            and self.food_preference is not None
            and self.accommodation_preference is not None
        )

    def _append_line(self, lines: list[str], label: str, value: object | None) -> None:
        if value is not None and str(value).strip():
            lines.append(f"{label}: {value}")

    def _append_list_line(
        self,
        lines: list[str],
        label: str,
        values: list[object],
    ) -> None:
        cleaned = _dedupe_text(values)
        if cleaned:
            lines.append(f"{label}: {'、'.join(cleaned)}")


def _dedupe_text(values: object) -> list[str]:
    seen: set[str] = set()
    cleaned: list[str] = []
    for value in values:
        text = str(value).strip()
        if text and text not in seen:
            seen.add(text)
            cleaned.append(text)
    return cleaned


# =========================================================
# Retrieved Chunk
# =========================================================

class TravelChunk(BaseModel):
    """
    One retrieved chunk from vector DB or external APIs/web.
    """

    id: str

    source_type: SourceType

    content_type: ContentType

    title: str

    text: str = Field(min_length=1)

    location: str | None = None

    province: str | None = None

    city: str | None = None

    district: str | None = None

    level: str | None = None

    tags: list[str] = Field(default_factory=list)

    official_status: str | None = None

    authority: str | None = None

    url: HttpUrl | None = None

    source_name: str

    published_at: datetime | None = None

    retrieved_at: datetime

    rating: float | None = None

    price_level: int | None = None

    score: float | None = None

    rerank_score: float | None = None


# =========================================================
# Search Result Candidate
# =========================================================

class TravelSearchHit(BaseModel):
    """
    Search candidate before full retrieval.
    """

    title: str

    url: HttpUrl

    snippet: str | None = None

    source_name: str | None = None

    location: str | None = None

    rating: float | None = None

    published_at: datetime | None = None


# =========================================================
# Activity / Place
# =========================================================

ActivityCategory = Literal[
    "natural_attraction",
    "cultural_attraction",
    "local_restaurant",
    "accommodation",
    "shopping",
    "transport",
    "nature",
    "special_event",
]


class ActivityAlternative(BaseModel):
    """One optional choice for a scheduled itinerary slot."""

    title: str = Field(min_length=1, max_length=80)

    description: str = Field(min_length=1, max_length=800)

    category: ActivityCategory | None = None

    location: str | None = Field(default=None, max_length=120)

    citations: list[int] = Field(default_factory=list, max_length=8)


class ActivityItem(BaseModel):

    start_time: time | None = None

    end_time: time | None = None

    name: str

    category: ActivityCategory | None = None

    description: str

    location: str | None = None

    estimated_cost: float | None = None

    duration_hours: float | None = None

    booking_url: HttpUrl | None = None

    opening_hours: str | None = None

    rating: float | None = None

    citations: list[int] = Field(default_factory=list, max_length=8)

    alternatives: list[ActivityAlternative] = Field(default_factory=list, max_length=4)


# =========================================================
# Daily Itinerary
# =========================================================

class DailyPlan(BaseModel):

    day: int

    date: datetime | None = None

    city: str

    activities: list[ActivityItem]

    estimated_daily_cost: float | None = None

    notes: str | None = None


# =========================================================
# Full Trip Itinerary
# =========================================================

class TravelItinerary(BaseModel):

    destination: str

    start_date: datetime | None = None

    end_date: date | None = None

    travelers: int | None = None

    budget_level: Literal[
        "budget",
        "mid_range",
        "luxury",
    ] | None = None

    itinerary: list[DailyPlan] = []

    total_estimated_cost: float | None = None

    travel_tips: list[str] = []

    citations: list[str] = []


# =========================================================
# Citation Pack
# =========================================================

class EvidenceQuote(BaseModel):
    """Auditable quote attached to one allowed in-text citation id."""

    citation_id: int = Field(ge=1)

    chunk_id: str

    source_type: SourceType

    content_type: ContentType

    title: str

    source_name: str

    source_ref: str

    quote: str = Field(min_length=1, max_length=1800)

    url: HttpUrl | None = None

    score: float | None = None

    rerank_score: float | None = None


class CitationValidationIssue(BaseModel):
    """Non-fatal citation validation issue surfaced for observability."""

    issue_type: Literal[
        "unknown_reference",
        "missing_citation_line",
        "altered_citation_line",
        "unused_citation_line",
        "source_type_mismatch",
    ]

    citation_id: int | None = None

    message: str

    source_ref: str | None = None


class CitationPack(BaseModel):

    context_text: str

    citations: list[str]

    evidence_quotes: list[EvidenceQuote] = Field(default_factory=list)


class QuickReplyOption(BaseModel):
    """A typed UI quick reply for pending multi-hop checkpoints."""

    label: str = Field(min_length=1, max_length=40)

    message: str = Field(min_length=1, max_length=200)

    action_id: QuickReplyActionId | None = None


TopicSectionCategory = Literal[
    "food",
    "accommodation",
    "public_transport",
    "shopping",
    "entertainment",
]
TopicRecommendationKind = Literal[
    "signature_item",
    "area_strategy",
    "booking_or_timing",
    "accessibility",
    "budget_fit",
    "verification_needed",
]


class TopicRecommendation(BaseModel):
    """One structured, citeable recommendation inside a topic section."""

    title: str = Field(min_length=1, max_length=80)

    description: str = Field(min_length=1, max_length=800)

    city: str | None = Field(default=None, max_length=80)

    day: int | None = Field(default=None, ge=1, le=60)

    kind: TopicRecommendationKind = "area_strategy"

    citations: list[int] = Field(default_factory=list, max_length=8)

    verification_note: str | None = Field(default=None, max_length=300)


class TravelTopicSection(BaseModel):
    """One focused, citeable topic section for a generated trip response."""

    category: TopicSectionCategory

    title: str = Field(min_length=1, max_length=40)

    summary: str = Field(default="", max_length=1200)

    recommendations: list[str] = Field(default_factory=list, max_length=10)

    items: list[TopicRecommendation] = Field(default_factory=list, max_length=10)


# =========================================================
# Final RAG Response
# =========================================================

class TravelAnswer(BaseModel):

    answer: str

    highlights: list[str]

    warnings: list[str]

    citations: list[str]

    generated_itinerary: TravelItinerary | None = None

    service_enrichment: ServiceEnrichmentContext | None = None

    topic_sections: list[TravelTopicSection] = Field(default_factory=list, max_length=8)

    quick_replies: list[QuickReplyOption] = Field(default_factory=list, max_length=6)

    performance: PerformanceTrace | None = None

    session_id: str | None = None

    needs_reply: bool = False

"""Evidence schemas for retrieval and citation."""

from datetime import date, datetime
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

class ActivityItem(BaseModel):

    name: str

    category: Literal[
        "natural_attraction",
        "cultural_attraction",
        "local_restaurant",
        "accommodation",
        "shopping",
        "transport",
        "nature",
        "special_event",
    ] | None = None

    description: str

    location: str | None = None

    estimated_cost: float | None = None

    duration_hours: float | None = None

    booking_url: HttpUrl | None = None

    opening_hours: str | None = None

    rating: float | None = None


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

class CitationPack(BaseModel):

    context_text: str

    citations: list[str]


class QuickReplyOption(BaseModel):
    """A typed UI quick reply for pending multi-hop checkpoints."""

    label: str = Field(min_length=1, max_length=40)

    message: str = Field(min_length=1, max_length=200)


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

    quick_replies: list[QuickReplyOption] = Field(default_factory=list, max_length=6)

    performance: PerformanceTrace | None = None

    session_id: str | None = None

    needs_reply: bool = False

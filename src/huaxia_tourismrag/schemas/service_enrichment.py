"""Typed DTOs for external tourism service enrichment."""

from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


MCPProvider = Literal["baidu_maps", "tuniu", "mapbox", "firecrawl"]
TravelServiceProvider = Literal["baidu_maps", "tuniu", "mapbox", "firecrawl"]
TransportMode = Literal[
    "walking",
    "driving",
    "transit",
    "train",
    "flight",
    "mixed",
    "unknown",
]
FeasibilityLevel = Literal[
    "easy",
    "reasonable",
    "tight",
    "not_recommended",
    "unknown",
]
WeatherImpactLevel = Literal["none", "low", "medium", "high", "unknown"]
BookingProductType = Literal["hotel", "ticket", "flight", "train", "package", "activity"]
AvailabilityStatus = Literal["available", "limited", "unavailable", "unknown"]
BookingActionType = Literal[
    "open_booking_link",
    "open_product_page",
    "request_live_price",
]
SourceAuthority = Literal["official", "commercial", "review", "blog", "unknown"]
RecencyLabel = Literal["today", "recent", "stale", "unknown"]


class RouteLegCheck(BaseModel):
    """One checked route leg returned by a map/transport provider."""

    origin: str = Field(min_length=1, max_length=120)

    destination: str = Field(min_length=1, max_length=120)

    recommended_mode: TransportMode = "unknown"

    estimated_duration_minutes: int | None = Field(default=None, ge=0, le=3000)

    distance_km: float | None = Field(default=None, ge=0, le=10000)

    feasibility_level: FeasibilityLevel = "unknown"

    notes: list[str] = Field(default_factory=list, max_length=8)

    provider_reference: str | None = Field(default=None, max_length=300)


class RouteFeasibilityReport(BaseModel):
    """Aggregated route sanity check for a generated itinerary."""

    provider: TravelServiceProvider

    route_summary: str = Field(min_length=1, max_length=800)

    legs: list[RouteLegCheck] = Field(default_factory=list, max_length=40)

    warnings: list[str] = Field(default_factory=list, max_length=12)


class WeatherImpact(BaseModel):
    """Weather impact for a city/day from a provider such as Baidu Maps."""

    provider: TravelServiceProvider

    city: str = Field(min_length=1, max_length=120)

    date_label: str | None = Field(default=None, max_length=80)

    condition: str | None = Field(default=None, max_length=120)

    temperature_summary: str | None = Field(default=None, max_length=120)

    impact_level: WeatherImpactLevel = "unknown"

    recommendation: str = Field(min_length=1, max_length=500)


class BookingProduct(BaseModel):
    """One commercial travel product candidate returned by Tuniu."""

    provider: TravelServiceProvider

    product_type: BookingProductType

    title: str = Field(min_length=1, max_length=300)

    city: str | None = Field(default=None, max_length=120)

    start_date: str | None = Field(default=None, max_length=80)

    end_date: str | None = Field(default=None, max_length=80)

    price_cny: float | None = Field(default=None, ge=0)

    price_note: str | None = Field(default=None, max_length=300)

    availability_status: AvailabilityStatus = "unknown"

    booking_url: HttpUrl | None = None

    highlights: list[str] = Field(default_factory=list, max_length=8)

    cancellation_note: str | None = Field(default=None, max_length=500)


class BookingAction(BaseModel):
    """A safe user-facing action that can move from planning to booking."""

    provider: TravelServiceProvider

    action_type: BookingActionType

    label: str = Field(min_length=1, max_length=120)

    url: HttpUrl | None = None

    safety_note: str = Field(min_length=1, max_length=500)


class FreshWebEvidence(BaseModel):
    """One current web page found through a live web-research provider."""

    provider: TravelServiceProvider

    query: str = Field(min_length=1, max_length=300)

    title: str = Field(min_length=1, max_length=300)

    url: HttpUrl | None = None

    summary: str = Field(min_length=1, max_length=800)

    source_authority: SourceAuthority = "unknown"

    recency_label: RecencyLabel = "unknown"


class ServiceProviderUnavailable(BaseModel):
    """Typed provider failure that is safe to show or log."""

    provider: TravelServiceProvider

    reason: str = Field(min_length=1, max_length=500)

    retryable: bool = True


class ServiceEnrichmentContext(BaseModel):
    """All external service evidence available to final answer generation."""

    route_feasibility: RouteFeasibilityReport | None = None

    weather_impacts: list[WeatherImpact] = Field(default_factory=list, max_length=40)

    booking_products: list[BookingProduct] = Field(default_factory=list, max_length=30)

    booking_actions: list[BookingAction] = Field(default_factory=list, max_length=12)

    fresh_web_evidence: list[FreshWebEvidence] = Field(
        default_factory=list,
        max_length=24,
    )

    unavailable_providers: list[ServiceProviderUnavailable] = Field(
        default_factory=list,
        max_length=8,
    )

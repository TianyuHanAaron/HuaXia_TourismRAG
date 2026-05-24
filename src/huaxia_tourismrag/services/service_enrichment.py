"""External service enrichment orchestration."""

from typing import Protocol

from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.research import TravelResearchPlan
from huaxia_tourismrag.schemas.service_enrichment import (
    BookingAction,
    BookingProduct,
    FreshWebEvidence,
    RouteFeasibilityReport,
    RouteLegCheck,
    ServiceEnrichmentContext,
    ServiceProviderUnavailable,
    TravelServiceProvider,
    WeatherImpact,
)


class MapsEnrichmentProvider(Protocol):
    """Provider contract for maps and weather service enrichment."""

    async def check_route_leg(
        self,
        origin: str,
        destination: str,
        preferred_mode: str = "driving",
    ) -> RouteLegCheck:
        """Check one route leg."""

    async def check_weather(
        self,
        city: str,
        date_label: str | None = None,
    ) -> WeatherImpact:
        """Check one city's weather impact."""


class BookingEnrichmentProvider(Protocol):
    """Provider contract for commercial travel products."""

    async def search_hotels(
        self,
        city: str,
        keywords: list[str],
        budget_level: str | None,
    ) -> list[BookingProduct]:
        """Search hotel products."""

    def to_booking_action(self, product: BookingProduct) -> BookingAction:
        """Create a safe user-facing booking action."""


class FreshWebEvidenceProvider(Protocol):
    """Provider contract for fresh web evidence."""

    async def search_fresh_travel_pages(
        self,
        query: str,
        limit: int = 5,
    ) -> list[FreshWebEvidence]:
        """Search current webpages and return typed evidence."""


class TravelServiceEnrichmentService:
    """Runs optional service-provider checks after itinerary planning."""

    def __init__(
        self,
        maps: MapsEnrichmentProvider | None = None,
        tuniu: BookingEnrichmentProvider | None = None,
        fresh_web: FreshWebEvidenceProvider | None = None,
    ) -> None:
        self.maps = maps
        self.tuniu = tuniu
        self.fresh_web = fresh_web

    async def enrich(
        self,
        question: TravelQuestion,
        diy_plan: DIYItineraryPlan | None,
        research_plan: TravelResearchPlan | None,
    ) -> ServiceEnrichmentContext:
        """Create typed service enrichment context for a planned trip."""

        route = self._route_from_plans(diy_plan, research_plan)
        unavailable: list[ServiceProviderUnavailable] = []
        route_report: RouteFeasibilityReport | None = None
        weather: list[WeatherImpact] = []
        products: list[BookingProduct] = []
        actions: list[BookingAction] = []
        fresh_web_evidence: list[FreshWebEvidence] = []

        if self.maps and len(route) >= 2:
            maps_provider = self._provider_name(self.maps, default="baidu_maps")
            try:
                legs: list[RouteLegCheck] = []
                for origin, destination in zip(route, route[1:], strict=False):
                    legs.append(
                        await self.maps.check_route_leg(
                            origin,
                            destination,
                            preferred_mode="driving",
                        )
                    )
                route_report = RouteFeasibilityReport(
                    provider=maps_provider,
                    route_summary=self._route_summary(maps_provider, legs),
                    legs=legs,
                    warnings=[
                        leg.notes[0]
                        for leg in legs
                        if leg.notes
                        and leg.feasibility_level in {"tight", "not_recommended"}
                    ],
                )
                for city in self._unique_cities(route)[:8]:
                    weather.append(await self.maps.check_weather(city))
            except Exception as exc:
                unavailable.append(
                    ServiceProviderUnavailable(
                        provider=maps_provider,
                        reason=(
                            f"{self._provider_label(maps_provider)} MCP 暂不可用：{exc}"
                        ),
                        retryable=True,
                    )
                )

        if self.tuniu:
            try:
                for city in self._booking_cities(route)[:6]:
                    city_products = await self.tuniu.search_hotels(
                        city=city,
                        keywords=question.interests,
                        budget_level=question.budget_level,
                    )
                    products.extend(city_products[:2])
                actions = [
                    self.tuniu.to_booking_action(product) for product in products[:6]
                ]
            except Exception as exc:
                unavailable.append(
                    ServiceProviderUnavailable(
                        provider="tuniu",
                        reason=f"途牛 MCP 暂不可用：{exc}",
                        retryable=True,
                    )
                )

        if self.fresh_web:
            fresh_provider = self._provider_name(self.fresh_web, default="firecrawl")
            try:
                for query in self._fresh_web_queries(
                    question,
                    diy_plan,
                    research_plan,
                    route,
                )[:6]:
                    evidence = await self.fresh_web.search_fresh_travel_pages(
                        query=query,
                        limit=3,
                    )
                    fresh_web_evidence.extend(evidence[:3])
            except Exception as exc:
                unavailable.append(
                    ServiceProviderUnavailable(
                        provider=fresh_provider,
                        reason=(
                            f"{self._provider_label(fresh_provider)} MCP 暂不可用：{exc}"
                        ),
                        retryable=True,
                    )
                )

        return ServiceEnrichmentContext(
            route_feasibility=route_report,
            weather_impacts=weather,
            booking_products=products[:12],
            booking_actions=actions[:8],
            fresh_web_evidence=fresh_web_evidence[:12],
            unavailable_providers=unavailable,
        )

    def _route_from_plans(
        self,
        diy_plan: DIYItineraryPlan | None,
        research_plan: TravelResearchPlan | None,
    ) -> list[str]:
        if diy_plan:
            return diy_plan.proposed_route
        if research_plan:
            route = []
            if research_plan.origin:
                route.append(research_plan.origin)
            if research_plan.destination:
                route.append(research_plan.destination)
            return route
        return []

    def _booking_cities(self, route: list[str]) -> list[str]:
        return self._unique_cities(route)

    def _unique_cities(self, route: list[str]) -> list[str]:
        seen: set[str] = set()
        cities: list[str] = []
        for city in route:
            if city not in seen:
                cities.append(city)
                seen.add(city)
        return cities

    def _fresh_web_queries(
        self,
        question: TravelQuestion,
        diy_plan: DIYItineraryPlan | None,
        research_plan: TravelResearchPlan | None,
        route: list[str],
    ) -> list[str]:
        queries: list[str] = []
        if diy_plan:
            theme = diy_plan.theme or "旅行"
            for city in self._unique_cities(route)[:6]:
                queries.append(f"{city} {theme} 景点 官方 开放 预约 最新")
        if research_plan and research_plan.destination:
            queries.append(f"{research_plan.destination} 景区 官方 开放 预约 最新")
        if question.destination:
            queries.append(f"{question.destination} 景区 官方 开放 预约 最新")
        queries.append(f"{question.question[:80]} 官方 最新 预约 开放")
        return self._unique_strings(queries)

    def _unique_strings(self, values: list[str]) -> list[str]:
        seen: set[str] = set()
        unique: list[str] = []
        for value in values:
            normalized = value.strip()
            if normalized and normalized not in seen:
                unique.append(normalized)
                seen.add(normalized)
        return unique

    def _provider_name(
        self,
        provider: object,
        default: TravelServiceProvider,
    ) -> TravelServiceProvider:
        value = getattr(provider, "provider_name", default)
        if value in {"baidu_maps", "tuniu", "mapbox", "firecrawl"}:
            return value
        return default

    def _provider_label(self, provider: TravelServiceProvider) -> str:
        return {
            "baidu_maps": "百度地图",
            "mapbox": "Mapbox",
            "firecrawl": "Firecrawl",
            "tuniu": "途牛",
        }[provider]

    def _route_summary(
        self,
        provider: TravelServiceProvider,
        legs: list[RouteLegCheck],
    ) -> str:
        tight_count = sum(
            1
            for leg in legs
            if leg.feasibility_level in {"tight", "not_recommended"}
        )
        provider_label = self._provider_label(provider)
        if tight_count:
            return f"{provider_label} MCP 检查显示有 {tight_count} 段交通偏紧，建议调整节奏。"
        return f"{provider_label} MCP 检查显示路线整体可执行，具体时长仍以实时交通为准。"

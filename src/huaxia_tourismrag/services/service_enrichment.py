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
from huaxia_tourismrag.services.provider_budget import ProviderBudget, ProviderCooldown


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
        fresh_web_providers: list[FreshWebEvidenceProvider] | None = None,
        provider_max_calls: dict[str, int] | None = None,
        provider_cooldown: ProviderCooldown | None = None,
    ) -> None:
        self.maps = maps
        self.tuniu = tuniu
        self.fresh_web_providers = fresh_web_providers or (
            [fresh_web] if fresh_web is not None else []
        )
        self.fresh_web = (
            self.fresh_web_providers[0] if self.fresh_web_providers else None
        )
        self.provider_max_calls = provider_max_calls or {}
        self.provider_cooldown = provider_cooldown

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
        provider_budget = (
            ProviderBudget(self.provider_max_calls)
            if self.provider_max_calls
            else None
        )

        if self.maps and len(route) >= 2:
            maps_provider = self._provider_name(self.maps, default="baidu_maps")
            try:
                legs: list[RouteLegCheck] = []
                for origin, destination in zip(route, route[1:], strict=False):
                    if not self._can_call_provider(
                        maps_provider,
                        provider_budget,
                        unavailable,
                    ):
                        break
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
                    warnings=self._route_warnings(legs),
                )
                for city in self._unique_cities(route)[:8]:
                    if not self._can_call_provider(
                        maps_provider,
                        provider_budget,
                        unavailable,
                    ):
                        break
                    weather.append(await self.maps.check_weather(city))
            except Exception as exc:
                self._mark_provider_failure(maps_provider)
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
                    if not self._can_call_provider(
                        "tuniu",
                        provider_budget,
                        unavailable,
                    ):
                        break
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
                self._mark_provider_failure("tuniu")
                unavailable.append(
                    ServiceProviderUnavailable(
                        provider="tuniu",
                        reason=f"途牛 MCP 暂不可用：{exc}",
                        retryable=True,
                    )
                )

        for fresh_web_provider in self.fresh_web_providers:
            fresh_provider = self._provider_name(
                fresh_web_provider,
                default="firecrawl",
            )
            try:
                for query in self._fresh_web_queries(
                    question,
                    diy_plan,
                    research_plan,
                    route,
                )[:6]:
                    if not self._can_call_provider(
                        fresh_provider,
                        provider_budget,
                        unavailable,
                    ):
                        break
                    evidence = await fresh_web_provider.search_fresh_travel_pages(
                        query=query,
                        limit=3,
                    )
                    fresh_web_evidence.extend(evidence[:3])
            except Exception as exc:
                self._mark_provider_failure(fresh_provider)
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

    def _can_call_provider(
        self,
        provider: TravelServiceProvider,
        provider_budget: ProviderBudget | None,
        unavailable: list[ServiceProviderUnavailable],
    ) -> bool:
        if self.provider_cooldown and not self.provider_cooldown.is_available(provider):
            unavailable.append(
                ServiceProviderUnavailable(
                    provider=provider,
                    reason=(
                        f"{self._provider_label(provider)} MCP 处于短暂冷却期，"
                        "本次跳过实时调用以加快响应。"
                    ),
                    retryable=True,
                )
            )
            return False
        if provider_budget and not provider_budget.consume(provider):
            unavailable.append(
                ServiceProviderUnavailable(
                    provider=provider,
                    reason=(
                        f"{self._provider_label(provider)} MCP 已达到本次请求调用预算，"
                        "其余实时查询已延后。"
                    ),
                    retryable=True,
                )
            )
            return False
        return True

    def _mark_provider_failure(self, provider: TravelServiceProvider) -> None:
        if self.provider_cooldown:
            self.provider_cooldown.mark_failure(provider)

    def _route_from_plans(
        self,
        diy_plan: DIYItineraryPlan | None,
        research_plan: TravelResearchPlan | None,
    ) -> list[str]:
        if diy_plan:
            return self._route_sequence(diy_plan.proposed_route)
        if research_plan:
            route: list[str] = []
            if research_plan.origin:
                route.append(research_plan.origin)
            entity_route = self._research_route_entities(research_plan)
            if entity_route:
                route.extend(entity_route)
            elif research_plan.destination:
                route.append(research_plan.destination)
            return self._route_sequence(route)
        return []

    def _route_sequence(self, values: list[str]) -> list[str]:
        route: list[str] = []
        for value in values:
            normalized = value.strip()
            if normalized and (not route or route[-1] != normalized):
                route.append(normalized)
        return route

    def _research_route_entities(self, research_plan: TravelResearchPlan) -> list[str]:
        route_entity_types = {"city", "attraction", "transport_hub"}
        return self._unique_strings(
            [
                entity.name
                for entity in research_plan.required_entities
                if not entity.optional and entity.entity_type in route_entity_types
            ]
        )

    def _booking_cities(self, route: list[str]) -> list[str]:
        return self._unique_cities(route)

    def _route_warnings(self, legs: list[RouteLegCheck]) -> list[str]:
        warnings: list[str] = []
        for leg in legs:
            if leg.notes and leg.feasibility_level in {"tight", "not_recommended"}:
                warnings.append(leg.notes[0])
            if leg.feasibility_level == "unknown" or (
                leg.estimated_duration_minutes is None and leg.distance_km is None
            ):
                warnings.append(
                    f"{leg.origin}至{leg.destination}未返回可用车程/距离，需二次核验。"
                )
        return self._unique_strings(warnings)[:12]

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
        if research_plan:
            for entity_name in self._research_route_entities(research_plan)[:6]:
                queries.append(f"{entity_name} 官方 开放 预约 最新")
            if research_plan.destination:
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
        if value in {"baidu_maps", "tuniu", "firecrawl", "tavily"}:
            return value
        return default

    def _provider_label(self, provider: TravelServiceProvider) -> str:
        return {
            "baidu_maps": "百度地图",
            "firecrawl": "Firecrawl",
            "tavily": "Tavily",
            "tuniu": "途牛",
        }[provider]

    def _route_summary(
        self,
        provider: TravelServiceProvider,
        legs: list[RouteLegCheck],
    ) -> str:
        if not legs:
            return f"{self._provider_label(provider)} MCP 未返回路线分段，需要二次核验。"
        tight_count = sum(
            1
            for leg in legs
            if leg.feasibility_level in {"tight", "not_recommended"}
        )
        known_duration_count = sum(
            1 for leg in legs if leg.estimated_duration_minutes is not None
        )
        unknown_count = sum(
            1
            for leg in legs
            if leg.feasibility_level == "unknown"
            or (
                leg.estimated_duration_minutes is None
                and leg.distance_km is None
            )
        )
        provider_label = self._provider_label(provider)
        if known_duration_count == 0:
            return (
                f"{provider_label} MCP 已检查 {len(legs)} 段路线，"
                "但未返回可用时长/距离，需要二次核验具体车程。"
            )
        if tight_count:
            summary = (
                f"{provider_label} MCP 检查显示有 {tight_count} 段交通偏紧，"
                "建议调整节奏。"
            )
        else:
            summary = (
                f"{provider_label} MCP 检查显示有 {known_duration_count} 段路线"
                "返回了可用车程，可作为顺路性参考。"
            )
        if unknown_count:
            summary += f" 另有 {unknown_count} 段缺少时长/距离，需要二次核验。"
        return summary

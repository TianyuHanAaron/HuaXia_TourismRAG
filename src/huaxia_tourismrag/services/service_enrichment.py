"""External service enrichment orchestration."""

from typing import Protocol

from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.research import TravelResearchPlan
from huaxia_tourismrag.schemas.service_enrichment import (
    FreshWebEvidence,
    ServiceEnrichmentContext,
    ServiceProviderUnavailable,
    TravelServiceProvider,
)
from huaxia_tourismrag.services.provider_budget import ProviderBudget, ProviderCooldown


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
        fresh_web: FreshWebEvidenceProvider | None = None,
        fresh_web_providers: list[FreshWebEvidenceProvider] | None = None,
        provider_max_calls: dict[str, int] | None = None,
        provider_cooldown: ProviderCooldown | None = None,
    ) -> None:
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
        fresh_web_evidence: list[FreshWebEvidence] = []
        provider_budget = (
            ProviderBudget(self.provider_max_calls)
            if self.provider_max_calls
            else None
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
        if value in {"firecrawl", "tavily"}:
            return value
        return default

    def _provider_label(self, provider: TravelServiceProvider) -> str:
        return {
            "firecrawl": "Firecrawl",
            "tavily": "Tavily",
        }[provider]

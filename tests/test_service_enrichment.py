import pytest

from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.research import TravelResearchPlan, TravelResearchTask
from huaxia_tourismrag.schemas.service_enrichment import FreshWebEvidence
from huaxia_tourismrag.services.provider_budget import ProviderCooldown
from huaxia_tourismrag.services.service_enrichment import (
    TravelServiceEnrichmentService,
)


class FakeFreshWeb:
    provider_name = "firecrawl"

    def __init__(self):
        self.search_calls = []

    async def search_fresh_travel_pages(self, query, limit=5):
        self.search_calls.append((query, limit))
        return [
            FreshWebEvidence(
                provider="firecrawl",
                query=query,
                title="三国主题景区官方信息",
                url="https://www.gov.cn/example",
                summary="景区开放与预约信息。",
                source_authority="official",
                recency_label="recent",
            )
        ]


class FakeTavilyFreshWeb(FakeFreshWeb):
    provider_name = "tavily"

    async def search_fresh_travel_pages(self, query, limit=5):
        self.search_calls.append((query, limit))
        return [
            FreshWebEvidence(
                provider="tavily",
                query=query,
                title="Tavily景区官方信息",
                url="https://www.gov.cn/tavily-example",
                summary="Tavily检索到的开放与预约信息。",
                source_authority="official",
                recency_label="recent",
            )
        ]


class FailingFreshWeb:
    provider_name = "firecrawl"

    async def search_fresh_travel_pages(self, query, limit=5):
        raise RuntimeError("firecrawl offline")


def make_task() -> TravelResearchTask:
    return TravelResearchTask(
        task_type="route",
        query="北京 涿州 三国 路线",
        reason="测试",
    )


def make_diy_plan() -> DIYItineraryPlan:
    task = make_task()
    return DIYItineraryPlan(
        original_question="北京出发三国路线",
        theme="三国",
        origin="北京",
        return_city="北京",
        required_stops=["涿州", "许昌"],
        proposed_route=["北京", "涿州", "许昌", "北京"],
        days=3,
        tasks=[task, task, task],
    )


@pytest.mark.asyncio
async def test_enrich_diy_plan_uses_fresh_web_provider_only():
    fresh_web = FakeFreshWeb()
    service = TravelServiceEnrichmentService(fresh_web=fresh_web)

    context = await service.enrich(
        question=TravelQuestion(
            question="北京出发三国路线",
            budget_level="luxury",
            interests=["三国", "古迹"],
        ),
        diy_plan=make_diy_plan(),
        research_plan=None,
    )

    assert context.route_feasibility is None
    assert context.weather_impacts == []
    assert context.booking_products == []
    assert context.booking_actions == []
    assert fresh_web.search_calls
    assert context.fresh_web_evidence[0].provider == "firecrawl"
    assert context.fresh_web_evidence[0].source_authority == "official"


@pytest.mark.asyncio
async def test_enrich_research_plan_uses_required_entities_for_fresh_web():
    fresh_web = FakeFreshWeb()
    service = TravelServiceEnrichmentService(fresh_web=fresh_web)
    task = make_task()
    research_plan = TravelResearchPlan(
        original_question="上海出发山西历史人文十日游",
        origin="上海",
        destination="山西",
        required_entities=[
            {
                "name": "太原",
                "entity_type": "city",
                "evidence_use": "route_feasibility",
            },
            {
                "name": "大同",
                "entity_type": "city",
                "evidence_use": "route_feasibility",
            },
            {
                "name": "平遥古城",
                "entity_type": "attraction",
                "evidence_use": "mainstream_attraction",
            },
        ],
        tasks=[task, task, task],
    )

    context = await service.enrich(
        question=TravelQuestion(question="上海出发山西历史人文十日游"),
        diy_plan=None,
        research_plan=research_plan,
    )

    search_queries = [query for query, _limit in fresh_web.search_calls]
    assert any("太原" in query for query in search_queries)
    assert any("大同" in query for query in search_queries)
    assert any("平遥古城" in query for query in search_queries)
    assert context.fresh_web_evidence


@pytest.mark.asyncio
async def test_enrich_records_fresh_web_failures_without_raising():
    service = TravelServiceEnrichmentService(fresh_web=FailingFreshWeb())

    context = await service.enrich(
        question=TravelQuestion(question="北京出发三国路线"),
        diy_plan=make_diy_plan(),
        research_plan=None,
    )

    assert context.fresh_web_evidence == []
    assert context.unavailable_providers[0].provider == "firecrawl"
    assert "firecrawl offline" in context.unavailable_providers[0].reason


@pytest.mark.asyncio
async def test_enrich_uses_cooldown_after_provider_failure():
    cooldown = ProviderCooldown(cooldown_seconds=60, clock=lambda: 10.0)
    service = TravelServiceEnrichmentService(
        fresh_web=FailingFreshWeb(),
        provider_cooldown=cooldown,
    )

    first = await service.enrich(
        question=TravelQuestion(question="北京出发三国路线"),
        diy_plan=make_diy_plan(),
        research_plan=None,
    )
    second = await service.enrich(
        question=TravelQuestion(question="北京出发三国路线"),
        diy_plan=make_diy_plan(),
        research_plan=None,
    )

    assert "firecrawl offline" in first.unavailable_providers[0].reason
    assert "冷却期" in second.unavailable_providers[0].reason


@pytest.mark.asyncio
async def test_enrich_can_use_firecrawl_and_tavily_fresh_web_providers():
    firecrawl = FakeFreshWeb()
    tavily = FakeTavilyFreshWeb()
    service = TravelServiceEnrichmentService(
        fresh_web_providers=[firecrawl, tavily],
    )

    context = await service.enrich(
        question=TravelQuestion(question="五台山预约方式"),
        diy_plan=None,
        research_plan=TravelResearchPlan(
            original_question="五台山预约方式",
            destination="五台山",
            tasks=[make_task(), make_task(), make_task()],
        ),
    )

    providers = {item.provider for item in context.fresh_web_evidence}
    assert providers == {"firecrawl", "tavily"}
    assert firecrawl.search_calls
    assert tavily.search_calls


@pytest.mark.asyncio
async def test_enrich_respects_fresh_web_provider_budget():
    firecrawl = FakeFreshWeb()
    service = TravelServiceEnrichmentService(
        fresh_web=firecrawl,
        provider_max_calls={"firecrawl": 2},
    )

    context = await service.enrich(
        question=TravelQuestion(question="五台山预约方式"),
        diy_plan=make_diy_plan(),
        research_plan=None,
    )

    assert len(firecrawl.search_calls) == 2
    assert len(context.fresh_web_evidence) == 2
    assert context.unavailable_providers[0].provider == "firecrawl"
    assert "调用预算" in context.unavailable_providers[0].reason

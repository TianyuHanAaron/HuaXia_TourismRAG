import pytest

from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.research import TravelResearchPlan, TravelResearchTask
from huaxia_tourismrag.schemas.service_enrichment import (
    BookingAction,
    BookingProduct,
    FreshWebEvidence,
    RouteLegCheck,
    WeatherImpact,
)
from huaxia_tourismrag.services.service_enrichment import (
    TravelServiceEnrichmentService,
)
from huaxia_tourismrag.services.provider_budget import ProviderCooldown


class FakeMaps:
    provider_name = "baidu_maps"

    def __init__(self):
        self.route_calls = []
        self.weather_calls = []

    async def check_route_leg(self, origin, destination, preferred_mode="driving"):
        self.route_calls.append((origin, destination, preferred_mode))
        return RouteLegCheck(
            origin=origin,
            destination=destination,
            recommended_mode=preferred_mode,
            estimated_duration_minutes=90,
            distance_km=100,
            feasibility_level="reasonable",
        )

    async def check_weather(self, city, date_label=None):
        self.weather_calls.append((city, date_label))
        return WeatherImpact(
            provider=self.provider_name,
            city=city,
            impact_level="low",
            recommendation="天气影响较小。",
        )


class FakeTuniu:
    def __init__(self):
        self.hotel_calls = []

    async def search_hotels(self, city, keywords, budget_level):
        self.hotel_calls.append((city, keywords, budget_level))
        return [
            BookingProduct(
                provider="tuniu",
                product_type="hotel",
                title=f"{city}高品质酒店",
                city=city,
                booking_url="https://example.com/hotel",
            )
        ]

    def to_booking_action(self, product):
        return BookingAction(
            provider="tuniu",
            action_type="open_booking_link",
            label="查看实时价格",
            url=product.booking_url,
            safety_note="以途牛实时页面为准。",
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


class FailingMaps:
    async def check_route_leg(self, origin, destination, preferred_mode="driving"):
        raise RuntimeError("maps offline")


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
async def test_enrich_diy_plan_checks_route_weather_and_hotels():
    maps = FakeMaps()
    tuniu = FakeTuniu()
    fresh_web = FakeFreshWeb()
    service = TravelServiceEnrichmentService(
        maps=maps,
        tuniu=tuniu,
        fresh_web=fresh_web,
    )

    context = await service.enrich(
        question=TravelQuestion(
            question="北京出发三国路线",
            budget_level="luxury",
            interests=["三国", "古迹"],
        ),
        diy_plan=make_diy_plan(),
        research_plan=None,
    )

    assert context.route_feasibility is not None
    assert context.route_feasibility.provider == "baidu_maps"
    assert len(context.route_feasibility.legs) == 3
    assert maps.route_calls == [
        ("北京", "涿州", "driving"),
        ("涿州", "许昌", "driving"),
        ("许昌", "北京", "driving"),
    ]
    assert [impact.city for impact in context.weather_impacts] == [
        "北京",
        "涿州",
        "许昌",
    ]
    assert context.booking_products[0].product_type == "hotel"
    assert context.booking_actions[0].action_type == "open_booking_link"
    assert tuniu.hotel_calls[0] == ("北京", ["三国", "古迹"], "luxury")
    assert fresh_web.search_calls
    assert context.fresh_web_evidence[0].provider == "firecrawl"
    assert context.fresh_web_evidence[0].source_authority == "official"


@pytest.mark.asyncio
async def test_enrich_research_plan_uses_origin_and_destination_route():
    service = TravelServiceEnrichmentService(maps=FakeMaps(), tuniu=None)
    task = make_task()
    research_plan = TravelResearchPlan(
        original_question="上海出发去杭州两日游",
        origin="上海",
        destination="杭州",
        tasks=[task, task, task],
    )

    context = await service.enrich(
        question=TravelQuestion(question="上海出发去杭州两日游"),
        diy_plan=None,
        research_plan=research_plan,
    )

    assert context.route_feasibility is not None
    assert [leg.origin for leg in context.route_feasibility.legs] == ["上海"]
    assert [leg.destination for leg in context.route_feasibility.legs] == ["杭州"]
    assert context.booking_products == []


@pytest.mark.asyncio
async def test_enrich_research_plan_uses_required_entities_for_route_and_fresh_web():
    maps = FakeMaps()
    fresh_web = FakeFreshWeb()
    service = TravelServiceEnrichmentService(maps=maps, tuniu=None, fresh_web=fresh_web)
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

    assert context.route_feasibility is not None
    assert maps.route_calls == [
        ("上海", "太原", "driving"),
        ("太原", "大同", "driving"),
        ("大同", "平遥古城", "driving"),
    ]
    search_queries = [query for query, _limit in fresh_web.search_calls]
    assert any("太原" in query for query in search_queries)
    assert any("大同" in query for query in search_queries)
    assert any("平遥古城" in query for query in search_queries)


def test_route_summary_does_not_claim_unknown_map_route_is_executable():
    service = TravelServiceEnrichmentService()

    summary = service._route_summary(
        "baidu_maps",
        [
            RouteLegCheck(
                origin="上海",
                destination="山西",
                recommended_mode="driving",
                feasibility_level="unknown",
            )
        ],
    )

    assert "未返回可用时长" in summary
    assert "二次核验" in summary
    assert "整体可执行" not in summary


@pytest.mark.asyncio
async def test_enrich_records_provider_failures_without_raising():
    service = TravelServiceEnrichmentService(maps=FailingMaps(), tuniu=None)

    context = await service.enrich(
        question=TravelQuestion(question="北京出发三国路线"),
        diy_plan=make_diy_plan(),
        research_plan=None,
    )

    assert context.route_feasibility is None
    assert context.unavailable_providers[0].provider == "baidu_maps"
    assert "maps offline" in context.unavailable_providers[0].reason


class FailingFreshWeb:
    provider_name = "firecrawl"

    async def search_fresh_travel_pages(self, query, limit=5):
        raise RuntimeError("firecrawl offline")


@pytest.mark.asyncio
async def test_enrich_records_fresh_web_failures_without_raising():
    service = TravelServiceEnrichmentService(maps=None, tuniu=None, fresh_web=FailingFreshWeb())

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
    failing = FailingFreshWeb()
    service = TravelServiceEnrichmentService(
        fresh_web=failing,
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

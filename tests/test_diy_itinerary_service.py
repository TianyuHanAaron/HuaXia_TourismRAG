from datetime import datetime, timezone

import pytest

from huaxia_tourismrag.agents.tourism_agent import TourismDeps
from huaxia_tourismrag.schemas.diy_itinerary import (
    DIYItineraryPlan,
    DIYRouteSegment,
    DIYThemeAnchor,
)
from huaxia_tourismrag.schemas.evidence import (
    CitationPack,
    EvidenceQuote,
    TravelAnswer,
    TravelChunk,
    TravelFormRequest,
    TravelQuestion,
    TravelSearchHit,
)
from huaxia_tourismrag.schemas.research import TravelResearchTask
from huaxia_tourismrag.schemas.search import SearchOptions
from huaxia_tourismrag.schemas.service_enrichment import ServiceEnrichmentContext
from huaxia_tourismrag.schemas.travel_checkpoints import (
    ClarificationDecision,
    FeasibilityReport,
    IntentDecision,
    PreferenceProfile,
)
from huaxia_tourismrag.services import diy_itinerary_service as diy_service_module
from huaxia_tourismrag.services.diy_itinerary_service import DIYItineraryService
from huaxia_tourismrag.services.evidence_merge import TravelChunkMergeService
from huaxia_tourismrag.services.session_store import InMemoryTravelSessionStore


class FakeInternalRAG:
    def __init__(self) -> None:
        self.queries: list[str] = []

    async def retrieve(
        self, query: str, tenant_id: str, limit: int = 12
    ) -> list[TravelChunk]:
        self.queries.append(query)
        return [
            TravelChunk(
                id=f"{tenant_id}:internal:{len(self.queries)}",
                source_type="internal",
                content_type="travel_guide",
                title="三国主题资料",
                text="三国主题路线需要兼顾历史相关性和交通顺路性。",
                source_name="internal",
                retrieved_at=datetime.now(timezone.utc),
                score=0.8,
            )
        ]

    async def retrieve_many(
        self,
        queries: list[str],
        tenant_id: str,
        limit: int = 12,
    ) -> dict[str, list[TravelChunk]]:
        return {
            query: await self.retrieve(query, tenant_id=tenant_id, limit=limit)
            for query in queries
        }


class FailingInternalRAG:
    async def retrieve(
        self, query: str, tenant_id: str, limit: int = 12
    ) -> list[TravelChunk]:
        raise RuntimeError("embedding endpoint unavailable")

    async def retrieve_many(
        self,
        queries: list[str],
        tenant_id: str,
        limit: int = 12,
    ) -> dict[str, list[TravelChunk]]:
        raise RuntimeError("embedding endpoint unavailable")


class FakeWebSearch:
    def __init__(self) -> None:
        self.requests: list[tuple[str, int, SearchOptions | None]] = []

    async def search_chinese_tourism(
        self,
        question: str,
        max_results: int,
        options: SearchOptions | None = None,
    ) -> list[TravelSearchHit]:
        self.requests.append((question, max_results, options))
        safe_id = len(self.requests)
        return [
            TravelSearchHit(
                title=f"DIY search result {safe_id}",
                url=f"https://example.com/diy/{safe_id}",
                snippet="DIY 搜索结果",
                source_name="test",
            )
        ]


class FakeWebpageReader:
    def __init__(self) -> None:
        self.urls: list[str] = []

    async def read(self, hit: TravelSearchHit) -> list[TravelChunk]:
        self.urls.append(str(hit.url))
        return [
            TravelChunk(
                id=f"web:{len(self.urls)}",
                source_type="web",
                content_type="travel_guide",
                title=hit.title,
                text=f"网页内容 {hit.title}",
                url=hit.url,
                source_name=hit.source_name or "web",
                retrieved_at=datetime.now(timezone.utc),
                score=0.7,
            )
        ]


class FakeReranker:
    chunks_seen: list[TravelChunk] = []

    def rerank(
        self, question: str, chunks: list[TravelChunk], top_k: int
    ) -> list[TravelChunk]:
        self.chunks_seen = chunks
        return chunks[:top_k]


class FakeCitationFormatter:
    def build(self, chunks: list[TravelChunk]) -> CitationPack:
        return CitationPack(
            context_text="\n".join(chunk.text for chunk in chunks),
            citations=["[1] 三国主题资料 - internal - internal"],
        )

    def extend_with_service_enrichment(
        self,
        pack: CitationPack,
        service_context: ServiceEnrichmentContext | None,
    ) -> CitationPack:
        return pack


@pytest.fixture(autouse=True)
def patch_checkpoints(monkeypatch):
    async def fake_create_intent_decision(
        question: TravelQuestion,
        request_mode: str,
    ) -> IntentDecision:
        return IntentDecision(
            request_mode=request_mode,
            intent="diy_itinerary",
            reason="测试 DIY 意图。",
        )

    async def fake_create_preference_decision(
        question: TravelQuestion,
        request_mode: str,
        intent_decision: IntentDecision,
    ) -> ClarificationDecision:
        return ClarificationDecision(
            should_ask=False,
            question=None,
            reason="信息足够。",
            profile=PreferenceProfile(
                travel_mode="mixed",
                theme_strictness="balanced_city",
            ),
            assumed_defaults=["默认平衡主题与城市体验。"],
        )

    async def fake_create_feasibility_report(
        question: TravelQuestion,
        request_mode: str,
        research_plan=None,
        diy_plan: DIYItineraryPlan | None = None,
        preference_profile: PreferenceProfile | None = None,
    ) -> FeasibilityReport:
        return FeasibilityReport(
            is_feasible=True,
            should_ask=False,
            question=None,
            issues=[],
            recommended_adjustments=[],
        )

    monkeypatch.setattr(
        diy_service_module,
        "create_intent_decision",
        fake_create_intent_decision,
    )
    monkeypatch.setattr(
        diy_service_module,
        "create_preference_decision",
        fake_create_preference_decision,
    )
    monkeypatch.setattr(
        diy_service_module,
        "create_feasibility_report",
        fake_create_feasibility_report,
    )
    monkeypatch.setattr(
        diy_service_module,
        "should_ask_detail_level",
        lambda question, request_mode: ClarificationDecision(
            should_ask=False,
            question=None,
            reason="测试默认详细度。",
            profile=PreferenceProfile(detail_level=question.detail_level or "standard"),
        ),
    )


@pytest.mark.asyncio
async def test_diy_itinerary_service_uses_diy_plan_and_passes_it_to_final_agent(
    monkeypatch,
):
    final_diy_plan: DIYItineraryPlan | None = None

    async def fake_create_diy_itinerary_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> DIYItineraryPlan:
        return DIYItineraryPlan(
            original_question=question.question,
            theme="三国历史巡礼",
            origin="北京",
            return_city="北京",
            required_stops=["涿州", "安阳", "许昌", "南阳", "成都", "汉中"],
            proposed_route=[
                "北京",
                "涿州",
                "安阳",
                "许昌",
                "南阳",
                "汉中",
                "成都",
                "北京",
            ],
            route_order_policy="optimize_for_transport",
            travel_mode="mixed",
            days=10,
            route_segments=[
                DIYRouteSegment(
                    origin="北京",
                    destination="涿州",
                    transport_focus="北京出发的近郊衔接。",
                ),
                DIYRouteSegment(
                    origin="南阳",
                    destination="汉中",
                    transport_focus="跨省长距离衔接。",
                ),
            ],
            tasks=[
                TravelResearchTask(
                    task_type="attraction",
                    evidence_use="mainstream_attraction",
                    query="许昌 曹魏 三国 遗址 博物馆 官方",
                    reason="核验许昌三国主题景点。",
                    max_results=4,
                ),
                TravelResearchTask(
                    task_type="transport",
                    evidence_use="route_feasibility",
                    query="南阳 到 汉中 交通 高铁 自驾",
                    reason="核验跨省交通可行性。",
                    max_results=4,
                ),
                TravelResearchTask(
                    task_type="food",
                    evidence_use="local_food",
                    query="成都 三国 主题 本地美食 特色小吃",
                    reason="补充当地餐饮。",
                    source_preference="local_experience",
                ),
            ],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan=None,
        diy_plan: DIYItineraryPlan | None = None,
        preference_profile: PreferenceProfile | None = None,
        feasibility_report: FeasibilityReport | None = None,
        detail_level: str = "standard",
        service_enrichment: ServiceEnrichmentContext | None = None,
    ) -> TravelAnswer:
        nonlocal final_diy_plan
        final_diy_plan = diy_plan
        return TravelAnswer(
            answer="ok",
            highlights=[],
            warnings=[],
            citations=citation_lines,
        )

    monkeypatch.setattr(
        diy_service_module,
        "create_diy_itinerary_plan",
        fake_create_diy_itinerary_plan,
    )
    monkeypatch.setattr(
        diy_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    internal_rag = FakeInternalRAG()
    web_search = FakeWebSearch()
    webpage_reader = FakeWebpageReader()
    deps = TourismDeps(
        tenant_id="demo-tenant",
        internal_rag=internal_rag,
        web_search=web_search,
        webpage_reader=webpage_reader,
        reranker=FakeReranker(),
        citations=FakeCitationFormatter(),
    )
    service = DIYItineraryService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=3,
        top_k=4,
    )

    answer = await service.answer(
        TravelQuestion(
            question="从北京出发，北京结束，三国历史巡礼：涿州-安阳-许昌-南阳-成都-汉中。"
        )
    )

    assert final_diy_plan is not None
    assert final_diy_plan.required_stops == ["涿州", "安阳", "许昌", "南阳", "成都", "汉中"]
    assert final_diy_plan.proposed_route[0] == "北京"
    assert final_diy_plan.proposed_route[-1] == "北京"
    assert answer.generated_itinerary is not None
    assert answer.generated_itinerary.destination == "三国历史巡礼"
    assert len(answer.generated_itinerary.itinerary) == 10
    planned_cities = [day.city for day in answer.generated_itinerary.itinerary]
    assert planned_cities[:4] == ["北京", "涿州", "安阳", "许昌"]
    assert internal_rag.queries[:3] == [
        "许昌 曹魏 三国 遗址 博物馆 官方",
        "成都 三国 主题 本地美食 特色小吃",
        "南阳 到 汉中 交通 高铁 自驾",
    ]
    assert web_search.requests[0] == (
        "许昌 曹魏 三国 遗址 博物馆 官方",
        3,
        SearchOptions(source_preference="mixed"),
    )
    assert webpage_reader.urls == [
        "https://example.com/diy/1",
        "https://example.com/diy/2",
        "https://example.com/diy/3",
    ]


@pytest.mark.asyncio
async def test_diy_answer_continues_with_web_evidence_when_internal_rag_is_unavailable(
    monkeypatch,
):
    async def fake_create_diy_itinerary_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> DIYItineraryPlan:
        task = TravelResearchTask(
            task_type="attraction",
            query="涿州 三国 官方",
            reason="核验主题景点。",
            max_results=1,
        )
        return DIYItineraryPlan(
            original_question=question.question,
            theme="三国历史巡礼",
            origin="北京",
            return_city="北京",
            required_stops=["涿州", "许昌"],
            proposed_route=["北京", "涿州", "许昌", "北京"],
            tasks=[task, task, task],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan=None,
        diy_plan: DIYItineraryPlan | None = None,
        preference_profile: PreferenceProfile | None = None,
        feasibility_report: FeasibilityReport | None = None,
        detail_level: str = "standard",
        service_enrichment: ServiceEnrichmentContext | None = None,
    ) -> TravelAnswer:
        return TravelAnswer(
            answer="ok [1]",
            highlights=[],
            warnings=[],
            citations=citation_lines,
        )

    monkeypatch.setattr(
        diy_service_module,
        "create_diy_itinerary_plan",
        fake_create_diy_itinerary_plan,
    )
    monkeypatch.setattr(
        diy_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    web_search = FakeWebSearch()
    service = DIYItineraryService(
        deps=TourismDeps(
            tenant_id="demo-tenant",
            internal_rag=FailingInternalRAG(),
            web_search=web_search,
            webpage_reader=FakeWebpageReader(),
            reranker=FakeReranker(),
            citations=FakeCitationFormatter(),
        ),
        merger=TravelChunkMergeService(),
        max_pages_to_read=1,
        top_k=4,
    )

    answer = await service.answer(
        TravelQuestion(question="北京出发三国历史巡礼：涿州。")
    )

    assert web_search.requests[0][0] == "涿州 三国 官方"
    assert answer.answer == "ok [1]"
    assert answer.warnings == [
        "内部知识库向量检索暂不可用，已改用实时网页证据继续规划。"
    ]


@pytest.mark.asyncio
async def test_diy_itinerary_service_asks_theme_strictness_before_planning(
    monkeypatch,
):
    async def fake_create_preference_decision(
        question: TravelQuestion,
        request_mode: str,
        intent_decision: IntentDecision,
    ) -> ClarificationDecision:
        return ClarificationDecision(
            should_ask=True,
            question="您希望只看三国强相关，还是平衡加入城市经典景点和本地美食？",
            reason="主题严格程度会改变 DIY 路线。",
            profile=PreferenceProfile(theme_strictness="unknown"),
            assumed_defaults=["如果不指定，默认平衡路线。"],
        )

    async def fail_create_diy_itinerary_plan(*args, **kwargs):
        raise AssertionError("DIY planner should not run when clarification is needed")

    monkeypatch.setattr(
        diy_service_module,
        "create_preference_decision",
        fake_create_preference_decision,
    )
    monkeypatch.setattr(
        diy_service_module,
        "create_diy_itinerary_plan",
        fail_create_diy_itinerary_plan,
    )
    internal_rag = FakeInternalRAG()
    deps = TourismDeps(
        tenant_id="demo-tenant",
        internal_rag=internal_rag,
        web_search=FakeWebSearch(),
        webpage_reader=FakeWebpageReader(),
        reranker=FakeReranker(),
        citations=FakeCitationFormatter(),
    )
    service = DIYItineraryService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=3,
        top_k=4,
    )

    answer = await service.answer(
        TravelQuestion(question="三国历史巡礼：涿州-安阳-许昌-成都。")
    )

    assert "三国强相关" in answer.answer
    assert answer.generated_itinerary is None
    assert internal_rag.queries == []


@pytest.mark.asyncio
async def test_diy_itinerary_service_creates_session_when_clarification_is_needed(
    monkeypatch,
):
    async def fake_create_preference_decision(
        question: TravelQuestion,
        request_mode: str,
        intent_decision: IntentDecision,
    ) -> ClarificationDecision:
        return ClarificationDecision(
            should_ask=True,
            question="您希望只看三国强相关，还是平衡加入城市经典景点和本地美食？",
            reason="主题严格程度会改变 DIY 路线。",
            profile=PreferenceProfile(theme_strictness="unknown"),
            assumed_defaults=["如果不指定，默认平衡路线。"],
        )

    monkeypatch.setattr(
        diy_service_module,
        "create_preference_decision",
        fake_create_preference_decision,
    )
    session_store = InMemoryTravelSessionStore()
    deps = TourismDeps(
        tenant_id="demo-tenant",
        internal_rag=FakeInternalRAG(),
        web_search=FakeWebSearch(),
        webpage_reader=FakeWebpageReader(),
        reranker=FakeReranker(),
        citations=FakeCitationFormatter(),
    )
    service = DIYItineraryService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=3,
        top_k=4,
        session_store=session_store,
    )

    answer = await service.answer(
        TravelQuestion(question="三国历史巡礼：涿州-安阳-许昌-成都。")
    )

    assert answer.needs_reply is True
    assert answer.session_id is not None
    session = await session_store.get(answer.session_id, tenant_id="demo-tenant")
    assert session.endpoint == "diy"
    assert session.pending_reason == "主题严格程度会改变 DIY 路线。"


@pytest.mark.asyncio
async def test_diy_itinerary_service_asks_when_feasibility_is_blocked(
    monkeypatch,
):
    async def fake_create_diy_itinerary_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> DIYItineraryPlan:
        return DIYItineraryPlan(
            original_question=question.question,
            theme="三国历史巡礼",
            required_stops=["涿州", "许昌", "成都"],
            proposed_route=["涿州", "许昌", "成都"],
            route_order_policy="optimize_for_transport",
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    query="三国历史巡礼 涿州 许昌 成都 路线",
                    reason="规划路线。",
                ),
                TravelResearchTask(
                    task_type="transport",
                    query="涿州 到 许昌 到 成都 交通",
                    reason="核验交通。",
                ),
                TravelResearchTask(
                    task_type="attraction",
                    query="成都 三国 武侯祠 官方",
                    reason="核验景点。",
                ),
            ],
        )

    async def fake_create_feasibility_report(
        question: TravelQuestion,
        request_mode: str,
        research_plan=None,
        diy_plan: DIYItineraryPlan | None = None,
        preference_profile: PreferenceProfile | None = None,
    ) -> FeasibilityReport:
        return FeasibilityReport(
            is_feasible=False,
            should_ask=True,
            question="3 天保留全部城市会过于赶路，是否允许延长到 5 天？",
            issues=[],
            recommended_adjustments=["延长到 5 天或减少 1 个城市。"],
        )

    monkeypatch.setattr(
        diy_service_module,
        "create_diy_itinerary_plan",
        fake_create_diy_itinerary_plan,
    )
    monkeypatch.setattr(
        diy_service_module,
        "create_feasibility_report",
        fake_create_feasibility_report,
    )
    deps = TourismDeps(
        tenant_id="demo-tenant",
        internal_rag=FakeInternalRAG(),
        web_search=FakeWebSearch(),
        webpage_reader=FakeWebpageReader(),
        reranker=FakeReranker(),
        citations=FakeCitationFormatter(),
    )
    service = DIYItineraryService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=3,
        top_k=4,
    )

    answer = await service.answer(
        TravelQuestion(question="三国历史巡礼：涿州-许昌-成都，3天。")
    )

    assert "是否允许延长到 5 天" in answer.answer
    assert answer.generated_itinerary is None


@pytest.mark.asyncio
async def test_diy_itinerary_service_filters_unrelated_evidence_before_citations(
    monkeypatch,
):
    async def fake_create_diy_itinerary_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> DIYItineraryPlan:
        return DIYItineraryPlan(
            original_question=question.question,
            theme="三国历史巡礼",
            origin="北京",
            return_city="北京",
            required_stops=["涿州", "许昌", "成都", "汉中"],
            proposed_route=["北京", "涿州", "许昌", "成都", "汉中", "北京"],
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    query="三国历史巡礼 涿州 许昌 成都 汉中",
                    reason="规划主题路线。",
                ),
                TravelResearchTask(
                    task_type="transport",
                    query="北京 涿州 许昌 成都 汉中 高铁",
                    reason="核验交通。",
                ),
                TravelResearchTask(
                    task_type="attraction",
                    query="许昌 曹魏 三国 官方",
                    reason="核验三国主题景点。",
                ),
            ],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan=None,
        diy_plan: DIYItineraryPlan | None = None,
        preference_profile: PreferenceProfile | None = None,
        feasibility_report: FeasibilityReport | None = None,
        detail_level: str = "standard",
        service_enrichment: ServiceEnrichmentContext | None = None,
    ) -> TravelAnswer:
        return TravelAnswer(
            answer="ok",
            highlights=[],
            warnings=[],
            citations=citation_lines,
        )

    class NoisyInternalRAG:
        async def retrieve(
            self, query: str, tenant_id: str, limit: int = 12
        ) -> list[TravelChunk]:
            return [
                TravelChunk(
                    id="beijing-hotel",
                    source_type="internal",
                    content_type="accommodation",
                    title="北京王府井希尔顿酒店适合高预算游客",
                    text="北京王府井住宿、酒店、早餐、房型。",
                    source_name="internal",
                    retrieved_at=datetime.now(timezone.utc),
                    score=0.99,
                ),
                TravelChunk(
                    id="xuchang-theme",
                    source_type="internal",
                    content_type="travel_guide",
                    title="许昌曹魏三国遗址",
                    text="许昌许都、曹操、曹魏、三国主题景点。",
                    source_name="internal",
                    retrieved_at=datetime.now(timezone.utc),
                    score=0.5,
                ),
                TravelChunk(
                    id="railway",
                    source_type="web",
                    content_type="transport",
                    title="中国铁路改签退票与目的地变更提醒",
                    text="12306 官方说明铁路购票、退票、改签、变更到站规则。",
                    url="https://www.12306.cn/en/faq.html",
                    source_name="12306",
                    retrieved_at=datetime.now(timezone.utc),
                    score=0.4,
                ),
            ]

        async def retrieve_many(
            self,
            queries: list[str],
            tenant_id: str,
            limit: int = 12,
        ) -> dict[str, list[TravelChunk]]:
            return {
                query: await self.retrieve(query, tenant_id=tenant_id, limit=limit)
                for query in queries
            }

    monkeypatch.setattr(
        diy_service_module,
        "create_diy_itinerary_plan",
        fake_create_diy_itinerary_plan,
    )
    monkeypatch.setattr(
        diy_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    reranker = FakeReranker()
    deps = TourismDeps(
        tenant_id="demo-tenant",
        internal_rag=NoisyInternalRAG(),
        web_search=FakeWebSearch(),
        webpage_reader=FakeWebpageReader(),
        reranker=reranker,
        citations=FakeCitationFormatter(),
    )
    service = DIYItineraryService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=0,
        top_k=4,
    )

    await service.answer(
        TravelQuestion(
            question="从北京出发，北京结束，三国历史巡礼：涿州-许昌-成都-汉中。"
        )
    )

    assert [chunk.id for chunk in reranker.chunks_seen] == [
        "xuchang-theme",
        "railway",
    ]


@pytest.mark.asyncio
async def test_diy_answer_attaches_service_enrichment_context(monkeypatch):
    async def fake_create_diy_itinerary_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> DIYItineraryPlan:
        task = TravelResearchTask(
            task_type="route",
            query="北京 涿州 许昌 三国 路线",
            reason="规划路线。",
        )
        return DIYItineraryPlan(
            original_question=question.question,
            theme="三国历史巡礼",
            origin="北京",
            return_city="北京",
            required_stops=["涿州", "许昌"],
            proposed_route=["北京", "涿州", "许昌", "北京"],
            tasks=[task, task, task],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan=None,
        diy_plan: DIYItineraryPlan | None = None,
        preference_profile: PreferenceProfile | None = None,
        feasibility_report: FeasibilityReport | None = None,
        detail_level: str = "standard",
        service_enrichment: ServiceEnrichmentContext | None = None,
    ) -> TravelAnswer:
        assert service_enrichment == ServiceEnrichmentContext()
        return TravelAnswer(
            answer="ok",
            highlights=[],
            warnings=[],
            citations=citation_lines,
        )

    class FakeServiceEnrichment:
        def __init__(self) -> None:
            self.calls = []

        async def enrich(
            self,
            question: TravelQuestion,
            diy_plan: DIYItineraryPlan | None,
            research_plan,
        ) -> ServiceEnrichmentContext:
            self.calls.append((question, diy_plan, research_plan))
            return ServiceEnrichmentContext()

    monkeypatch.setattr(
        diy_service_module,
        "create_diy_itinerary_plan",
        fake_create_diy_itinerary_plan,
    )
    monkeypatch.setattr(
        diy_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    enrichment = FakeServiceEnrichment()
    deps = TourismDeps(
        tenant_id="demo-tenant",
        internal_rag=FakeInternalRAG(),
        web_search=FakeWebSearch(),
        webpage_reader=FakeWebpageReader(),
        reranker=FakeReranker(),
        citations=FakeCitationFormatter(),
    )
    service = DIYItineraryService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=0,
        top_k=4,
        service_enrichment=enrichment,
    )

    answer = await service.answer(
        TravelQuestion(question="北京出发三国巡礼，涿州和许昌必须去。", detail_level="deep")
    )

    assert answer.service_enrichment == ServiceEnrichmentContext()
    assert len(enrichment.calls) == 1
    assert enrichment.calls[0][1].proposed_route == ["北京", "涿州", "许昌", "北京"]
    assert enrichment.calls[0][2] is None


@pytest.mark.asyncio
async def test_diy_answer_normalizes_fabricated_llm_citation_lines(monkeypatch):
    async def fake_create_diy_itinerary_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> DIYItineraryPlan:
        task = TravelResearchTask(
            task_type="attraction",
            query="成都 武侯祠 官方",
            reason="核验三国主题景点。",
        )
        return DIYItineraryPlan(
            original_question=question.question,
            theme="三国历史巡礼",
            origin="北京",
            return_city="北京",
            required_stops=["成都", "汉中"],
            proposed_route=["北京", "成都", "汉中", "北京"],
            tasks=[task, task, task],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan=None,
        diy_plan: DIYItineraryPlan | None = None,
        preference_profile: PreferenceProfile | None = None,
        feasibility_report: FeasibilityReport | None = None,
        detail_level: str = "standard",
        service_enrichment: ServiceEnrichmentContext | None = None,
    ) -> TravelAnswer:
        return TravelAnswer(
            answer="成都段以武侯祠承接蜀汉主题。[1]",
            highlights=[],
            warnings=[],
            citations=["[1] 模型改写来源 - fake - https://fake.example"],
        )

    class StrictCitationFormatter:
        def build(self, chunks: list[TravelChunk]) -> CitationPack:
            return CitationPack(
                context_text="[1] quote=成都武侯祠承接蜀汉主题。",
                citations=[
                    "[1] 成都武侯祠 - 成都文旅 - https://example.cn/wuhou"
                ],
                evidence_quotes=[
                    EvidenceQuote(
                        citation_id=1,
                        chunk_id="web:wuhou",
                        source_type="web",
                        content_type="attraction",
                        title="成都武侯祠",
                        source_name="成都文旅",
                        source_ref="https://example.cn/wuhou",
                        quote="成都武侯祠承接蜀汉主题。",
                        url="https://example.cn/wuhou",
                    )
                ],
            )

    monkeypatch.setattr(
        diy_service_module,
        "create_diy_itinerary_plan",
        fake_create_diy_itinerary_plan,
    )
    monkeypatch.setattr(
        diy_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    service = DIYItineraryService(
        deps=TourismDeps(
            tenant_id="demo-tenant",
            internal_rag=FakeInternalRAG(),
            web_search=FakeWebSearch(),
            webpage_reader=FakeWebpageReader(),
            reranker=FakeReranker(),
            citations=StrictCitationFormatter(),
        ),
        merger=TravelChunkMergeService(),
        max_pages_to_read=0,
        top_k=2,
    )

    answer = await service.answer(
        TravelQuestion(question="我想做成都三国历史巡礼。", detail_level="standard")
    )

    assert answer.citations == [
        "[1] 成都武侯祠 - 成都文旅 - https://example.cn/wuhou"
    ]
    assert any("引用校验已自动修正" in warning for warning in answer.warnings)
    assert answer.performance is not None
    guard_stage = next(stage for stage in answer.performance.stages if stage.name == "citation_guard")
    assert guard_stage.metadata["issues"] == 1
    assert guard_stage.metadata["returned_citations"] == 1


@pytest.mark.asyncio
async def test_diy_endpoint_skips_intent_but_keeps_preference_checkpoint(monkeypatch):
    async def fail_intent(*args, **kwargs):
        raise AssertionError("DIY endpoint should not need intent checkpoint")

    async def fake_preference(
        question: TravelQuestion,
        request_mode: str,
        intent_decision: IntentDecision,
    ) -> ClarificationDecision:
        assert intent_decision.intent == "diy_itinerary"
        return ClarificationDecision(
            should_ask=True,
            question="主题纯粹型还是平衡城市旅行型？",
            reason="主题严格程度会改变路线。",
            profile=PreferenceProfile(theme_strictness="unknown"),
            assumed_defaults=["默认平衡主题和城市体验。"],
        )

    monkeypatch.setattr(diy_service_module, "create_intent_decision", fail_intent)
    monkeypatch.setattr(
        diy_service_module,
        "create_preference_decision",
        fake_preference,
    )

    service = DIYItineraryService(
        deps=TourismDeps(
            tenant_id="demo-tenant",
            internal_rag=FakeInternalRAG(),
            web_search=FakeWebSearch(),
            webpage_reader=FakeWebpageReader(),
            reranker=FakeReranker(),
            citations=FakeCitationFormatter(),
        ),
        merger=TravelChunkMergeService(),
        max_pages_to_read=0,
        top_k=4,
        session_store=InMemoryTravelSessionStore(),
    )

    answer = await service.answer(
        TravelQuestion(
            question="三国历史巡礼，必须覆盖涿州、许昌、南阳、成都、汉中。"
        )
    )

    assert answer.needs_reply is True
    assert answer.session_id is not None
    assert [option.label for option in answer.quick_replies] == [
        "选择 A",
        "选择 B",
        "默认偏好",
    ]
    assert [option.action_id for option in answer.quick_replies] == [
        "preference_option_a",
        "preference_option_b",
        "default_preferences",
    ]


@pytest.mark.asyncio
async def test_diy_planner_validation_failure_returns_recoverable_clarification(
    monkeypatch,
):
    async def fake_preference(
        question: TravelQuestion,
        request_mode: str,
        intent_decision: IntentDecision,
    ) -> ClarificationDecision:
        return ClarificationDecision(
            should_ask=False,
            question=None,
            reason="偏好已足够明确。",
            profile=PreferenceProfile(
                travel_mode="mixed",
                pace="balanced",
                attraction_mix="natural",
                detail_level="deep",
            ),
        )

    async def fail_create_diy_itinerary_plan(*args, **kwargs):
        raise ValueError(
            "Qwen Cloud response was not valid JSON for DIYItineraryPlan: "
            "required_stops List should have at least 2 items after validation"
        )

    monkeypatch.setattr(
        diy_service_module,
        "create_preference_decision",
        fake_preference,
    )
    monkeypatch.setattr(
        diy_service_module,
        "create_diy_itinerary_plan",
        fail_create_diy_itinerary_plan,
    )
    session_store = InMemoryTravelSessionStore()
    service = DIYItineraryService(
        deps=TourismDeps(
            tenant_id="demo-tenant",
            internal_rag=FakeInternalRAG(),
            web_search=FakeWebSearch(),
            webpage_reader=FakeWebpageReader(),
            reranker=FakeReranker(),
            citations=FakeCitationFormatter(),
        ),
        merger=TravelChunkMergeService(),
        max_pages_to_read=0,
        top_k=4,
        session_store=session_store,
    )

    answer = await service.answer(
        TravelQuestion(
            question="陪爸妈去川西和西藏7天，人均8000，想看自然美景",
            detail_level="deep",
        )
    )

    assert answer.needs_reply is True
    assert answer.session_id
    assert "还需要一个明确的必去城市或景点清单" in answer.answer
    assert "Qwen Cloud response" not in answer.answer


@pytest.mark.asyncio
async def test_diy_planner_recovery_preserves_pending_reply_for_existing_session(
    monkeypatch,
):
    async def fake_preference(
        question: TravelQuestion,
        request_mode: str,
        intent_decision: IntentDecision,
    ) -> ClarificationDecision:
        return ClarificationDecision(
            should_ask=False,
            question=None,
            reason="偏好已足够明确。",
            profile=PreferenceProfile(detail_level="deep"),
        )

    async def fail_create_diy_itinerary_plan(*args, **kwargs):
        raise ValueError("Qwen Cloud response was not valid JSON for DIYItineraryPlan")

    monkeypatch.setattr(
        diy_service_module,
        "create_preference_decision",
        fake_preference,
    )
    monkeypatch.setattr(
        diy_service_module,
        "create_diy_itinerary_plan",
        fail_create_diy_itinerary_plan,
    )
    service = DIYItineraryService(
        deps=TourismDeps(
            tenant_id="demo-tenant",
            internal_rag=FakeInternalRAG(),
            web_search=FakeWebSearch(),
            webpage_reader=FakeWebpageReader(),
            reranker=FakeReranker(),
            citations=FakeCitationFormatter(),
        ),
        merger=TravelChunkMergeService(),
        max_pages_to_read=0,
        top_k=4,
        session_store=InMemoryTravelSessionStore(),
        create_pending_sessions=False,
    )

    answer = await service.answer(
        TravelQuestion(
            question="原始请求：川西和西藏7天\n\n用户补充信息：平衡型，自驾/包车",
            detail_level="deep",
        )
    )

    assert answer.needs_reply is True
    assert answer.session_id is None


@pytest.mark.asyncio
async def test_complete_form_diy_skips_preference_checkpoint(monkeypatch):
    async def fail_preference(*args, **kwargs):
        raise AssertionError("form completeness should skip preference checkpoint")

    async def fake_create_diy_itinerary_plan(*args, **kwargs) -> DIYItineraryPlan:
        return DIYItineraryPlan(
            original_question="三国历史巡礼",
            theme="三国历史",
            origin="北京",
            return_city="北京",
            required_stops=["涿州", "许昌", "成都"],
            proposed_route=["北京", "涿州", "许昌", "成都", "北京"],
            tasks=[
                TravelResearchTask(
                    task_type="attraction",
                    query="许昌 三国 遗址",
                    reason="景点。",
                ),
                TravelResearchTask(
                    task_type="transport",
                    query="北京 许昌 成都 交通",
                    reason="交通。",
                ),
                TravelResearchTask(
                    task_type="food",
                    query="成都 本地美食",
                    reason="美食。",
                ),
            ],
        )

    async def fake_generate_answer_with_context(*args, **kwargs) -> TravelAnswer:
        return TravelAnswer(answer="ok", highlights=[], warnings=[], citations=[])

    monkeypatch.setattr(diy_service_module, "create_preference_decision", fail_preference)
    monkeypatch.setattr(
        diy_service_module,
        "create_diy_itinerary_plan",
        fake_create_diy_itinerary_plan,
    )
    monkeypatch.setattr(
        diy_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    service = DIYItineraryService(
        deps=TourismDeps(
            tenant_id="demo-tenant",
            internal_rag=FakeInternalRAG(),
            web_search=FakeWebSearch(),
            webpage_reader=FakeWebpageReader(),
            reranker=FakeReranker(),
            citations=FakeCitationFormatter(),
        ),
        merger=TravelChunkMergeService(),
        max_pages_to_read=0,
        top_k=4,
    )
    form = TravelFormRequest(
        request_mode="diy",
        origin_city="北京",
        return_city="北京",
        required_stops=["涿州", "许昌", "成都"],
        duration_days=10,
        traveler_composition={"adults": 2, "elders": 1, "children": 1},
        budget_level="luxury",
        route_strictness="must_cover_all",
        travel_mode_preference="train_first",
        attraction_preferences=["history_culture", "theme_route"],
        detail_level="deep",
    )

    answer = await service.answer(form.to_travel_question(), form_request=form)

    assert answer.answer == "ok"


@pytest.mark.asyncio
async def test_diy_backfills_missing_destination_entity(monkeypatch):
    async def fake_create_diy_itinerary_plan(*args, **kwargs) -> DIYItineraryPlan:
        return DIYItineraryPlan(
            original_question="三国历史巡礼",
            theme="三国历史",
            origin="北京",
            return_city="北京",
            required_stops=["北京", "赤壁", "成都"],
            proposed_route=["北京", "赤壁", "成都", "北京"],
            theme_anchors=[
                DIYThemeAnchor(
                    stop="赤壁",
                    keywords=["赤壁古战场"],
                    reason="三国战役主题核心点。",
                )
            ],
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    query="北京 赤壁 成都 交通",
                    reason="交通。",
                ),
                TravelResearchTask(
                    task_type="attraction",
                    query="三国历史 遗址",
                    reason="景点。",
                ),
                TravelResearchTask(
                    task_type="food",
                    query="成都 本地美食",
                    reason="美食。",
                ),
            ],
        )

    seen_queries: list[str] = []

    class BackfillWebSearch(FakeWebSearch):
        async def search_chinese_tourism(
            self,
            question: str,
            max_results: int,
            options: SearchOptions | None = None,
        ) -> list[TravelSearchHit]:
            seen_queries.append(question)
            return await super().search_chinese_tourism(question, max_results, options)

    async def fake_generate_answer_with_context(*args, **kwargs) -> TravelAnswer:
        return TravelAnswer(answer="ok", highlights=[], warnings=[], citations=[])

    monkeypatch.setattr(
        diy_service_module,
        "create_diy_itinerary_plan",
        fake_create_diy_itinerary_plan,
    )
    monkeypatch.setattr(
        diy_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    service = DIYItineraryService(
        deps=TourismDeps(
            tenant_id="demo-tenant",
            internal_rag=FakeInternalRAG(),
            web_search=BackfillWebSearch(),
            webpage_reader=FakeWebpageReader(),
            reranker=FakeReranker(),
            citations=FakeCitationFormatter(),
        ),
        merger=TravelChunkMergeService(),
        max_pages_to_read=1,
        top_k=4,
    )

    await service.answer(TravelQuestion(question="三国历史巡礼 北京 赤壁 成都"))

    assert any("赤壁古战场" in query for query in seen_queries)

from datetime import date, datetime, timezone

import pytest

from huaxia_tourismrag.agents.tourism_agent import TourismDeps
from huaxia_tourismrag.schemas.evidence import (
    CitationPack,
    EvidenceQuote,
    TravelAnswer,
    TravelChunk,
    TravelFormRequest,
    TravelQuestion,
    TravelSearchHit,
)
from huaxia_tourismrag.schemas.research import TravelResearchPlan, TravelResearchTask
from huaxia_tourismrag.schemas.search import SearchOptions
from huaxia_tourismrag.schemas.service_enrichment import (
    FreshWebEvidence,
    ServiceEnrichmentContext,
)
from huaxia_tourismrag.schemas.travel_checkpoints import (
    ClarificationDecision,
    FeasibilityReport,
    IntentDecision,
    PreferenceProfile,
)
from huaxia_tourismrag.services.evidence_merge import TravelChunkMergeService
from huaxia_tourismrag.services import qa_service as qa_service_module
from huaxia_tourismrag.services.qa_service import TourismQAService
from huaxia_tourismrag.services.retrieval_cache import RetrievalCache
from huaxia_tourismrag.services.session_store import InMemoryTravelSessionStore
from huaxia_tourismrag.tools.citation_formatter import CitationFormatter


class FakeInternalRAG:
    def __init__(self) -> None:
        self.queries: list[str] = []

    async def retrieve(
        self, query: str, tenant_id: str, limit: int = 12
    ) -> list[TravelChunk]:
        self.queries.append(query)
        return [
            TravelChunk(
                id=f"{tenant_id}:internal:0",
                source_type="internal",
                content_type="travel_guide",
                title="北京基础行程",
                text="北京第一次旅行应覆盖景点、美食和住宿区域。",
                source_name="internal",
                retrieved_at=datetime.now(timezone.utc),
                score=0.9,
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
                title=f"search result {safe_id}",
                url=f"https://example.com/{safe_id}",
                snippet="测试搜索结果",
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


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}

    async def get(self, key: str) -> str | None:
        return self.values.get(key)

    async def set(self, key: str, value: str, ex: int) -> None:
        self.values[key] = value


class FakeReranker:
    def __init__(self) -> None:
        self.top_k_values: list[int] = []
        self.chunks_seen: list[TravelChunk] = []

    def rerank(
        self, question: str, chunks: list[TravelChunk], top_k: int
    ) -> list[TravelChunk]:
        self.top_k_values.append(top_k)
        self.chunks_seen = chunks
        return chunks[:top_k]


class FakeCitationFormatter:
    def __init__(self) -> None:
        self.chunks_seen: list[TravelChunk] = []

    def build(self, chunks: list[TravelChunk]) -> CitationPack:
        self.chunks_seen = chunks
        return CitationPack(
            context_text="\n".join(chunk.text for chunk in chunks),
            citations=[
                f"[{index}] {chunk.title} - {chunk.source_name} - {chunk.url or 'internal'}"
                for index, chunk in enumerate(chunks, start=1)
            ],
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
            intent="conventional_itinerary",
            reason="测试默认意图。",
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
            profile=PreferenceProfile(pace="balanced"),
            assumed_defaults=["默认平衡节奏。"],
        )

    async def fake_create_feasibility_report(
        question: TravelQuestion,
        request_mode: str,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
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
        qa_service_module,
        "create_intent_decision",
        fake_create_intent_decision,
    )
    monkeypatch.setattr(
        qa_service_module,
        "create_preference_decision",
        fake_create_preference_decision,
    )
    monkeypatch.setattr(
        qa_service_module,
        "create_feasibility_report",
        fake_create_feasibility_report,
    )
    monkeypatch.setattr(
        qa_service_module,
        "should_ask_detail_level",
        lambda question, request_mode: ClarificationDecision(
            should_ask=False,
            question=None,
            reason="测试默认详细度。",
            profile=PreferenceProfile(detail_level=question.detail_level or "standard"),
        ),
    )


@pytest.mark.asyncio
async def test_answer_uses_research_plan_tasks_for_retrieval(monkeypatch):
    planner_inputs: list[TravelQuestion] = []
    final_plan: TravelResearchPlan | None = None

    async def fake_create_research_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> TravelResearchPlan:
        planner_inputs.append(question)
        return TravelResearchPlan(
            original_question=question.question,
            destination="四川、云南",
            trip_days=10,
            interests=["自然风景", "民族文化", "本地美食"],
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    evidence_use="route_feasibility",
                    query="四川云南十日游 成都 昆明 大理 丽江 路线 不赶路",
                    reason="确定顺路路线。",
                    max_results=4,
                ),
                TravelResearchTask(
                    task_type="food",
                    evidence_use="local_food",
                    query="成都 云南 十日游 代表美食 火锅 米线 菌菇 本地推荐",
                    reason="覆盖本地美食。",
                    max_results=3,
                    source_preference="local_experience",
                    recency_days=180,
                ),
                TravelResearchTask(
                    task_type="accommodation",
                    evidence_use="hotel_zone",
                    query="成都 大理 丽江 住宿区域 推荐 第一次去",
                    reason="覆盖住宿区域。",
                    max_results=2,
                ),
            ],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
        preference_profile: PreferenceProfile | None = None,
        feasibility_report: FeasibilityReport | None = None,
        detail_level: str = "standard",
        service_enrichment: ServiceEnrichmentContext | None = None,
    ) -> TravelAnswer:
        nonlocal final_plan
        final_plan = research_plan
        return TravelAnswer(
            answer="ok",
            highlights=[],
            warnings=[],
            citations=citation_lines,
        )

    monkeypatch.setattr(
        qa_service_module,
        "create_research_plan",
        fake_create_research_plan,
    )
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    internal_rag = FakeInternalRAG()
    web_search = FakeWebSearch()
    webpage_reader = FakeWebpageReader()
    reranker = FakeReranker()
    deps = TourismDeps(
        tenant_id="demo-tenant",
        internal_rag=internal_rag,
        web_search=web_search,
        webpage_reader=webpage_reader,
        reranker=reranker,
        citations=FakeCitationFormatter(),
    )
    service = TourismQAService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=2,
        top_k=4,
    )
    question = TravelQuestion(
        question="我想做一次四川云南十日游，第一次去，希望路线不要太赶。",
        destination="四川、云南",
        travelers=2,
        budget_level="mid_range",
        interests=["自然风景", "民族文化", "本地美食"],
    )

    await service.answer(question)

    assert planner_inputs == [question]
    assert internal_rag.queries == [
        "四川云南十日游 成都 昆明 大理 丽江 路线 不赶路",
        "成都 云南 十日游 代表美食 火锅 米线 菌菇 本地推荐",
        "成都 大理 丽江 住宿区域 推荐 第一次去",
    ]
    assert web_search.requests == [
        (
            "四川云南十日游 成都 昆明 大理 丽江 路线 不赶路",
            3,
            SearchOptions(source_preference="mixed"),
        ),
        (
            "成都 云南 十日游 代表美食 火锅 米线 菌菇 本地推荐",
            3,
            SearchOptions(
                source_preference="local_experience",
                recency_days=180,
            ),
        ),
        (
            "成都 大理 丽江 住宿区域 推荐 第一次去",
            2,
            SearchOptions(source_preference="mixed"),
        ),
    ]
    assert webpage_reader.urls == ["https://example.com/1", "https://example.com/2"]
    assert final_plan is not None
    assert final_plan.destination == "四川、云南"
    assert reranker.top_k_values == [4]


@pytest.mark.asyncio
async def test_answer_synthesizes_structured_itinerary_when_final_agent_omits_it(
    monkeypatch,
):
    async def fake_create_research_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> TravelResearchPlan:
        return TravelResearchPlan(
            original_question=question.question,
            destination="山西",
            origin="上海",
            trip_days=10,
            travelers_summary="5人，含老人儿童",
            budget_level="luxury",
            interests=["历史人文", "古建"],
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    query="山西 十日 人文 古建 路线",
                    reason="规划整体路线。",
                ),
                TravelResearchTask(
                    task_type="transport",
                    query="上海 山西 高铁 包车 交通",
                    reason="核验交通。",
                ),
                TravelResearchTask(
                    task_type="accommodation",
                    query="山西 豪华酒店 住宿区域",
                    reason="核验住宿。",
                ),
            ],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
        preference_profile: PreferenceProfile | None = None,
        feasibility_report: FeasibilityReport | None = None,
        detail_level: str = "standard",
        service_enrichment: ServiceEnrichmentContext | None = None,
    ) -> TravelAnswer:
        return TravelAnswer(
            answer="正文里有方案，但模型漏掉了结构化行程。",
            highlights=[],
            warnings=[],
            citations=citation_lines,
        )

    monkeypatch.setattr(
        qa_service_module,
        "create_research_plan",
        fake_create_research_plan,
    )
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    service = TourismQAService(
        deps=TourismDeps(
            tenant_id="demo-tenant",
            internal_rag=FakeInternalRAG(),
            web_search=FakeWebSearch(),
            webpage_reader=FakeWebpageReader(),
            reranker=FakeReranker(),
            citations=FakeCitationFormatter(),
        ),
        merger=TravelChunkMergeService(),
        max_pages_to_read=1,
        top_k=3,
    )

    answer = await service.answer(
        TravelQuestion(
            question="上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。",
            destination="山西",
            travelers=5,
            budget_level="luxury",
            detail_level="deep",
        )
    )

    assert answer.generated_itinerary is not None
    assert answer.generated_itinerary.destination == "山西"
    assert answer.generated_itinerary.travelers == 5
    assert answer.generated_itinerary.budget_level == "luxury"
    assert len(answer.generated_itinerary.itinerary) == 10
    assert answer.generated_itinerary.itinerary[0].city == "山西"
    assert answer.generated_itinerary.itinerary[0].activities[0].name


@pytest.mark.asyncio
async def test_answer_performance_reports_retrieval_cache_hits(monkeypatch):
    async def fake_create_research_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> TravelResearchPlan:
        task = TravelResearchTask(
            task_type="route",
            query="北京 三天 路线",
            reason="规划路线。",
            max_results=2,
        )
        return TravelResearchPlan(
            original_question=question.question,
            destination="北京",
            tasks=[task, task, task],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
        preference_profile: PreferenceProfile | None = None,
        feasibility_report: FeasibilityReport | None = None,
        detail_level: str = "standard",
        service_enrichment: ServiceEnrichmentContext | None = None,
    ) -> TravelAnswer:
        return TravelAnswer(answer="ok", highlights=[], warnings=[], citations=[])

    monkeypatch.setattr(
        qa_service_module,
        "create_research_plan",
        fake_create_research_plan,
    )
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    cache = RetrievalCache(redis=FakeRedis(), ttl_seconds=3600)
    hit = TravelSearchHit(
        title="北京路线",
        url="https://example.com/beijing",
        snippet="北京三天路线。",
        source_name="test",
    )
    cached_chunk = TravelChunk(
        id="cached:1",
        source_type="internal",
        content_type="travel_guide",
        title="北京路线",
        text="北京三天路线证据。",
        source_name="internal",
        retrieved_at=datetime.now(timezone.utc),
        score=0.9,
    )
    await cache.set_internal_rag("北京 三天 路线", "demo-tenant", 8, [cached_chunk])
    await cache.set_web_search(
        "北京 三天 路线",
        max_results=2,
        options=SearchOptions(source_preference="mixed"),
        hits=[hit],
    )
    await cache.set_page_chunks(str(hit.url), [cached_chunk])
    internal_rag = FakeInternalRAG()
    web_search = FakeWebSearch()
    webpage_reader = FakeWebpageReader()
    service = TourismQAService(
        deps=TourismDeps(
            tenant_id="demo-tenant",
            internal_rag=internal_rag,
            web_search=web_search,
            webpage_reader=webpage_reader,
            reranker=FakeReranker(),
            citations=FakeCitationFormatter(),
        ),
        merger=TravelChunkMergeService(),
        max_pages_to_read=1,
        top_k=4,
        retrieval_cache=cache,
    )

    answer = await service.answer(TravelQuestion(question="北京三天怎么玩？"))

    metadata_by_stage = {
        stage.name: stage.metadata for stage in answer.performance.stages
    }
    assert metadata_by_stage["evidence_retrieval"]["internal_chunks"] == 3
    assert metadata_by_stage["evidence_retrieval"]["web_chunks"] == 1
    assert metadata_by_stage["evidence_retrieval"]["pages"] == 1
    assert internal_rag.queries == []
    assert web_search.requests == []
    assert webpage_reader.urls == []


@pytest.mark.asyncio
async def test_answer_continues_with_web_evidence_when_internal_rag_is_unavailable(
    monkeypatch,
):
    async def fake_create_research_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> TravelResearchPlan:
        task = TravelResearchTask(
            task_type="route",
            query="北京 三天 路线",
            reason="规划路线。",
            max_results=1,
        )
        return TravelResearchPlan(
            original_question=question.question,
            destination="北京",
            tasks=[task, task, task],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
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

    monkeypatch.setattr(
        qa_service_module,
        "create_research_plan",
        fake_create_research_plan,
    )
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    web_search = FakeWebSearch()
    service = TourismQAService(
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

    answer = await service.answer(TravelQuestion(question="北京三天怎么玩？"))

    assert web_search.requests[0][0] == "北京 三天 路线"
    assert answer.answer == "ok"
    assert answer.warnings == [
        "内部知识库向量检索暂不可用，已改用实时网页证据继续规划。"
    ]


@pytest.mark.asyncio
async def test_answer_prioritizes_core_task_types_when_page_budget_is_small(monkeypatch):
    async def fake_create_research_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> TravelResearchPlan:
        return TravelResearchPlan(
            original_question=question.question,
            destination="山西省",
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    evidence_use="route_feasibility",
                    query="山西十日游路线",
                    reason="整体路线。",
                ),
                TravelResearchTask(
                    task_type="attraction",
                    evidence_use="mainstream_attraction",
                    query="云冈石窟 五台山 平遥古城",
                    reason="景点。",
                ),
                TravelResearchTask(
                    task_type="attraction",
                    evidence_use="mainstream_attraction",
                    query="晋祠 山西博物院 壶口瀑布",
                    reason="景点。",
                ),
                TravelResearchTask(
                    task_type="accommodation",
                    evidence_use="hotel_zone",
                    query="山西豪华酒店 太原 大同 平遥",
                    reason="住宿。",
                ),
                TravelResearchTask(
                    task_type="food",
                    evidence_use="local_food",
                    query="山西特色美食 高端餐厅",
                    reason="美食。",
                ),
            ],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
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
        qa_service_module,
        "create_research_plan",
        fake_create_research_plan,
    )
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    web_search = FakeWebSearch()
    webpage_reader = FakeWebpageReader()
    reranker = FakeReranker()
    deps = TourismDeps(
        tenant_id="demo-tenant",
        internal_rag=FakeInternalRAG(),
        web_search=web_search,
        webpage_reader=webpage_reader,
        reranker=reranker,
        citations=FakeCitationFormatter(),
    )
    service = TourismQAService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=3,
        top_k=4,
    )

    await service.answer(TravelQuestion(question="山西历史人文深度十日游怎么安排？"))

    assert [request[0] for request in web_search.requests[:4]] == [
        "山西十日游路线",
        "云冈石窟 五台山 平遥古城",
        "山西特色美食 高端餐厅",
        "山西豪华酒店 太原 大同 平遥",
    ]
    assert webpage_reader.urls == [
        "https://example.com/1",
        "https://example.com/2",
        "https://example.com/3",
    ]
    assert reranker.top_k_values == [5]


@pytest.mark.asyncio
async def test_answer_passes_freshness_options_to_web_search(monkeypatch):
    async def fake_create_research_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> TravelResearchPlan:
        return TravelResearchPlan(
            original_question=question.question,
            destination="山西省",
            tasks=[
                TravelResearchTask(
                    task_type="booking",
                    evidence_use="official_status",
                    query="云冈石窟 官方 开放时间 预约 临时闭馆 维护 公告 2026",
                    reason="核验云冈石窟最新开放和预约。",
                    max_results=6,
                    freshness_required=True,
                    recency_days=90,
                    source_preference="official",
                ),
                TravelResearchTask(
                    task_type="food",
                    evidence_use="local_food",
                    query="太原 本地面馆 特色小吃 近期",
                    reason="寻找近期本地美食体验。",
                    source_preference="local_experience",
                    recency_days=180,
                ),
                TravelResearchTask(
                    task_type="route",
                    evidence_use="route_feasibility",
                    query="山西十日游路线",
                    reason="整体路线。",
                ),
            ],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
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

    monkeypatch.setattr(
        qa_service_module,
        "create_research_plan",
        fake_create_research_plan,
    )
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    web_search = FakeWebSearch()
    deps = TourismDeps(
        tenant_id="demo-tenant",
        internal_rag=FakeInternalRAG(),
        web_search=web_search,
        webpage_reader=FakeWebpageReader(),
        reranker=FakeReranker(),
        citations=FakeCitationFormatter(),
    )
    service = TourismQAService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=2,
        top_k=4,
    )

    await service.answer(TravelQuestion(question="山西历史人文深度十日游怎么安排？"))

    freshness_request = next(
        request for request in web_search.requests if request[0].startswith("云冈石窟")
    )
    local_request = next(
        request for request in web_search.requests if request[0].startswith("太原")
    )

    assert freshness_request[2] == SearchOptions(
        freshness_required=True,
        recency_days=90,
        source_preference="official",
        topic="general",
    )
    assert local_request[2] == SearchOptions(
        recency_days=180,
        source_preference="local_experience",
    )


@pytest.mark.asyncio
async def test_answer_prioritizes_fresh_official_tasks_before_general_tasks(
    monkeypatch,
):
    async def fake_create_research_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> TravelResearchPlan:
        return TravelResearchPlan(
            original_question=question.question,
            destination="山西省",
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    evidence_use="route_feasibility",
                    query="山西十日游路线",
                    reason="整体路线。",
                ),
                TravelResearchTask(
                    task_type="food",
                    evidence_use="local_food",
                    query="太原 本地美食 特色小吃",
                    reason="本地美食。",
                    source_preference="local_experience",
                ),
                TravelResearchTask(
                    task_type="booking",
                    evidence_use="official_status",
                    query="云冈石窟 官方 开放时间 预约 临时闭馆 公告",
                    reason="核验最新开放状态。",
                    freshness_required=True,
                    recency_days=30,
                    source_preference="official",
                ),
            ],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
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

    monkeypatch.setattr(
        qa_service_module,
        "create_research_plan",
        fake_create_research_plan,
    )
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    web_search = FakeWebSearch()
    webpage_reader = FakeWebpageReader()
    deps = TourismDeps(
        tenant_id="demo-tenant",
        internal_rag=FakeInternalRAG(),
        web_search=web_search,
        webpage_reader=webpage_reader,
        reranker=FakeReranker(),
        citations=FakeCitationFormatter(),
    )
    service = TourismQAService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=1,
        top_k=4,
    )

    await service.answer(TravelQuestion(question="山西历史人文深度十日游怎么安排？"))

    assert [request[0] for request in web_search.requests] == [
        "云冈石窟 官方 开放时间 预约 临时闭馆 公告",
        "山西十日游路线",
        "太原 本地美食 特色小吃",
    ]
    assert webpage_reader.urls == ["https://example.com/1"]


@pytest.mark.asyncio
async def test_answer_returns_clarification_before_retrieval(monkeypatch):
    async def fake_create_preference_decision(
        question: TravelQuestion,
        request_mode: str,
        intent_decision: IntentDecision,
    ) -> ClarificationDecision:
        return ClarificationDecision(
            should_ask=True,
            question="您偏好自然风景、历史文化，还是平衡安排？",
            reason="偏好会改变路线。",
            profile=PreferenceProfile(attraction_mix="unknown"),
            assumed_defaults=["如果不指定，默认平衡安排。"],
        )

    async def fail_create_research_plan(*args, **kwargs):
        raise AssertionError("research planner should not run when clarification is needed")

    monkeypatch.setattr(
        qa_service_module,
        "create_preference_decision",
        fake_create_preference_decision,
    )
    monkeypatch.setattr(
        qa_service_module,
        "create_research_plan",
        fail_create_research_plan,
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
    service = TourismQAService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=2,
        top_k=4,
    )

    answer = await service.answer(TravelQuestion(question="成都重庆五天怎么玩？"))

    assert "自然风景、历史文化" in answer.answer
    assert answer.generated_itinerary is None
    assert internal_rag.queries == []


@pytest.mark.asyncio
async def test_answer_creates_session_when_clarification_is_needed(monkeypatch):
    async def fake_create_preference_decision(
        question: TravelQuestion,
        request_mode: str,
        intent_decision: IntentDecision,
    ) -> ClarificationDecision:
        return ClarificationDecision(
            should_ask=True,
            question="您偏好自然风景、历史文化，还是平衡安排？",
            reason="偏好会改变路线。",
            profile=PreferenceProfile(attraction_mix="unknown"),
            assumed_defaults=["如果不指定，默认平衡安排。"],
        )

    monkeypatch.setattr(
        qa_service_module,
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
    service = TourismQAService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=2,
        top_k=4,
        session_store=session_store,
    )

    answer = await service.answer(TravelQuestion(question="成都重庆五天怎么玩？"))

    assert answer.needs_reply is True
    assert answer.session_id is not None
    session = await session_store.get(answer.session_id, tenant_id="demo-tenant")
    assert session.endpoint == "questions"
    assert session.original_question.question == "成都重庆五天怎么玩？"


@pytest.mark.asyncio
async def test_general_question_feasibility_report_warns_instead_of_blocking(
    monkeypatch,
):
    async def fake_create_research_plan(*args, **kwargs) -> TravelResearchPlan:
        return TravelResearchPlan(
            original_question="广州出发广西五日游",
            destination="广西",
            origin="广州",
            trip_days=5,
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    query="广西 桂林 阳朔 北海 五日游 路线",
                    reason="路线。",
                ),
                TravelResearchTask(
                    task_type="attraction",
                    query="桂林 漓江 阳朔 涠洲岛 景点",
                    reason="景点。",
                ),
                TravelResearchTask(
                    task_type="food",
                    query="广西 桂林 北海 本地美食",
                    reason="美食。",
                ),
            ],
        )

    async def fake_create_feasibility_report(*args, **kwargs) -> FeasibilityReport:
        return FeasibilityReport(
            is_feasible=False,
            should_ask=True,
            question="是否接受压缩路线？",
            issues=[
                {
                    "issue_type": "travel_time",
                    "description": "五天串联桂林、阳朔、涠洲岛节奏偏紧。",
                }
            ],
            recommended_adjustments=["减少一晚涠洲岛或延长至七天。"],
        )

    seen_reports: list[FeasibilityReport | None] = []

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
        preference_profile: PreferenceProfile | None = None,
        feasibility_report: FeasibilityReport | None = None,
        detail_level: str = "standard",
        service_enrichment: ServiceEnrichmentContext | None = None,
    ) -> TravelAnswer:
        seen_reports.append(feasibility_report)
        return TravelAnswer(
            answer="可以安排广西五日游，但会提示节奏偏紧。",
            highlights=[],
            warnings=["五天串联桂林、阳朔、涠洲岛节奏偏紧。"],
            citations=[],
        )

    monkeypatch.setattr(qa_service_module, "create_research_plan", fake_create_research_plan)
    monkeypatch.setattr(
        qa_service_module,
        "create_feasibility_report",
        fake_create_feasibility_report,
    )
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    service = TourismQAService(
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
        TravelQuestion(question="广州出发，广西桂林阳朔北海五天怎么玩？")
    )

    assert answer.needs_reply is False
    assert answer.session_id is None
    assert seen_reports
    assert seen_reports[0] is not None
    assert seen_reports[0].should_ask is True


@pytest.mark.asyncio
async def test_qa_backfills_missing_destination_entity(monkeypatch):
    async def fake_create_research_plan(*args, **kwargs) -> TravelResearchPlan:
        return TravelResearchPlan(
            original_question="东北七日游",
            destination="哈尔滨",
            required_entities=[
                {
                    "name": "冰雪大世界",
                    "entity_type": "attraction",
                    "evidence_use": "mainstream_attraction",
                },
            ],
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    evidence_use="route_feasibility",
                    query="北京 哈尔滨 高铁",
                    reason="route",
                ),
                TravelResearchTask(
                    task_type="risk",
                    evidence_use="risk_warning",
                    query="东北冬季安全",
                    reason="risk",
                ),
                TravelResearchTask(
                    task_type="food",
                    evidence_use="local_food",
                    query="哈尔滨 本地美食",
                    reason="food",
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

    monkeypatch.setattr(qa_service_module, "create_research_plan", fake_create_research_plan)
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    service = TourismQAService(
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

    await service.answer(TravelQuestion(question="东北七日游"))

    assert any("冰雪大世界" in query for query in seen_queries)


@pytest.mark.asyncio
async def test_complete_form_question_skips_preference_checkpoint(monkeypatch):
    async def fail_preference(*args, **kwargs):
        raise AssertionError("form completeness should skip preference checkpoint")

    async def fake_create_research_plan(*args, **kwargs) -> TravelResearchPlan:
        return TravelResearchPlan(
            original_question="山西历史人文十日游",
            destination="山西",
            trip_days=10,
            interests=["history_culture"],
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    query="山西 十日游 路线",
                    reason="路线。",
                ),
                TravelResearchTask(
                    task_type="attraction",
                    query="山西 文化遗产",
                    reason="景点。",
                ),
                TravelResearchTask(
                    task_type="food",
                    query="山西 本地美食",
                    reason="美食。",
                ),
            ],
        )

    async def fake_generate_answer_with_context(*args, **kwargs) -> TravelAnswer:
        return TravelAnswer(answer="ok", highlights=[], warnings=[], citations=[])

    monkeypatch.setattr(qa_service_module, "create_preference_decision", fail_preference)
    monkeypatch.setattr(qa_service_module, "create_research_plan", fake_create_research_plan)
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    service = TourismQAService(
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
        request_mode="normal",
        destination="山西",
        duration_days=10,
        traveler_composition={"adults": 3, "elders": 1, "children": 1},
        budget_level="luxury",
        attraction_preferences=["history_culture", "heritage"],
        detail_level="deep",
    )

    answer = await service.answer(form.to_travel_question(), form_request=form)

    assert answer.answer == "ok"


@pytest.mark.asyncio
async def test_answer_filters_unrelated_evidence_and_prefers_web_citations(
    monkeypatch,
):
    async def fake_create_research_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> TravelResearchPlan:
        return TravelResearchPlan(
            original_question=question.question,
            destination="海南岛",
            origin="郑州",
            trip_days=7,
            interests=["海口", "三亚", "万宁", "本地美食"],
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    query="海南岛 海口 三亚 万宁 七日游 东线慢游",
                    reason="规划海南路线。",
                ),
                TravelResearchTask(
                    task_type="food",
                    query="海南 海口 三亚 本地美食 文昌鸡 清补凉",
                    reason="规划海南美食。",
                ),
                TravelResearchTask(
                    task_type="booking",
                    evidence_use="official_status",
                    query="三亚 南山 天涯海角 官方 开放时间 预约",
                    reason="核验海南景区。",
                ),
            ],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
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

    class NoisyInternalRAG:
        async def retrieve(
            self, query: str, tenant_id: str, limit: int = 12
        ) -> list[TravelChunk]:
            return [
                TravelChunk(
                    id="summer-palace",
                    source_type="internal",
                    content_type="travel_guide",
                    title="颐和园按游览时长规划路线",
                    text="北京颐和园官方游览路线，可按1.5小时或2.5小时游览。",
                    source_name="internal",
                    retrieved_at=datetime.now(timezone.utc),
                    score=0.99,
                ),
                TravelChunk(
                    id="hainan-internal",
                    source_type="internal",
                    content_type="travel_guide",
                    title="海南东线七日游",
                    text="海南岛海口、万宁、三亚适合带父母七天慢游。",
                    source_name="internal",
                    retrieved_at=datetime.now(timezone.utc),
                    score=0.6,
                ),
            ]

    class HainanWebSearch:
        async def search_chinese_tourism(
            self,
            question: str,
            max_results: int,
            options: SearchOptions | None = None,
        ) -> list[TravelSearchHit]:
                return [
                    TravelSearchHit(
                        title="海南岛东线七日游网页",
                        url="https://example.cn/hainan",
                        snippet="海南旅游网页",
                        source_name="tavily",
                )
            ]

    class HainanWebpageReader:
        async def read(self, hit: TravelSearchHit) -> list[TravelChunk]:
            return [
                TravelChunk(
                    id="hainan-web",
                    source_type="web",
                    content_type="travel_guide",
                    title=hit.title,
                    text="海南岛海口、万宁、三亚适合带父母七天慢游。",
                    url=hit.url,
                    source_name=hit.source_name or "web",
                    retrieved_at=datetime.now(timezone.utc),
                    score=0.7,
                )
            ]

    monkeypatch.setattr(
        qa_service_module,
        "create_research_plan",
        fake_create_research_plan,
    )
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    reranker = FakeReranker()
    citations = FakeCitationFormatter()
    deps = TourismDeps(
        tenant_id="demo-tenant",
        internal_rag=NoisyInternalRAG(),
        web_search=HainanWebSearch(),
        webpage_reader=HainanWebpageReader(),
        reranker=reranker,
        citations=citations,
    )
    service = TourismQAService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=1,
        top_k=4,
    )

    answer = await service.answer(
        TravelQuestion(question="陪爸妈去海南岛7天，人均3000。")
    )

    assert "summer-palace" not in [chunk.id for chunk in reranker.chunks_seen]
    assert [chunk.id for chunk in citations.chunks_seen] == ["hainan-web"]
    assert answer.citations == [
        "[1] 海南岛东线七日游网页 - tavily - https://example.cn/hainan"
    ]


@pytest.mark.asyncio
async def test_answer_normalizes_fabricated_llm_citation_lines(monkeypatch):
    async def fake_create_research_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> TravelResearchPlan:
        task = TravelResearchTask(
            task_type="attraction",
            query="北京 故宫 官方",
            reason="核验景点。",
        )
        return TravelResearchPlan(
            original_question=question.question,
            destination="北京",
            tasks=[task, task, task],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
        preference_profile: PreferenceProfile | None = None,
        feasibility_report: FeasibilityReport | None = None,
        detail_level: str = "standard",
        service_enrichment: ServiceEnrichmentContext | None = None,
    ) -> TravelAnswer:
        return TravelAnswer(
            answer="故宫建议提前预约。[1]",
            highlights=[],
            warnings=[],
            citations=["[1] 模型改写来源 - fake - https://fake.example"],
        )

    class StrictCitationFormatter:
        def build(self, chunks: list[TravelChunk]) -> CitationPack:
            return CitationPack(
                context_text="[1] quote=故宫建议提前预约。",
                citations=[
                    "[1] 故宫预约说明 - 北京文旅 - https://example.cn/palace"
                ],
                evidence_quotes=[
                    EvidenceQuote(
                        citation_id=1,
                        chunk_id="web:palace",
                        source_type="web",
                        content_type="attraction",
                        title="故宫预约说明",
                        source_name="北京文旅",
                        source_ref="https://example.cn/palace",
                        quote="故宫建议提前预约。",
                        url="https://example.cn/palace",
                    )
                ],
            )

    monkeypatch.setattr(
        qa_service_module,
        "create_research_plan",
        fake_create_research_plan,
    )
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )

    service = TourismQAService(
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

    answer = await service.answer(TravelQuestion(question="北京三天怎么玩？"))

    assert answer.citations == [
        "[1] 故宫预约说明 - 北京文旅 - https://example.cn/palace"
    ]
    assert any("引用校验已自动修正" in warning for warning in answer.warnings)
    assert answer.performance is not None
    guard_stage = next(stage for stage in answer.performance.stages if stage.name == "citation_guard")
    assert guard_stage.metadata["issues"] == 1
    assert guard_stage.metadata["returned_citations"] == 1


@pytest.mark.asyncio
async def test_answer_attaches_service_enrichment_context(monkeypatch):
    async def fake_create_research_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> TravelResearchPlan:
        task = TravelResearchTask(
            task_type="route",
            query="上海 杭州 两日游 路线",
            reason="核验路线。",
        )
        return TravelResearchPlan(
            original_question=question.question,
            origin="上海",
            destination="杭州",
            tasks=[task, task, task],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
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
            diy_plan,
            research_plan: TravelResearchPlan | None,
        ) -> ServiceEnrichmentContext:
            self.calls.append((question, diy_plan, research_plan))
            return ServiceEnrichmentContext()

    monkeypatch.setattr(
        qa_service_module,
        "create_research_plan",
        fake_create_research_plan,
    )
    monkeypatch.setattr(
        qa_service_module,
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
    service = TourismQAService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=0,
        top_k=4,
        service_enrichment=enrichment,
    )

    answer = await service.answer(
        TravelQuestion(question="上海出发杭州两日游。", detail_level="deep")
    )

    assert answer.service_enrichment == ServiceEnrichmentContext()
    assert len(enrichment.calls) == 1
    assert enrichment.calls[0][1] is None
    assert enrichment.calls[0][2].destination == "杭州"


@pytest.mark.asyncio
async def test_answer_adds_fresh_web_evidence_to_allowed_citations(monkeypatch):
    async def fake_create_research_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> TravelResearchPlan:
        return TravelResearchPlan(
            original_question=question.question,
            destination="平遥",
            tasks=[
                TravelResearchTask(
                    task_type="attraction",
                    query="平遥古城 官方 开放 预约 最新",
                    reason="核验实时预约信息。",
                ),
                TravelResearchTask(
                    task_type="route",
                    query="平遥古城 交通 接驳",
                    reason="核验交通接驳。",
                ),
                TravelResearchTask(
                    task_type="accommodation",
                    query="平遥古城 住宿 区域",
                    reason="核验住宿区域。",
                ),
            ],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
        preference_profile: PreferenceProfile | None = None,
        feasibility_report: FeasibilityReport | None = None,
        detail_level: str = "standard",
        service_enrichment: ServiceEnrichmentContext | None = None,
    ) -> TravelAnswer:
        fresh_line = next(
            line for line in citation_lines if "平遥古城景区官方预约说明" in line
        )
        fresh_id = fresh_line.split("]", 1)[0].strip("[")
        assert "source_name=firecrawl" in citation_context
        return TravelAnswer(
            answer=f"平遥古城预约信息以官方网页为准。[{fresh_id}]",
            highlights=[],
            warnings=[],
            citations=citation_lines,
        )

    class FakeServiceEnrichment:
        async def enrich(
            self,
            question: TravelQuestion,
            diy_plan,
            research_plan: TravelResearchPlan | None,
        ) -> ServiceEnrichmentContext:
            return ServiceEnrichmentContext(
                fresh_web_evidence=[
                    FreshWebEvidence(
                        provider="firecrawl",
                        query="平遥古城 官方 开放 预约 最新",
                        title="平遥古城景区官方预约说明",
                        url="https://example.cn/pingyao-booking",
                        summary="平遥古城预约信息以官方网页为准。",
                        source_authority="official",
                        recency_label="recent",
                    )
                ]
            )

    monkeypatch.setattr(
        qa_service_module,
        "create_research_plan",
        fake_create_research_plan,
    )
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )
    service = TourismQAService(
        deps=TourismDeps(
            tenant_id="demo-tenant",
            internal_rag=FakeInternalRAG(),
            web_search=FakeWebSearch(),
            webpage_reader=FakeWebpageReader(),
            reranker=FakeReranker(),
            citations=CitationFormatter(),
        ),
        merger=TravelChunkMergeService(),
        max_pages_to_read=0,
        top_k=1,
        service_enrichment=FakeServiceEnrichment(),
    )

    answer = await service.answer(
        TravelQuestion(question="平遥古城怎么预约？", detail_level="deep")
    )

    assert answer.citations == [
        line for line in answer.citations if "平遥古城景区官方预约说明" in line
    ]
    assert answer.citations[0].endswith("https://example.cn/pingyao-booking")


@pytest.mark.asyncio
async def test_answer_adds_topic_evidence_bundle_to_final_context(monkeypatch):
    captured_context = ""

    async def fake_create_research_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> TravelResearchPlan:
        return TravelResearchPlan(
            original_question=question.question,
            destination="北京",
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    evidence_use="route_feasibility",
                    query="北京三日游路线",
                    reason="路线证据。",
                ),
                TravelResearchTask(
                    task_type="food",
                    evidence_use="local_food",
                    query="北京本地美食",
                    reason="美食证据。",
                ),
                TravelResearchTask(
                    task_type="accommodation",
                    evidence_use="hotel_zone",
                    query="北京住宿片区",
                    reason="住宿证据。",
                ),
            ],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
        preference_profile: PreferenceProfile | None = None,
        feasibility_report: FeasibilityReport | None = None,
        detail_level: str = "standard",
        service_enrichment: ServiceEnrichmentContext | None = None,
    ) -> TravelAnswer:
        nonlocal captured_context
        captured_context = citation_context
        return TravelAnswer(
            answer="ok [1]",
            highlights=[],
            warnings=[],
            citations=citation_lines,
        )

    monkeypatch.setattr(
        qa_service_module,
        "create_research_plan",
        fake_create_research_plan,
    )
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )

    service = TourismQAService(
        deps=TourismDeps(
            tenant_id="demo-tenant",
            internal_rag=FakeInternalRAG(),
            web_search=FakeWebSearch(),
            webpage_reader=FakeWebpageReader(),
            reranker=FakeReranker(),
            citations=CitationFormatter(),
        ),
        merger=TravelChunkMergeService(),
        max_pages_to_read=0,
        top_k=4,
    )

    await service.answer(
        TravelQuestion(
            question="北京三天怎么玩，想吃本地美食。",
            detail_level="standard",
        )
    )

    assert "专题证据包" in captured_context
    assert "category=food" in captured_context
    assert "category=accommodation" in captured_context


@pytest.mark.asyncio
async def test_final_answer_cannot_request_reply_without_session(monkeypatch):
    async def fake_create_research_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> TravelResearchPlan:
        return TravelResearchPlan(
            original_question=question.question,
            destination="成都、重庆",
            tasks=[
                TravelResearchTask(
                    task_type="food",
                    query="成都 重庆 本地美食",
                    reason="测试美食证据。",
                ),
                TravelResearchTask(
                    task_type="route",
                    query="成都 重庆 六天 路线",
                    reason="测试路线证据。",
                ),
                TravelResearchTask(
                    task_type="attraction",
                    query="成都 重庆 轻松 景点",
                    reason="测试景点证据。",
                ),
            ],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
        preference_profile: PreferenceProfile | None = None,
        feasibility_report: FeasibilityReport | None = None,
        detail_level: str = "standard",
        service_enrichment: ServiceEnrichmentContext | None = None,
    ) -> TravelAnswer:
        return TravelAnswer(
            answer="成都重庆美食路线。",
            highlights=[],
            warnings=[],
            citations=[],
            needs_reply=True,
        )

    monkeypatch.setattr(
        qa_service_module,
        "create_research_plan",
        fake_create_research_plan,
    )
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )

    service = TourismQAService(
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

    answer = await service.answer(TravelQuestion(question="成都重庆六天美食路线。"))

    assert answer.needs_reply is False
    assert answer.session_id is None


@pytest.mark.asyncio
async def test_typed_concise_short_question_skips_preference_and_feasibility(
    monkeypatch,
):
    async def fail_preference(*args, **kwargs):
        raise AssertionError("preference checkpoint should be skipped")

    async def fail_feasibility(*args, **kwargs):
        raise AssertionError("feasibility checkpoint should be skipped")

    async def fake_intent(
        question: TravelQuestion,
        request_mode: str,
    ) -> IntentDecision:
        return IntentDecision(
            request_mode=request_mode,
            intent="conventional_itinerary",
            reason="general endpoint still uses typed intent checkpoint.",
        )

    async def fake_create_research_plan(
        question: TravelQuestion,
        preference_profile: PreferenceProfile | None = None,
        intent_decision: IntentDecision | None = None,
    ) -> TravelResearchPlan:
        assert intent_decision is not None
        assert preference_profile is not None
        return TravelResearchPlan(
            original_question=question.question,
            destination="北京",
            trip_days=3,
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    query="北京 三天 路线",
                    reason="测试路线。",
                ),
                TravelResearchTask(
                    task_type="attraction",
                    query="北京 故宫 天坛",
                    reason="测试景点。",
                ),
                TravelResearchTask(
                    task_type="food",
                    query="北京 本地小吃",
                    reason="测试美食。",
                ),
            ],
        )

    async def fake_generate_answer_with_context(
        question: str,
        citation_context: str,
        citation_lines: list[str],
        deps: TourismDeps,
        research_plan: TravelResearchPlan | None = None,
        diy_plan=None,
        preference_profile: PreferenceProfile | None = None,
        feasibility_report: FeasibilityReport | None = None,
        detail_level: str = "standard",
        service_enrichment: ServiceEnrichmentContext | None = None,
    ) -> TravelAnswer:
        assert detail_level == "concise"
        return TravelAnswer(
            answer="北京三天简洁路线。",
            highlights=[],
            warnings=[],
            citations=[],
        )

    monkeypatch.setattr(qa_service_module, "create_intent_decision", fake_intent)
    monkeypatch.setattr(qa_service_module, "create_preference_decision", fail_preference)
    monkeypatch.setattr(qa_service_module, "create_feasibility_report", fail_feasibility)
    monkeypatch.setattr(qa_service_module, "create_research_plan", fake_create_research_plan)
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )

    service = TourismQAService(
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
            question="请规划旅行。",
            destination="北京",
            start_date=date(2026, 6, 1),
            end_date=date(2026, 6, 3),
            travelers=2,
            detail_level="concise",
        )
    )

    assert answer.answer == "北京三天简洁路线。"


@pytest.mark.asyncio
async def test_normal_endpoint_uses_intent_without_blocking_obvious_diy_text(
    monkeypatch,
):
    calls = {"intent": 0}

    async def fake_intent(
        question: TravelQuestion,
        request_mode: str,
    ) -> IntentDecision:
        calls["intent"] += 1
        return IntentDecision(
            request_mode="general",
            intent="diy_itinerary",
            should_redirect=True,
            recommended_endpoint="/tourism/itineraries/diy",
            reason="用户请求自定义主题路线。",
        )

    monkeypatch.setattr(qa_service_module, "create_intent_decision", fake_intent)

    async def fake_create_research_plan(*args, **kwargs) -> TravelResearchPlan:
        return TravelResearchPlan(
            original_question="我想做一条三国历史巡礼，必须覆盖涿州、许昌、成都。",
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    evidence_use="route_feasibility",
                    query="三国历史巡礼 路线",
                    reason="验证不会被端点重定向阻塞。",
                    max_results=2,
                ),
                TravelResearchTask(
                    task_type="attraction",
                    evidence_use="mainstream_attraction",
                    query="涿州 许昌 成都 三国 景点",
                    reason="验证景点任务仍然执行。",
                    max_results=2,
                ),
                TravelResearchTask(
                    task_type="transport",
                    evidence_use="route_feasibility",
                    query="涿州 许昌 成都 高铁 包车",
                    reason="验证交通任务仍然执行。",
                    max_results=2,
                ),
            ]
        )

    async def fake_generate_answer_with_context(*args, **kwargs) -> TravelAnswer:
        return TravelAnswer(
            answer="已继续生成三国历史巡礼方案。",
            highlights=[],
            warnings=[],
            citations=[],
        )

    monkeypatch.setattr(
        qa_service_module,
        "create_research_plan",
        fake_create_research_plan,
    )
    monkeypatch.setattr(
        qa_service_module,
        "generate_answer_with_context",
        fake_generate_answer_with_context,
    )

    service = TourismQAService(
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
        TravelQuestion(question="我想做一条三国历史巡礼，必须覆盖涿州、许昌、成都。")
    )

    assert calls["intent"] == 1
    assert "三国历史巡礼方案" in answer.answer
    assert "/tourism/itineraries/diy" not in answer.answer

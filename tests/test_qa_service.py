from datetime import datetime, timezone

import pytest

from huaxia_tourismrag.agents.tourism_agent import TourismDeps
from huaxia_tourismrag.schemas.evidence import (
    CitationPack,
    TravelAnswer,
    TravelChunk,
    TravelQuestion,
    TravelSearchHit,
)
from huaxia_tourismrag.schemas.research import TravelResearchPlan, TravelResearchTask
from huaxia_tourismrag.schemas.search import SearchOptions
from huaxia_tourismrag.schemas.travel_checkpoints import (
    ClarificationDecision,
    FeasibilityReport,
    IntentDecision,
    PreferenceProfile,
)
from huaxia_tourismrag.services.evidence_merge import TravelChunkMergeService
from huaxia_tourismrag.services import qa_service as qa_service_module
from huaxia_tourismrag.services.qa_service import TourismQAService
from huaxia_tourismrag.services.session_store import InMemoryTravelSessionStore


class FakeInternalRAG:
    def __init__(self) -> None:
        self.queries: list[str] = []

    async def retrieve(self, query: str, tenant_id: str) -> list[TravelChunk]:
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
        "成都 大理 丽江 住宿区域 推荐 第一次去",
        "成都 云南 十日游 代表美食 火锅 米线 菌菇 本地推荐",
    ]
    assert web_search.requests == [
        (
            "四川云南十日游 成都 昆明 大理 丽江 路线 不赶路",
            4,
            SearchOptions(source_preference="mixed"),
        ),
        (
            "成都 大理 丽江 住宿区域 推荐 第一次去",
            2,
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
    ]
    assert webpage_reader.urls == ["https://example.com/1", "https://example.com/2"]
    assert final_plan is not None
    assert final_plan.destination == "四川、云南"
    assert reranker.top_k_values == [4]


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
        "山西豪华酒店 太原 大同 平遥",
        "山西特色美食 高端餐厅",
        "云冈石窟 五台山 平遥古城",
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
                    query="太原 本地面馆 老字号 近期",
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
                    query="太原 本地美食 老字号",
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
        "太原 本地美食 老字号",
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
    ) -> TravelAnswer:
        return TravelAnswer(
            answer="ok",
            highlights=[],
            warnings=[],
            citations=citation_lines,
        )

    class NoisyInternalRAG:
        async def retrieve(self, query: str, tenant_id: str) -> list[TravelChunk]:
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
                    title="海南东线七日游网页",
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
        "[1] 海南东线七日游网页 - tavily - https://example.cn/hainan"
    ]

# Destination Evidence Optimisation V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make conventional itinerary answers use destination-specific attraction, food, route, and booking evidence before policy evidence, while keeping citation faithfulness and reducing deep-job latency.

**Architecture:** Keep the system DTO-driven: no regex triggers and no behavior-critical keyword lists. Add structured destination entities to the research plan, measure evidence coverage by entity and evidence use, backfill only missing coverage, and budget final context by source fit so policy/legal/railway documents cannot dominate scenic or food claims.

**Tech Stack:** Python 3.11, Pydantic DTOs, FastAPI services, Qdrant/internal RAG, web search/page reader abstractions, Streamlit frontend tests, pytest, ruff.

---

## Evidence From Four-Prompt Smoke Test

The four live prompts all completed and citation IDs matched returned citation lines:

| Prompt | Runtime | needs_reply | Citation IDs | Main Failure Mode |
|---|---:|---:|---:|---|
| 广西计划 | 76.7s | false | matched | Useful feasibility warnings, but answer relied on limited route evidence and did not produce enough day-by-day destination confidence. |
| 贵州计划 | 64.3s | false | matched | Policy/railway citations dominated budget and safety claims; destination-specific Huangguoshu/Xiaoqikong/Xijiang evidence was too weak. |
| 东北计划 | 68.2s | false | matched | Missing current Ice World/Yabuli/Xuexiang evidence; answer admitted missing official/opening/price evidence. |
| 新疆计划 | 76.4s | false | matched | Correctly identified route overload, but needs stronger map/route-distance evidence and better adjusted itinerary output. |

The next optimisation should not change the checkpoint fix. The problem is evidence selection and final-context composition, not session routing.

## File Structure

- Modify: `src/huaxia_tourismrag/schemas/research.py`
  - Add structured destination entities and coverage intent to `TravelResearchPlan`.
- Create: `src/huaxia_tourismrag/schemas/evidence_coverage.py`
  - DTOs for entity coverage, source-fit classification, and backfill requests.
- Create: `src/huaxia_tourismrag/services/evidence_source_policy.py`
  - DTO-enum source compatibility rules using `ResearchTaskType`, `EvidenceUse`, and `ContentType`.
- Create: `src/huaxia_tourismrag/services/evidence_coverage.py`
  - Builds coverage reports from retrieved chunks and research-plan entities.
- Modify: `src/huaxia_tourismrag/services/evidence_retrieval_orchestrator.py`
  - Add bounded backfill retrieval for missing destination evidence.
- Modify: `src/huaxia_tourismrag/services/context_budgeter.py`
  - Preserve balanced evidence quotas by evidence use and source fit.
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
  - Run coverage report, targeted backfill, and source-fit budgeting before final LLM generation.
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
  - Apply the same evidence coverage pipeline for DIY routes.
- Modify: `src/huaxia_tourismrag/agents/research_planner.py`
  - Require planner to return structured destination entities.
- Modify: `src/huaxia_tourismrag/agents/tourism_agent.py`
  - Add final-answer rules that scenic/food claims must cite destination/scenic/food evidence, not policy sources.
- Modify: `src/huaxia_tourismrag/tools/citation_guard.py`
  - Surface source-fit warnings when answer uses policy citations for scenic/food claims.
- Create: `evals/destination_evidence_cases.json`
  - Four smoke prompts and expected coverage checks.
- Create: `tests/test_evidence_source_policy.py`
- Create: `tests/test_evidence_coverage.py`
- Modify: `tests/test_qa_service.py`
- Modify: `tests/test_diy_itinerary_service.py`
- Modify: `tests/test_tourism_agent.py`
- Modify: `tests/test_citation_guard.py`

---

### Task 1: Add Structured Destination Entities To Research Plans

**Files:**
- Modify: `src/huaxia_tourismrag/schemas/research.py`
- Modify: `tests/test_research_planner.py`

- [ ] **Step 1: Write failing schema test**

Add to `tests/test_research_planner.py`:

```python
from huaxia_tourismrag.schemas.research import ResearchEntity, TravelResearchPlan, TravelResearchTask


def test_research_plan_accepts_structured_destination_entities() -> None:
    plan = TravelResearchPlan(
        original_question="广州出发广西五日游",
        destination="广西",
        origin="广州",
        trip_days=5,
        required_entities=[
            ResearchEntity(name="桂林", entity_type="city", evidence_use="mainstream_attraction"),
            ResearchEntity(name="漓江", entity_type="attraction", evidence_use="mainstream_attraction"),
            ResearchEntity(name="遇龙河骑行", entity_type="activity", evidence_use="mainstream_attraction"),
            ResearchEntity(name="涠洲岛", entity_type="attraction", evidence_use="mainstream_attraction"),
            ResearchEntity(name="海鲜", entity_type="food", evidence_use="local_food"),
        ],
        tasks=[
            TravelResearchTask(task_type="route", query="广州 广西 桂林 阳朔 北海 路线", reason="route"),
            TravelResearchTask(task_type="attraction", query="桂林 漓江 阳朔 涠洲岛 景点", reason="attraction"),
            TravelResearchTask(task_type="food", query="北海 涠洲岛 海鲜 本地美食", reason="food"),
        ],
    )

    assert [entity.name for entity in plan.required_entities] == [
        "桂林",
        "漓江",
        "遇龙河骑行",
        "涠洲岛",
        "海鲜",
    ]
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest tests/test_research_planner.py::test_research_plan_accepts_structured_destination_entities -q
```

Expected: FAIL because `ResearchEntity` or `required_entities` does not exist.

- [ ] **Step 3: Add DTOs**

Modify `src/huaxia_tourismrag/schemas/research.py`:

```python
ResearchEntityType = Literal[
    "city",
    "attraction",
    "activity",
    "food",
    "accommodation_area",
    "transport_hub",
    "risk",
]


class ResearchEntity(BaseModel):
    """Structured destination item that retrieved evidence should cover."""

    name: str = Field(min_length=1, max_length=120)

    entity_type: ResearchEntityType

    evidence_use: EvidenceUse

    optional: bool = False
```

Add this field to `TravelResearchPlan`:

```python
required_entities: list[ResearchEntity] = Field(default_factory=list, max_length=24)
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
uv run pytest tests/test_research_planner.py::test_research_plan_accepts_structured_destination_entities -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/schemas/research.py tests/test_research_planner.py
git commit -m "feat: add research plan destination entities"
```

---

### Task 2: Teach The Research Planner To Emit Entities

**Files:**
- Modify: `src/huaxia_tourismrag/agents/research_planner.py`
- Modify: `tests/test_research_planner.py`

- [ ] **Step 1: Write failing prompt contract test**

Add to `tests/test_research_planner.py`:

```python
from huaxia_tourismrag.agents.research_planner import _build_research_plan_prompt
from huaxia_tourismrag.schemas.evidence import TravelQuestion


def test_research_planner_prompt_requires_destination_entities() -> None:
    prompt = _build_research_plan_prompt(
        TravelQuestion(question="贵州六日游，黄果树、小七孔、西江苗寨"),
        preference_profile=None,
        intent_decision=None,
    )

    assert "required_entities" in prompt
    assert "entity_type" in prompt
    assert "evidence_use" in prompt
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest tests/test_research_planner.py::test_research_planner_prompt_requires_destination_entities -q
```

Expected: FAIL if the prompt does not mention `required_entities`.

- [ ] **Step 3: Update planner prompt**

In `src/huaxia_tourismrag/agents/research_planner.py`, add these instructions to the planner prompt:

```python
"""
required_entities:
- Extract structured destination entities from the request.
- Include cities, named attractions, named activities, local food experiences, accommodation zones, and transport hubs when they are central to the route.
- Each entity must use DTO enum values only:
  entity_type: city | attraction | activity | food | accommodation_area | transport_hub | risk
  evidence_use: official_status | route_feasibility | mainstream_attraction | hidden_gem | local_food | hotel_zone | risk_warning
- Do not infer private/contact information.
- Do not add broad generic entities when a named entity exists.
"""
```

- [ ] **Step 4: Run planner prompt test**

Run:

```bash
uv run pytest tests/test_research_planner.py::test_research_planner_prompt_requires_destination_entities -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/agents/research_planner.py tests/test_research_planner.py
git commit -m "feat: require structured destination entities in planner"
```

---

### Task 3: Add DTO-Based Source Compatibility Policy

**Files:**
- Create: `src/huaxia_tourismrag/services/evidence_source_policy.py`
- Create: `tests/test_evidence_source_policy.py`

- [ ] **Step 1: Write failing policy tests**

Create `tests/test_evidence_source_policy.py`:

```python
from huaxia_tourismrag.services.evidence_source_policy import source_fit_for_task


def test_policy_sources_do_not_fit_scenic_or_food_claims() -> None:
    assert source_fit_for_task(
        task_type="attraction",
        evidence_use="mainstream_attraction",
        content_type="railway",
    ).is_primary is False
    assert source_fit_for_task(
        task_type="food",
        evidence_use="local_food",
        content_type="legal",
    ).is_primary is False


def test_destination_sources_fit_scenic_and_food_claims() -> None:
    assert source_fit_for_task(
        task_type="attraction",
        evidence_use="mainstream_attraction",
        content_type="attraction",
    ).is_primary is True
    assert source_fit_for_task(
        task_type="food",
        evidence_use="local_food",
        content_type="local_cuisine",
    ).is_primary is True


def test_policy_sources_fit_risk_and_transport_claims() -> None:
    assert source_fit_for_task(
        task_type="risk",
        evidence_use="risk_warning",
        content_type="tourism_safety",
    ).is_primary is True
    assert source_fit_for_task(
        task_type="transport",
        evidence_use="route_feasibility",
        content_type="railway",
    ).is_primary is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
uv run pytest tests/test_evidence_source_policy.py -q
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement DTO-enum policy**

Create `src/huaxia_tourismrag/services/evidence_source_policy.py`:

```python
"""DTO-enum source compatibility policy for itinerary evidence."""

from pydantic import BaseModel

from huaxia_tourismrag.schemas.evidence import ContentType
from huaxia_tourismrag.schemas.research import EvidenceUse, ResearchTaskType


class SourceFit(BaseModel):
    """Compatibility result between a chunk content type and a research task."""

    is_primary: bool
    is_supporting: bool
    reason: str


PRIMARY_CONTENT_TYPES: dict[EvidenceUse, set[ContentType]] = {
    "official_status": {"attraction", "destination", "scenic_quality", "travel_guide"},
    "route_feasibility": {"transport", "railway", "aviation", "road_transport", "maps", "travel_guide"},
    "mainstream_attraction": {"attraction", "destination", "heritage_site", "activity", "travel_guide"},
    "hidden_gem": {"attraction", "destination", "heritage_site", "activity", "travel_guide"},
    "local_food": {"local_cuisine", "local_specialty", "travel_guide"},
    "hotel_zone": {"accommodation", "destination", "travel_guide"},
    "risk_warning": {"tourism_safety", "regulation", "legal", "travel_guide", "transport"},
}

SUPPORTING_CONTENT_TYPES: dict[ResearchTaskType, set[ContentType]] = {
    "route": {"transport", "railway", "aviation", "road_transport", "maps", "travel_guide"},
    "attraction": {"destination", "travel_guide", "scenic_quality"},
    "food": {"destination", "travel_guide"},
    "accommodation": {"destination", "travel_guide"},
    "transport": {"regulation", "legal", "tourism_safety"},
    "booking": {"regulation", "legal", "tourism_safety", "travel_guide"},
    "risk": {"regulation", "legal", "tourism_safety", "transport"},
}


def source_fit_for_task(
    *,
    task_type: ResearchTaskType,
    evidence_use: EvidenceUse,
    content_type: ContentType,
) -> SourceFit:
    """Return whether a chunk content type can support a task claim."""

    if content_type in PRIMARY_CONTENT_TYPES[evidence_use]:
        return SourceFit(
            is_primary=True,
            is_supporting=True,
            reason="content_type is primary for evidence_use",
        )
    if content_type in SUPPORTING_CONTENT_TYPES[task_type]:
        return SourceFit(
            is_primary=False,
            is_supporting=True,
            reason="content_type supports task_type but is not primary evidence",
        )
    return SourceFit(
        is_primary=False,
        is_supporting=False,
        reason="content_type does not support task_type or evidence_use",
    )
```

- [ ] **Step 4: Run policy tests**

Run:

```bash
uv run pytest tests/test_evidence_source_policy.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/services/evidence_source_policy.py tests/test_evidence_source_policy.py
git commit -m "feat: add DTO source compatibility policy"
```

---

### Task 4: Add Evidence Coverage Reports

**Files:**
- Create: `src/huaxia_tourismrag/schemas/evidence_coverage.py`
- Create: `src/huaxia_tourismrag/services/evidence_coverage.py`
- Create: `tests/test_evidence_coverage.py`

- [ ] **Step 1: Write failing coverage tests**

Create `tests/test_evidence_coverage.py`:

```python
from datetime import datetime, timezone

from huaxia_tourismrag.schemas.evidence import TravelChunk
from huaxia_tourismrag.schemas.research import ResearchEntity, TravelResearchPlan, TravelResearchTask
from huaxia_tourismrag.services.evidence_coverage import build_evidence_coverage_report


def _chunk(chunk_id: str, title: str, text: str, content_type: str) -> TravelChunk:
    return TravelChunk(
        id=chunk_id,
        source_type="internal",
        content_type=content_type,
        title=title,
        text=text,
        source_name="test",
        retrieved_at=datetime.now(timezone.utc),
        score=0.8,
    )


def test_coverage_reports_missing_destination_entities() -> None:
    plan = TravelResearchPlan(
        original_question="贵州六日游",
        destination="贵州",
        required_entities=[
            ResearchEntity(name="黄果树瀑布", entity_type="attraction", evidence_use="mainstream_attraction"),
            ResearchEntity(name="长桌宴", entity_type="food", evidence_use="local_food"),
        ],
        tasks=[
            TravelResearchTask(task_type="attraction", evidence_use="mainstream_attraction", query="黄果树瀑布", reason="景点"),
            TravelResearchTask(task_type="food", evidence_use="local_food", query="长桌宴", reason="美食"),
            TravelResearchTask(task_type="route", evidence_use="route_feasibility", query="贵州六日路线", reason="路线"),
        ],
    )
    chunks = [_chunk("huangguoshu", "黄果树瀑布", "黄果树瀑布适合贵州经典行程。", "attraction")]

    report = build_evidence_coverage_report(plan, chunks)

    assert report.covered_entity_names == ["黄果树瀑布"]
    assert report.missing_entity_names == ["长桌宴"]
    assert report.has_primary_destination_coverage is False


def test_policy_chunks_do_not_cover_attraction_entities() -> None:
    plan = TravelResearchPlan(
        original_question="东北七日游",
        destination="黑龙江",
        required_entities=[
            ResearchEntity(name="冰雪大世界", entity_type="attraction", evidence_use="mainstream_attraction"),
        ],
        tasks=[
            TravelResearchTask(task_type="attraction", evidence_use="mainstream_attraction", query="冰雪大世界", reason="景点"),
            TravelResearchTask(task_type="route", evidence_use="route_feasibility", query="北京 哈尔滨 高铁", reason="交通"),
            TravelResearchTask(task_type="risk", evidence_use="risk_warning", query="东北 冬季 安全", reason="风险"),
        ],
    )
    chunks = [_chunk("railway", "铁路旅客运输规程", "铁路实名制与退改签规则。", "railway")]

    report = build_evidence_coverage_report(plan, chunks)

    assert report.covered_entity_names == []
    assert report.missing_entity_names == ["冰雪大世界"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
uv run pytest tests/test_evidence_coverage.py -q
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Add coverage DTOs**

Create `src/huaxia_tourismrag/schemas/evidence_coverage.py`:

```python
"""Evidence coverage DTOs for destination-specific RAG quality."""

from pydantic import BaseModel, Field

from huaxia_tourismrag.schemas.research import EvidenceUse, ResearchEntityType


class EntityEvidenceCoverage(BaseModel):
    """Coverage for one structured research entity."""

    entity_name: str = Field(min_length=1, max_length=120)
    entity_type: ResearchEntityType
    evidence_use: EvidenceUse
    primary_chunk_ids: list[str] = Field(default_factory=list, max_length=12)
    supporting_chunk_ids: list[str] = Field(default_factory=list, max_length=12)

    @property
    def is_covered(self) -> bool:
        return bool(self.primary_chunk_ids)


class EvidenceCoverageReport(BaseModel):
    """Coverage summary used to decide targeted backfill and context budgeting."""

    entities: list[EntityEvidenceCoverage] = Field(default_factory=list, max_length=24)

    @property
    def covered_entity_names(self) -> list[str]:
        return [entity.entity_name for entity in self.entities if entity.is_covered]

    @property
    def missing_entity_names(self) -> list[str]:
        return [entity.entity_name for entity in self.entities if not entity.is_covered]

    @property
    def has_primary_destination_coverage(self) -> bool:
        return bool(self.entities) and not self.missing_entity_names
```

- [ ] **Step 4: Implement coverage builder**

Create `src/huaxia_tourismrag/services/evidence_coverage.py`:

```python
"""Destination evidence coverage calculation."""

from huaxia_tourismrag.schemas.evidence import ContentType, TravelChunk
from huaxia_tourismrag.schemas.evidence_coverage import (
    EntityEvidenceCoverage,
    EvidenceCoverageReport,
)
from huaxia_tourismrag.schemas.research import ResearchEntity, TravelResearchPlan
from huaxia_tourismrag.services.evidence_source_policy import source_fit_for_task


def build_evidence_coverage_report(
    plan: TravelResearchPlan,
    chunks: list[TravelChunk],
) -> EvidenceCoverageReport:
    """Build destination entity coverage from structured plan entities and chunks."""

    entities = [
        _coverage_for_entity(entity, plan, chunks)
        for entity in plan.required_entities
        if not entity.optional
    ]
    return EvidenceCoverageReport(entities=entities)


def _coverage_for_entity(
    entity: ResearchEntity,
    plan: TravelResearchPlan,
    chunks: list[TravelChunk],
) -> EntityEvidenceCoverage:
    primary_ids: list[str] = []
    supporting_ids: list[str] = []
    task_type = _task_type_for_entity(entity)
    for chunk in chunks:
        if not _chunk_mentions_entity(chunk, entity.name):
            continue
        fit = source_fit_for_task(
            task_type=task_type,
            evidence_use=entity.evidence_use,
            content_type=chunk.content_type,
        )
        if fit.is_primary:
            primary_ids.append(chunk.id)
        elif fit.is_supporting:
            supporting_ids.append(chunk.id)
    return EntityEvidenceCoverage(
        entity_name=entity.name,
        entity_type=entity.entity_type,
        evidence_use=entity.evidence_use,
        primary_chunk_ids=primary_ids[:12],
        supporting_chunk_ids=supporting_ids[:12],
    )


def _task_type_for_entity(entity: ResearchEntity):
    if entity.entity_type == "food":
        return "food"
    if entity.entity_type == "accommodation_area":
        return "accommodation"
    if entity.entity_type == "transport_hub":
        return "transport"
    if entity.entity_type == "risk":
        return "risk"
    return "attraction"


def _chunk_mentions_entity(chunk: TravelChunk, entity_name: str) -> bool:
    haystack = f"{chunk.title}\n{chunk.text}"
    return entity_name in haystack
```

- [ ] **Step 5: Run coverage tests**

Run:

```bash
uv run pytest tests/test_evidence_coverage.py -q
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/huaxia_tourismrag/schemas/evidence_coverage.py src/huaxia_tourismrag/services/evidence_coverage.py tests/test_evidence_coverage.py
git commit -m "feat: add destination evidence coverage reports"
```

---

### Task 5: Add Targeted Backfill For Missing Entities

**Files:**
- Modify: `src/huaxia_tourismrag/services/evidence_retrieval_orchestrator.py`
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
- Test: `tests/test_qa_service.py`, `tests/test_diy_itinerary_service.py`

- [ ] **Step 1: Write failing QA backfill test**

Add to `tests/test_qa_service.py`:

```python
@pytest.mark.asyncio
async def test_qa_backfills_missing_destination_entity(monkeypatch):
    async def fake_create_research_plan(*args, **kwargs) -> TravelResearchPlan:
        return TravelResearchPlan(
            original_question="东北七日游",
            destination="哈尔滨",
            required_entities=[
                {"name": "冰雪大世界", "entity_type": "attraction", "evidence_use": "mainstream_attraction"},
            ],
            tasks=[
                TravelResearchTask(task_type="route", evidence_use="route_feasibility", query="北京 哈尔滨 高铁", reason="route"),
                TravelResearchTask(task_type="risk", evidence_use="risk_warning", query="东北冬季安全", reason="risk"),
                TravelResearchTask(task_type="food", evidence_use="local_food", query="哈尔滨 本地美食", reason="food"),
            ],
        )

    seen_queries: list[str] = []

    class BackfillWebSearch(FakeWebSearch):
        async def search_chinese_tourism(self, question, max_results, options=None):
            seen_queries.append(question)
            return await super().search_chinese_tourism(question, max_results, options)

    async def fake_generate_answer_with_context(*args, **kwargs) -> TravelAnswer:
        return TravelAnswer(answer="ok", highlights=[], warnings=[], citations=[])

    monkeypatch.setattr(qa_service_module, "create_research_plan", fake_create_research_plan)
    monkeypatch.setattr(qa_service_module, "generate_answer_with_context", fake_generate_answer_with_context)
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
        max_pages_to_read=0,
        top_k=4,
    )

    await service.answer(TravelQuestion(question="东北七日游"))

    assert any("冰雪大世界" in query for query in seen_queries)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest tests/test_qa_service.py::test_qa_backfills_missing_destination_entity -q
```

Expected: FAIL because no targeted backfill happens.

- [ ] **Step 3: Add orchestrator method**

Add to `EvidenceRetrievalOrchestrator`:

```python
async def retrieve_entity_backfill(
    self,
    *,
    entities: list[ResearchEntity],
    tenant_id: str,
    budget: RetrievalBudget,
    internal_rag,
    web_search,
    webpage_reader,
) -> EvidenceRetrievalResult:
    tasks = [
        TravelResearchTask(
            task_type=_task_type_for_entity(entity),
            evidence_use=entity.evidence_use,
            query=entity.name,
            reason=f"Backfill evidence for structured entity: {entity.name}",
            max_results=min(3, budget.max_search_results_per_task),
            freshness_required=False,
            source_preference="mixed",
        )
        for entity in entities[: budget.max_tasks]
    ]
    return await self.retrieve(
        tasks=tasks,
        tenant_id=tenant_id,
        budget=budget,
        internal_rag=internal_rag,
        web_search=web_search,
        webpage_reader=webpage_reader,
        retrieval_cache=self.retrieval_cache,
    )
```

Use the same `_task_type_for_entity` logic as `services/evidence_coverage.py` or import it if made public.

- [ ] **Step 4: Wire coverage plus backfill for QA service**

In `qa_service.py`, after initial retrieval and merge/filter but before final reranking:

```python
coverage_report = build_evidence_coverage_report(research_plan, merged)
missing_entities = [
    entity
    for entity in research_plan.required_entities
    if entity.name in coverage_report.missing_entity_names
]
if missing_entities and budget.max_pages_to_read > 0:
    backfill_result = await self.retrieval_orchestrator.retrieve_entity_backfill(
        entities=missing_entities,
        tenant_id=self.deps.tenant_id,
        budget=budget,
        internal_rag=self.deps.internal_rag,
        web_search=self.deps.web_search,
        webpage_reader=self.deps.webpage_reader,
    )
    merged = self.merger.merge(
        merged,
        backfill_result.internal_chunks + backfill_result.web_chunks,
    )
```

- [ ] **Step 5: Run QA backfill test**

Run:

```bash
uv run pytest tests/test_qa_service.py::test_qa_backfills_missing_destination_entity -q
```

Expected: PASS.

- [ ] **Step 6: Add DIY backfill test and wire same service path**

Add equivalent test to `tests/test_diy_itinerary_service.py` using a DIY route entity like `赤壁古战场`, then wire the same coverage/backfill logic after DIY initial retrieval.

Run:

```bash
uv run pytest tests/test_diy_itinerary_service.py::test_diy_backfills_missing_destination_entity -q
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/huaxia_tourismrag/services/evidence_retrieval_orchestrator.py src/huaxia_tourismrag/services/qa_service.py src/huaxia_tourismrag/services/diy_itinerary_service.py tests/test_qa_service.py tests/test_diy_itinerary_service.py
git commit -m "feat: backfill missing destination evidence"
```

---

### Task 6: Budget Context By Evidence Fit

**Files:**
- Modify: `src/huaxia_tourismrag/services/context_budgeter.py`
- Test: `tests/test_context_budgeter.py`

- [ ] **Step 1: Write failing context budgeter test**

Add to `tests/test_context_budgeter.py`:

```python
from huaxia_tourismrag.schemas.evidence import CitationPack, EvidenceQuote
from huaxia_tourismrag.services.context_budgeter import ContextBudgeter


def test_context_budgeter_keeps_destination_quotes_before_policy_quotes() -> None:
    pack = CitationPack(
        context_text="",
        citations=["[1] railway", "[2] attraction", "[3] food", "[4] legal"],
        evidence_quotes=[
            EvidenceQuote(citation_id=1, source_ref="internal:rail", quote="铁路规则", source_type="internal", content_type="railway", source_name="rail"),
            EvidenceQuote(citation_id=2, source_ref="internal:attr", quote="黄果树瀑布景区", source_type="internal", content_type="attraction", source_name="attr"),
            EvidenceQuote(citation_id=3, source_ref="internal:food", quote="苗寨长桌宴", source_type="internal", content_type="local_cuisine", source_name="food"),
            EvidenceQuote(citation_id=4, source_ref="internal:legal", quote="旅游法规则", source_type="internal", content_type="legal", source_name="legal"),
        ],
    )

    trimmed = ContextBudgeter(max_quotes_by_detail={"standard": 2}).trim(pack, "standard")

    assert [quote.citation_id for quote in trimmed.evidence_quotes] == [2, 3]
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest tests/test_context_budgeter.py::test_context_budgeter_keeps_destination_quotes_before_policy_quotes -q
```

Expected: FAIL because current trimming does not prioritize destination quotes.

- [ ] **Step 3: Add quote priority method**

In `context_budgeter.py`:

```python
DESTINATION_CONTENT_TYPES = {
    "destination",
    "attraction",
    "heritage_site",
    "local_cuisine",
    "local_specialty",
    "activity",
    "accommodation",
}


def _quote_priority(quote: EvidenceQuote) -> int:
    if quote.content_type in DESTINATION_CONTENT_TYPES:
        return 0
    if quote.content_type in {"transport", "railway", "aviation", "road_transport", "tourism_safety"}:
        return 1
    return 2
```

Sort selected quotes by `_quote_priority` before applying the quote count cap, while preserving citation IDs and citation lines exactly.

- [ ] **Step 4: Run context budgeter test**

Run:

```bash
uv run pytest tests/test_context_budgeter.py::test_context_budgeter_keeps_destination_quotes_before_policy_quotes -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/services/context_budgeter.py tests/test_context_budgeter.py
git commit -m "feat: prioritize destination evidence in context budget"
```

---

### Task 7: Tighten Final Answer Source-Fit Contract

**Files:**
- Modify: `src/huaxia_tourismrag/agents/tourism_agent.py`
- Modify: `tests/test_tourism_agent.py`

- [ ] **Step 1: Write failing prompt test**

Add to `tests/test_tourism_agent.py`:

```python
def test_final_answer_prompt_rejects_policy_sources_for_food_and_scenic_claims():
    prompt = build_final_answer_prompt(
        question="贵州六日游",
        citation_context="",
        citation_lines=[],
        detail_level="standard",
    )

    assert "景点、美食、住宿、体验类结论必须优先引用 destination、attraction、heritage_site、local_cuisine、local_specialty、activity 或 travel_guide 证据" in prompt
    assert "不要用 railway、legal、regulation、contract 类证据支撑景点好不好玩或食物是否值得吃" in prompt
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest tests/test_tourism_agent.py::test_final_answer_prompt_rejects_policy_sources_for_food_and_scenic_claims -q
```

Expected: FAIL until the prompt contract is added.

- [ ] **Step 3: Add strict source-fit rules**

Add to the final-answer prompt in `tourism_agent.py`:

```python
"""
Citation source-fit rules:
- 景点、美食、住宿、体验类结论必须优先引用 destination、attraction、heritage_site、local_cuisine、local_specialty、activity 或 travel_guide 证据。
- 不要用 railway、legal、regulation、contract 类证据支撑景点好不好玩或食物是否值得吃。
- railway、legal、regulation、contract 类证据只用于交通规则、退改签、实名制、安全、合同、费用边界和合规提醒。
- 如果某个景点或美食缺少直接证据，可以给出谨慎建议，但必须在提醒中说明缺少实时/直接证据，不要硬配政策引用。
"""
```

- [ ] **Step 4: Run prompt test**

Run:

```bash
uv run pytest tests/test_tourism_agent.py::test_final_answer_prompt_rejects_policy_sources_for_food_and_scenic_claims -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/agents/tourism_agent.py tests/test_tourism_agent.py
git commit -m "feat: enforce source-fit rules in final answer prompt"
```

---

### Task 8: Strengthen Citation Guard Source-Fit Warnings

**Files:**
- Modify: `src/huaxia_tourismrag/tools/citation_guard.py`
- Modify: `tests/test_citation_guard.py`

- [ ] **Step 1: Write failing citation guard test**

Add to `tests/test_citation_guard.py`:

```python
def test_citation_guard_flags_policy_citation_for_food_claim() -> None:
    answer = TravelAnswer(
        answer="苗寨长桌宴很值得体验[1]。",
        highlights=[],
        warnings=[],
        citations=["[1] 铁路旅客运输规程 - 中国政府网 - internal:rail"],
    )
    pack = CitationPack(
        context_text="",
        citations=["[1] 铁路旅客运输规程 - 中国政府网 - internal:rail"],
        evidence_quotes=[
            EvidenceQuote(
                citation_id=1,
                source_ref="internal:rail",
                quote="铁路实名制规则。",
                source_type="internal",
                content_type="railway",
                source_name="中国政府网",
            )
        ],
    )

    result = CitationGuard().validate_and_normalize(answer, pack)

    assert any(issue.issue_type == "source_type_mismatch" for issue in result.issues)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest tests/test_citation_guard.py::test_citation_guard_flags_policy_citation_for_food_claim -q
```

Expected: FAIL if the guard does not flag this mismatch.

- [ ] **Step 3: Implement DTO source-fit warning**

In `citation_guard.py`, for each used citation ID:

```python
POLICY_CONTENT_TYPES = {
    "railway",
    "aviation",
    "road_transport",
    "legal",
    "regulation",
    "contract",
    "consumer_protection",
    "tourism_safety",
}

DESTINATION_CLAIM_HINT_TYPES = {"attraction", "food", "accommodation", "activity"}
```

Do not add natural-language regex matching. Instead, use the existing suspicious-policy check only when:

```python
quote.content_type in POLICY_CONTENT_TYPES
```

and the citation is not used in `warnings`. This is conservative: policy citations in warnings are allowed, but policy citations in `answer` and `highlights` should raise `source_type_mismatch`.

- [ ] **Step 4: Run citation guard test**

Run:

```bash
uv run pytest tests/test_citation_guard.py::test_citation_guard_flags_policy_citation_for_food_claim -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/tools/citation_guard.py tests/test_citation_guard.py
git commit -m "feat: warn on policy citations in destination claims"
```

---

### Task 9: Add Four-Prompt Destination Evidence Eval Fixture

**Files:**
- Create: `evals/destination_evidence_cases.json`
- Modify: `evals/manual_itinerary_quality.md`

- [ ] **Step 1: Create eval fixture**

Create `evals/destination_evidence_cases.json`:

```json
[
  {
    "id": "guangxi_5d_guangzhou",
    "prompt": "我们两个人从广州出发，计划去广西玩5天，预算6000元左右。主要想去桂林坐竹筏看漓江山水，再去阳朔骑行遇龙河，最后到北海涠洲岛住两晚，吃海鲜看日落。",
    "expected_entities": ["桂林", "漓江", "遇龙河", "北海", "涠洲岛", "海鲜"],
    "must_not_block": true,
    "max_policy_citations_in_highlights": 1
  },
  {
    "id": "guizhou_6d_family",
    "prompt": "一家三口从上海起止，贵州六日游，预算9000元包含高铁票和住宿。想打卡黄果树瀑布、荔波小七孔和西江千户苗寨，希望行程不要太赶，能体验苗寨长桌宴和梯田晨雾。",
    "expected_entities": ["黄果树瀑布", "荔波小七孔", "西江千户苗寨", "长桌宴", "梯田晨雾"],
    "must_not_block": true,
    "max_policy_citations_in_highlights": 1
  },
  {
    "id": "dongbei_7d_new_year",
    "prompt": "四位朋友从北京出发，去东北玩7天，预算14000元（人均3500）。计划元旦期间去哈尔滨看冰雪大世界、中央大街，再去亚布力滑雪，然后到雪乡住一晚火炕，体验东北炖菜和冻梨。",
    "expected_entities": ["哈尔滨", "冰雪大世界", "中央大街", "亚布力", "雪乡", "东北炖菜", "冻梨"],
    "must_not_block": true,
    "max_policy_citations_in_highlights": 1
  },
  {
    "id": "xinjiang_8d_north_loop",
    "prompt": "两人从成都飞乌鲁木齐，新疆8日游，预算16000元。主要走北疆环线：天山天池、可可托海、喀纳斯湖、禾木村，最后去赛里木湖。希望包一辆越野车，住一晚禾木的小木屋看星空。",
    "expected_entities": ["乌鲁木齐", "天山天池", "可可托海", "喀纳斯湖", "禾木村", "赛里木湖", "禾木小木屋"],
    "must_not_block": true,
    "max_policy_citations_in_highlights": 1
  }
]
```

- [ ] **Step 2: Update manual QA doc**

Append to `evals/manual_itinerary_quality.md`:

```markdown
## Destination Evidence Smoke Cases

Use `evals/destination_evidence_cases.json` after any retrieval, citation, planner, or context-budgeting change.

Pass criteria:
- `needs_reply=false` for all four conventional prompts.
- Returned citation IDs exactly match used in-text citation IDs.
- Scenic and food highlights do not cite policy/legal/railway sources except for explicit transport or risk warnings.
- Each expected entity is either planned with direct destination evidence or explicitly marked as missing/needs real-time verification.
- Deep job runtime should trend below 60 seconds for cached/common routes and below 90 seconds uncached.
```

- [ ] **Step 3: Commit**

```bash
git add evals/destination_evidence_cases.json evals/manual_itinerary_quality.md
git commit -m "test: add destination evidence smoke cases"
```

---

### Task 10: Run Full Verification And Four Live Prompts

**Files:**
- No code changes.

- [ ] **Step 1: Run focused tests**

Run:

```bash
uv run pytest tests/test_evidence_source_policy.py tests/test_evidence_coverage.py tests/test_context_budgeter.py tests/test_citation_guard.py -q
```

Expected: all tests pass.

- [ ] **Step 2: Run full suite**

Run:

```bash
uv run ruff check src/huaxia_tourismrag tests
uv run pytest -q
```

Expected: ruff passes, pytest passes.

- [ ] **Step 3: Run live four-prompt smoke**

Use `/tourism/jobs/questions` for each prompt in `evals/destination_evidence_cases.json`.

Expected:
- All four jobs complete.
- `needs_reply=false`.
- Citation IDs match exactly.
- Highlights contain no more than one policy/railway citation.
- Answers include a usable adjusted route instead of only saying the original route is too hard.

- [ ] **Step 4: Record benchmark**

Append a dated result block to `evals/manual_itinerary_quality.md`:

```markdown
### YYYY-MM-DD Destination Evidence Benchmark

| Case | Runtime | needs_reply | Citation IDs Match | Policy Citations In Highlights | Notes |
|---|---:|---:|---:|---:|---|
| guangxi_5d_guangzhou |  |  |  |  |  |
| guizhou_6d_family |  |  |  |  |  |
| dongbei_7d_new_year |  |  |  |  |  |
| xinjiang_8d_north_loop |  |  |  |  |  |
```

- [ ] **Step 5: Commit verification notes**

```bash
git add evals/manual_itinerary_quality.md
git commit -m "docs: record destination evidence benchmark"
```

---

## Self-Review

Spec coverage:
- Destination evidence quality: Tasks 1-6.
- Policy citation overuse: Tasks 3, 6, 7, 8.
- Four-prompt regression fixture: Task 9.
- Live verification: Task 10.
- DTO-only/no regex principle: all trigger and compatibility decisions use Pydantic fields, enum values, source metadata, and planner-extracted entity DTOs.

Placeholder scan:
- No task uses unresolved placeholder wording.
- All new modules have concrete test and implementation snippets.

Type consistency:
- `ResearchEntity.evidence_use` reuses existing `EvidenceUse`.
- `ResearchEntity.entity_type` uses new `ResearchEntityType`.
- Source policy consumes existing `ResearchTaskType`, `EvidenceUse`, and `ContentType`.
- Coverage report consumes `TravelResearchPlan.required_entities`.

Execution recommendation:
- Implement Tasks 1-4 first as one checkpoint.
- Implement Tasks 5-8 second as one checkpoint.
- Run Task 10 after Task 9 and compare to the latest four-prompt smoke baseline.

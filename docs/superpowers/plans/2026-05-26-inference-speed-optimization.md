# Inference Speed Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make HuaXia Tourism RAG feel production-grade by measuring every inference stage, applying detail-level-aware retrieval budgets, avoiding unnecessary work before clarification checkpoints, caching expensive retrieval/search/page-read operations, and preparing deep plans for async/progress execution.

**Architecture:** Start with observability because current latency may come from LLM checkpoint agents, remote embedding, Qdrant, search, page parsing, MCP enrichment, or final generation. Then enforce deterministic budgets by route type and detail level. Add caches and limited concurrency only after budget behavior is test-covered.

**Tech Stack:** FastAPI, Streamlit, Pydantic DTOs, Redis, Qdrant, Tavily/Exa, Firecrawl/trafilatura, PydanticAI, pytest, ruff.

---

## Priority Decision

Implement in this order:

1. **Stage timing instrumentation**: highest priority because it identifies the real bottleneck and is low risk.
2. **Retrieval budget policy**: high impact, low risk; prevents deep-mode behavior from leaking into concise/standard answers.
3. **Clarification fast path audit**: ensure no internal RAG, web search, page parsing, MCP enrichment, or final generation runs when a checkpoint answer will be returned.
4. **Redis cache wrappers**: high impact for repeated prompts, popular destinations, page parsing, and search results.
5. **Bounded concurrency for page reads**: useful after budgets exist; otherwise concurrency can just make expensive fan-out happen faster.
6. **Async job/progress path for deep DIY itineraries**: important for UX and timeout resilience, but larger surface area; do after the synchronous path is measured and bounded.
7. **Hosted reranker / model choice changes**: defer until data proves ranking is a bottleneck or answer quality needs it.

Do **not** start by changing models, adding more MCPs, or rewriting the whole service. Those moves are more expensive and harder to verify.

---

## Target Latency Budgets

- Clarification checkpoint: **1-3 seconds**
- Concise answer: **5-12 seconds**
- Standard answer: **8-20 seconds**
- Deep conventional itinerary: **20-45 seconds**
- Deep DIY itinerary: **30-60 seconds** or async job/progress mode

---

## File Structure

Create:

- `src/huaxia_tourismrag/schemas/performance.py`  
  Pydantic DTOs for stage timings and retrieval budgets.

- `src/huaxia_tourismrag/services/performance.py`  
  Timer helper, budget inference, and stage-name constants.

- `src/huaxia_tourismrag/services/retrieval_cache.py`  
  Redis-backed JSON cache helpers for search hits, page chunks, and internal RAG results.

- `tests/test_performance.py`  
  Unit tests for timing DTOs and budget inference.

- `tests/test_retrieval_cache.py`  
  Unit tests for cache key stability, TTL behavior, and JSON round trips.

Modify:

- `src/huaxia_tourismrag/core/config.py`  
  Add timing and cache settings.

- `src/huaxia_tourismrag/schemas/evidence.py`  
  Add optional performance trace field to `TravelAnswer`.

- `src/huaxia_tourismrag/services/qa_service.py`  
  Add timings, budget application, and cache-aware retrieval.

- `src/huaxia_tourismrag/services/diy_itinerary_service.py`  
  Add timings, budget application, and cache-aware retrieval.

- `src/huaxia_tourismrag/bootstrap.py`  
  Wire cache and settings into services.

- `src/huaxia_tourismrag/streamlit_app.py`  
  Optionally render compact service timing only in debug/admin mode.

- `.env.example`  
  Document speed/caching settings.

---

## Task 1: Add Performance DTOs

**Files:**
- Create: `src/huaxia_tourismrag/schemas/performance.py`
- Test: `tests/test_performance.py`

- [ ] **Step 1: Write failing tests for timing and budget DTOs**

Add to `tests/test_performance.py`:

```python
from huaxia_tourismrag.schemas.performance import (
    PerformanceStageTiming,
    PerformanceTrace,
    RetrievalBudget,
)


def test_performance_trace_sums_stage_duration():
    trace = PerformanceTrace(
        stages=[
            PerformanceStageTiming(name="checkpoint", duration_ms=100.2),
            PerformanceStageTiming(name="web_search", duration_ms=250.8),
        ]
    )

    assert trace.total_ms == 351.0


def test_retrieval_budget_has_safe_defaults():
    budget = RetrievalBudget()

    assert budget.max_tasks == 6
    assert budget.max_pages_to_read == 4
    assert budget.max_search_results_per_task == 4
    assert budget.enable_service_enrichment is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
uv run pytest tests/test_performance.py -q
```

Expected: FAIL because `huaxia_tourismrag.schemas.performance` does not exist.

- [ ] **Step 3: Implement DTOs**

Create `src/huaxia_tourismrag/schemas/performance.py`:

```python
"""Performance and retrieval-budget DTOs."""

from pydantic import BaseModel, Field


class PerformanceStageTiming(BaseModel):
    """Elapsed time for one inference stage."""

    name: str
    duration_ms: float = Field(ge=0)
    metadata: dict[str, str | int | float | bool] = Field(default_factory=dict)


class PerformanceTrace(BaseModel):
    """Optional debug trace for one answer generation request."""

    stages: list[PerformanceStageTiming] = Field(default_factory=list)

    @property
    def total_ms(self) -> float:
        return round(sum(stage.duration_ms for stage in self.stages), 2)


class RetrievalBudget(BaseModel):
    """Hard limits for evidence retrieval and enrichment."""

    max_tasks: int = Field(default=6, ge=0)
    max_pages_to_read: int = Field(default=4, ge=0)
    max_search_results_per_task: int = Field(default=4, ge=0)
    internal_rag_limit: int = Field(default=8, ge=0)
    enable_internal_rag: bool = True
    enable_web_search: bool = True
    enable_page_reading: bool = True
    enable_service_enrichment: bool = False
```

- [ ] **Step 4: Run tests**

Run:

```bash
uv run pytest tests/test_performance.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/schemas/performance.py tests/test_performance.py
git commit -m "Add inference performance DTOs"
```

---

## Task 2: Add Timer Helper and Budget Inference

**Files:**
- Create: `src/huaxia_tourismrag/services/performance.py`
- Modify: `tests/test_performance.py`

- [ ] **Step 1: Add failing tests for budget inference**

Append to `tests/test_performance.py`:

```python
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.services.performance import infer_retrieval_budget


def test_concise_general_budget_is_lightweight():
    budget = infer_retrieval_budget(
        TravelQuestion(question="北京三天怎么玩？", detail_level="concise"),
        request_mode="general",
    )

    assert budget.max_tasks == 3
    assert budget.max_pages_to_read == 1
    assert budget.enable_service_enrichment is False


def test_deep_diy_budget_allows_more_research():
    budget = infer_retrieval_budget(
        TravelQuestion(
            question="三国历史巡礼，北京往返，涿州、临漳、许昌、成都、汉中，深度旅行社版。",
            detail_level="deep",
        ),
        request_mode="diy",
    )

    assert budget.max_tasks == 8
    assert budget.max_pages_to_read == 6
    assert budget.enable_service_enrichment is True
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/test_performance.py -q
```

Expected: FAIL because `infer_retrieval_budget` does not exist.

- [ ] **Step 3: Implement timer and budget helper**

Create `src/huaxia_tourismrag/services/performance.py`:

```python
"""Inference timing and budget policy."""

from __future__ import annotations

import time
from contextlib import contextmanager
from typing import Iterator

from huaxia_tourismrag.schemas.evidence import DetailLevel, TravelQuestion
from huaxia_tourismrag.schemas.performance import (
    PerformanceStageTiming,
    PerformanceTrace,
    RetrievalBudget,
)


class InferenceTimer:
    """Collect stage timings for one request."""

    def __init__(self) -> None:
        self.trace = PerformanceTrace()

    @contextmanager
    def stage(
        self,
        name: str,
        **metadata: str | int | float | bool,
    ) -> Iterator[None]:
        started = time.perf_counter()
        try:
            yield
        finally:
            elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
            self.trace.stages.append(
                PerformanceStageTiming(
                    name=name,
                    duration_ms=elapsed_ms,
                    metadata=metadata,
                )
            )


def infer_retrieval_budget(
    question: TravelQuestion,
    request_mode: str,
) -> RetrievalBudget:
    """Infer deterministic retrieval limits from mode and requested detail."""

    level: DetailLevel = question.detail_level or "standard"

    if level == "concise":
        return RetrievalBudget(
            max_tasks=3,
            max_pages_to_read=1,
            max_search_results_per_task=2,
            internal_rag_limit=5,
            enable_service_enrichment=False,
        )

    if level == "deep" and request_mode == "diy":
        return RetrievalBudget(
            max_tasks=8,
            max_pages_to_read=6,
            max_search_results_per_task=4,
            internal_rag_limit=10,
            enable_service_enrichment=True,
        )

    if level == "deep":
        return RetrievalBudget(
            max_tasks=7,
            max_pages_to_read=5,
            max_search_results_per_task=4,
            internal_rag_limit=10,
            enable_service_enrichment=True,
        )

    return RetrievalBudget(
        max_tasks=5,
        max_pages_to_read=3,
        max_search_results_per_task=3,
        internal_rag_limit=8,
        enable_service_enrichment=False,
    )
```

- [ ] **Step 4: Run tests**

```bash
uv run pytest tests/test_performance.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/services/performance.py tests/test_performance.py
git commit -m "Add retrieval budget policy"
```

---

## Task 3: Attach Optional Performance Trace to Answers

**Files:**
- Modify: `src/huaxia_tourismrag/schemas/evidence.py`
- Modify: `tests/test_service_enrichment_schemas.py` or create `tests/test_answer_performance_trace.py`

- [ ] **Step 1: Write failing test**

Create `tests/test_answer_performance_trace.py`:

```python
from huaxia_tourismrag.schemas.evidence import TravelAnswer
from huaxia_tourismrag.schemas.performance import (
    PerformanceStageTiming,
    PerformanceTrace,
)


def test_travel_answer_accepts_optional_performance_trace():
    answer = TravelAnswer(
        answer="ok",
        performance=PerformanceTrace(
            stages=[PerformanceStageTiming(name="llm", duration_ms=10)]
        ),
    )

    assert answer.performance is not None
    assert answer.performance.total_ms == 10
```

- [ ] **Step 2: Run test to verify failure**

```bash
uv run pytest tests/test_answer_performance_trace.py -q
```

Expected: FAIL because `TravelAnswer` has no `performance` field.

- [ ] **Step 3: Add field to `TravelAnswer`**

In `src/huaxia_tourismrag/schemas/evidence.py`, import and add:

```python
from huaxia_tourismrag.schemas.performance import PerformanceTrace
```

Inside `TravelAnswer`:

```python
performance: PerformanceTrace | None = None
```

- [ ] **Step 4: Run test**

```bash
uv run pytest tests/test_answer_performance_trace.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/schemas/evidence.py tests/test_answer_performance_trace.py
git commit -m "Expose optional answer performance trace"
```

---

## Task 4: Instrument QA and DIY Services

**Files:**
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
- Test: `tests/test_qa_service.py`
- Test: `tests/test_diy_itinerary_service.py`

- [ ] **Step 1: Add tests proving checkpoint responses do not perform retrieval**

Add a test to `tests/test_diy_itinerary_service.py` using existing fake deps pattern:

```python
async def test_diy_detail_checkpoint_returns_before_retrieval(monkeypatch):
    calls = {"internal": 0, "search": 0, "page": 0}

    class FakeInternal:
        async def retrieve(self, *args, **kwargs):
            calls["internal"] += 1
            return []

    class FakeSearch:
        async def search_chinese_tourism(self, *args, **kwargs):
            calls["search"] += 1
            return []

    class FakeReader:
        async def read(self, *args, **kwargs):
            calls["page"] += 1
            return []

    # Reuse the project's existing helper for TourismDeps if available.
    # If no helper exists, construct TourismDeps with these fakes and no-op reranker/citations.

    answer = await service.answer(
        TravelQuestion(
            question="三国历史巡礼，北京往返，涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中。",
            detail_level=None,
        )
    )

    assert answer.needs_reply is True
    assert calls == {"internal": 0, "search": 0, "page": 0}
```

Use the repo's current test helper style rather than introducing new global fixtures.

- [ ] **Step 2: Add tests for performance trace on full answers**

Add assertions to existing full-answer service tests:

```python
assert answer.performance is not None
assert {stage.name for stage in answer.performance.stages}
assert answer.performance.total_ms >= 0
```

- [ ] **Step 3: Run tests to verify failure**

```bash
uv run pytest tests/test_qa_service.py tests/test_diy_itinerary_service.py -q
```

Expected: FAIL until services attach traces and tests are adapted to current helper names.

- [ ] **Step 4: Instrument services**

In both service files:

```python
from huaxia_tourismrag.services.performance import (
    InferenceTimer,
    infer_retrieval_budget,
)
```

At the top of `answer()`:

```python
timer = InferenceTimer()
budget = infer_retrieval_budget(question, request_mode="general")
```

Use `request_mode="diy"` in DIY service.

Wrap stages:

```python
with timer.stage("intent_checkpoint"):
    intent_decision = await create_intent_decision(...)
```

Before every early return:

```python
answer = build_detail_level_answer(detail_decision)
answer.performance = timer.trace
return await self._with_pending_session(...)
```

For full answers, set:

```python
answer.performance = timer.trace
```

after `generate_answer_with_context`.

- [ ] **Step 5: Run tests**

```bash
uv run pytest tests/test_qa_service.py tests/test_diy_itinerary_service.py tests/test_performance.py -q
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/huaxia_tourismrag/services/qa_service.py src/huaxia_tourismrag/services/diy_itinerary_service.py tests/test_qa_service.py tests/test_diy_itinerary_service.py
git commit -m "Instrument itinerary inference stages"
```

---

## Task 5: Enforce Retrieval Budgets

**Files:**
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
- Test: `tests/test_qa_service.py`
- Test: `tests/test_diy_itinerary_service.py`

- [ ] **Step 1: Add budget tests**

Add test for concise mode:

```python
async def test_concise_answer_limits_tasks_pages_and_results(monkeypatch):
    search_calls = []
    page_reads = []

    class FakeSearch:
        async def search_chinese_tourism(self, query, max_results, options):
            search_calls.append((query, max_results))
            return [
                SearchHit(title=f"hit-{i}", url=f"https://example.com/{i}", snippet="ok")
                for i in range(5)
            ]

    class FakeReader:
        async def read(self, hit):
            page_reads.append(str(hit.url))
            return []

    answer = await service.answer(
        TravelQuestion(question="北京三天怎么玩，简单说一下。", detail_level="concise")
    )

    assert len(search_calls) <= 3
    assert all(max_results <= 2 for _, max_results in search_calls)
    assert len(page_reads) <= 1
```

- [ ] **Step 2: Run tests to verify failure**

```bash
uv run pytest tests/test_qa_service.py tests/test_diy_itinerary_service.py -q
```

Expected: FAIL because services still use the plan's full task/result counts.

- [ ] **Step 3: Apply budgets in services**

In QA service, after ordering tasks:

```python
ordered_tasks = self._prioritize_tasks(research_plan.tasks)[: budget.max_tasks]
```

In DIY service:

```python
ordered_tasks = self._prioritize_tasks(diy_plan.tasks)[: budget.max_tasks]
```

Internal RAG:

```python
if budget.enable_internal_rag and internal_rag_available:
    internal.extend(
        await self.deps.internal_rag.retrieve(
            task.query,
            tenant_id=self.deps.tenant_id,
            limit=budget.internal_rag_limit,
        )
    )
```

Web search:

```python
if not budget.enable_web_search:
    continue

hits = await self.deps.web_search.search_chinese_tourism(
    task.query,
    max_results=min(task.max_results, budget.max_search_results_per_task),
    options=task.to_search_options(),
)
```

Page reading:

```python
if not budget.enable_page_reading:
    continue

if pages_read >= min(self.max_pages_to_read, budget.max_pages_to_read):
    break
```

Service enrichment:

```python
if self.service_enrichment and budget.enable_service_enrichment:
    service_context = await self.service_enrichment.enrich(...)
```

- [ ] **Step 4: Run tests**

```bash
uv run pytest tests/test_qa_service.py tests/test_diy_itinerary_service.py tests/test_performance.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/services/qa_service.py src/huaxia_tourismrag/services/diy_itinerary_service.py tests/test_qa_service.py tests/test_diy_itinerary_service.py
git commit -m "Apply detail-aware retrieval budgets"
```

---

## Task 6: Add Redis Retrieval Cache

**Files:**
- Create: `src/huaxia_tourismrag/services/retrieval_cache.py`
- Test: `tests/test_retrieval_cache.py`

- [ ] **Step 1: Write failing cache tests**

Create `tests/test_retrieval_cache.py`:

```python
import json

from huaxia_tourismrag.services.retrieval_cache import (
    RetrievalCache,
    stable_cache_key,
)


class FakeRedis:
    def __init__(self):
        self.values = {}
        self.ttls = {}

    async def get(self, key):
        return self.values.get(key)

    async def set(self, key, value, ex=None):
        self.values[key] = value
        self.ttls[key] = ex


def test_stable_cache_key_normalizes_parts():
    assert stable_cache_key("web", " 北京三天怎么玩 ", "2") == stable_cache_key(
        "web", "北京三天怎么玩", "2"
    )


async def test_retrieval_cache_round_trips_json():
    redis = FakeRedis()
    cache = RetrievalCache(redis=redis, namespace="test", ttl_seconds=60)

    await cache.set_json("abc", {"hits": [1, 2]})

    assert await cache.get_json("abc") == {"hits": [1, 2]}
    assert redis.ttls["test:abc"] == 60
```

- [ ] **Step 2: Run tests to verify failure**

```bash
uv run pytest tests/test_retrieval_cache.py -q
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement cache helper**

Create `src/huaxia_tourismrag/services/retrieval_cache.py`:

```python
"""Small JSON cache for expensive retrieval operations."""

from __future__ import annotations

import hashlib
import json
from typing import Any, Protocol


class AsyncKeyValueStore(Protocol):
    async def get(self, key: str) -> str | None: ...

    async def set(self, key: str, value: str, ex: int | None = None) -> Any: ...


def stable_cache_key(*parts: object) -> str:
    normalized = "|".join(str(part).strip() for part in parts)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class RetrievalCache:
    """Redis-compatible JSON cache with stable namespacing."""

    def __init__(
        self,
        redis: AsyncKeyValueStore | None,
        namespace: str,
        ttl_seconds: int,
    ) -> None:
        self.redis = redis
        self.namespace = namespace.strip(":")
        self.ttl_seconds = ttl_seconds

    async def get_json(self, key: str) -> object | None:
        if self.redis is None:
            return None
        raw = await self.redis.get(self._key(key))
        if not raw:
            return None
        return json.loads(raw)

    async def set_json(self, key: str, value: object) -> None:
        if self.redis is None:
            return
        await self.redis.set(
            self._key(key),
            json.dumps(value, ensure_ascii=False),
            ex=self.ttl_seconds,
        )

    def _key(self, key: str) -> str:
        return f"{self.namespace}:{key}"
```

- [ ] **Step 4: Run tests**

```bash
uv run pytest tests/test_retrieval_cache.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/services/retrieval_cache.py tests/test_retrieval_cache.py
git commit -m "Add retrieval cache helper"
```

---

## Task 7: Cache Internal RAG, Web Search, and Page Reads

**Files:**
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
- Modify: `src/huaxia_tourismrag/bootstrap.py`
- Modify: `src/huaxia_tourismrag/core/config.py`
- Modify: `.env.example`
- Test: `tests/test_qa_service.py`
- Test: `tests/test_diy_itinerary_service.py`

- [ ] **Step 1: Add config settings**

In `Settings`:

```python
enable_retrieval_cache: bool = Field(default=True, alias="ENABLE_RETRIEVAL_CACHE")
retrieval_cache_ttl_seconds: int = Field(default=3600, alias="RETRIEVAL_CACHE_TTL_SECONDS")
```

In `.env.example`:

```env
ENABLE_RETRIEVAL_CACHE=true
RETRIEVAL_CACHE_TTL_SECONDS=3600
```

- [ ] **Step 2: Add service constructor argument**

In both QA and DIY constructors:

```python
retrieval_cache: RetrievalCache | None = None,
```

Store:

```python
self.retrieval_cache = retrieval_cache
```

- [ ] **Step 3: Add tests for cache hit skipping provider calls**

Use a fake cache returning serialized chunks/hits. The expected behavior:

```python
assert internal_rag_calls == 0
assert web_search_calls == 0
assert page_reader_calls == 0
```

when cache returns data for the relevant keys.

- [ ] **Step 4: Implement cache key usage**

For internal RAG:

```python
key = stable_cache_key("internal", self.deps.tenant_id, task.query, budget.internal_rag_limit)
cached = await self.retrieval_cache.get_json(key) if self.retrieval_cache else None
if cached is not None:
    internal.extend([TravelChunk.model_validate(row) for row in cached])
else:
    chunks = await self.deps.internal_rag.retrieve(...)
    internal.extend(chunks)
    if self.retrieval_cache:
        await self.retrieval_cache.set_json(key, [chunk.model_dump(mode="json") for chunk in chunks])
```

For web search:

```python
key = stable_cache_key("web-search", task.query, budget.max_search_results_per_task, task.to_search_options().model_dump_json())
```

Store `SearchHit.model_dump(mode="json")`.

For page reads:

```python
key = stable_cache_key("page-read", str(hit.url))
```

Store `TravelChunk.model_dump(mode="json")`.

- [ ] **Step 5: Wire cache in bootstrap**

Use the same Redis URL as session store for now:

```python
from huaxia_tourismrag.services.retrieval_cache import RetrievalCache


def build_retrieval_cache(settings: Settings | None = None) -> RetrievalCache | None:
    settings = settings or get_settings()
    if not settings.enable_retrieval_cache:
        return None
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return RetrievalCache(
        redis=redis,
        namespace="huaxia:retrieval",
        ttl_seconds=settings.retrieval_cache_ttl_seconds,
    )
```

Pass to `TourismQAService` and `DIYItineraryService`.

- [ ] **Step 6: Run tests**

```bash
uv run pytest tests/test_retrieval_cache.py tests/test_qa_service.py tests/test_diy_itinerary_service.py tests/test_bootstrap.py -q
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/huaxia_tourismrag/services/retrieval_cache.py src/huaxia_tourismrag/services/qa_service.py src/huaxia_tourismrag/services/diy_itinerary_service.py src/huaxia_tourismrag/bootstrap.py src/huaxia_tourismrag/core/config.py .env.example tests
git commit -m "Cache expensive retrieval operations"
```

---

## Task 8: Add Bounded Page-Read Concurrency

**Files:**
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
- Modify: `src/huaxia_tourismrag/core/config.py`
- Test: `tests/test_qa_service.py`
- Test: `tests/test_diy_itinerary_service.py`

- [ ] **Step 1: Add config setting**

In `Settings`:

```python
page_read_concurrency: int = Field(default=3, alias="PAGE_READ_CONCURRENCY")
```

- [ ] **Step 2: Add constructor argument to services**

```python
page_read_concurrency: int = 3,
```

Store:

```python
self.page_read_concurrency = max(1, page_read_concurrency)
```

- [ ] **Step 3: Refactor page reading into helper**

In each service or a shared helper:

```python
import asyncio


async def _read_hits_with_budget(self, hits, seen_urls, pages_remaining):
    selected = []
    for hit in hits:
        if len(selected) >= pages_remaining:
            break
        url = str(hit.url)
        if url in seen_urls:
            continue
        seen_urls.add(url)
        selected.append(hit)

    semaphore = asyncio.Semaphore(self.page_read_concurrency)

    async def read_one(hit):
        async with semaphore:
            return await self.deps.webpage_reader.read(hit)

    results = await asyncio.gather(*(read_one(hit) for hit in selected))
    chunks = [chunk for result in results for chunk in result]
    return chunks, len(selected)
```

- [ ] **Step 4: Add tests**

Use fake reader with `asyncio.sleep(0.01)` and assert all selected pages are read while total pages still respects the budget:

```python
assert len(page_reads) <= budget.max_pages_to_read
```

- [ ] **Step 5: Run tests**

```bash
uv run pytest tests/test_qa_service.py tests/test_diy_itinerary_service.py -q
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/huaxia_tourismrag/services/qa_service.py src/huaxia_tourismrag/services/diy_itinerary_service.py src/huaxia_tourismrag/core/config.py tests
git commit -m "Read web evidence pages concurrently within budget"
```

---

## Task 9: Render Performance Trace in Debug Mode

**Files:**
- Modify: `src/huaxia_tourismrag/streamlit_app.py`
- Test: `tests/test_streamlit_frontend.py`

- [ ] **Step 1: Add frontend copy and debug render test**

Add a test that checks for a hidden/debug-only performance section function:

```python
def test_streamlit_has_performance_trace_renderer():
    source = Path("src/huaxia_tourismrag/streamlit_app.py").read_text()

    assert "_render_performance_trace" in source
    assert "performance" in source
```

- [ ] **Step 2: Implement renderer**

In `streamlit_app.py`:

```python
def _render_performance_trace(payload: dict[str, Any]) -> None:
    performance = payload.get("performance")
    if not performance or not st.session_state.get("show_debug_timing"):
        return

    stages = performance.get("stages") or []
    with st.expander("调试：生成耗时 / Debug timings", expanded=False):
        st.write(f"Total: {performance.get('total_ms', 'n/a')} ms")
        for stage in stages:
            st.write(f"{stage.get('name')}: {stage.get('duration_ms')} ms")
```

Call after rendering answer payload.

- [ ] **Step 3: Add sidebar toggle**

```python
st.session_state["show_debug_timing"] = st.sidebar.toggle(
    "显示调试耗时",
    value=st.session_state.get("show_debug_timing", False),
)
```

- [ ] **Step 4: Run tests**

```bash
uv run pytest tests/test_streamlit_frontend.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/streamlit_app.py tests/test_streamlit_frontend.py
git commit -m "Show optional inference timing in Streamlit"
```

---

## Task 10: Plan Async Deep Itinerary Jobs

**Files:**
- Create: `src/huaxia_tourismrag/schemas/jobs.py`
- Create: `src/huaxia_tourismrag/services/job_store.py`
- Modify: `src/huaxia_tourismrag/api/routes.py`
- Test: `tests/test_routes.py`

This task is intentionally last because it changes API shape.

- [ ] **Step 1: Add job DTO tests**

```python
from huaxia_tourismrag.schemas.jobs import TravelJobStatus


def test_travel_job_status_shape():
    status = TravelJobStatus(
        job_id="job_1",
        status="running",
        progress_message="夏夏正在整理路线...",
    )

    assert status.status == "running"
```

- [ ] **Step 2: Add DTOs**

`src/huaxia_tourismrag/schemas/jobs.py`:

```python
from typing import Literal

from pydantic import BaseModel

from huaxia_tourismrag.schemas.evidence import TravelAnswer

JobStatus = Literal["queued", "running", "completed", "failed"]


class TravelJobStatus(BaseModel):
    job_id: str
    status: JobStatus
    progress_message: str | None = None
    answer: TravelAnswer | None = None
    error: str | None = None
```

- [ ] **Step 3: Add API endpoints**

Add later after synchronous optimization is proven:

```text
POST /tourism/jobs/diy
GET /tourism/jobs/{job_id}
```

The first endpoint returns `TravelJobStatus(status="queued")` quickly. The second returns progress or final answer.

- [ ] **Step 4: Use only for deep DIY**

Route to async job when:

```python
question.detail_level == "deep" and request_mode == "diy"
```

or when frontend explicitly asks for async mode.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/schemas/jobs.py src/huaxia_tourismrag/services/job_store.py src/huaxia_tourismrag/api/routes.py tests/test_routes.py
git commit -m "Add async deep itinerary job API"
```

---

## Production Rollout Settings

Recommended `.env` for production after Tasks 1-9:

```env
EMBEDDING_PROVIDER=remote
ENABLE_MODEL_RERANKER=false
ENABLE_RETRIEVAL_CACHE=true
RETRIEVAL_CACHE_TTL_SECONDS=3600
MAX_SEARCH_RESULTS=4
MAX_PAGES_TO_READ=3
TOP_K_CONTEXTS=4
PAGE_READ_CONCURRENCY=3
FIRECRAWL_MCP_ENABLED=false
```

Turn MCP providers on only after timing shows the base path is healthy.

---

## Verification Commands

Run after each task:

```bash
uv run ruff check src/huaxia_tourismrag tests
uv run pytest tests/test_performance.py tests/test_retrieval_cache.py tests/test_qa_service.py tests/test_diy_itinerary_service.py tests/test_routes.py tests/test_streamlit_frontend.py -q
```

Run a manual timing test:

```bash
uv run huaxia-tourismrag ask "北京三天怎么玩，简单说一下。" --detail concise --timeout 120
uv run huaxia-tourismrag diy "三国历史巡礼，从北京出发，涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中，10到12天。" --detail deep --timeout 300
```

Expected after Tasks 1-9:

- concise request reads at most 1 webpage
- standard request reads at most 3 webpages
- deep DIY reads at most 6 webpages
- repeated requests hit cache and show lower web/search/page-read timings
- checkpoint answers return without internal RAG, web search, page parsing, or service enrichment

---

## Self-Review

- Spec coverage: The plan compares optimization methods and orders implementation by risk-adjusted impact.
- DTO-driven: New behavior is controlled through Pydantic DTOs: `PerformanceTrace`, `PerformanceStageTiming`, `RetrievalBudget`, and later `TravelJobStatus`.
- First implementation: Instrumentation and budget policy come before caching, concurrency, and async jobs.
- No large rewrite: Existing QA/DIY services remain the orchestration layer.
- Production safety: Local reranker remains disabled; MCP enrichment remains budget-gated and off for low-latency defaults.

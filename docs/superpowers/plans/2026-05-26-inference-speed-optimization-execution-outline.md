# Inference Speed Optimization Execution Outline

This is the execution outline for:

- [2026-05-26-inference-speed-optimization.md](2026-05-26-inference-speed-optimization.md)

Use the detailed plan for exact code/test steps. Use this outline to decide
what to implement first, when to stop, and how to verify that each phase is
actually improving production readiness.

---

## Principle

Do not optimize by intuition.

The rollout order is:

```text
measure -> reduce unnecessary work -> cache repeated work -> parallelize bounded work -> make deep work async
```

Avoid starting with model changes, more MCP providers, or aggressive
parallelism. Those can hide the bottleneck instead of fixing it.

---

## Phase 0: Baseline Before Code Changes

**Goal:** Know current latency before implementing anything.

Run these manually and write down approximate timings:

```bash
uv run huaxia-tourismrag ask "北京三天怎么玩，简单说一下。" --detail concise --timeout 120
uv run huaxia-tourismrag ask "上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。" --detail deep --timeout 300
uv run huaxia-tourismrag diy "三国历史巡礼，从北京出发，涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中，10到12天。" --detail deep --timeout 600
```

Record:

- total runtime
- whether a checkpoint was returned
- whether web pages were parsed
- whether internal RAG failed or timed out
- whether service enrichment ran

**Proceed when:** you have a rough baseline for concise, deep conventional, and
deep DIY.

---

## Phase 1: Observability First

**Detailed tasks:** Task 1, Task 2, Task 3, Task 4.

**Goal:** Every answer can optionally expose a structured performance trace.

Implement:

- `PerformanceStageTiming`
- `PerformanceTrace`
- `RetrievalBudget`
- `InferenceTimer`
- optional `TravelAnswer.performance`
- timing stages inside QA and DIY services

Track at minimum:

```text
intent_checkpoint
preference_checkpoint
detail_checkpoint
research_plan
feasibility_checkpoint
internal_rag
web_search
page_read
merge_filter_rerank
service_enrichment
llm_generation
total
```

**Success criteria:**

- checkpoint answers include timing data
- full answers include timing data
- importing the app still does not load local model stacks
- no user-facing behavior changes except optional debug timing

**Verification:**

```bash
uv run pytest tests/test_performance.py tests/test_answer_performance_trace.py tests/test_qa_service.py tests/test_diy_itinerary_service.py -q
uv run ruff check src/huaxia_tourismrag tests
```

**Stop/go decision:** If timing shows LLM calls dominate, prioritize checkpoint
fast path and output-length control. If web/page parsing dominates, prioritize
budgets and cache.

---

## Phase 2: Hard Retrieval Budgets

**Detailed tasks:** Task 5.

**Goal:** Detail level controls how much work the system is allowed to do.

Apply budgets:

```text
concise:
  max_tasks = 3
  max_pages_to_read = 1
  max_search_results_per_task = 2
  service_enrichment = false

standard:
  max_tasks = 5
  max_pages_to_read = 3
  max_search_results_per_task = 3
  service_enrichment = false

deep:
  max_tasks = 7 general / 8 diy
  max_pages_to_read = 5 general / 6 diy
  max_search_results_per_task = 4
  service_enrichment = true
```

**Success criteria:**

- concise requests cannot accidentally parse 6 pages
- standard requests stay bounded
- deep DIY still has enough evidence to be useful
- service enrichment does not run for concise/standard by default

**Verification:**

```bash
uv run pytest tests/test_qa_service.py tests/test_diy_itinerary_service.py tests/test_performance.py -q
```

Manual check:

```bash
uv run huaxia-tourismrag ask "北京三天怎么玩，简单说一下。" --detail concise --timeout 120
```

Expected:

- at most 1 page read
- shorter answer
- no service enrichment

---

## Phase 3: Clarification Fast Path

**Detailed tasks:** covered by Task 4 and Task 5 tests.

**Goal:** If the system needs to ask a checkpoint, it must not do expensive
retrieval first.

Checkpoint response should only run:

```text
intent/preference/detail/feasibility checkpoint logic
session creation
response shaping
```

It should not run:

```text
internal RAG
web search
page reader
reranker
service enrichment
final answer generation
```

**Success criteria:**

- ambiguous DIY route returns buttons quickly
- Streamlit checkpoint buttons appear without a long wait
- checkpoint tests prove expensive tools were not called

**Verification:**

```bash
uv run pytest tests/test_travel_checkpoints.py tests/test_session_reply_service.py tests/test_diy_itinerary_service.py -q
```

Manual check in Streamlit:

```text
/diy 我想做一条三国历史巡礼路线，从北京出发并回到北京，必须覆盖涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中。10到12天，高铁优先，必要时包车。
```

Expected:

- clarification appears quickly
- no timeout before buttons

---

## Phase 4: Redis Retrieval Cache

**Detailed tasks:** Task 6 and Task 7.

**Goal:** Repeated prompts and popular routes reuse expensive retrieval work.

Cache:

- internal RAG result by tenant/query/limit
- web search result by query/options/result limit
- parsed page chunks by URL

Do not cache:

- final LLM answer yet
- user private contact information
- sales/lead data

**Success criteria:**

- first call may be slow
- second similar call is clearly faster
- cache TTL is configurable
- cache can be disabled through env

Recommended env:

```env
ENABLE_RETRIEVAL_CACHE=true
RETRIEVAL_CACHE_TTL_SECONDS=3600
```

**Verification:**

```bash
uv run pytest tests/test_retrieval_cache.py tests/test_qa_service.py tests/test_diy_itinerary_service.py tests/test_bootstrap.py -q
```

Manual repeated request:

```bash
uv run huaxia-tourismrag ask "上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。" --detail standard --timeout 300
uv run huaxia-tourismrag ask "上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。" --detail standard --timeout 300
```

Expected:

- second run has lower `internal_rag`, `web_search`, and/or `page_read` timing

---

## Phase 5: Bounded Page-Read Concurrency

**Detailed tasks:** Task 8.

**Goal:** Read selected pages concurrently without increasing total fan-out.

Add:

```env
PAGE_READ_CONCURRENCY=3
```

Rules:

- concurrency applies only after page budget is selected
- never exceed `max_pages_to_read`
- keep default conservative for Render/Railway style hosts

**Success criteria:**

- standard/deep plans finish faster when multiple pages are selected
- no more pages are parsed than before
- provider errors remain isolated per page

**Verification:**

```bash
uv run pytest tests/test_qa_service.py tests/test_diy_itinerary_service.py -q
```

Manual:

```bash
uv run huaxia-tourismrag diy "三国历史巡礼，从北京出发，涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中，10到12天。" --detail deep --timeout 600
```

Expected:

- page-read stage improves compared with Phase 1 baseline

---

## Phase 6: Debug Timing in Streamlit

**Detailed tasks:** Task 9.

**Goal:** Make production testing easier without exposing debug internals to
normal users.

Add a sidebar toggle:

```text
显示调试耗时
```

When enabled, show:

- total ms
- stage list
- cache hit/miss metadata if available

**Success criteria:**

- hidden by default
- useful during deployment testing
- does not clutter normal UI

**Verification:**

```bash
uv run pytest tests/test_streamlit_frontend.py -q
```

---

## Phase 7: Async Deep DIY Jobs

**Detailed tasks:** Task 10.

**Goal:** Prevent frontend/API timeouts for the heaviest agency-grade plans.

Use async jobs only when:

```text
request_mode = diy
detail_level = deep
expected route complexity is high
```

Flow:

```text
POST /tourism/jobs/diy -> returns job_id
GET /tourism/jobs/{job_id} -> queued/running/completed/failed
Streamlit polls job status and displays progress
```

**Success criteria:**

- normal and standard requests still use synchronous path
- deep DIY no longer blocks one HTTP request for too long
- job status survives refresh through Redis

**Verification:**

```bash
uv run pytest tests/test_routes.py tests/test_streamlit_frontend.py -q
```

---

## Phase 8: Model/Reranker Re-evaluation

Do this only after Phases 1-7 produce timing data.

Possible decisions:

- keep reranker disabled
- use hosted reranker only for deep mode
- switch final answer model for concise mode
- use smaller model for checkpoint agents
- add final-answer cache for common public demo prompts

**Success criteria:**

- model changes are justified by measured stage timings
- quality does not regress on complex cultural/DIY itineraries

---

## Suggested Commit Sequence

Use small commits:

```text
1. Add performance DTOs
2. Add retrieval budget policy
3. Expose answer performance trace
4. Instrument QA and DIY timings
5. Apply detail-aware retrieval budgets
6. Add retrieval cache helper
7. Cache expensive retrieval operations
8. Read web evidence pages concurrently within budget
9. Show optional inference timing in Streamlit
10. Add async deep itinerary job API
```

Do not squash these during development. Each commit should be independently
reviewable and testable.

---

## Final Production Readiness Gate

Before claiming the system is production-speed ready, run:

```bash
uv run ruff check src/huaxia_tourismrag tests
uv run pytest -q
```

Then manually test:

```bash
uv run huaxia-tourismrag ask "北京三天怎么玩，简单说一下。" --detail concise --timeout 120
uv run huaxia-tourismrag ask "上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。" --detail standard --timeout 300
uv run huaxia-tourismrag diy "三国历史巡礼，从北京出发，涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中，10到12天。" --detail deep --timeout 600
```

The final report should include:

- before/after timings
- which stage improved most
- remaining bottleneck
- recommended Render/Railway/production env settings
- whether deep DIY should default to async mode

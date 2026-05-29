# Inference Speed Optimization V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make HuaXia TourismRAG feel faster after citation faithfulness, topic-section quality, Qwen Cloud routing, and MCP enrichment were added.

**Architecture:** Reduce actual latency by shrinking duplicated prompts, gating live web/MCP fan-out with provider budgets, caching reusable evidence packs, and moving expensive optional topic enrichment into staged jobs. Preserve citation faithfulness by never bypassing `CitationGuard` or `TopicSectionQualityGuard`.

**Tech Stack:** Python 3.11, FastAPI, Streamlit, Pydantic DTOs, Qwen Cloud structured output, Qdrant/internal RAG, Tavily/Firecrawl MCP, pytest, ruff.

---

## Why V3 Is Needed

The current speed improvements already cover model routing, async jobs, retrieval budgets, and basic caches. The latest quality work adds new latency risks:

- `topic_evidence_context` can duplicate quotes already present in `CitationPack.context_text`.
- Topic sections add extra final-answer output tokens.
- Tavily/Firecrawl evidence is useful, but live provider calls can dominate latency or fail under quota/rate limits.
- Deep answers still tend to wait for all enrichment before users see the final plan.
- Streamlit progress feels better, but the user still waits for one large response in many cases.

V3 focuses on:

1. Faster final prompts.
2. Live-provider budget control.
3. Deferred/staged topic sections.
4. Evidence-pack caching.
5. Better benchmark visibility.

## Target Latency

- Simple typed form / concise answer: p50 under 8 seconds.
- Standard itinerary with internal RAG and limited web: p50 under 18 seconds.
- Deep itinerary first visible result: job accepted/progress in under 2 seconds.
- Deep core itinerary ready: p50 under 45 seconds.
- Deferred topic tabs ready after core answer: p50 additional 10-25 seconds.
- Repeated demo prompt with cache: p50 under 3 seconds.

## Non-Negotiables

- Do not bypass `CitationGuard`.
- Do not bypass `TopicSectionQualityGuard`.
- Do not reintroduce regex or literal trigger-term routing.
- Do not hide unsupported facts inside topic tabs.
- Do not let Tavily/Firecrawl/other MCP failures block the whole answer.
- Do not use Mapbox route evidence unless the provider returns real duration/distance; unknown route checks stay excluded from positive feasibility.

## File Structure

Create:

- `src/huaxia_tourismrag/services/prompt_compaction.py`
  - Builds compact final prompt context from `CitationPack` plus topic evidence bundles without duplicating full quotes.
- `src/huaxia_tourismrag/services/provider_budget.py`
  - DTO-driven per-request budgets and provider cooldowns for Tavily, Firecrawl, page reading, and service enrichment.
- `src/huaxia_tourismrag/services/evidence_pack_cache.py`
  - Cache `CitationPack` and topic evidence bundle payloads by normalized plan fingerprint.
- `src/huaxia_tourismrag/services/topic_section_generation.py`
  - Generates topic sections separately from the core answer when async topic mode is enabled.
- `scripts/benchmark_latency.py`
  - Manual benchmark runner for representative prompts.
- `evals/speed_v3_benchmarks.json`
  - Benchmark cases and expected service-level checks.

Modify:

- `src/huaxia_tourismrag/core/config.py`
  - Add speed V3 config flags and TTLs.
- `src/huaxia_tourismrag/agents/tourism_agent.py`
  - Accept compact topic evidence context and optional `topic_section_mode`.
- `src/huaxia_tourismrag/services/qa_service.py`
  - Use prompt compaction, provider budgets, evidence-pack cache, and optional deferred topic sections.
- `src/huaxia_tourismrag/services/diy_itinerary_service.py`
  - Same as QA service for DIY routes.
- `src/huaxia_tourismrag/services/service_enrichment.py`
  - Respect provider budgets and cooldown.
- `src/huaxia_tourismrag/services/job_worker.py`
  - Add optional deferred topic-section job stage.
- `src/huaxia_tourismrag/schemas/jobs.py`
  - Add job kind or metadata for topic-section completion.
- `src/huaxia_tourismrag/streamlit_app.py`
  - Show core itinerary first and show topic tabs as loading/ready states when deferred mode is enabled.
- `tests/test_*.py`
  - Add focused tests listed below.

## Configuration

Add these settings:

```env
ENABLE_PROMPT_COMPACTION=true
MAX_FINAL_CONTEXT_QUOTES_CONCISE=6
MAX_FINAL_CONTEXT_QUOTES_STANDARD=10
MAX_FINAL_CONTEXT_QUOTES_DEEP=16

ENABLE_EVIDENCE_PACK_CACHE=true
EVIDENCE_PACK_CACHE_TTL_SECONDS=1800

ENABLE_PROVIDER_BUDGETS=true
TAVILY_MAX_CALLS_PER_REQUEST=4
FIRECRAWL_MAX_CALLS_PER_REQUEST=4
PAGE_READ_MAX_CALLS_PER_REQUEST=6
PROVIDER_COOLDOWN_SECONDS=180

TOPIC_SECTION_MODE=async_for_deep
TOPIC_SECTION_CACHE_TTL_SECONDS=1800
TOPIC_SECTION_MODEL=qwen3.6-plus
```

Accepted `TOPIC_SECTION_MODE` values:

- `inline`: current behavior; topic sections generated with the main answer.
- `async_for_deep`: deep answers return core itinerary first, topic sections complete in a follow-up job.
- `async`: all itinerary answers defer topic sections.
- `disabled`: no topic tabs; useful for emergency low-latency demos.

## Task 1: Add Baseline Speed Benchmarks

**Files:**

- Create: `evals/speed_v3_benchmarks.json`
- Create: `scripts/benchmark_latency.py`
- Test: `tests/test_speed_v3_benchmarks.py`

- [ ] **Step 1: Add benchmark fixture**

Create `evals/speed_v3_benchmarks.json`:

```json
[
  {
    "id": "beijing_concise",
    "mode": "normal",
    "detail_level": "concise",
    "prompt": "北京三天怎么玩，简单说一下。",
    "expected": ["has_answer", "has_citations"]
  },
  {
    "id": "chengdu_chongqing_food",
    "mode": "normal",
    "detail_level": "standard",
    "prompt": "成都和重庆6天，主要想吃本地美食，也想加一点轻松景点。",
    "expected": ["has_itinerary", "has_topic_sections", "has_citations"]
  },
  {
    "id": "shanxi_deep_family",
    "mode": "normal",
    "detail_level": "deep",
    "prompt": "上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。",
    "expected": ["uses_job_or_progress", "has_itinerary", "has_citations"]
  },
  {
    "id": "three_kingdoms_diy",
    "mode": "diy",
    "detail_level": "deep",
    "prompt": "我想做一条三国历史巡礼路线，从北京出发并回到北京，必须覆盖涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中。10到12天，高铁优先，必要时包车。",
    "expected": ["uses_job_or_progress", "preserves_required_stops", "has_citations"]
  }
]
```

- [ ] **Step 2: Add fixture validation test**

Create `tests/test_speed_v3_benchmarks.py`:

```python
import json
from pathlib import Path


def test_speed_v3_benchmark_fixture_is_valid():
    cases = json.loads(Path("evals/speed_v3_benchmarks.json").read_text())

    assert len(cases) >= 4
    assert {case["id"] for case in cases} >= {
        "beijing_concise",
        "chengdu_chongqing_food",
        "shanxi_deep_family",
        "three_kingdoms_diy",
    }
    for case in cases:
        assert case["mode"] in {"normal", "diy"}
        assert case["detail_level"] in {"concise", "standard", "deep"}
        assert len(case["prompt"]) >= 5
        assert case["expected"]
```

- [ ] **Step 3: Add manual benchmark script**

Create `scripts/benchmark_latency.py`:

```python
"""Run manual latency benchmarks against a local HuaXia TourismRAG API."""

from __future__ import annotations

import argparse
import asyncio
import json
import time
from pathlib import Path
from typing import Any

import httpx


def _endpoint(mode: str) -> str:
    return "/tourism/itineraries/diy" if mode == "diy" else "/tourism/questions"


async def _run_case(client: httpx.AsyncClient, base_url: str, case: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "question": case["prompt"],
        "detail_level": case["detail_level"],
        "language": "zh-CN",
    }
    started = time.perf_counter()
    response = await client.post(f"{base_url}{_endpoint(case['mode'])}", json=payload)
    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
    status = response.status_code
    body = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
    return {
        "id": case["id"],
        "status_code": status,
        "elapsed_ms": elapsed_ms,
        "needs_reply": body.get("needs_reply"),
        "has_itinerary": body.get("generated_itinerary") is not None,
        "citations": len(body.get("citations") or []),
        "topic_sections": len(body.get("topic_sections") or []),
        "performance_total_ms": (body.get("performance") or {}).get("total_ms"),
    }


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--cases", default="evals/speed_v3_benchmarks.json")
    args = parser.parse_args()

    cases = json.loads(Path(args.cases).read_text())
    async with httpx.AsyncClient(timeout=180) as client:
        results = [await _run_case(client, args.base_url, case) for case in cases]
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 4: Run targeted test**

Run:

```bash
uv run pytest -q tests/test_speed_v3_benchmarks.py
```

Expected: benchmark fixture test passes.

## Task 2: Compact Final Prompt Context

**Files:**

- Create: `src/huaxia_tourismrag/services/prompt_compaction.py`
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
- Test: `tests/test_prompt_compaction.py`

Problem:

Current final context can include full citation quotes once in `CitationPack.context_text` and again in `format_topic_evidence_context(...)`. This inflates prompt tokens without adding evidence.

- [ ] **Step 1: Add failing prompt compaction tests**

Create `tests/test_prompt_compaction.py`:

```python
from huaxia_tourismrag.schemas.evidence import CitationPack, EvidenceQuote
from huaxia_tourismrag.services.prompt_compaction import FinalPromptCompactor
from huaxia_tourismrag.services.topic_evidence_selector import TopicEvidenceBundle


def _quote(citation_id: int, content_type: str, quote: str) -> EvidenceQuote:
    return EvidenceQuote(
        citation_id=citation_id,
        chunk_id=f"chunk:{citation_id}",
        source_type="internal",
        content_type=content_type,
        title=f"来源 {citation_id}",
        source_name="测试来源",
        source_ref=f"internal:chunk:{citation_id}",
        quote=quote,
    )


def test_compactor_does_not_duplicate_full_topic_quotes():
    long_quote = "成都担担面和钟水饺适合作为本地小吃体验。" * 20
    pack = CitationPack(
        context_text=f"[1] citation_id=1\nquote={long_quote}",
        citations=["[1] 成都美食 - 测试来源 - internal:chunk:1"],
        evidence_quotes=[_quote(1, "local_cuisine", long_quote)],
    )
    bundles = [
        TopicEvidenceBundle(
            category="food",
            title="美食",
            destination_scope=["成都"],
            evidence_quotes=pack.evidence_quotes,
        )
    ]

    result = FinalPromptCompactor(max_quotes=6, max_topic_quote_chars=80).compact(pack, bundles)

    assert result.context.count(long_quote) == 1
    assert "专题证据包" in result.context
    assert "quote=成都担担面和钟水饺适合作为本地小吃体验。" in result.context
    assert len(result.context) < len(pack.context_text) + len(long_quote)


def test_compactor_limits_quote_count():
    quotes = [_quote(index, "travel_guide", f"证据 {index}") for index in range(1, 10)]
    pack = CitationPack(
        context_text="\n\n".join(f"[{quote.citation_id}] quote={quote.quote}" for quote in quotes),
        citations=[],
        evidence_quotes=quotes,
    )

    result = FinalPromptCompactor(max_quotes=4).compact(pack, [])

    assert result.included_citation_ids == [1, 2, 3, 4]
    assert "[5]" not in result.context
```

- [ ] **Step 2: Implement compactor**

Create `src/huaxia_tourismrag/services/prompt_compaction.py`:

```python
from pydantic import BaseModel

from huaxia_tourismrag.schemas.evidence import CitationPack, EvidenceQuote
from huaxia_tourismrag.services.topic_evidence_selector import TopicEvidenceBundle


class CompactedPromptContext(BaseModel):
    context: str
    included_citation_ids: list[int]


class FinalPromptCompactor:
    def __init__(self, max_quotes: int = 12, max_topic_quote_chars: int = 180) -> None:
        self.max_quotes = max(1, max_quotes)
        self.max_topic_quote_chars = max(40, max_topic_quote_chars)

    def compact(
        self,
        pack: CitationPack,
        topic_bundles: list[TopicEvidenceBundle],
    ) -> CompactedPromptContext:
        included = pack.evidence_quotes[: self.max_quotes]
        included_ids = [quote.citation_id for quote in included]
        lines = ["已检索证据："]
        for quote in included:
            lines.append(self._quote_block(quote, max_chars=1600))

        lines.append("\n专题证据包：")
        for bundle in topic_bundles:
            lines.append(
                f"category={bundle.category} title={bundle.title} "
                f"scope={'、'.join(bundle.destination_scope) or '未限定'}"
            )
            for quote in bundle.evidence_quotes:
                if quote.citation_id not in included_ids:
                    continue
                short_quote = quote.quote[: self.max_topic_quote_chars]
                lines.append(
                    f"- [{quote.citation_id}] content_type={quote.content_type} "
                    f"title={quote.title} quote={short_quote}"
                )
            for gap in bundle.source_gaps:
                lines.append(f"- source_gap={gap}")

        return CompactedPromptContext(
            context="\n".join(lines),
            included_citation_ids=included_ids,
        )

    def _quote_block(self, quote: EvidenceQuote, max_chars: int) -> str:
        return (
            f"[{quote.citation_id}] citation_id={quote.citation_id}\n"
            f"chunk_id={quote.chunk_id}\n"
            f"source_type={quote.source_type}\n"
            f"content_type={quote.content_type}\n"
            f"title={quote.title}\n"
            f"source_name={quote.source_name}\n"
            f"source_ref={quote.source_ref}\n"
            f"quote={quote.quote[:max_chars]}"
        )
```

- [ ] **Step 3: Wire compactor into QA and DIY**

In `qa_service.py` and `diy_itinerary_service.py`:

```python
from huaxia_tourismrag.services.prompt_compaction import FinalPromptCompactor
```

Add `self.final_prompt_compactor = FinalPromptCompactor(max_quotes=...)` in constructors. Use detail-level caps:

```python
max_quotes_by_detail = {"concise": 6, "standard": 10, "deep": 16}
compactor = FinalPromptCompactor(max_quotes=max_quotes_by_detail[detail_level])
prompt_context = compactor.compact(pack, topic_bundles).context
```

Replace:

```python
citation_context=f"{pack.context_text}\n\n{topic_evidence_context}"
```

with:

```python
citation_context=prompt_context
```

- [ ] **Step 4: Run tests**

Run:

```bash
uv run pytest -q tests/test_prompt_compaction.py tests/test_qa_service.py tests/test_diy_itinerary_service.py
```

Expected: all pass.

## Task 3: Provider Budget And Cooldown

**Files:**

- Create: `src/huaxia_tourismrag/services/provider_budget.py`
- Modify: `src/huaxia_tourismrag/core/config.py`
- Modify: `src/huaxia_tourismrag/services/service_enrichment.py`
- Modify: `src/huaxia_tourismrag/services/evidence_retrieval_orchestrator.py`
- Test: `tests/test_provider_budget.py`

- [ ] **Step 1: Add tests**

Create `tests/test_provider_budget.py`:

```python
import time

from huaxia_tourismrag.services.provider_budget import ProviderBudget, ProviderCooldown


def test_provider_budget_allows_only_configured_calls():
    budget = ProviderBudget(max_calls={"tavily": 2, "firecrawl": 1})

    assert budget.try_consume("tavily") is True
    assert budget.try_consume("tavily") is True
    assert budget.try_consume("tavily") is False
    assert budget.try_consume("firecrawl") is True
    assert budget.try_consume("firecrawl") is False


def test_provider_cooldown_blocks_until_expired():
    cooldown = ProviderCooldown(cooldown_seconds=30)
    now = time.monotonic()

    assert cooldown.is_blocked("tavily", now=now) is False
    cooldown.mark_failure("tavily", now=now)
    assert cooldown.is_blocked("tavily", now=now + 10) is True
    assert cooldown.is_blocked("tavily", now=now + 31) is False
```

- [ ] **Step 2: Implement provider budget**

Create `src/huaxia_tourismrag/services/provider_budget.py`:

```python
from dataclasses import dataclass, field


@dataclass
class ProviderBudget:
    max_calls: dict[str, int]
    used_calls: dict[str, int] = field(default_factory=dict)

    def try_consume(self, provider: str) -> bool:
        limit = self.max_calls.get(provider, 0)
        used = self.used_calls.get(provider, 0)
        if used >= limit:
            return False
        self.used_calls[provider] = used + 1
        return True


@dataclass
class ProviderCooldown:
    cooldown_seconds: int
    failures: dict[str, float] = field(default_factory=dict)

    def mark_failure(self, provider: str, *, now: float) -> None:
        self.failures[provider] = now

    def is_blocked(self, provider: str, *, now: float) -> bool:
        failed_at = self.failures.get(provider)
        if failed_at is None:
            return False
        return now - failed_at < self.cooldown_seconds
```

- [ ] **Step 3: Add config**

In `src/huaxia_tourismrag/core/config.py`, add:

```python
enable_provider_budgets: bool = Field(default=True, alias="ENABLE_PROVIDER_BUDGETS")
tavily_max_calls_per_request: int = Field(default=4, alias="TAVILY_MAX_CALLS_PER_REQUEST")
firecrawl_max_calls_per_request: int = Field(default=4, alias="FIRECRAWL_MAX_CALLS_PER_REQUEST")
page_read_max_calls_per_request: int = Field(default=6, alias="PAGE_READ_MAX_CALLS_PER_REQUEST")
provider_cooldown_seconds: int = Field(default=180, alias="PROVIDER_COOLDOWN_SECONDS")
```

- [ ] **Step 4: Apply budget in service enrichment and retrieval**

Use `ProviderBudget.try_consume(...)` before each live provider call. If budget is exhausted, add a typed `ServiceProviderUnavailable(provider=..., reason="provider budget exhausted", retryable=False)` instead of calling the provider.

- [ ] **Step 5: Run tests**

Run:

```bash
uv run pytest -q tests/test_provider_budget.py tests/test_service_enrichment.py tests/test_evidence_retrieval_orchestrator.py
```

Expected: all pass.

## Task 4: Evidence Pack Cache

**Files:**

- Create: `src/huaxia_tourismrag/services/evidence_pack_cache.py`
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
- Test: `tests/test_evidence_pack_cache.py`

- [ ] **Step 1: Add tests**

Create `tests/test_evidence_pack_cache.py`:

```python
from huaxia_tourismrag.schemas.evidence import CitationPack
from huaxia_tourismrag.services.evidence_pack_cache import EvidencePackCache


class FakeRedis:
    def __init__(self) -> None:
        self.values = {}

    async def get(self, key: str) -> str | None:
        return self.values.get(key)

    async def set(self, key: str, value: str, ex: int) -> None:
        self.values[key] = value


def test_evidence_pack_cache_key_is_stable():
    cache = EvidencePackCache(redis=FakeRedis(), ttl_seconds=1800)

    assert cache.key("山西", "deep", "zh-CN") == cache.key(" 山西 ", "deep", "zh-CN")
    assert cache.key("山西", "deep", "zh-CN") != cache.key("山西", "standard", "zh-CN")


async def test_evidence_pack_cache_round_trips_pack():
    redis = FakeRedis()
    cache = EvidencePackCache(redis=redis, ttl_seconds=1800)
    pack = CitationPack(context_text="ctx", citations=["[1] a"], evidence_quotes=[])

    await cache.set_pack("key", pack)
    loaded = await cache.get_pack("key")

    assert loaded == pack
```

- [ ] **Step 2: Implement cache**

Create `src/huaxia_tourismrag/services/evidence_pack_cache.py`:

```python
import hashlib

from huaxia_tourismrag.schemas.evidence import CitationPack


class EvidencePackCache:
    def __init__(self, redis, ttl_seconds: int) -> None:
        self.redis = redis
        self.ttl_seconds = ttl_seconds

    def key(self, question: str, detail_level: str, language: str) -> str:
        normalized = " ".join(question.split())
        digest = hashlib.sha256(f"{normalized}|{detail_level}|{language}".encode()).hexdigest()
        return f"evidence-pack:{digest}"

    async def get_pack(self, key: str) -> CitationPack | None:
        raw = await self.redis.get(key)
        if raw is None:
            return None
        return CitationPack.model_validate_json(raw)

    async def set_pack(self, key: str, pack: CitationPack) -> None:
        await self.redis.set(key, pack.model_dump_json(), ex=self.ttl_seconds)
```

- [ ] **Step 3: Wire into QA and DIY**

Use the evidence-pack cache after retrieval and citation formatting, before final LLM generation. Cache only after service enrichment and prompt compaction inputs are stable enough for the final answer.

- [ ] **Step 4: Run tests**

Run:

```bash
uv run pytest -q tests/test_evidence_pack_cache.py tests/test_qa_service.py tests/test_diy_itinerary_service.py
```

Expected: all pass.

## Task 5: Deferred Topic Sections

**Files:**

- Create: `src/huaxia_tourismrag/services/topic_section_generation.py`
- Modify: `src/huaxia_tourismrag/schemas/jobs.py`
- Modify: `src/huaxia_tourismrag/services/job_worker.py`
- Modify: `src/huaxia_tourismrag/api/routes.py`
- Modify: `src/huaxia_tourismrag/streamlit_app.py`
- Test: `tests/test_topic_section_generation.py`
- Test: `tests/test_job_queue.py`
- Test: `tests/test_routes.py`
- Test: `tests/test_streamlit_frontend.py`

Behavior:

- In `TOPIC_SECTION_MODE=async_for_deep`, the main deep answer may return with a polished itinerary and zero or partial `topic_sections`.
- A background topic-section job receives:
  - original guarded answer
  - `CitationPack`
  - topic evidence bundles
  - route metadata
- The job returns only `topic_sections`, then the UI updates the tabs.

- [ ] **Step 1: Add topic-section generation service test**

Create `tests/test_topic_section_generation.py`:

```python
from huaxia_tourismrag.schemas.evidence import CitationPack, TravelAnswer
from huaxia_tourismrag.services.topic_section_generation import should_defer_topic_sections


def test_defer_topic_sections_only_for_deep_when_configured():
    answer = TravelAnswer(answer="ok", highlights=[], warnings=[], citations=[])
    pack = CitationPack(context_text="", citations=[], evidence_quotes=[])

    assert should_defer_topic_sections("async_for_deep", "deep", answer, pack) is True
    assert should_defer_topic_sections("async_for_deep", "standard", answer, pack) is False
    assert should_defer_topic_sections("inline", "deep", answer, pack) is False
    assert should_defer_topic_sections("disabled", "deep", answer, pack) is False
```

- [ ] **Step 2: Implement defer policy**

Create `src/huaxia_tourismrag/services/topic_section_generation.py`:

```python
from huaxia_tourismrag.schemas.evidence import CitationPack, TravelAnswer


def should_defer_topic_sections(
    mode: str,
    detail_level: str,
    answer: TravelAnswer,
    pack: CitationPack,
) -> bool:
    if mode == "disabled":
        return False
    if answer.needs_reply:
        return False
    if not pack.evidence_quotes:
        return False
    if mode == "async":
        return True
    return mode == "async_for_deep" and detail_level == "deep"
```

- [ ] **Step 3: Add job/API shape**

Extend job schemas with a typed `topic_sections` job result, or add `topic_sections_status` metadata to existing general/deep jobs. The API response should stay backward compatible: users still receive a `TravelAnswer`, but Streamlit can poll for topic-section completion.

- [ ] **Step 4: Streamlit loading state**

If the answer includes topic-section job metadata:

- render tabs as disabled/loading captions first
- poll the job endpoint
- replace tabs when topic sections arrive

- [ ] **Step 5: Run tests**

Run:

```bash
uv run pytest -q tests/test_topic_section_generation.py tests/test_job_queue.py tests/test_routes.py tests/test_streamlit_frontend.py
```

Expected: all pass.

## Task 6: Adaptive Retrieval Fan-Out

**Files:**

- Modify: `src/huaxia_tourismrag/services/evidence_retrieval_orchestrator.py`
- Modify: `src/huaxia_tourismrag/services/evidence_coverage.py`
- Test: `tests/test_evidence_retrieval_orchestrator.py`
- Test: `tests/test_evidence_coverage.py`

Behavior:

- If internal evidence already covers required route entities and topic sections, skip extra web page reads for non-current claims.
- Still run fresh web/MCP for:
  - opening/booking/appointment
  - recent policy/current provider evidence
  - hotel/product availability
  - performance/show schedule
- Use typed `ResearchTask.freshness_required`, `ResearchTask.evidence_use`, and `ContentType`; do not use phrase triggers.

- [ ] **Step 1: Add tests**

Add to `tests/test_evidence_retrieval_orchestrator.py`:

```python
def test_adaptive_fanout_skips_page_read_when_internal_coverage_is_sufficient():
    # Build typed route/food/accommodation coverage and assert non-fresh tasks
    # do not require page reads.
    assert True
```

Replace the body with existing orchestrator test fakes from the file, asserting `webpage_reader.read` is not called for non-fresh covered tasks.

- [ ] **Step 2: Implement adaptive fan-out**

Add a small method in orchestrator:

```python
def should_read_pages_for_task(self, task: TravelResearchTask, coverage_sufficient: bool) -> bool:
    if task.freshness_required:
        return True
    if task.evidence_use == "official_status":
        return True
    return not coverage_sufficient
```

- [ ] **Step 3: Run tests**

Run:

```bash
uv run pytest -q tests/test_evidence_retrieval_orchestrator.py tests/test_evidence_coverage.py
```

Expected: all pass.

## Task 7: Streamlit Real-Time Progress And Timing

**Files:**

- Modify: `src/huaxia_tourismrag/streamlit_app.py`
- Modify: `src/huaxia_tourismrag/frontend/streamlit_client.py`
- Test: `tests/test_streamlit_frontend.py`

Behavior:

- UI timer should use actual elapsed client-side time while job is running.
- Once completed, show server `performance.total_ms` separately from wall-clock waiting time.
- Do not show misleading "generated for 121 seconds" if the job was queued/polled or restarted.

- [ ] **Step 1: Add tests**

Add to `tests/test_streamlit_frontend.py`:

```python
def test_job_elapsed_label_distinguishes_wall_clock_and_server_time():
    label = streamlit_app._job_elapsed_label(
        wall_clock_seconds=12.3,
        server_total_ms=5200,
        language="zh",
    )

    assert "等待约 12 秒" in label
    assert "生成耗时约 5 秒" in label
```

- [ ] **Step 2: Implement helper**

In `streamlit_app.py`:

```python
def _job_elapsed_label(
    *,
    wall_clock_seconds: float,
    server_total_ms: float | None,
    language: str,
) -> str:
    if language == "en":
        server = (
            f", server generation about {round(server_total_ms / 1000)}s"
            if server_total_ms is not None
            else ""
        )
        return f"Waited about {round(wall_clock_seconds)}s{server}"
    server = (
        f"，生成耗时约 {round(server_total_ms / 1000)} 秒"
        if server_total_ms is not None
        else ""
    )
    return f"等待约 {round(wall_clock_seconds)} 秒{server}"
```

- [ ] **Step 3: Run tests**

Run:

```bash
uv run pytest -q tests/test_streamlit_frontend.py
```

Expected: all pass.

## Task 8: Verification And Benchmarks

**Files:**

- Modify: `README.zh-CN.md`
- Modify: `.env.example`

- [ ] **Step 1: Document speed V3 settings**

Add a small section to `.env.example`:

```env
# Speed V3
ENABLE_PROMPT_COMPACTION=true
ENABLE_PROVIDER_BUDGETS=true
ENABLE_EVIDENCE_PACK_CACHE=true
TOPIC_SECTION_MODE=async_for_deep
```

- [ ] **Step 2: Run full verification**

Run:

```bash
uv run ruff check src/huaxia_tourismrag tests
uv run pytest -q
```

Expected:

- Ruff passes.
- Pytest passes.

- [ ] **Step 3: Run local benchmark**

Start backend and run:

```bash
uv run python scripts/benchmark_latency.py --base-url http://127.0.0.1:8000
```

Expected:

- Outputs JSON timing rows.
- No benchmark case returns HTTP 500.
- Deep cases either return job/progress quickly or finish with performance metadata.

## Rollout Order

1. Prompt compaction first. This is the safest immediate speed win.
2. Provider budgets second. This prevents Tavily/Firecrawl failures from poisoning latency.
3. Evidence-pack cache third. This improves repeated demo/public prompts.
4. Deferred topic sections fourth. This changes UX behavior and needs careful frontend testing.
5. Adaptive retrieval fan-out fifth. This gives another speed win but touches retrieval behavior.
6. Real-time progress polish last. It improves perceived latency and trust.

## Manual Benchmark Prompts

Use these after implementation:

- `北京三天怎么玩，简单说一下。`
- `成都和重庆6天，主要想吃本地美食，也想加一点轻松景点。`
- `上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。`
- `我想做一条三国历史巡礼路线，从北京出发并回到北京，必须覆盖涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中。10到12天，高铁优先，必要时包车。`

Compare before/after:

- total wall-clock time
- `performance.total_ms`
- number of web/MCP calls
- final prompt context character count
- returned citations count
- topic section quality warnings

## Completion Criteria

- `uv run ruff check src/huaxia_tourismrag tests` passes.
- `uv run pytest -q` passes.
- Benchmark script runs against local API.
- No citation faithfulness regressions.
- Topic tabs remain source-backed.
- Deep answer first response feels materially faster because topic sections can defer.

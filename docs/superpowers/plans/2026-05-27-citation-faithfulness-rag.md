# Citation Faithfulness RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make HuaXia TourismRAG a truly evidence-bound RAG system where every in-text citation/reference can be deterministically traced to an exact retrieved internal or web evidence source.

**Architecture:** Add a typed evidence quote registry around `CitationFormatter`, then validate every generated answer against that registry after LLM generation. The LLM may write natural language, but citation IDs, citation lines, source metadata, and cited source availability become deterministic code paths, not model discretion.

**Tech Stack:** Python 3.11, Pydantic v2 DTOs, PydanticAI, FastAPI, Streamlit, Qdrant, Firecrawl/web search, pytest, ruff.

---

## Current Risk Summary

Today the system retrieves internal/web chunks and builds citation lines in `src/huaxia_tourismrag/tools/citation_formatter.py`, then asks the LLM to produce `TravelAnswer.citations`. That is close to RAG, but not strict enough:

- The final model can omit citations it used, include unused citation lines, alter citation text, or cite `[9]` when only `[1]` through `[4]` exist.
- `CitationPack` only carries `context_text` and `citations`; it does not expose a structured registry of citation IDs mapped to chunk IDs, URL, source type, source name, and exact text excerpt.
- There is no post-generation citation validator in `qa_service.py` or `diy_itinerary_service.py`.
- Internal citation lines without URLs are currently shown as `internal`, which is not precise enough for auditing. They should expose stable internal chunk/source IDs.
- The user-facing answer can still over-cite policy docs or use policy sources to support scenic/food claims if the model chooses poorly.

## File Structure

Create:

- `src/huaxia_tourismrag/tools/citation_guard.py`
  - Deterministic citation parser, validator, and normalizer.
  - No network calls, no model calls.

- `tests/test_citation_guard.py`
  - Unit tests for citation ID parsing, unknown reference detection, exact citation-line normalization, and claim/source type mismatch checks.

- `evals/citation_faithfulness_cases.json`
  - Small manual/demo QA fixture with prompts and expected citation checks.

Modify:

- `src/huaxia_tourismrag/schemas/evidence.py`
  - Add typed `EvidenceQuote` / `CitationValidationIssue` DTOs.
  - Extend `CitationPack` while preserving current `context_text` and `citations` fields for API compatibility.

- `src/huaxia_tourismrag/tools/citation_formatter.py`
  - Generate stable evidence quote records.
  - Include exact quoted excerpts in `context_text`.
  - Use `internal:<chunk_id>` instead of plain `internal` for internal rows without URLs.

- `src/huaxia_tourismrag/agents/tourism_agent.py`
  - Tighten prompt rules so the model only uses citation IDs from the provided registry.
  - Require `citations` to be exact copied lines from allowed citations.

- `src/huaxia_tourismrag/services/qa_service.py`
  - Validate and normalize the final `TravelAnswer` before returning it.

- `src/huaxia_tourismrag/services/diy_itinerary_service.py`
  - Same validation/normalization for DIY answers.

- `tests/test_citation_formatter.py`
  - Update expectations for structured evidence quotes and internal IDs.

- `tests/test_tourism_agent.py`
  - Verify prompt contains strict citation registry rules.

- `tests/test_qa_service.py`
  - Verify service rejects/repairs fabricated citations.

- `tests/test_diy_itinerary_service.py`
  - Mirror QA service citation guard coverage for DIY route.

- `evals/manual_itinerary_quality.md`
  - Add citation-faithfulness smoke checks.

---

## Task 1: Add Structured Evidence Quote DTOs

**Files:**
- Modify: `src/huaxia_tourismrag/schemas/evidence.py`
- Test: `tests/test_citation_formatter.py`

- [ ] **Step 1: Write the failing test**

Add this test to `tests/test_citation_formatter.py`:

```python
def test_citation_formatter_builds_structured_evidence_quotes():
    formatter = CitationFormatter()
    chunk = _chunk("internal:shanxi:pingyao", "平遥古城", None)
    chunk.text = "平遥古城是山西重要历史文化目的地，适合安排古城墙、日升昌和双林寺。"
    chunk.source_name = "山西文旅内部结构化资料"

    pack = formatter.build([chunk])

    assert pack.evidence_quotes[0].citation_id == 1
    assert pack.evidence_quotes[0].chunk_id == "internal:shanxi:pingyao"
    assert pack.evidence_quotes[0].source_type == "internal"
    assert pack.evidence_quotes[0].source_name == "山西文旅内部结构化资料"
    assert pack.evidence_quotes[0].url is None
    assert pack.evidence_quotes[0].source_ref == "internal:internal:shanxi:pingyao"
    assert "平遥古城是山西重要历史文化目的地" in pack.evidence_quotes[0].quote
    assert "[1]" in pack.context_text
    assert "source_ref=internal:internal:shanxi:pingyao" in pack.context_text
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest tests/test_citation_formatter.py::test_citation_formatter_builds_structured_evidence_quotes -q
```

Expected: FAIL because `CitationPack.evidence_quotes` and `EvidenceQuote` do not exist.

- [ ] **Step 3: Implement the DTOs**

In `src/huaxia_tourismrag/schemas/evidence.py`, add after `CitationPack` imports and before `CitationPack`:

```python
class EvidenceQuote(BaseModel):
    """One exact evidence excerpt that may be cited in the final answer."""

    citation_id: int = Field(ge=1)
    chunk_id: str
    source_type: SourceType
    content_type: ContentType
    title: str
    source_name: str
    source_ref: str
    quote: str = Field(min_length=1, max_length=1800)
    url: HttpUrl | None = None
    score: float | None = None
    rerank_score: float | None = None


class CitationValidationIssue(BaseModel):
    """Deterministic citation validation issue after answer generation."""

    issue_type: Literal[
        "unknown_reference",
        "missing_citation_line",
        "altered_citation_line",
        "unused_citation_line",
        "source_type_mismatch",
    ]
    message: str
    citation_id: int | None = None
```

Then replace `CitationPack` with:

```python
class CitationPack(BaseModel):
    context_text: str
    citations: list[str]
    evidence_quotes: list[EvidenceQuote] = Field(default_factory=list)
```

- [ ] **Step 4: Run test to verify current formatter still fails**

Run:

```bash
uv run pytest tests/test_citation_formatter.py::test_citation_formatter_builds_structured_evidence_quotes -q
```

Expected: FAIL because formatter is not yet populating `evidence_quotes`.

- [ ] **Step 5: Commit DTO skeleton**

```bash
git add src/huaxia_tourismrag/schemas/evidence.py tests/test_citation_formatter.py
git commit -m "Add structured citation evidence DTOs"
```

---

## Task 2: Make CitationFormatter Produce Auditable Evidence Quotes

**Files:**
- Modify: `src/huaxia_tourismrag/tools/citation_formatter.py`
- Test: `tests/test_citation_formatter.py`

- [ ] **Step 1: Add internal source-ref test**

Update `test_citation_formatter_keeps_distinct_internal_chunks_without_urls`:

```python
def test_citation_formatter_keeps_distinct_internal_chunks_without_urls():
    formatter = CitationFormatter()

    pack = formatter.build(
        [
            _chunk("internal:1", "山西行前清单", None),
            _chunk("internal:2", "平遥住宿清单", None),
        ]
    )

    assert pack.citations == [
        "[1] 山西行前清单 - test - internal:internal:1",
        "[2] 平遥住宿清单 - test - internal:internal:2",
    ]
    assert pack.evidence_quotes[0].source_ref == "internal:internal:1"
    assert pack.evidence_quotes[1].source_ref == "internal:internal:2"
    assert "source_ref=internal:internal:1" in pack.context_text
    assert "source_ref=internal:internal:2" in pack.context_text
```

- [ ] **Step 2: Run citation formatter tests**

Run:

```bash
uv run pytest tests/test_citation_formatter.py -q
```

Expected: FAIL on internal citation line format and missing `evidence_quotes`.

- [ ] **Step 3: Implement formatter changes**

Replace the loop in `CitationFormatter.build()` with this structure:

```python
from huaxia_tourismrag.schemas.evidence import CitationPack, EvidenceQuote, TravelChunk


class CitationFormatter:
    def build(self, chunks: list[TravelChunk]) -> CitationPack:
        citation_lines: list[str] = []
        context_blocks: list[str] = []
        evidence_quotes: list[EvidenceQuote] = []
        seen_keys: set[str] = set()

        unique_chunks: list[TravelChunk] = []
        for chunk in chunks:
            key = self._dedupe_key(chunk)
            if key in seen_keys:
                continue
            seen_keys.add(key)
            unique_chunks.append(chunk)

        for index, chunk in enumerate(unique_chunks, start=1):
            source_ref = self._source_ref(chunk)
            label = f"[{index}]"
            quote = self._quote_text(chunk.text)
            citation_lines.append(
                f"{label} {chunk.title} - {chunk.source_name} - {source_ref}"
            )
            evidence_quotes.append(
                EvidenceQuote(
                    citation_id=index,
                    chunk_id=chunk.id,
                    source_type=chunk.source_type,
                    content_type=chunk.content_type,
                    title=chunk.title,
                    source_name=chunk.source_name,
                    source_ref=source_ref,
                    quote=quote,
                    url=chunk.url,
                    score=chunk.score,
                    rerank_score=chunk.rerank_score,
                )
            )
            context_blocks.append(
                f"{label} citation_id={index}\n"
                f"chunk_id={chunk.id}\n"
                f"title={chunk.title}\n"
                f"source_type={chunk.source_type}\n"
                f"content_type={chunk.content_type}\n"
                f"source_name={chunk.source_name}\n"
                f"source_ref={source_ref}\n"
                f"score={chunk.score}\n"
                f"quote={quote}"
            )

        return CitationPack(
            context_text="\n\n".join(context_blocks),
            citations=citation_lines,
            evidence_quotes=evidence_quotes,
        )

    def _source_ref(self, chunk: TravelChunk) -> str:
        if chunk.url:
            return self._normalize_url(str(chunk.url))
        return f"internal:{chunk.id}"

    def _quote_text(self, text: str) -> str:
        normalized = " ".join(text.split())
        return normalized[:1600]
```

Keep existing `_dedupe_key()` and `_normalize_url()` methods.

- [ ] **Step 4: Run formatter tests**

Run:

```bash
uv run pytest tests/test_citation_formatter.py -q
```

Expected: PASS.

- [ ] **Step 5: Run broader schema/tool tests**

Run:

```bash
uv run pytest tests/test_citation_formatter.py tests/test_tourism_agent.py tests/test_qa_service.py -q
```

Expected: Some tests may fail because they still expect `internal` instead of `internal:<chunk_id>`. Update only test expectations that compare exact citation strings.

- [ ] **Step 6: Commit formatter**

```bash
git add src/huaxia_tourismrag/tools/citation_formatter.py tests/test_citation_formatter.py tests/test_tourism_agent.py tests/test_qa_service.py
git commit -m "Build auditable citation quote registry"
```

---

## Task 3: Add Deterministic CitationGuard

**Files:**
- Create: `src/huaxia_tourismrag/tools/citation_guard.py`
- Create: `tests/test_citation_guard.py`

- [ ] **Step 1: Write tests for valid and invalid references**

Create `tests/test_citation_guard.py`:

```python
from huaxia_tourismrag.schemas.evidence import CitationPack, EvidenceQuote, TravelAnswer
from huaxia_tourismrag.tools.citation_guard import CitationGuard


def _pack() -> CitationPack:
    quotes = [
        EvidenceQuote(
            citation_id=1,
            chunk_id="food:chengdu",
            source_type="internal",
            content_type="local_cuisine",
            title="成都本地美食",
            source_name="内部美食库",
            source_ref="internal:food:chengdu",
            quote="成都美食包括火锅、担担面、钟水饺和甜水面。",
        ),
        EvidenceQuote(
            citation_id=2,
            chunk_id="web:wuhou",
            source_type="web",
            content_type="attraction",
            title="成都武侯祠官方参观信息",
            source_name="firecrawl",
            source_ref="https://www.example.com/wuhou",
            quote="成都武侯祠博物馆发布参观预约和开放信息。",
            url="https://www.example.com/wuhou",
        ),
    ]
    return CitationPack(
        context_text="",
        citations=[
            "[1] 成都本地美食 - 内部美食库 - internal:food:chengdu",
            "[2] 成都武侯祠官方参观信息 - firecrawl - https://www.example.com/wuhou",
        ],
        evidence_quotes=quotes,
    )


def test_citation_guard_normalizes_used_citation_lines_exactly():
    answer = TravelAnswer(
        answer="成都可安排火锅和担担面[1]，武侯祠需要关注预约信息[2]。",
        highlights=["美食与景点都有来源[1][2]"],
        warnings=[],
        citations=["[1] altered", "[2] also altered"],
    )

    result = CitationGuard().validate_and_normalize(answer, _pack())

    assert result.issues == []
    assert result.answer.citations == [
        "[1] 成都本地美食 - 内部美食库 - internal:food:chengdu",
        "[2] 成都武侯祠官方参观信息 - firecrawl - https://www.example.com/wuhou",
    ]


def test_citation_guard_reports_unknown_references():
    answer = TravelAnswer(
        answer="成都可安排火锅[9]。",
        highlights=[],
        warnings=[],
        citations=[],
    )

    result = CitationGuard().validate_and_normalize(answer, _pack())

    assert [issue.issue_type for issue in result.issues] == ["unknown_reference"]
    assert result.issues[0].citation_id == 9
    assert result.answer.citations == []


def test_citation_guard_drops_unused_citation_lines():
    answer = TravelAnswer(
        answer="成都可安排火锅[1]。",
        highlights=[],
        warnings=[],
        citations=[
            "[1] 成都本地美食 - 内部美食库 - internal:food:chengdu",
            "[2] 成都武侯祠官方参观信息 - firecrawl - https://www.example.com/wuhou",
        ],
    )

    result = CitationGuard().validate_and_normalize(answer, _pack())

    assert result.answer.citations == [
        "[1] 成都本地美食 - 内部美食库 - internal:food:chengdu",
    ]
    assert [issue.issue_type for issue in result.issues] == ["unused_citation_line"]
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
uv run pytest tests/test_citation_guard.py -q
```

Expected: FAIL because `citation_guard.py` does not exist.

- [ ] **Step 3: Implement CitationGuard**

Create `src/huaxia_tourismrag/tools/citation_guard.py`:

```python
"""Deterministic validation for final-answer citations."""

from dataclasses import dataclass
import re

from huaxia_tourismrag.schemas.evidence import (
    CitationPack,
    CitationValidationIssue,
    TravelAnswer,
)

_BRACKET_REF_RE = re.compile(r"\[(\d+)\]")


@dataclass
class CitationGuardResult:
    answer: TravelAnswer
    issues: list[CitationValidationIssue]


class CitationGuard:
    """Validate that final answer citations come from the formatter registry."""

    def validate_and_normalize(
        self,
        answer: TravelAnswer,
        pack: CitationPack,
    ) -> CitationGuardResult:
        allowed_lines = self._allowed_lines(pack)
        used_ids = self._used_reference_ids(answer)
        issues: list[CitationValidationIssue] = []

        for citation_id in sorted(used_ids):
            if citation_id not in allowed_lines:
                issues.append(
                    CitationValidationIssue(
                        issue_type="unknown_reference",
                        citation_id=citation_id,
                        message=f"Answer used unknown citation [{citation_id}].",
                    )
                )

        existing_ids = self._citation_line_ids(answer.citations)
        for citation_id in sorted(existing_ids - used_ids):
            issues.append(
                CitationValidationIssue(
                    issue_type="unused_citation_line",
                    citation_id=citation_id,
                    message=f"Citation line [{citation_id}] was listed but not used.",
                )
            )

        normalized = [
            allowed_lines[citation_id]
            for citation_id in sorted(used_ids)
            if citation_id in allowed_lines
        ]
        answer.citations = normalized
        return CitationGuardResult(answer=answer, issues=issues)

    def _allowed_lines(self, pack: CitationPack) -> dict[int, str]:
        lines: dict[int, str] = {}
        for line in pack.citations:
            match = _BRACKET_REF_RE.match(line.strip())
            if match:
                lines[int(match.group(1))] = line
        return lines

    def _used_reference_ids(self, answer: TravelAnswer) -> set[int]:
        text_parts = [answer.answer]
        text_parts.extend(answer.highlights)
        text_parts.extend(answer.warnings)
        if answer.generated_itinerary:
            for day in answer.generated_itinerary.itinerary:
                text_parts.append(day.city)
                if day.notes:
                    text_parts.append(day.notes)
                for activity in day.activities:
                    text_parts.append(activity.name)
                    text_parts.append(activity.description)
                    if activity.location:
                        text_parts.append(activity.location)
                    if activity.opening_hours:
                        text_parts.append(activity.opening_hours)
        joined = "\n".join(text_parts)
        return {int(match) for match in _BRACKET_REF_RE.findall(joined)}

    def _citation_line_ids(self, citations: list[str]) -> set[int]:
        ids: set[int] = set()
        for line in citations:
            match = _BRACKET_REF_RE.match(line.strip())
            if match:
                ids.add(int(match.group(1)))
        return ids
```

- [ ] **Step 4: Run guard tests**

Run:

```bash
uv run pytest tests/test_citation_guard.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit guard**

```bash
git add src/huaxia_tourismrag/tools/citation_guard.py tests/test_citation_guard.py
git commit -m "Add deterministic citation guard"
```

---

## Task 4: Tighten the Final Answer Prompt Contract

**Files:**
- Modify: `src/huaxia_tourismrag/agents/tourism_agent.py`
- Test: `tests/test_tourism_agent.py`

- [ ] **Step 1: Add prompt assertion test**

Add to `tests/test_tourism_agent.py`:

```python
def test_final_answer_prompt_requires_exact_allowed_citation_lines():
    prompt = build_final_answer_prompt(
        question="成都重庆怎么吃？",
        citation_context=(
            "[1] citation_id=1\n"
            "chunk_id=food:chengdu\n"
            "source_type=internal\n"
            "content_type=local_cuisine\n"
            "source_ref=internal:food:chengdu\n"
            "quote=成都美食包括火锅、担担面和钟水饺。"
        ),
        citation_lines=[
            "[1] 成都本地美食 - 内部美食库 - internal:food:chengdu",
        ],
        detail_level="concise",
    )

    assert "只能引用“允许使用的引用”里的编号" in prompt
    assert "citations 字段必须逐字复制" in prompt
    assert "不要输出未在允许列表中的引用编号" in prompt
    assert "不要把政策/铁路来源用于支撑景点或美食推荐" in prompt
```

- [ ] **Step 2: Run prompt test to verify failure**

Run:

```bash
uv run pytest tests/test_tourism_agent.py::test_final_answer_prompt_requires_exact_allowed_citation_lines -q
```

Expected: FAIL because the exact rules are not yet present.

- [ ] **Step 3: Update prompt rules**

In `build_final_answer_prompt()` rules, insert after `- 只能使用上面的证据。`:

```text
- 只能引用“允许使用的引用”里的编号，例如 [1]、[2]；不要输出未在允许列表中的引用编号。
- citations 字段必须逐字复制“允许使用的引用”中实际用到的完整行，不要改写标题、source_name 或 url/source_ref。
- 如果某句话没有对应证据，不要给它加引用；改写成“建议二次核验”或放入待确认事项。
- 不要把政策/铁路来源用于支撑景点或美食推荐；政策/铁路来源只可支撑票务、实名制、退改、禁限携带、合同和安全类说明。
- 同一段同时引用多个来源时，确保每个编号都直接支持该段中的对应事实。
```

- [ ] **Step 4: Run prompt tests**

Run:

```bash
uv run pytest tests/test_tourism_agent.py -q
```

Expected: PASS after updating expectations if existing prompt tests need exact wording changes.

- [ ] **Step 5: Commit prompt contract**

```bash
git add src/huaxia_tourismrag/agents/tourism_agent.py tests/test_tourism_agent.py
git commit -m "Tighten final answer citation contract"
```

---

## Task 5: Enforce CitationGuard in QA Service

**Files:**
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
- Test: `tests/test_qa_service.py`

- [ ] **Step 1: Add failing service test**

Add to `tests/test_qa_service.py`:

```python
@pytest.mark.asyncio
async def test_answer_normalizes_citations_to_exact_pack_lines(monkeypatch):
    async def fake_create_research_plan(question, preference_profile=None, intent_decision=None):
        return TravelResearchPlan(
            original_question=str(question.question),
            destination="成都",
            tasks=[
                TravelResearchTask(
                    task_type="food",
                    query="成都 本地美食",
                    reason="核验美食。",
                )
            ],
        )

    async def fake_generate_answer_with_context(**kwargs):
        return TravelAnswer(
            answer="成都可安排火锅和担担面[1]。",
            highlights=[],
            warnings=[],
            citations=["[1] model altered this line"],
        )

    class FoodInternalRAG:
        async def retrieve(self, query: str, tenant_id: str, limit: int = 12):
            return [
                TravelChunk(
                    id="food:chengdu",
                    source_type="internal",
                    content_type="local_cuisine",
                    title="成都本地美食",
                    text="成都美食包括火锅、担担面和钟水饺。",
                    source_name="内部美食库",
                    retrieved_at=datetime.now(timezone.utc),
                    score=0.9,
                )
            ]

    monkeypatch.setattr(qa_service_module, "create_research_plan", fake_create_research_plan)
    monkeypatch.setattr(qa_service_module, "generate_answer_with_context", fake_generate_answer_with_context)

    deps = TourismDeps(
        tenant_id="demo-tenant",
        internal_rag=FoodInternalRAG(),
        web_search=FakeWebSearch([]),
        webpage_reader=FakeWebpageReader(),
        reranker=FakeReranker(),
        citations=CitationFormatter(),
    )
    service = TourismQAService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=0,
        top_k=4,
    )

    answer = await service.answer(TravelQuestion(question="成都重庆怎么吃？"))

    assert answer.citations == [
        "[1] 成都本地美食 - 内部美食库 - internal:food:chengdu"
    ]
```

If helper class names differ in the current test file, define local fakes in the test with the same methods shown above.

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
uv run pytest tests/test_qa_service.py::test_answer_normalizes_citations_to_exact_pack_lines -q
```

Expected: FAIL because service returns the model-altered citation line.

- [ ] **Step 3: Wire CitationGuard into `TourismQAService`**

In `src/huaxia_tourismrag/services/qa_service.py`:

1. Add import:

```python
from huaxia_tourismrag.tools.citation_guard import CitationGuard
```

2. In `TourismQAService.__init__`, add:

```python
self.citation_guard = CitationGuard()
```

3. After `generate_answer_with_context(...)` and before setting `service_enrichment`, add:

```python
guard_result = self.citation_guard.validate_and_normalize(answer, pack)
answer = guard_result.answer
if guard_result.issues:
    issue_summary = "；".join(issue.message for issue in guard_result.issues[:3])
    answer.warnings.append(f"引用校验已自动修正：{issue_summary}")
```

- [ ] **Step 4: Run service test**

Run:

```bash
uv run pytest tests/test_qa_service.py::test_answer_normalizes_citations_to_exact_pack_lines -q
```

Expected: PASS.

- [ ] **Step 5: Run all QA service tests**

Run:

```bash
uv run pytest tests/test_qa_service.py -q
```

Expected: PASS.

- [ ] **Step 6: Commit QA service guard**

```bash
git add src/huaxia_tourismrag/services/qa_service.py tests/test_qa_service.py
git commit -m "Enforce citation guard in QA service"
```

---

## Task 6: Enforce CitationGuard in DIY Service

**Files:**
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
- Test: `tests/test_diy_itinerary_service.py`

- [ ] **Step 1: Add DIY citation normalization test**

Add to `tests/test_diy_itinerary_service.py`:

```python
@pytest.mark.asyncio
async def test_diy_answer_normalizes_citations_to_exact_pack_lines(monkeypatch):
    async def fake_create_diy_itinerary_plan(question, preference_profile=None, intent_decision=None):
        return DIYItineraryPlan(
            original_question=str(question.question),
            theme="三国历史巡礼",
            origin="北京",
            return_city="北京",
            required_stops=["成都"],
            proposed_route=["北京", "成都", "北京"],
            route_order_policy="optimize_for_transport",
            travel_mode="rail",
            tasks=[
                TravelResearchTask(
                    task_type="attraction",
                    query="成都 武侯祠 三国 官方",
                    reason="核验武侯祠。",
                )
            ],
        )

    async def fake_generate_answer_with_context(**kwargs):
        return TravelAnswer(
            answer="成都段应围绕武侯祠展开[1]。",
            highlights=[],
            warnings=[],
            citations=["[1] model changed the citation"],
        )

    class WuhouInternalRAG:
        async def retrieve(self, query: str, tenant_id: str, limit: int = 12):
            return [
                TravelChunk(
                    id="attraction:chengdu:wuhou",
                    source_type="internal",
                    content_type="attraction",
                    title="成都武侯祠",
                    text="成都武侯祠是蜀汉主题的重要文化景点。",
                    source_name="内部景区库",
                    retrieved_at=datetime.now(timezone.utc),
                    score=0.95,
                )
            ]

    monkeypatch.setattr(diy_service_module, "create_diy_itinerary_plan", fake_create_diy_itinerary_plan)
    monkeypatch.setattr(diy_service_module, "generate_answer_with_context", fake_generate_answer_with_context)

    deps = TourismDeps(
        tenant_id="demo-tenant",
        internal_rag=WuhouInternalRAG(),
        web_search=FakeWebSearch([]),
        webpage_reader=FakeWebpageReader(),
        reranker=FakeReranker(),
        citations=CitationFormatter(),
    )
    service = DIYItineraryService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=0,
        top_k=4,
    )

    answer = await service.answer(
        TravelQuestion(question="做一条三国历史巡礼，必须覆盖成都。")
    )

    assert answer.citations == [
        "[1] 成都武侯祠 - 内部景区库 - internal:attraction:chengdu:wuhou"
    ]
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
uv run pytest tests/test_diy_itinerary_service.py::test_diy_answer_normalizes_citations_to_exact_pack_lines -q
```

Expected: FAIL because DIY service does not yet guard citations.

- [ ] **Step 3: Wire CitationGuard into DIY service**

In `src/huaxia_tourismrag/services/diy_itinerary_service.py`:

1. Add import:

```python
from huaxia_tourismrag.tools.citation_guard import CitationGuard
```

2. In `DIYItineraryService.__init__`, add:

```python
self.citation_guard = CitationGuard()
```

3. After `generate_answer_with_context(...)` and before setting `service_enrichment`, add:

```python
guard_result = self.citation_guard.validate_and_normalize(answer, pack)
answer = guard_result.answer
if guard_result.issues:
    issue_summary = "；".join(issue.message for issue in guard_result.issues[:3])
    answer.warnings.append(f"引用校验已自动修正：{issue_summary}")
```

- [ ] **Step 4: Run DIY tests**

Run:

```bash
uv run pytest tests/test_diy_itinerary_service.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit DIY service guard**

```bash
git add src/huaxia_tourismrag/services/diy_itinerary_service.py tests/test_diy_itinerary_service.py
git commit -m "Enforce citation guard in DIY service"
```

---

## Task 7: Add Source-Type Compatibility Checks

**Files:**
- Modify: `src/huaxia_tourismrag/tools/citation_guard.py`
- Test: `tests/test_citation_guard.py`

- [ ] **Step 1: Add source mismatch tests**

Add to `tests/test_citation_guard.py`:

```python
def test_citation_guard_flags_policy_source_used_for_food_claim():
    pack = CitationPack(
        context_text="",
        citations=[
            "[1] 铁路旅客运输规程 - 中国政府网 - https://www.gov.cn/rail",
        ],
        evidence_quotes=[
            EvidenceQuote(
                citation_id=1,
                chunk_id="policy:rail",
                source_type="internal",
                content_type="railway",
                title="铁路旅客运输规程",
                source_name="中国政府网",
                source_ref="https://www.gov.cn/rail",
                quote="铁路客票载明发到站、车次、席别、票价等信息。",
                url="https://www.gov.cn/rail",
            )
        ],
    )
    answer = TravelAnswer(
        answer="成都美食建议安排火锅和小面[1]。",
        highlights=[],
        warnings=[],
        citations=[],
    )

    result = CitationGuard().validate_and_normalize(answer, pack)

    assert any(issue.issue_type == "source_type_mismatch" for issue in result.issues)
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
uv run pytest tests/test_citation_guard.py::test_citation_guard_flags_policy_source_used_for_food_claim -q
```

Expected: FAIL because source-type compatibility is not implemented.

- [ ] **Step 3: Implement compatibility heuristic**

In `CitationGuard`, add:

```python
POLICY_CONTENT_TYPES = {
    "legal",
    "regulation",
    "railway",
    "transport",
    "road_transport",
    "aviation",
    "tourism_safety",
    "contract",
    "consumer_protection",
}

FOOD_HINTS = ("美食", "火锅", "小面", "川菜", "粤菜", "小吃", "餐厅", "吃", "面", "粉")
SCENIC_HINTS = ("景区", "景点", "古城", "博物馆", "寺", "山", "石窟", "游览")
POLICY_HINTS = ("实名", "退票", "改签", "禁限", "安检", "合同", "票价", "车次", "承运")
```

Then call this from `validate_and_normalize()` after unknown-reference detection:

```python
self._add_source_type_issues(answer, pack, used_ids, issues)
```

Add methods:

```python
def _add_source_type_issues(
    self,
    answer: TravelAnswer,
    pack: CitationPack,
    used_ids: set[int],
    issues: list[CitationValidationIssue],
) -> None:
    quote_by_id = {quote.citation_id: quote for quote in pack.evidence_quotes}
    answer_text = self._answer_text(answer)
    for citation_id in used_ids:
        quote = quote_by_id.get(citation_id)
        if not quote:
            continue
        if quote.content_type in POLICY_CONTENT_TYPES:
            if self._looks_like_food_or_scenic_claim(answer_text) and not self._looks_like_policy_claim(answer_text):
                issues.append(
                    CitationValidationIssue(
                        issue_type="source_type_mismatch",
                        citation_id=citation_id,
                        message=f"Citation [{citation_id}] is policy/transport evidence but appears attached to scenic or food recommendations.",
                    )
                )

def _answer_text(self, answer: TravelAnswer) -> str:
    text_parts = [answer.answer]
    text_parts.extend(answer.highlights)
    text_parts.extend(answer.warnings)
    return "\n".join(text_parts)

def _looks_like_food_or_scenic_claim(self, text: str) -> bool:
    return any(hint in text for hint in FOOD_HINTS + SCENIC_HINTS)

def _looks_like_policy_claim(self, text: str) -> bool:
    return any(hint in text for hint in POLICY_HINTS)
```

This is intentionally conservative. It flags suspicious policy citation use; it does not try to prove every claim semantically.

- [ ] **Step 4: Run citation guard tests**

Run:

```bash
uv run pytest tests/test_citation_guard.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit compatibility checks**

```bash
git add src/huaxia_tourismrag/tools/citation_guard.py tests/test_citation_guard.py
git commit -m "Flag incompatible citation source types"
```

---

## Task 8: Surface Citation Validation in Performance Trace

**Files:**
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
- Test: `tests/test_qa_service.py`
- Test: `tests/test_diy_itinerary_service.py`

- [ ] **Step 1: Add test expectation**

In the citation normalization tests from Tasks 5 and 6, assert:

```python
assert answer.performance is not None
assert any(stage.name == "citation_guard" for stage in answer.performance.stages)
```

If existing performance test helpers represent stages as dicts, assert the equivalent key:

```python
assert any(stage["name"] == "citation_guard" for stage in answer.performance["stages"])
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
uv run pytest tests/test_qa_service.py tests/test_diy_itinerary_service.py -q
```

Expected: FAIL because guard is not timed yet.

- [ ] **Step 3: Wrap guard in timer stage**

In both services, replace the guard block with:

```python
with timer.stage("citation_guard") as stage_metadata:
    guard_result = self.citation_guard.validate_and_normalize(answer, pack)
    stage_metadata["issues"] = len(guard_result.issues)
    stage_metadata["available_citations"] = len(pack.citations)
    stage_metadata["returned_citations"] = len(guard_result.answer.citations)
    answer = guard_result.answer
```

Keep the warning append after this block.

- [ ] **Step 4: Run tests**

Run:

```bash
uv run pytest tests/test_qa_service.py tests/test_diy_itinerary_service.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit timing visibility**

```bash
git add src/huaxia_tourismrag/services/qa_service.py src/huaxia_tourismrag/services/diy_itinerary_service.py tests/test_qa_service.py tests/test_diy_itinerary_service.py
git commit -m "Expose citation guard timing and issue counts"
```

---

## Task 9: Add Citation Faithfulness Eval Fixture

**Files:**
- Create: `evals/citation_faithfulness_cases.json`
- Modify: `evals/manual_itinerary_quality.md`

- [ ] **Step 1: Create eval fixture**

Create `evals/citation_faithfulness_cases.json`:

```json
[
  {
    "id": "chengdu_chongqing_food",
    "mode": "normal",
    "prompt": "成都和重庆6天，主要想吃本地美食，也想加一点轻松景点，不想每天赶路。",
    "expected_checks": [
      "Every citation id used in answer/highlights/warnings exists in citations.",
      "Citations for 火锅、小面、担担面、串串、钵钵鸡 or other food claims must map to local_cuisine/local_specialty/internal food or web travel evidence, not railway/legal evidence.",
      "No citation line is fabricated or rewritten by the model."
    ]
  },
  {
    "id": "sanguo_diy",
    "mode": "diy",
    "prompt": "我想做一条三国历史巡礼路线，从北京出发并回到北京，必须覆盖涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中。10到12天，高铁优先，必要时包车。",
    "expected_checks": [
      "Citations for 三国景点/遗址 claims map to attraction/heritage/web evidence.",
      "Railway or tourism law citations only support transport/compliance reminders.",
      "All citation lines are exact allowed lines from CitationPack."
    ]
  },
  {
    "id": "beijing_xian_heritage",
    "mode": "normal",
    "prompt": "北京和西安8天，第一次来中国，想看文化遗产和博物馆，节奏不要太累。",
    "expected_checks": [
      "Museum/reservation claims cite official or current web evidence when available.",
      "Food claims cite food/local guide evidence.",
      "No unknown bracket citation ids appear."
    ]
  }
]
```

- [ ] **Step 2: Update manual QA doc**

In `evals/manual_itinerary_quality.md`, add a section:

```markdown
## Citation Faithfulness Checks

- In every answer, search for bracket refs like `[1]`. Each number must exist in the `citations` list.
- Every `citations` item must exactly match an allowed formatter line: `[n] title - source_name - url_or_internal_ref`.
- Food/scenic claims must not cite railway, legal, or safety sources.
- Railway/legal/policy citations should appear only in transport, contract, booking, safety, refund, or compliance paragraphs.
- For internal sources without URLs, citation lines must use `internal:<chunk_id>`, not plain `internal`.
```

- [ ] **Step 3: Commit eval fixture**

```bash
git add evals/citation_faithfulness_cases.json evals/manual_itinerary_quality.md
git commit -m "Add citation faithfulness eval checklist"
```

---

## Task 10: End-to-End Verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Run lint**

Run:

```bash
uv run ruff check src/huaxia_tourismrag tests
```

Expected: `All checks passed!`

- [ ] **Step 2: Run full tests**

Run:

```bash
uv run pytest -q
```

Expected: all tests pass.

- [ ] **Step 3: Run one live API smoke test**

With local FastAPI running:

```bash
uv run huaxia-tourismrag ask "成都和重庆6天，主要想吃本地美食，也想加一点轻松景点，不想每天赶路。" --detail concise --timeout 900 --raw > /tmp/huaxia-citation-smoke.json
```

Then inspect:

```bash
uv run python - <<'PY'
import json, re
from pathlib import Path

data = json.loads(Path("/tmp/huaxia-citation-smoke.json").read_text())
text = "\n".join([
    data.get("answer", ""),
    "\n".join(data.get("highlights") or []),
    "\n".join(data.get("warnings") or []),
])
used = {int(x) for x in re.findall(r"\[(\d+)\]", text)}
listed = {int(x) for c in data.get("citations") or [] for x in re.findall(r"^\[(\d+)\]", c)}
print("used", sorted(used))
print("listed", sorted(listed))
print("unknown", sorted(used - listed))
print("citations", data.get("citations") or [])
PY
```

Expected:

- `unknown []`
- citation lines use exact formatter format
- no policy citation supports food/scenic recommendations

- [ ] **Step 4: Commit if verification changed docs or fixtures**

If no files changed, no commit. If QA notes were updated:

```bash
git add evals/manual_itinerary_quality.md
git commit -m "Record citation faithfulness smoke test"
```

---

## Acceptance Criteria

- `CitationPack` contains structured `evidence_quotes`.
- Every citation line maps to a deterministic `EvidenceQuote`.
- Internal sources without URLs cite `internal:<chunk_id>` instead of plain `internal`.
- Generated `TravelAnswer.citations` is normalized to exact allowed formatter lines.
- Unknown bracket references are detected.
- Unused citation lines are removed from the returned `citations` list.
- Suspicious use of policy/railway/legal evidence for food/scenic claims is flagged in warnings.
- QA and DIY services both run the guard.
- Citation guard issue counts appear in performance trace.
- Manual eval docs include citation faithfulness checks.
- `uv run ruff check src/huaxia_tourismrag tests` passes.
- `uv run pytest -q` passes.

## Known Limits

- This plan guarantees citation identity and source compatibility; it does not fully prove every sentence is semantically entailed by the cited quote.
- A future stricter phase can add model-assisted claim extraction plus NLI/LLM judging, but that should not be the first implementation because deterministic guardrails will remove the biggest failure modes at much lower cost.


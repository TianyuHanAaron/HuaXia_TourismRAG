# Pydantic Graph Engagement Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use Pydantic Graph to run a separate waiting-room mini-encyclopedia feed that appears within seconds while the deep RAG itinerary continues in the background.

**Architecture:** Keep the main itinerary RAG pipeline unchanged and citation-faithful. Add a sidecar `EngagementFeedGraph` that starts only after all checkpoints are resolved and an async travel job has been created. The sidecar writes batches of typed cards into `TravelJob.engagement_feed`; Streamlit polls job status and rotates six-card batches every 10 seconds until the final RAG answer arrives.

**Tech Stack:** Pydantic v2 DTOs, `pydantic_graph.GraphBuilder` from PydanticAI 1.102, Qwen Cloud structured JSON runner, FastAPI background tasks, existing Redis/in-memory job store, Streamlit polling UI, pytest/ruff.

**References:**
- Pydantic Graph docs: https://ai.pydantic.dev/graph/
- Pydantic AI structured output docs: https://ai.pydantic.dev/output/
- Existing async job flow: `src/huaxia_tourismrag/api/routes.py`, `src/huaxia_tourismrag/schemas/jobs.py`, `src/huaxia_tourismrag/services/job_store.py`

---

## Product Rules

1. **Waiting-room feed is not RAG evidence.** It must never enter `CitationPack`, `TravelAnswer.citations`, or the final-answer prompt.
2. **It starts after user intent is complete.** It runs for async deep jobs only, including form jobs, DIY jobs, normal deep jobs, and deep session-reply jobs after checkpoint resolution.
3. **It must render in seconds.** Job status must expose an immediate `engagement_feed.status="loading"` object. The first real card batch should use a fast model and an 8-second timeout. If Qwen is slow, Streamlit still shows a polished loading shell.
4. **It is DTO-driven.** No regex or term-trigger scanning. Entity seeds come from `TravelQuestion` fields, `TravelFormRequest` fields, or an LLM extractor that returns a validated DTO.
5. **Cards are long-form but bounded.** Each card body should be 300-500 Chinese characters. The graph validates length and removes underdeveloped cards instead of padding with junk.
6. **Content mix is deliberate.** Across three batches of six cards:
   - 景点冷知识: 5 cards
   - 城市民俗: 5 cards
   - 本地味道: 5 cards
   - 旅客提醒: 3 cards
7. **No fake real-time facts.** The sidecar may use model prior knowledge for culture, history, local food, and common-sense travel reminders. It must not claim current ticket prices, opening hours, weather forecast, hotel availability, traffic, ranking, or booking status.
8. **Transition matters.** While pending, cards are the main waiting-room surface. When the final answer arrives, the waiting room collapses into a small optional “刚才路上看的小百科” expander so the authoritative RAG answer owns the page.

---

## File Structure

- Create `src/huaxia_tourismrag/schemas/engagement.py`
  - Public DTOs for card type, card, batch, feed status, and graph input/output.
- Create `src/huaxia_tourismrag/agents/engagement_feed_agent.py`
  - Qwen structured prompts for entity extraction and card generation.
  - Uses existing Qwen Cloud runner/model split rather than PydanticAI tool calls.
- Create `src/huaxia_tourismrag/services/engagement_feed_graph.py`
  - Pydantic GraphBuilder graph definition and orchestration nodes.
  - Generates first batch fast, persists it, then continues with later batches.
- Create `src/huaxia_tourismrag/services/engagement_feed_service.py`
  - Public service wrapper used by FastAPI routes/background jobs.
  - Enforces timeout, feature flag, and graceful failure.
- Modify `src/huaxia_tourismrag/schemas/jobs.py`
  - Add `engagement_feed: EngagementFeed | None` to `TravelJob` and `TravelJobStatusResponse`.
- Modify `src/huaxia_tourismrag/services/job_store.py`
  - Add `update_engagement_feed(...)` to the protocol, in-memory store, and Redis store.
- Modify `src/huaxia_tourismrag/api/routes.py`
  - Start the engagement sidecar when async jobs are created.
  - Do not start it for sync endpoints or unresolved checkpoint responses.
- Modify `src/huaxia_tourismrag/bootstrap.py`
  - Build `EngagementFeedService` and attach it to `app.state`.
- Modify `src/huaxia_tourismrag/core/config.py`
  - Add feature flags and timeout settings.
- Modify `src/huaxia_tourismrag/frontend/streamlit_client.py`
  - Preserve `engagement_feed` from job status.
- Modify `src/huaxia_tourismrag/streamlit_app.py`
  - Render the glassmorphism six-card waiting room and rotate batches every 10 seconds.
- Add tests:
  - `tests/test_engagement_feed_schemas.py`
  - `tests/test_engagement_feed_graph.py`
  - `tests/test_engagement_feed_service.py`
  - Extend `tests/test_routes.py`
  - Extend `tests/test_streamlit_frontend.py`

---

## Graph Design

Use `pydantic_graph.GraphBuilder`, not the deprecated `BaseNode`/`Graph` API. Local package inspection shows importing `Graph` emits a deprecation warning in `pydantic_graph==1.102.0`.

### DTOs

```python
EngagementCardType = Literal[
    "attraction_knowledge",
    "city_folk_custom",
    "local_flavor",
    "traveler_reminder",
]

class EngagementCard(BaseModel):
    card_id: str
    card_type: EngagementCardType
    entity: str
    title: str
    body: str = Field(min_length=180, max_length=650)
    confidence: Literal[
        "general_knowledge",
        "soft_legend",
        "culture_note",
        "travel_common_sense",
    ]

class EngagementBatch(BaseModel):
    batch_index: int = Field(ge=0, le=4)
    cards: list[EngagementCard] = Field(min_length=1, max_length=6)

class EngagementFeed(BaseModel):
    status: Literal["disabled", "loading", "partial", "ready", "failed"] = "loading"
    batches: list[EngagementBatch] = Field(default_factory=list, max_length=3)
    message: str | None = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
```

### Graph State

```python
class EngagementFeedState(BaseModel):
    job_id: str
    tenant_id: str
    language: Literal["zh-CN", "en"] = "zh-CN"
    seed_entities: list[str] = Field(default_factory=list, max_length=16)
    selected_entities: list[str] = Field(default_factory=list, max_length=12)
    generated_batches: list[EngagementBatch] = Field(default_factory=list, max_length=3)
    warnings: list[str] = Field(default_factory=list, max_length=8)
```

### Graph Dependencies

```python
class EngagementFeedDeps(BaseModel):
    model_name: str
    first_batch_timeout_seconds: float
    full_feed_timeout_seconds: float
    generator: EngagementFeedAgent
    job_store: TravelJobStore
```

### Node Flow

1. `start -> BuildSeedEntities`
   - Pull entities from `TravelFormRequest.destination`, `required_stops`, `must_have`, `attraction_preferences`, and `TravelQuestion.destination/interests`.
   - No regex, no keyword triggers.
2. `BuildSeedEntities -> ExtractEntitiesWhenNeeded`
   - If structured fields have enough seeds, skip the LLM extractor.
   - Otherwise ask Qwen Flash for `EngagementEntityPack`.
3. `ExtractEntitiesWhenNeeded -> PlanBatches`
   - Create three batch specs:
     - Batch 0: 2 景点冷知识, 2 城市民俗, 1 本地味道, 1 旅客提醒
     - Batch 1: 2 景点冷知识, 1 城市民俗, 2 本地味道, 1 旅客提醒
     - Batch 2: 1 景点冷知识, 2 城市民俗, 2 本地味道, 1 旅客提醒
4. `PlanBatches -> GenerateFirstBatch`
   - One Qwen Flash call.
   - Timeout: 8 seconds.
   - Output: exactly one `EngagementBatch` with up to six long cards.
5. `GenerateFirstBatch -> ValidateAndPersistFirstBatch`
   - Remove cards that mention real-time prices/opening/weather/bookings.
   - Remove “为什么值得注意” or any explanatory label copied from old mockup.
   - Persist `EngagementFeed(status="partial", batches=[batch0])`.
6. `ValidateAndPersistFirstBatch -> GenerateAdditionalBatches`
   - Non-critical background work.
   - Timeout: 20 seconds.
   - Generate batches 1 and 2; persist whenever a batch validates.
7. `GenerateAdditionalBatches -> End`
   - Persist `status="ready"` if at least one batch exists.
   - Persist `status="failed"` only if no cards were ever produced.

---

## UI Design

The UI should follow the previous mockup’s spirit: airy glass cards over the existing scenic background, light shadows, soft borders, and a calm “夏夏正在翻目的地小百科” tone.

### Waiting State

- Show immediately after async job creation.
- Title: `夏夏正在整理正式行程，先给你翻几页目的地小百科`
- Subtitle: `这些是旅途中可读的小知识，最终行程会另外做引用校验。`
- Six skeleton cards appear if `engagement_feed.status="loading"` and no batch exists.

### Card Layout

- Desktop: 2 columns x 3 rows.
- Narrow screens: 1 column.
- Each card:
  - Small pill: `景点冷知识` / `城市民俗` / `本地味道` / `旅客提醒`
  - Entity line: `龙门石窟` / `洛阳` / `开封小吃`
  - Title
  - 300-500 Chinese characters body
  - Small footer: `灵感小百科，不作为实时政策或票务依据`
- Remove the old `为什么值得注意` section completely.

### Rotation

- Rotate to the next available batch every 10 seconds.
- If only one batch is ready, keep it visible and show `更多小百科正在路上`.
- Use `st.session_state["engagement_batch_index"]` and `st.session_state["engagement_last_rotated_at"]`.
- Do not call the backend every 10 seconds just for rotation. The existing job polling fetches updates; rotation is local.

### Transition To RAG Answer

- While job status is `queued` or `running`, the waiting room is expanded.
- When status becomes `completed`, clear the waiting-room container before rendering the final answer.
- Save the last feed in `st.session_state["last_engagement_feed"]`.
- Render a collapsed expander below the final answer:
  - Chinese: `刚才路上看的小百科`
  - English: `Travel almanac from the wait`
- The final RAG answer must visually dominate the page. The mini-encyclopedia becomes secondary.

---

## Implementation Tasks

### Task 1: Add Engagement DTOs

**Files:**
- Create: `src/huaxia_tourismrag/schemas/engagement.py`
- Test: `tests/test_engagement_feed_schemas.py`

- [ ] **Step 1: Write failing DTO tests**

```python
from pydantic import ValidationError

from huaxia_tourismrag.schemas.engagement import (
    EngagementBatch,
    EngagementCard,
    EngagementFeed,
)


def test_engagement_card_accepts_long_mini_encyclopedia_body():
    card = EngagementCard(
        card_id="c1",
        card_type="city_folk_custom",
        entity="洛阳",
        title="牡丹为什么成了洛阳的城市名片",
        body="洛阳与牡丹的关系并不只是花卉观赏。隋唐时期洛阳作为东都，园林、寺院、贵族宅邸共同推动了牡丹审美，后来逐渐沉淀成城市文化符号。今天游客去洛阳看龙门石窟、白马寺之外，也常把牡丹当作理解这座古都气质的入口：它一方面代表盛唐气象，另一方面也让春季旅行多了一层节令感。",
        confidence="culture_note",
    )

    assert card.entity == "洛阳"
    assert card.card_type == "city_folk_custom"


def test_engagement_batch_limits_to_six_cards():
    cards = [
        EngagementCard(
            card_id=f"c{i}",
            card_type="local_flavor",
            entity="开封",
            title=f"开封味道 {i}",
            body="开封小吃的魅力在于它把市井气和古都感放在一起。游客常见的灌汤包、桶子鸡、花生糕、羊肉炕馍并不是孤立菜名，而是夜市、老街和早晚市节奏的一部分。安排开封行程时，把吃饭时间留得从容，比把小吃当作赶路补给更能体验这座城市。",
            confidence="general_knowledge",
        )
        for i in range(7)
    ]

    try:
        EngagementBatch(batch_index=0, cards=cards)
    except ValidationError as exc:
        assert "at most 6" in str(exc)
    else:
        raise AssertionError("expected max-length validation failure")


def test_engagement_feed_partial_status():
    feed = EngagementFeed(
        status="partial",
        batches=[
            EngagementBatch(
                batch_index=0,
                cards=[
                    EngagementCard(
                        card_id="c1",
                        card_type="traveler_reminder",
                        entity="塔县",
                        title="高海拔行程要慢下来",
                        body="塔县和帕米尔高原的风景很容易让人兴奋，但第一次到高海拔地区时，真正影响体验的往往不是景点数量，而是身体适应速度。行程里应少跑动、多喝水、避免当天剧烈运动，把拍照点、休息点和用餐点连成慢节奏。儿童和老人尤其要观察头痛、胸闷、睡眠质量等信号。",
                        confidence="travel_common_sense",
                    )
                ],
            )
        ],
    )

    assert feed.status == "partial"
```

- [ ] **Step 2: Run and confirm failure**

```bash
uv run pytest -q tests/test_engagement_feed_schemas.py
```

Expected: import error because `schemas.engagement` does not exist.

- [ ] **Step 3: Implement `schemas/engagement.py`**

Add the DTOs from the “Graph Design / DTOs” section. Include `EngagementEntity`, `EngagementEntityPack`, `EngagementBatchSpec`, `EngagementFeedInput`, and `EngagementFeedOutput` so graph and tests share typed contracts.

- [ ] **Step 4: Run DTO tests**

```bash
uv run pytest -q tests/test_engagement_feed_schemas.py
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/schemas/engagement.py tests/test_engagement_feed_schemas.py
git commit -m "feat: add engagement feed DTOs"
```

### Task 2: Build Qwen Engagement Agent

**Files:**
- Create: `src/huaxia_tourismrag/agents/engagement_feed_agent.py`
- Test: `tests/test_engagement_feed_agent.py`

- [ ] **Step 1: Add tests for prompt rules**

```python
from huaxia_tourismrag.agents.engagement_feed_agent import (
    build_engagement_card_prompt,
)
from huaxia_tourismrag.schemas.engagement import EngagementBatchSpec


def test_engagement_prompt_forbids_realtime_and_citations():
    prompt = build_engagement_card_prompt(
        entities=["龙门石窟", "洛阳", "洛阳水席"],
        spec=EngagementBatchSpec(
            batch_index=0,
            card_types=[
                "attraction_knowledge",
                "city_folk_custom",
                "local_flavor",
                "traveler_reminder",
                "attraction_knowledge",
                "city_folk_custom",
            ],
        ),
        language="zh-CN",
    )

    assert "不要编造引用" in prompt
    assert "不要写实时票价" in prompt
    assert "300-500 个中文字符" in prompt
    assert "为什么值得注意" not in prompt
```

- [ ] **Step 2: Implement prompt builders**

Create pure functions:
- `build_entity_extraction_prompt(question, form_request, language)`
- `build_engagement_card_prompt(entities, spec, language)`

The card prompt must include:
- 6 cards exactly when possible.
- Each body 300-500 Chinese characters.
- No citations, no URLs, no current prices, no current weather forecast, no opening hours.
- Respectful wording for religion, ethnicity, border regions, and minority cultures.

- [ ] **Step 3: Add agent wrapper**

Use existing Qwen structured runner:

```python
class EngagementFeedAgent:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def extract_entities(...) -> EngagementEntityPack:
        return await run_qwen_structured(
            prompt,
            output_type=EngagementEntityPack,
            model_override=settings.checkpoint_model,
        )

    async def generate_batch(...) -> EngagementBatch:
        return await run_qwen_structured(
            prompt,
            output_type=EngagementBatch,
            model_override=settings.checkpoint_model,
        )
```

Use `settings.checkpoint_model` (`qwen3.6-flash`) rather than `final_answer_model`.

- [ ] **Step 4: Run tests**

```bash
uv run pytest -q tests/test_engagement_feed_agent.py
```

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/agents/engagement_feed_agent.py tests/test_engagement_feed_agent.py
git commit -m "feat: add Qwen engagement feed agent"
```

### Task 3: Implement Pydantic GraphBuilder Flow

**Files:**
- Create: `src/huaxia_tourismrag/services/engagement_feed_graph.py`
- Test: `tests/test_engagement_feed_graph.py`

- [ ] **Step 1: Write graph persistence test**

```python
import pytest

from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.engagement import EngagementBatch, EngagementCard
from huaxia_tourismrag.services.engagement_feed_graph import run_engagement_feed_graph
from huaxia_tourismrag.services.job_store import InMemoryTravelJobStore


class FakeEngagementAgent:
    async def extract_entities(self, *args, **kwargs):
        raise AssertionError("structured seeds should avoid extractor")

    async def generate_batch(self, *, spec, entities, language):
        return EngagementBatch(
            batch_index=spec.batch_index,
            cards=[
                EngagementCard(
                    card_id=f"b{spec.batch_index}-{i}",
                    card_type=card_type,
                    entity=entities[i % len(entities)],
                    title=f"卡片 {i}",
                    body="这是一张等待室小百科卡片。它不会作为最终行程引用，只用于等待时帮助用户理解目的地背景。内容保持常识性和文化性，不写实时票价、开放时间、酒店房态或交通状态，也不会假装做了网页核验。",
                    confidence="general_knowledge",
                )
                for i, card_type in enumerate(spec.card_types)
            ],
        )


@pytest.mark.asyncio
async def test_engagement_graph_persists_first_batch_before_finishing():
    store = InMemoryTravelJobStore()
    question = TravelQuestion(
        question="洛阳龙门石窟和开封五日游",
        destination="洛阳",
        interests=["龙门石窟", "开封小吃"],
    )
    job = await store.create("demo", question, kind="general_question")

    await run_engagement_feed_graph(
        job_id=job.job_id,
        tenant_id="demo",
        question=question,
        form_request=None,
        agent=FakeEngagementAgent(),
        job_store=store,
        first_batch_timeout_seconds=8,
        full_feed_timeout_seconds=20,
    )

    saved = await store.get(job.job_id, "demo")
    assert saved.engagement_feed is not None
    assert saved.engagement_feed.status == "ready"
    assert len(saved.engagement_feed.batches) == 3
    assert len(saved.engagement_feed.batches[0].cards) == 6
```

- [ ] **Step 2: Implement graph state and batch specs**

Use `GraphBuilder`:

```python
from pydantic_graph import GraphBuilder

builder = GraphBuilder(
    name="EngagementFeedGraph",
    state_type=EngagementFeedState,
    deps_type=EngagementFeedDeps,
    input_type=EngagementFeedInput,
    output_type=EngagementFeed,
)
```

Define graph steps as small async functions:
- `build_seed_entities`
- `extract_entities_when_needed`
- `plan_batches`
- `generate_first_batch`
- `validate_and_persist_first_batch`
- `generate_additional_batches`
- `finalize_feed`

Build edges in a linear flow first. Do not use graph branching until tests require it.

- [ ] **Step 3: Add validation helper**

Create:

```python
def validate_engagement_batch(batch: EngagementBatch) -> EngagementBatch:
    forbidden = ("票价", "今日天气", "当前开放", "酒店房态", "实时路况", "为什么值得注意")
    valid_cards = [
        card for card in batch.cards
        if not any(term in card.body or term in card.title for term in forbidden)
    ]
    return batch.model_copy(update={"cards": valid_cards[:6]})
```

This helper may use a fixed forbidden tuple because it validates generated card content, not route/user intent. It is not a checkpoint trigger.

- [ ] **Step 4: Run graph tests**

```bash
uv run pytest -q tests/test_engagement_feed_graph.py
```

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/services/engagement_feed_graph.py tests/test_engagement_feed_graph.py
git commit -m "feat: add pydantic graph engagement feed"
```

### Task 4: Persist Feed On Travel Jobs

**Files:**
- Modify: `src/huaxia_tourismrag/schemas/jobs.py`
- Modify: `src/huaxia_tourismrag/services/job_store.py`
- Test: `tests/test_job_store.py`

- [ ] **Step 1: Write job-store test**

```python
import pytest

from huaxia_tourismrag.schemas.engagement import EngagementFeed
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.services.job_store import InMemoryTravelJobStore


@pytest.mark.asyncio
async def test_job_store_updates_engagement_feed():
    store = InMemoryTravelJobStore()
    job = await store.create(
        "demo",
        TravelQuestion(question="洛阳三天"),
        kind="general_question",
    )

    await store.update_engagement_feed(
        job.job_id,
        "demo",
        EngagementFeed(status="loading", batches=[]),
    )

    saved = await store.get(job.job_id, "demo")
    assert saved.engagement_feed is not None
    assert saved.engagement_feed.status == "loading"
```

- [ ] **Step 2: Extend DTOs**

Add `engagement_feed: EngagementFeed | None = None` to `TravelJob` and `TravelJobStatusResponse`.

Update `TravelJobStatusResponse.from_job(...)` to copy `job.engagement_feed`.

- [ ] **Step 3: Extend store protocol and backends**

Add:

```python
async def update_engagement_feed(
    self,
    job_id: str,
    tenant_id: str,
    feed: EngagementFeed,
) -> TravelJob:
    """Persist waiting-room engagement feed for a job."""
```

Implement it in both in-memory and Redis stores by loading the job, setting `job.engagement_feed`, updating `updated_at`, and saving.

- [ ] **Step 4: Run tests**

```bash
uv run pytest -q tests/test_job_store.py
```

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/schemas/jobs.py src/huaxia_tourismrag/services/job_store.py tests/test_job_store.py
git commit -m "feat: persist engagement feed on travel jobs"
```

### Task 5: Add EngagementFeedService And Bootstrap

**Files:**
- Create: `src/huaxia_tourismrag/services/engagement_feed_service.py`
- Modify: `src/huaxia_tourismrag/core/config.py`
- Modify: `src/huaxia_tourismrag/bootstrap.py`
- Test: `tests/test_engagement_feed_service.py`

- [ ] **Step 1: Add config settings**

```python
enable_engagement_feed: bool = Field(default=True, validation_alias="ENABLE_ENGAGEMENT_FEED")
engagement_first_batch_timeout_seconds: float = Field(default=8.0, validation_alias="ENGAGEMENT_FIRST_BATCH_TIMEOUT_SECONDS")
engagement_full_timeout_seconds: float = Field(default=24.0, validation_alias="ENGAGEMENT_FULL_TIMEOUT_SECONDS")
engagement_model: str | None = Field(default=None, validation_alias="ENGAGEMENT_MODEL")
```

Model selection:

```python
def engagement_model_name(self) -> str:
    return self.engagement_model or self.checkpoint_model_name
```

- [ ] **Step 2: Implement service wrapper**

```python
class EngagementFeedService:
    def __init__(self, settings: Settings, agent: EngagementFeedAgent) -> None:
        self.settings = settings
        self.agent = agent

    async def start_for_job(...):
        if not self.settings.enable_engagement_feed:
            await job_store.update_engagement_feed(job_id, tenant_id, EngagementFeed(status="disabled"))
            return
        await job_store.update_engagement_feed(job_id, tenant_id, EngagementFeed(status="loading"))
        try:
            await asyncio.wait_for(
                run_engagement_feed_graph(...),
                timeout=self.settings.engagement_full_timeout_seconds,
            )
        except Exception:
            current = await job_store.get(job_id, tenant_id)
            if not current.engagement_feed or not current.engagement_feed.batches:
                await job_store.update_engagement_feed(
                    job_id,
                    tenant_id,
                    EngagementFeed(status="failed", message="目的地小百科暂时没有生成出来。"),
                )
```

- [ ] **Step 3: Bootstrap service**

In `bootstrap.py`, build one app-level service and attach:

```python
app.state.engagement_feed_service = EngagementFeedService(
    settings=settings,
    agent=EngagementFeedAgent(settings=settings),
)
```

- [ ] **Step 4: Run tests**

```bash
uv run pytest -q tests/test_engagement_feed_service.py
```

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/services/engagement_feed_service.py src/huaxia_tourismrag/core/config.py src/huaxia_tourismrag/bootstrap.py tests/test_engagement_feed_service.py
git commit -m "feat: add engagement feed service"
```

### Task 6: Wire Sidecar Into Async Job Routes

**Files:**
- Modify: `src/huaxia_tourismrag/api/routes.py`
- Test: `tests/test_routes.py`

- [ ] **Step 1: Add route tests**

Add:

```python
class FakeEngagementFeedService:
    calls: list[tuple[str, str]] = []

    async def start_for_job(self, *, job_id, tenant_id, question, form_request, job_store):
        self.calls.append((job_id, question.question))


def test_general_job_starts_engagement_feed_sidecar():
    client = make_client()
    client.app.state.engagement_feed_service = FakeEngagementFeedService()

    response = client.post(
        "/tourism/jobs/questions",
        json={"question": "郑州出发河南10天中原文化深度游", "detail_level": "deep"},
    )

    assert response.status_code == 202
    assert client.app.state.engagement_feed_service.calls
```

Add a second test proving sync `/tourism/questions` does not call the sidecar.

- [ ] **Step 2: Add dependency helper**

```python
def get_engagement_feed_service(request: Request) -> EngagementFeedService | None:
    return getattr(request.app.state, "engagement_feed_service", None)
```

- [ ] **Step 3: Start sidecar after job creation**

For `/forms/jobs`, `/jobs/diy`, `/jobs/questions`, and `/sessions/{session_id}/reply/job`:

```python
engagement_service = get_engagement_feed_service(request)
if engagement_service is not None:
    background_tasks.add_task(
        engagement_service.start_for_job,
        job_id=job.job_id,
        tenant_id=user.tenant_id,
        question=question,
        form_request=body if isinstance(body, TravelFormRequest) else None,
        job_store=job_store,
    )
```

Do this even when `travel_job_queue` is enabled, because the sidecar belongs to the API-created waiting experience and does not need the external worker.

- [ ] **Step 4: Run route tests**

```bash
uv run pytest -q tests/test_routes.py
```

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/api/routes.py tests/test_routes.py
git commit -m "feat: start engagement feed for async travel jobs"
```

### Task 7: Render Waiting-Room Cards In Streamlit

**Files:**
- Modify: `src/huaxia_tourismrag/streamlit_app.py`
- Test: `tests/test_streamlit_frontend.py`

- [ ] **Step 1: Add renderer tests**

```python
from huaxia_tourismrag import streamlit_app


def test_engagement_feed_html_renders_six_long_cards():
    feed = {
        "status": "partial",
        "batches": [
            {
                "batch_index": 0,
                "cards": [
                    {
                        "card_id": f"c{i}",
                        "card_type": "attraction_knowledge",
                        "entity": "龙门石窟",
                        "title": f"龙门石窟小百科 {i}",
                        "body": "龙门石窟不是单一景点，而是一段跨越北魏到唐代的石刻艺术长卷。游客站在伊河边看到的卢舍那大佛，常被视作盛唐审美与国家工程能力的象征。把它放进行程时，不应只安排拍照时间，还应预留讲解或慢看石窟细节的时间。",
                        "confidence": "general_knowledge",
                    }
                    for i in range(6)
                ],
            }
        ],
    }

    html = streamlit_app._engagement_feed_html(feed, language="zh-CN", batch_index=0)
    assert html.count("engagement-card") == 6
    assert "为什么值得注意" not in html
    assert "灵感小百科" in html
```

- [ ] **Step 2: Add CSS**

Add CSS classes:
- `.engagement-feed-shell`
- `.engagement-feed-header`
- `.engagement-grid`
- `.engagement-card`
- `.engagement-pill`
- `.engagement-entity`
- `.engagement-body`
- `.engagement-batch-dots`

Styling:
- translucent white glass panel
- light shadow only
- 8px radius or less unless matching the current UI
- 2-column desktop grid, 1-column mobile
- line-height 1.55 for long Chinese text

- [ ] **Step 3: Add render helpers**

```python
def _engagement_active_batch(feed: dict[str, Any]) -> int:
    batches = feed.get("batches") if isinstance(feed, dict) else []
    if not batches:
        return 0
    now = time.monotonic()
    last = float(st.session_state.get("engagement_last_rotated_at", now))
    current = int(st.session_state.get("engagement_batch_index", 0))
    if now - last >= 10:
        current = (current + 1) % len(batches)
        st.session_state["engagement_batch_index"] = current
        st.session_state["engagement_last_rotated_at"] = now
    return min(current, len(batches) - 1)
```

Add `_render_engagement_waiting_room(status)` and `_engagement_feed_html(...)`.

- [ ] **Step 4: Insert renderer into polling loops**

In both `_submit_and_poll_form_job(...)` and `_submit_and_poll_travel_job(...)`:
- Create `engagement_container = st.empty()` after job creation.
- Each polling iteration:
  - get `feed = status.get("engagement_feed")`
  - render feed if present and job not completed
  - render skeleton if no feed yet
- When completed:
  - store feed in `st.session_state["last_engagement_feed"]`
  - empty the waiting container
  - return answer

- [ ] **Step 5: Add final-answer transition**

After final answer render, if `last_engagement_feed` exists, render a collapsed expander with the last batch. Do not keep it above the final itinerary.

- [ ] **Step 6: Run frontend tests**

```bash
uv run pytest -q tests/test_streamlit_frontend.py
```

- [ ] **Step 7: Commit**

```bash
git add src/huaxia_tourismrag/streamlit_app.py tests/test_streamlit_frontend.py
git commit -m "feat: render engagement feed waiting room"
```

### Task 8: End-To-End Verification

**Files:**
- Update: `evals/manual_itinerary_quality.md`
- Optional Create: `evals/engagement_feed_cases.json`

- [ ] **Step 1: Add manual QA cases**

Add these checks:
- Submit a deep form request.
- Verify the engagement shell appears immediately.
- Verify first cards appear if Qwen sidecar finishes before final answer.
- Verify cards rotate locally every 10 seconds.
- Verify final RAG answer replaces the waiting room.
- Verify no card appears in citations or final RAG evidence.
- Verify no card claims real-time opening hours, prices, weather, or hotel availability.

- [ ] **Step 2: Run focused tests**

```bash
uv run pytest -q \
  tests/test_engagement_feed_schemas.py \
  tests/test_engagement_feed_agent.py \
  tests/test_engagement_feed_graph.py \
  tests/test_engagement_feed_service.py \
  tests/test_routes.py \
  tests/test_streamlit_frontend.py
```

- [ ] **Step 3: Run full verification**

```bash
uv run ruff check src/huaxia_tourismrag tests
uv run pytest -q
git diff --check
```

- [ ] **Step 4: Manual smoke**

Run FastAPI and Streamlit, then test:

```text
河南计划：一家四口（两大两小）从郑州本地出发，用10天深度游中原文化，预算14000元。7月初想走“寻根+古都”线：安阳殷墟和文字博物馆住两天，洛阳龙门石窟、白马寺、二里头夏都遗址三天，登封少林寺和嵩阳书院两天，开封清明上河园、州桥遗址两天，最后一天去三门峡地坑院，吃烩面、水席和汴京烤鸭。
```

Expected:
- waiting room appears within 1-2 seconds after job creation
- first batch either appears within 8 seconds or skeleton remains polished
- final answer still has citation-faithful itinerary
- waiting room collapses after final answer

- [ ] **Step 5: Commit docs/evals**

```bash
git add evals/manual_itinerary_quality.md evals/engagement_feed_cases.json
git commit -m "docs: add engagement feed QA checks"
```

---

## Rollout Flags

Recommended `.env.example` comments:

```env
# Optional waiting-room mini encyclopedia shown while deep jobs run.
ENABLE_ENGAGEMENT_FEED=true
ENGAGEMENT_MODEL=qwen3.6-flash
ENGAGEMENT_FIRST_BATCH_TIMEOUT_SECONDS=8
ENGAGEMENT_FULL_TIMEOUT_SECONDS=24
```

Production safety defaults:
- If Qwen sidecar fails, the main answer must still complete.
- If Redis is unavailable, in-memory local behavior should still pass tests.
- If no engagement cards validate, `engagement_feed.status="failed"` should be silent in Streamlit unless debug mode is enabled.

---

## Self-Review

- Spec coverage: Includes graph architecture, seconds-first rendering, card rotation, transition to final RAG, DTO-only entity selection, and post-checkpoint start timing.
- Placeholder scan: No TBD/TODO placeholders remain.
- Type consistency: `EngagementFeed` is the public object stored on `TravelJob` and returned through `TravelJobStatusResponse`; Streamlit consumes the same object.
- Scope: This plan does not change final itinerary quality, citation guard behavior, or RAG retrieval. Those remain separate systems.

# DTO-Driven LLM Fast Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace keyword/regex checkpoint fast paths with a strictly DTO-driven checkpoint policy while preserving the Qwen model-routing speed wins.

**Architecture:** Deterministic routing may only inspect validated DTO fields, endpoint mode, session state, and typed quick-reply IDs. Natural-language interpretation remains inside typed LLM checkpoint calls that return validated Pydantic DTOs. No checkpoint/cache fast path may scan `question.question` for words, punctuation counts, regexes, or term tuples.

**Tech Stack:** FastAPI, Streamlit, Pydantic DTOs, Qwen Cloud/OpenAI-compatible runner, pytest.

---

## Non-Negotiable Rules

- No regex anywhere in checkpoint routing, cache policy, or Qwen JSON extraction.
- No hard-coded keyword tuples for routing, preference skipping, detail inference, privacy/cache decisions, or quick-reply interpretation.
- Deterministic code can use:
  - `TravelQuestion.destination`
  - `TravelQuestion.start_date`
  - `TravelQuestion.end_date`
  - `TravelQuestion.travelers`
  - `TravelQuestion.budget_level`
  - `TravelQuestion.detail_level`
  - `TravelQuestion.interests`
  - endpoint/request mode: `"general"` or `"diy"`
  - session `pending_kind`
  - typed quick-reply action IDs
- Deterministic code cannot use:
  - substring checks on `question.question`
  - punctuation counts inside `question.question`
  - hard-coded Chinese/English trigger phrases
  - regular expressions
- If a decision requires reading natural language, call the checkpoint LLM and parse the result into the existing DTO.

---

## File Structure

- Modify: `src/huaxia_tourismrag/schemas/travel_checkpoints.py`
  - Add typed `CheckpointContext`, `CheckpointPolicyDecision`, and quick-reply action enums.
- Modify: `src/huaxia_tourismrag/schemas/evidence.py`
  - Extend `QuickReplyOption` with optional typed `action_id`.
- Modify: `src/huaxia_tourismrag/schemas/session.py`
  - Extend `SessionReplyRequest` with optional `quick_reply_action_id`.
- Modify: `src/huaxia_tourismrag/services/travel_checkpoints.py`
  - Remove keyword tuples and text-scanning helpers.
  - Add DTO-only context construction and policy decisions.
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
  - Use DTO-only policy decisions.
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
  - Use DTO-only policy decisions.
- Modify: `src/huaxia_tourismrag/services/session_reply_service.py`
  - Use typed quick-reply action IDs where present.
- Modify: `src/huaxia_tourismrag/services/answer_cache.py`
  - Replace text privacy scanning with typed cache policy input.
- Modify: `src/huaxia_tourismrag/agents/qwen_structured_runner.py`
  - Remove regex-based JSON extraction.
- Modify: `src/huaxia_tourismrag/frontend/streamlit_client.py`
  - Send typed quick-reply action IDs.
- Modify: `src/huaxia_tourismrag/streamlit_app.py`
  - Render quick replies using typed action IDs.
- Test: `tests/test_dto_checkpoint_policy.py`
- Test: `tests/test_session_reply_service.py`
- Test: `tests/test_qwen_structured_runner.py`
- Test: `tests/test_speed_optimizations.py`
- Test: update existing QA/DIY checkpoint tests.

---

## Task 1: Add DTO-Only Checkpoint Policy Types

**Files:**
- Modify: `src/huaxia_tourismrag/schemas/travel_checkpoints.py`
- Test: `tests/test_dto_checkpoint_policy.py`

- [ ] **Step 1: Write failing tests**

```python
from datetime import date

from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.travel_checkpoints import RequestMode
from huaxia_tourismrag.services.travel_checkpoints import (
    build_checkpoint_context,
    evaluate_checkpoint_policy,
)


def test_policy_ignores_natural_language_trigger_words() -> None:
    question = TravelQuestion(
        question="必须覆盖巡礼深度游老人儿童豪华包车多城，文本里故意放很多词。",
    )

    context = build_checkpoint_context(question, request_mode="general")
    decision = evaluate_checkpoint_policy(context)

    assert decision.run_intent_checkpoint is True
    assert decision.run_preference_checkpoint is True
    assert decision.run_feasibility_checkpoint is True


def test_diy_endpoint_skips_intent_from_endpoint_mode_only() -> None:
    question = TravelQuestion(question="普通自然语言，不包含任何特殊词。")

    context = build_checkpoint_context(question, request_mode="diy")
    decision = evaluate_checkpoint_policy(context)

    assert decision.run_intent_checkpoint is False
    assert decision.synthesized_intent == "diy_itinerary"


def test_typed_short_general_trip_can_skip_feasibility() -> None:
    question = TravelQuestion(
        question="请规划旅行。",
        destination="北京",
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 3),
        travelers=2,
        detail_level="concise",
    )

    context = build_checkpoint_context(question, request_mode="general")
    decision = evaluate_checkpoint_policy(context)

    assert decision.run_preference_checkpoint is False
    assert decision.run_feasibility_checkpoint is False
```

- [ ] **Step 2: Add types**

```python
CheckpointReason = Literal[
    "endpoint_diy_mode",
    "explicit_concise_detail",
    "typed_short_single_destination",
    "insufficient_typed_context",
]


class CheckpointContext(BaseModel):
    request_mode: RequestMode
    detail_level: DetailLevel | None = None
    has_destination: bool = False
    has_start_date: bool = False
    has_end_date: bool = False
    duration_days: int | None = Field(default=None, ge=0, le=366)
    travelers: int | None = Field(default=None, ge=1, le=20)
    budget_level: Literal["budget", "mid_range", "luxury"] | None = None
    interest_count: int = Field(default=0, ge=0, le=12)


class CheckpointPolicyDecision(BaseModel):
    run_intent_checkpoint: bool = True
    run_preference_checkpoint: bool = True
    run_feasibility_checkpoint: bool = True
    synthesized_intent: IntentType | None = None
    synthesized_preference_profile: PreferenceProfile | None = None
    synthesized_feasibility_report: FeasibilityReport | None = None
    reasons: list[CheckpointReason] = Field(default_factory=list)
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
uv run pytest tests/test_dto_checkpoint_policy.py -q
```

Expected: fails because `build_checkpoint_context` and `evaluate_checkpoint_policy` do not exist.

---

## Task 2: Replace Keyword Fast Paths With DTO Policy

**Files:**
- Modify: `src/huaxia_tourismrag/services/travel_checkpoints.py`
- Test: `tests/test_dto_checkpoint_policy.py`

- [ ] **Step 1: Remove rejected constants and helpers**

Delete these from `services/travel_checkpoints.py`:

```python
SKIP_CLARIFICATION_TERMS
CONCISE_DETAIL_TERMS
STANDARD_DETAIL_TERMS
DEEP_DETAIL_TERMS
DIY_INTENT_TERMS
OPERATIONAL_STATUS_TERMS
COMPLEX_ROUTE_TERMS
SHORT_TRIP_TERMS
should_run_intent_checkpoint
should_skip_preference_checkpoint
should_skip_feasibility_checkpoint
should_skip_clarification
infer_detail_level
resolve_detail_level_reply
_looks_like_trip_request
_has_complex_route_signal
_is_simple_short_trip
```

- [ ] **Step 2: Add DTO-only implementation**

```python
def build_checkpoint_context(
    question: TravelQuestion,
    request_mode: RequestMode,
) -> CheckpointContext:
    duration_days = None
    if question.start_date and question.end_date:
        duration_days = (question.end_date - question.start_date).days + 1

    return CheckpointContext(
        request_mode=request_mode,
        detail_level=question.detail_level,
        has_destination=question.destination is not None,
        has_start_date=question.start_date is not None,
        has_end_date=question.end_date is not None,
        duration_days=duration_days,
        travelers=question.travelers,
        budget_level=question.budget_level,
        interest_count=len(question.interests),
    )


def evaluate_checkpoint_policy(context: CheckpointContext) -> CheckpointPolicyDecision:
    decision = CheckpointPolicyDecision()

    if context.request_mode == "diy":
        decision.run_intent_checkpoint = False
        decision.synthesized_intent = "diy_itinerary"
        decision.reasons.append("endpoint_diy_mode")

    typed_short_single_destination = (
        context.request_mode == "general"
        and context.has_destination
        and context.duration_days is not None
        and context.duration_days <= 4
        and (context.travelers is None or context.travelers <= 4)
        and context.budget_level != "luxury"
        and context.interest_count <= 3
    )

    if context.detail_level == "concise":
        decision.run_preference_checkpoint = False
        decision.synthesized_preference_profile = PreferenceProfile(
            detail_level="concise",
            pace="balanced",
            attraction_mix="balanced",
            food_preference="local",
            accommodation_preference="convenient",
            assumed_defaults=["使用简洁回答深度与通用平衡偏好。"],
        )
        decision.reasons.append("explicit_concise_detail")

    if typed_short_single_destination:
        decision.run_feasibility_checkpoint = False
        decision.synthesized_feasibility_report = FeasibilityReport(
            is_feasible=True,
            should_ask=False,
            issues=[],
            recommended_adjustments=[],
        )
        decision.reasons.append("typed_short_single_destination")

    return decision
```

- [ ] **Step 3: Keep detail level DTO-only**

```python
def resolved_detail_level(question: TravelQuestion) -> DetailLevel:
    return question.detail_level or "standard"
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
uv run pytest tests/test_dto_checkpoint_policy.py -q
```

Expected: pass.

---

## Task 3: Wire DTO Policy Into QA And DIY Services

**Files:**
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
- Test: `tests/test_qa_service.py`
- Test: `tests/test_diy_itinerary_service.py`

- [ ] **Step 1: Replace imports**

Remove imports of rejected helpers. Add:

```python
from huaxia_tourismrag.services.travel_checkpoints import (
    build_checkpoint_context,
    evaluate_checkpoint_policy,
    synthesize_feasibility_report,
    synthesize_intent_decision,
    synthesize_preference_decision,
)
```

- [ ] **Step 2: Build policy once per answer**

At the start of `answer(...)`, after `budget`:

```python
checkpoint_context = build_checkpoint_context(question, request_mode="general")
checkpoint_policy = evaluate_checkpoint_policy(checkpoint_context)
```

For DIY:

```python
checkpoint_context = build_checkpoint_context(question, request_mode="diy")
checkpoint_policy = evaluate_checkpoint_policy(checkpoint_context)
```

- [ ] **Step 3: Use policy, not text**

```python
if checkpoint_policy.run_intent_checkpoint:
    intent_decision = await create_intent_decision(question, request_mode="general")
else:
    intent_decision = synthesize_intent_decision(
        request_mode="general",
        intent=checkpoint_policy.synthesized_intent,
    )
```

Preference:

```python
if checkpoint_policy.run_preference_checkpoint:
    preference_decision = await create_preference_decision(...)
else:
    preference_decision = synthesize_preference_decision(
        question,
        profile=checkpoint_policy.synthesized_preference_profile,
    )
```

Feasibility:

```python
if checkpoint_policy.run_feasibility_checkpoint:
    feasibility_report = await create_feasibility_report(...)
else:
    feasibility_report = checkpoint_policy.synthesized_feasibility_report or synthesize_feasibility_report()
```

- [ ] **Step 4: Remove text-based clarification skip**

If `preference_decision.should_ask`, always create a pending session. The only typed way to skip is a quick-reply action handled by session state.

- [ ] **Step 5: Run service tests**

Run:

```bash
uv run pytest tests/test_qa_service.py tests/test_diy_itinerary_service.py -q
```

Expected: pass after updating tests to assert DTO policy behavior.

---

## Task 4: Make Quick Replies Typed

**Files:**
- Modify: `src/huaxia_tourismrag/schemas/evidence.py`
- Modify: `src/huaxia_tourismrag/schemas/session.py`
- Modify: `src/huaxia_tourismrag/services/travel_checkpoints.py`
- Modify: `src/huaxia_tourismrag/services/session_reply_service.py`
- Modify: `src/huaxia_tourismrag/frontend/streamlit_client.py`
- Modify: `src/huaxia_tourismrag/streamlit_app.py`
- Test: `tests/test_session_reply_service.py`
- Test: `tests/test_streamlit_frontend.py`

- [ ] **Step 1: Extend DTOs**

```python
QuickReplyActionId = Literal[
    "preference_option_a",
    "preference_option_b",
    "default_preferences",
    "detail_concise",
    "detail_standard",
    "detail_deep",
    "feasibility_accept_adjustment",
    "feasibility_keep_original",
]


class QuickReplyOption(BaseModel):
    label: str = Field(min_length=1, max_length=40)
    message: str = Field(min_length=1, max_length=200)
    action_id: QuickReplyActionId | None = None
```

```python
class SessionReplyRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    quick_reply_action_id: QuickReplyActionId | None = None
```

- [ ] **Step 2: Generate action IDs**

Detail replies:

```python
QuickReplyOption(
    label="先看大方向",
    message="先看大方向",
    action_id="detail_concise",
)
```

Preference replies:

```python
QuickReplyOption(label="选择 A", message="A", action_id="preference_option_a")
QuickReplyOption(label="选择 B", message="B", action_id="preference_option_b")
QuickReplyOption(label="默认偏好", message="默认偏好", action_id="default_preferences")
```

- [ ] **Step 3: Session replies use action IDs**

`session_reply_service.py` should prefer `quick_reply_action_id` over message content:

```python
if body.quick_reply_action_id == "detail_concise":
    session.original_question.detail_level = "concise"
elif body.quick_reply_action_id == "detail_standard":
    session.original_question.detail_level = "standard"
elif body.quick_reply_action_id == "detail_deep":
    session.original_question.detail_level = "deep"
```

If there is no `quick_reply_action_id`, append `body.message` and let the typed LLM checkpoint interpret the free-form reply.

- [ ] **Step 4: Run tests**

Run:

```bash
uv run pytest tests/test_session_reply_service.py tests/test_streamlit_frontend.py -q
```

Expected: pass.

---

## Task 5: Remove Text-Based Cache Safety

**Files:**
- Modify: `src/huaxia_tourismrag/services/answer_cache.py`
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
- Test: `tests/test_speed_optimizations.py`

- [ ] **Step 1: Add typed policy DTO**

```python
class AnswerCachePolicyInput(BaseModel):
    request_mode: RequestMode
    detail_level: DetailLevel
    language: Literal["zh-CN", "en"]
    is_session_reply: bool = False
    has_contact_payload: bool = False
    allow_cache: bool = True


def is_cache_allowed(policy: AnswerCachePolicyInput) -> bool:
    return policy.allow_cache and not policy.is_session_reply and not policy.has_contact_payload
```

- [ ] **Step 2: Replace `is_cache_safe_question(...)`**

Services pass typed metadata:

```python
cache_allowed = is_cache_allowed(
    AnswerCachePolicyInput(
        request_mode="general",
        detail_level=detail_level,
        language=question.language,
        is_session_reply=False,
        has_contact_payload=False,
    )
)
```

Sales/contact flows must pass `has_contact_payload=True`.

- [ ] **Step 3: Run cache tests**

Run:

```bash
uv run pytest tests/test_speed_optimizations.py -q
```

Expected: pass with no free-text privacy scanning.

---

## Task 6: Remove Regex From Qwen JSON Extraction

**Files:**
- Modify: `src/huaxia_tourismrag/agents/qwen_structured_runner.py`
- Test: `tests/test_qwen_structured_runner.py`

- [ ] **Step 1: Replace regex implementation**

```python
def _extract_json_text(content: str) -> str:
    text = content.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    if not text.startswith("{"):
        raise QwenStructuredOutputError("Qwen response did not start with a JSON object.")
    return text
```

- [ ] **Step 2: Remove `import re`**

- [ ] **Step 3: Run runner tests**

Run:

```bash
uv run pytest tests/test_qwen_structured_runner.py -q
```

Expected: pass.

---

## Task 7: Preserve Model Routing And Async Job Work

**Files:**
- Keep: `src/huaxia_tourismrag/core/config.py`
- Keep: `src/huaxia_tourismrag/agents/model_runtime.py`
- Keep: `src/huaxia_tourismrag/agents/travel_checkpoints.py`
- Keep: `src/huaxia_tourismrag/agents/research_planner.py`
- Keep: `src/huaxia_tourismrag/agents/diy_itinerary_planner.py`
- Keep: `src/huaxia_tourismrag/agents/tourism_agent.py`
- Keep: job progress endpoint work if already present.

- [ ] **Step 1: Keep Qwen model split**

Checkpoint calls use `settings.checkpoint_model`.

Planner calls use `settings.planner_model`.

Final answer calls use `settings.final_answer_model`.

- [ ] **Step 2: Do not change concise answer prompt behavior**

No hard cap is added in this plan.

- [ ] **Step 3: Deep session replies stay async**

The session reply job endpoint remains valid because it is based on typed `session_id`, endpoint, and job kind.

---

## Task 8: Update Tests That Encode Keyword Behavior

**Files:**
- Modify: `tests/test_qa_service.py`
- Modify: `tests/test_diy_itinerary_service.py`
- Modify: `tests/test_travel_checkpoints.py`

- [ ] **Step 1: Delete keyword-trigger assertions**

Remove tests whose expected behavior depends on words like “巡礼”, “必须覆盖”, “简单说”, or “怎么玩”.

- [ ] **Step 2: Replace with DTO assertions**

Use explicit typed fields:

```python
TravelQuestion(
    question="请规划旅行。",
    destination="北京",
    start_date=date(2026, 6, 1),
    end_date=date(2026, 6, 3),
    travelers=2,
    detail_level="concise",
)
```

- [ ] **Step 3: Run all affected tests**

Run:

```bash
uv run pytest tests/test_travel_checkpoints.py tests/test_qa_service.py tests/test_diy_itinerary_service.py -q
```

Expected: pass.

---

## Task 9: Verification

- [ ] **Step 1: Static check**

Run:

```bash
uv run ruff check src/huaxia_tourismrag tests
```

Expected: pass.

- [ ] **Step 2: Full test suite**

Run:

```bash
uv run pytest -q
```

Expected: pass.

- [ ] **Step 3: Manual DTO behavior smoke**

Run one normal prompt without typed fields and confirm it does not use deterministic keyword skipping. It may call the checkpoint LLM.

Run one Streamlit prompt with explicit UI detail level and confirm the typed `detail_level` controls detail routing.

Run one DIY endpoint request and confirm intent skips only because endpoint mode is `"diy"`.

---

## Resulting Speed Strategy

This redesign keeps the clean speed wins:

- Qwen checkpoint model is faster.
- Qwen planner model is cheaper/faster than final model.
- Final answer model stays high quality.
- Deep replies use async jobs and progress UI.
- Answer cache can still work, but only from typed cache policy.

This deliberately removes the risky speed wins:

- No keyword shortcut for “simple”.
- No keyword shortcut for “complex”.
- No keyword shortcut for “DIY”.
- No regex shortcut for private-contact detection.

To recover those speed wins later, the UI/API should collect structured fields instead of parsing free text, for example:

- destination picker
- trip days selector
- traveler mix selector
- route mode selector
- required-stop list editor
- theme strictness selector
- explicit “use default preferences” button with `quick_reply_action_id="default_preferences"`


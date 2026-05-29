# Form Template Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Streamlit default to a polished form-template planning mode so first-time users can build a high-quality travel request by clicking options instead of writing a long natural-language prompt.

**Architecture:** Add a typed `TravelFormRequest` DTO that captures the form state explicitly, then convert it into the existing `TravelQuestion` pipeline through one deterministic adapter. The UI defaults to form mode, keeps free-text as optional notes, and only asks checkpoint questions when typed fields are still materially missing. This preserves the project rule: deterministic routing uses DTO fields, not keyword scans.

**Tech Stack:** Streamlit, FastAPI, Pydantic DTOs, existing `TravelQuestion`/checkpoint/session/job services, pytest.

---

## Product Decision

Default user experience changes from:

```text
User writes a long prompt -> Xiaxia asks confirmations -> user replies -> generation
```

to:

```text
User clicks a planning template -> fills typed fields -> Xiaxia generates or asks only one high-impact missing item
```

Free text remains available, but it becomes:

- optional notes in the form, or
- an advanced “自由描述” tab.

The form should feel like a travel-agency intake sheet, not a developer form.

---

## Non-Negotiable Rules

- Do not use hard-coded keyword triggers or regex to infer user intent from free text.
- Form defaults must be represented as typed DTO values.
- Checkpoint skipping must use typed completeness, not natural-language phrase matching.
- Do not remove the existing natural-language input; demote it to an optional/advanced path.
- Do not make users fill every field. Empty optional fields should map to conservative defaults.
- Deep DIY requests should continue to use async job mode and progress UI.

---

## File Structure

- Modify: `src/huaxia_tourismrag/schemas/evidence.py`
  - Add typed form request DTOs and conversion helpers.
- Modify: `src/huaxia_tourismrag/frontend/streamlit_client.py`
  - Add typed form payload builders and submit methods.
- Modify: `src/huaxia_tourismrag/streamlit_app.py`
  - Add default form-template UI.
  - Keep free-text mode as a secondary tab.
  - Submit form-derived DTOs to existing endpoints/jobs.
- Modify: `src/huaxia_tourismrag/services/travel_checkpoints.py`
  - Extend DTO-only checkpoint policy with form completeness facts.
- Modify: `src/huaxia_tourismrag/schemas/travel_checkpoints.py`
  - Extend `CheckpointContext` with typed form completeness fields.
- Modify: `src/huaxia_tourismrag/api/routes.py`
  - Add optional form endpoints only if direct `TravelQuestion` payloads become too large.
- Test: `tests/test_travel_form_request.py`
- Test: `tests/test_streamlit_frontend.py`
- Test: `tests/test_travel_checkpoints.py`
- Test: `tests/test_routes.py`

---

## Typed UX Model

Create these DTOs in `schemas/evidence.py`:

```python
TravelerGroup = Literal["solo", "couple", "family", "friends", "parents", "business"]
TravelPace = Literal["relaxed", "balanced", "intensive"]
TravelModePreference = Literal["train_first", "flight_first", "self_drive", "charter_when_needed", "mixed"]
AttractionPreference = Literal[
    "history_culture",
    "nature",
    "food",
    "family_friendly",
    "photography",
    "theme_route",
    "heritage",
    "city_classics",
]
RouteStrictness = Literal["flexible", "must_cover_all", "theme_pure", "balanced_city"]
AccommodationPreference = Literal["convenient", "luxury", "boutique", "budget"]
FoodPreference = Literal["local_snacks", "classic_restaurants", "fine_dining", "balanced"]


class TravelerComposition(BaseModel):
    adults: int = Field(default=1, ge=0, le=20)
    elders: int = Field(default=0, ge=0, le=10)
    children: int = Field(default=0, ge=0, le=10)

    @property
    def total(self) -> int:
        return self.adults + self.elders + self.children


class TravelFormRequest(BaseModel):
    request_mode: Literal["normal", "diy"] = "normal"
    origin_city: str | None = Field(default=None, max_length=80)
    destination: str | None = Field(default=None, max_length=120)
    return_city: str | None = Field(default=None, max_length=80)
    required_stops: list[str] = Field(default_factory=list, max_length=12)
    start_date: date | None = None
    end_date: date | None = None
    duration_days: int | None = Field(default=None, ge=1, le=60)
    traveler_group: TravelerGroup | None = None
    traveler_composition: TravelerComposition = Field(default_factory=TravelerComposition)
    budget_level: Literal["budget", "mid_range", "luxury"] | None = None
    travel_mode_preference: TravelModePreference = "mixed"
    pace: TravelPace = "balanced"
    route_strictness: RouteStrictness = "flexible"
    attraction_preferences: list[AttractionPreference] = Field(default_factory=list, max_length=8)
    accommodation_preference: AccommodationPreference = "convenient"
    food_preference: FoodPreference = "balanced"
    must_have: list[str] = Field(default_factory=list, max_length=12)
    avoid: list[str] = Field(default_factory=list, max_length=12)
    extra_notes: str | None = Field(default=None, max_length=500)
    detail_level: DetailLevel = "deep"
    language: Literal["zh-CN", "en"] = "zh-CN"
```

Add a conversion method:

```python
def to_travel_question(self) -> TravelQuestion:
    return TravelQuestion(
        question=self.to_request_summary(),
        destination=self.destination,
        start_date=self.start_date,
        end_date=self.end_date,
        travelers=self.traveler_composition.total or None,
        budget_level=self.budget_level,
        detail_level=self.detail_level,
        interests=self.to_interests(),
        language=self.language,
    )
```

`to_request_summary()` is allowed to generate a natural-language summary because it is not inference. It is deterministic serialization of validated DTO fields.

---

## Task 1: Add Typed Form DTOs

**Files:**
- Modify: `src/huaxia_tourismrag/schemas/evidence.py`
- Test: `tests/test_travel_form_request.py`

- [ ] **Step 1: Write failing tests**

```python
from huaxia_tourismrag.schemas.evidence import TravelFormRequest


def test_form_request_converts_to_travel_question_with_structured_context():
    form = TravelFormRequest(
        request_mode="diy",
        origin_city="北京",
        return_city="北京",
        required_stops=["涿州", "临漳", "许昌", "南阳", "成都", "汉中"],
        duration_days=12,
        traveler_composition={"adults": 3, "elders": 1, "children": 1},
        budget_level="luxury",
        travel_mode_preference="train_first",
        pace="balanced",
        route_strictness="must_cover_all",
        attraction_preferences=["history_culture", "theme_route", "heritage"],
        food_preference="local_snacks",
        accommodation_preference="convenient",
        detail_level="deep",
        language="zh-CN",
    )

    question = form.to_travel_question()

    assert question.destination is None
    assert question.travelers == 5
    assert question.budget_level == "luxury"
    assert question.detail_level == "deep"
    assert "必须覆盖: 涿州、临漳、许昌、南阳、成都、汉中" in question.question
    assert "交通偏好: train_first" in question.question
    assert "history_culture" in question.interests


def test_form_request_requires_at_least_one_traveler():
    form = TravelFormRequest(
        traveler_composition={"adults": 0, "elders": 0, "children": 0},
    )

    try:
        form.to_travel_question()
    except ValueError as exc:
        assert "at least one traveler" in str(exc)
    else:
        raise AssertionError("expected invalid empty traveler composition")
```

- [ ] **Step 2: Run failing test**

```bash
uv run pytest tests/test_travel_form_request.py -q
```

Expected: fails because `TravelFormRequest` does not exist.

- [ ] **Step 3: Implement DTOs and conversion**

Add the DTOs listed in the “Typed UX Model” section.

Implementation details:
- `to_request_summary()` should include only non-empty typed fields.
- Join lists with `、`.
- Use stable labels such as `出发城市`, `返回城市`, `必须覆盖`, `天数`, `同行人`, `预算等级`, `交通偏好`, `节奏`, `路线严格度`, `住宿偏好`, `餐饮偏好`, `补充说明`.
- `to_interests()` should combine `attraction_preferences`, `must_have`, and `required_stops`, capped to 12 items.

- [ ] **Step 4: Verify tests pass**

```bash
uv run pytest tests/test_travel_form_request.py -q
```

Expected: passes.

---

## Task 2: Add Form Payload Builders To Streamlit Client

**Files:**
- Modify: `src/huaxia_tourismrag/frontend/streamlit_client.py`
- Test: `tests/test_streamlit_frontend.py`

- [ ] **Step 1: Write failing tests**

```python
from huaxia_tourismrag.frontend.streamlit_client import build_form_payload


def test_build_form_payload_preserves_structured_fields():
    payload = build_form_payload(
        request_mode="diy",
        origin_city="北京",
        return_city="北京",
        required_stops=["涿州", "许昌"],
        duration_days=10,
        adults=2,
        elders=1,
        children=1,
        budget_level="luxury",
        travel_mode_preference="train_first",
        pace="balanced",
        route_strictness="must_cover_all",
        attraction_preferences=["history_culture", "theme_route"],
        accommodation_preference="convenient",
        food_preference="local_snacks",
        detail_level="deep",
        language="zh-CN",
        extra_notes="必要时包车。",
    )

    assert payload["request_mode"] == "diy"
    assert payload["required_stops"] == ["涿州", "许昌"]
    assert payload["traveler_composition"] == {
        "adults": 2,
        "elders": 1,
        "children": 1,
    }
    assert payload["detail_level"] == "deep"
```

- [ ] **Step 2: Run failing test**

```bash
uv run pytest tests/test_streamlit_frontend.py::test_build_form_payload_preserves_structured_fields -q
```

Expected: fails because `build_form_payload` does not exist.

- [ ] **Step 3: Implement `build_form_payload`**

Add a pure helper:

```python
def build_form_payload(...) -> dict[str, object]:
    payload = {
        "request_mode": request_mode,
        "origin_city": _clean_optional(origin_city),
        "destination": _clean_optional(destination),
        "return_city": _clean_optional(return_city),
        "required_stops": _clean_text_list(required_stops),
        "duration_days": duration_days,
        "traveler_composition": {
            "adults": adults,
            "elders": elders,
            "children": children,
        },
        "budget_level": budget_level,
        "travel_mode_preference": travel_mode_preference,
        "pace": pace,
        "route_strictness": route_strictness,
        "attraction_preferences": attraction_preferences,
        "accommodation_preference": accommodation_preference,
        "food_preference": food_preference,
        "extra_notes": _clean_optional(extra_notes),
        "detail_level": detail_level,
        "language": language,
    }
    return {key: value for key, value in payload.items() if value is not None}
```

- [ ] **Step 4: Verify tests pass**

```bash
uv run pytest tests/test_streamlit_frontend.py::test_build_form_payload_preserves_structured_fields -q
```

Expected: passes.

---

## Task 3: Add API Form Endpoints

**Files:**
- Modify: `src/huaxia_tourismrag/api/routes.py`
- Test: `tests/test_routes.py`

- [ ] **Step 1: Write failing route tests**

Add tests:

```python
def test_form_question_route_converts_form_to_existing_qa_service():
    client = make_client()

    response = client.post(
        "/tourism/forms/questions",
        json={
            "request_mode": "normal",
            "destination": "山西",
            "duration_days": 10,
            "traveler_composition": {"adults": 3, "elders": 1, "children": 1},
            "budget_level": "luxury",
            "attraction_preferences": ["history_culture", "heritage"],
            "detail_level": "deep",
        },
    )

    assert response.status_code == 200
    assert FakeTourismQAService.questions[0].travelers == 5
    assert "目的地: 山西" in FakeTourismQAService.questions[0].question


def test_form_diy_job_route_queues_deep_diy_job():
    client = make_client(configure_job_queue=True)

    response = client.post(
        "/tourism/forms/jobs",
        json={
            "request_mode": "diy",
            "origin_city": "北京",
            "return_city": "北京",
            "required_stops": ["涿州", "许昌", "成都", "汉中"],
            "duration_days": 12,
            "traveler_composition": {"adults": 2, "elders": 1, "children": 1},
            "budget_level": "luxury",
            "route_strictness": "must_cover_all",
            "detail_level": "deep",
        },
    )

    assert response.status_code == 202
    queue = client.app.state.travel_job_queue
    assert queue.items[0].kind == "diy_itinerary"
```

- [ ] **Step 2: Run failing tests**

```bash
uv run pytest tests/test_routes.py::test_form_question_route_converts_form_to_existing_qa_service tests/test_routes.py::test_form_diy_job_route_queues_deep_diy_job -q
```

Expected: fails because endpoints do not exist.

- [ ] **Step 3: Implement form endpoints**

Add:

```python
@router.post("/forms/questions", response_model=TravelAnswer)
async def answer_form_question(body: TravelFormRequest, request: Request) -> TravelAnswer:
    question = body.to_travel_question()
    if body.request_mode == "diy":
        service = _diy_itinerary_service(request)
        return await service.answer(question)
    service = _tourism_qa_service(request)
    return await service.answer(question)
```

Add job endpoint:

```python
@router.post("/forms/jobs", response_model=TravelJobCreateResponse, status_code=202)
async def create_form_job(body: TravelFormRequest, request: Request, background_tasks: BackgroundTasks) -> TravelJobCreateResponse:
    question = body.to_travel_question()
    kind: TravelJobKind = "diy_itinerary" if body.request_mode == "diy" else "general_question"
    # Reuse existing job creation helper flow from `/jobs/diy` and `/jobs/questions`.
```

Use existing job store/queue/background execution code rather than duplicating logic where possible.

- [ ] **Step 4: Verify route tests pass**

```bash
uv run pytest tests/test_routes.py::test_form_question_route_converts_form_to_existing_qa_service tests/test_routes.py::test_form_diy_job_route_queues_deep_diy_job -q
```

Expected: passes.

---

## Task 4: Extend DTO-Only Checkpoint Policy For Form Completeness

**Files:**
- Modify: `src/huaxia_tourismrag/schemas/travel_checkpoints.py`
- Modify: `src/huaxia_tourismrag/services/travel_checkpoints.py`
- Test: `tests/test_travel_checkpoints.py`

- [ ] **Step 1: Write failing tests**

```python
from huaxia_tourismrag.schemas.evidence import TravelFormRequest
from huaxia_tourismrag.services.travel_checkpoints import (
    build_checkpoint_context,
    evaluate_checkpoint_policy,
)


def test_complete_form_skips_preference_checkpoint_without_text_scanning():
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
        pace="balanced",
        attraction_preferences=["history_culture", "theme_route"],
        accommodation_preference="convenient",
        food_preference="local_snacks",
        detail_level="deep",
    )

    context = build_checkpoint_context(
        form.to_travel_question(),
        request_mode="diy",
        form_request=form,
    )
    decision = evaluate_checkpoint_policy(context)

    assert decision.run_intent_checkpoint is False
    assert decision.run_preference_checkpoint is False
```

- [ ] **Step 2: Run failing test**

```bash
uv run pytest tests/test_travel_checkpoints.py::test_complete_form_skips_preference_checkpoint_without_text_scanning -q
```

Expected: fails because `form_request` is not accepted.

- [ ] **Step 3: Add form completeness fields**

Extend `CheckpointContext`:

```python
from_form_template: bool = False
has_origin_city: bool = False
has_return_city: bool = False
required_stop_count: int = Field(default=0, ge=0, le=12)
has_traveler_composition: bool = False
has_transport_preference: bool = False
has_pace_preference: bool = False
has_route_strictness: bool = False
has_food_preference: bool = False
has_accommodation_preference: bool = False
```

Update `build_checkpoint_context(question, request_mode, form_request=None)`.

- [ ] **Step 4: Update policy**

Add:

```python
complete_form_preferences = (
    context.from_form_template
    and context.has_traveler_composition
    and context.budget_level is not None
    and context.has_transport_preference
    and context.has_pace_preference
    and context.has_food_preference
    and context.has_accommodation_preference
)

if complete_form_preferences:
    decision.run_preference_checkpoint = False
    decision.synthesized_preference_profile = PreferenceProfile(...)
    decision.reasons.append("complete_form_preferences")
```

Add `"complete_form_preferences"` to `CheckpointReason`.

- [ ] **Step 5: Verify tests pass**

```bash
uv run pytest tests/test_travel_checkpoints.py::test_complete_form_skips_preference_checkpoint_without_text_scanning -q
```

Expected: passes.

---

## Task 5: Build Default Streamlit Form Template UI

**Files:**
- Modify: `src/huaxia_tourismrag/streamlit_app.py`
- Test: `tests/test_streamlit_frontend.py`

- [ ] **Step 1: Add UI state tests for mode defaults**

Add a helper-level test if existing Streamlit tests avoid rendering:

```python
from huaxia_tourismrag.streamlit_app import _default_template_state


def test_default_template_state_prefers_form_mode_and_deep_detail():
    state = _default_template_state()

    assert state["composer_mode"] == "form"
    assert state["request_mode"] == "normal"
    assert state["detail_level"] == "deep"
    assert state["pace"] == "balanced"
    assert state["travel_mode_preference"] == "mixed"
```

- [ ] **Step 2: Run failing test**

```bash
uv run pytest tests/test_streamlit_frontend.py::test_default_template_state_prefers_form_mode_and_deep_detail -q
```

Expected: fails because `_default_template_state` does not exist.

- [ ] **Step 3: Implement template state helper**

Add:

```python
def _default_template_state() -> dict[str, Any]:
    return {
        "composer_mode": "form",
        "request_mode": "normal",
        "origin_city": "",
        "destination": "",
        "return_city": "",
        "required_stops_text": "",
        "duration_days": 5,
        "adults": 2,
        "elders": 0,
        "children": 0,
        "budget_level": "mid_range",
        "travel_mode_preference": "mixed",
        "pace": "balanced",
        "route_strictness": "flexible",
        "attraction_preferences": ["history_culture", "food"],
        "accommodation_preference": "convenient",
        "food_preference": "balanced",
        "detail_level": "deep",
        "extra_notes": "",
    }
```

Initialize these fields in `_ensure_state()`.

- [ ] **Step 4: Add the visual form**

Replace `_render_input(...)` with a two-tab composer:

```python
form_tab, free_text_tab = st.tabs([copy["form_mode"], copy["free_text_mode"]])
with form_tab:
    _render_form_composer(mode=mode, detail_level=detail_level, copy=copy)
with free_text_tab:
    _render_free_text_composer(mode=mode, detail_level=detail_level, copy=copy)
```

Create `_render_form_composer(...)` with these controls:

- Trip type: normal / diy, synced with existing mode radio.
- Destination or required stops.
- Origin and return city.
- Duration days or date range.
- Adults / elders / children number inputs.
- Budget segmented control.
- Travel mode segmented control.
- Pace segmented control.
- Attraction preference multi-select.
- Food preference.
- Accommodation preference.
- Optional must-have / avoid / notes text areas.
- Submit button.

Use a clear first-time layout:

```text
1. 去哪儿
2. 和谁去
3. 怎么玩
4. 预算和舒适度
5. 补充说明
```

- [ ] **Step 5: Submit structured payload**

On submit:

```python
payload = build_form_payload(...)
_submit_form_payload(payload, copy=copy)
```

Implement `_submit_form_payload`:

- append a human-readable summary as the user message
- if detail is deep, call `/tourism/forms/jobs`
- otherwise call `/tourism/forms/questions`
- sync returned `session_id` and `needs_reply` exactly like `_submit_prompt`

- [ ] **Step 6: Verify frontend tests pass**

```bash
uv run pytest tests/test_streamlit_frontend.py -q
```

Expected: passes.

---

## Task 6: Reduce Confirmation Breaks For Complete Form Requests

**Files:**
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
- Test: `tests/test_qa_service.py`
- Test: `tests/test_diy_itinerary_service.py`

- [ ] **Step 1: Write service tests**

Add tests proving complete form context skips preference checkpoint:

```python
async def test_complete_form_question_skips_preference_checkpoint(monkeypatch):
    async def fail_preference(*args, **kwargs):
        raise AssertionError("form completeness should skip preference checkpoint")

    # Build TravelQuestion from TravelFormRequest, pass form_request into service.answer.
```

- [ ] **Step 2: Extend service method signatures**

Change:

```python
async def answer(self, question: TravelQuestion, progress_callback: ProgressCallback | None = None)
```

to:

```python
async def answer(
    self,
    question: TravelQuestion,
    progress_callback: ProgressCallback | None = None,
    form_request: TravelFormRequest | None = None,
) -> TravelAnswer:
```

Only routes using form endpoints pass `form_request`.

- [ ] **Step 3: Pass form request into checkpoint context**

```python
checkpoint_context = build_checkpoint_context(
    question,
    request_mode="general",
    form_request=form_request,
)
```

Same for DIY.

- [ ] **Step 4: Verify service tests pass**

```bash
uv run pytest tests/test_qa_service.py tests/test_diy_itinerary_service.py -q
```

Expected: passes.

---

## Task 7: Polish Copy And Bilingual Form Labels

**Files:**
- Modify: `src/huaxia_tourismrag/streamlit_app.py`
- Test: `tests/test_streamlit_frontend.py`

- [ ] **Step 1: Add copy keys**

Chinese:

```python
"form_mode": "快速表单",
"free_text_mode": "自由描述",
"form_section_where": "1. 去哪儿",
"form_section_people": "2. 和谁去",
"form_section_style": "3. 怎么玩",
"form_section_budget": "4. 预算和舒适度",
"form_section_notes": "5. 补充说明",
"form_submit": "生成旅行方案",
"required_stops_help": "多个城市或景点用换行分隔。",
```

English:

```python
"form_mode": "Quick form",
"free_text_mode": "Free text",
"form_section_where": "1. Where to go",
"form_section_people": "2. Travelers",
"form_section_style": "3. Travel style",
"form_section_budget": "4. Budget and comfort",
"form_section_notes": "5. Notes",
"form_submit": "Generate itinerary",
"required_stops_help": "Use one city or attraction per line.",
```

- [ ] **Step 2: Verify copy keys exist**

Add a test that both language dictionaries contain all form keys.

- [ ] **Step 3: Run tests**

```bash
uv run pytest tests/test_streamlit_frontend.py -q
```

Expected: passes.

---

## Task 8: Manual UX Smoke Test

**Files:**
- Update: `evals/manual_itinerary_quality.md`

- [ ] **Step 1: Add form-mode QA cases**

Add:

```markdown
## Form Template Mode Smoke Tests

### Case 1: Shanxi family luxury history trip
- Mode: 快速表单
- Destination: 山西
- Duration: 10 days
- Travelers: 3 adults, 1 elder, 1 child
- Budget: luxury
- Preferences: history culture, heritage, local food
- Expected:
  - No unnecessary “你更偏哪种” checkpoint
  - Uses async job for deep answer
  - Answer preserves elderly/child pacing

### Case 2: DIY 三国巡礼
- Mode: 快速表单
- Request mode: DIY
- Origin/return: 北京
- Required stops: 涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中
- Route strictness: must_cover_all
- Expected:
  - Intent checkpoint skipped by endpoint/form mode
  - Required stops preserved
  - Deep job progress appears
```

- [ ] **Step 2: Run app locally**

```bash
uv run uvicorn huaxia_tourismrag.main:app --reload --host 127.0.0.1 --port 8000
uv run streamlit run src/huaxia_tourismrag/streamlit_app.py
```

- [ ] **Step 3: Record observations**

Update `evals/manual_itinerary_quality.md` with:

- whether checkpoint count dropped
- whether generated summary matched selected fields
- whether required stops were preserved
- whether async job progress was visible

---

## Task 9: Full Verification And Commit

**Files:**
- All changed files.

- [ ] **Step 1: Run lint**

```bash
uv run ruff check src/huaxia_tourismrag tests
```

Expected: `All checks passed!`

- [ ] **Step 2: Run tests**

```bash
uv run pytest -q
```

Expected: all tests pass.

- [ ] **Step 3: Scan for forbidden checkpoint/cache text triggers**

```bash
rg -n "should_skip|trigger|PRIVATE_CONTACT_HINTS|CONCISE_DETAIL|DIY_INTENT|OPERATIONAL_STATUS|COMPLEX_ROUTE|SHORT_TRIP|import re|re\\." \
  src/huaxia_tourismrag/services/travel_checkpoints.py \
  src/huaxia_tourismrag/services/answer_cache.py \
  src/huaxia_tourismrag/agents/qwen_structured_runner.py \
  src/huaxia_tourismrag/services/session_reply_service.py
```

Expected: no forbidden routing/cache/Qwen extraction matches.

- [ ] **Step 4: Commit**

```bash
git add src/huaxia_tourismrag tests evals/manual_itinerary_quality.md docs/superpowers/plans/2026-05-28-form-template-mode.md
git commit -m "Add form template planning mode"
```

---

## Self-Review Checklist

- The plan adds a typed form DTO rather than making Streamlit generate opaque natural language.
- The API can still serve existing natural-language clients.
- The form mode reduces checkpoint interruptions using typed completeness facts.
- No deterministic step scans free text for keywords.
- Deep DIY remains async-first.
- Tests cover DTO conversion, payload construction, route wiring, checkpoint skipping, and UI helper behavior.

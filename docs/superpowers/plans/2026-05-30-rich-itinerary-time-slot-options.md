# Rich Itinerary Time Slot Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `行程` feel like a professional travel-agency day-by-day plan by adding explicit clock times, richer food/lodging/transport/shopping/entertainment details, and user-choice alternatives inside each day.

**Architecture:** Extend the existing `generated_itinerary` DTO instead of stuffing more prose into one description string. The LLM writes structured timed activities and optional alternatives; a post-generation guard validates ordering and source compatibility; Streamlit renders the same DTO as polished text, timeline, CSV, and PDF.

**Tech Stack:** Pydantic DTOs, Qwen structured JSON output, existing citation/topic evidence pipeline, FastAPI service layer, Streamlit renderer, pytest/ruff.

---

## File Structure

- Modify `src/huaxia_tourismrag/schemas/evidence.py`
  - Add a typed `ActivityAlternative`.
  - Extend `ActivityItem` with `start_time`, `end_time`, `alternatives`, and `citations`.
- Modify `src/huaxia_tourismrag/agents/tourism_agent.py`
  - Update final-answer prompt so deep itineraries include time slots, practical topic details, and 1-3 alternatives where evidence supports them.
- Create `src/huaxia_tourismrag/services/itinerary_schedule_quality.py`
  - Validate timed activities without inventing content.
  - Keep backward compatibility for old activity rows.
  - Normalize invalid times and unsupported alternatives into warnings/removals.
- Modify `src/huaxia_tourismrag/services/qa_service.py`
  - Run the itinerary schedule guard after `ensure_generated_itinerary(...)` and before final response return.
- Modify `src/huaxia_tourismrag/services/diy_itinerary_service.py`
  - Run the same guard for DIY route answers.
- Modify `src/huaxia_tourismrag/tools/citation_guard.py`
  - Include new alternative descriptions and citation IDs in citation normalization.
- Modify `src/huaxia_tourismrag/streamlit_app.py`
  - Render time labels, alternatives, and topical details in text/timeline/PDF/CSV.
- Modify tests:
  - `tests/test_tourism_agent.py`
  - `tests/test_itinerary_schedule_quality.py` (new)
  - `tests/test_qa_service.py`
  - `tests/test_diy_itinerary_service.py`
  - `tests/test_streamlit_frontend.py`

---

### Task 1: Extend Itinerary DTOs

**Files:**
- Modify: `src/huaxia_tourismrag/schemas/evidence.py`
- Test: `tests/test_tourism_agent.py`

- [ ] **Step 1: Write the failing schema test**

Add this test near the existing itinerary schema tests in `tests/test_tourism_agent.py`:

```python
def test_activity_item_accepts_time_slots_and_alternatives():
    answer = TravelAnswer.model_validate(
        {
            "answer": "夏夏整理好了。[1]",
            "highlights": [],
            "warnings": [],
            "citations": ["[1] 成都美食 - 测试来源 - internal:food"],
            "generated_itinerary": {
                "destination": "成都",
                "itinerary": [
                    {
                        "day": 1,
                        "city": "成都",
                        "activities": [
                            {
                                "start_time": "08:30",
                                "end_time": "10:30",
                                "name": "武侯祠深度讲解",
                                "category": "cultural_attraction",
                                "description": "08:30 到达武侯祠，安排讲解员讲三国人物线索。[1]",
                                "citations": [1],
                                "alternatives": [
                                    {
                                        "title": "轻松版",
                                        "description": "如果同行人想少走路，可缩短讲解时间并增加茶馆休息。[1]",
                                        "category": "special_event",
                                        "citations": [1],
                                    }
                                ],
                            }
                        ],
                    }
                ],
            },
        }
    )

    activity = answer.generated_itinerary.itinerary[0].activities[0]
    assert activity.start_time.strftime("%H:%M") == "08:30"
    assert activity.end_time.strftime("%H:%M") == "10:30"
    assert activity.citations == [1]
    assert activity.alternatives[0].title == "轻松版"
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
uv run pytest -q tests/test_tourism_agent.py::test_activity_item_accepts_time_slots_and_alternatives
```

Expected: fail because `ActivityItem` does not yet expose `start_time`, `end_time`, `citations`, or `alternatives`.

- [ ] **Step 3: Implement DTO additions**

In `src/huaxia_tourismrag/schemas/evidence.py`, add imports:

```python
from datetime import date, datetime, time
```

If `date` and `datetime` are already imported, extend the existing import with `time`.

Add this model immediately before `class ActivityItem(BaseModel):`

```python
class ActivityAlternative(BaseModel):
    """One optional choice for a scheduled itinerary slot."""

    title: str = Field(min_length=1, max_length=80)

    description: str = Field(min_length=1, max_length=800)

    category: Literal[
        "natural_attraction",
        "cultural_attraction",
        "local_restaurant",
        "accommodation",
        "shopping",
        "transport",
        "nature",
        "special_event",
    ] | None = None

    location: str | None = Field(default=None, max_length=120)

    citations: list[int] = Field(default_factory=list, max_length=8)
```

Extend `ActivityItem` with:

```python
    start_time: time | None = None

    end_time: time | None = None

    citations: list[int] = Field(default_factory=list, max_length=8)

    alternatives: list[ActivityAlternative] = Field(default_factory=list, max_length=4)
```

- [ ] **Step 4: Verify the schema test passes**

Run:

```bash
uv run pytest -q tests/test_tourism_agent.py::test_activity_item_accepts_time_slots_and_alternatives
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/schemas/evidence.py tests/test_tourism_agent.py
git commit -m "feat: add timed itinerary activity options"
```

---

### Task 2: Tighten Final-Answer Prompt Contract

**Files:**
- Modify: `src/huaxia_tourismrag/agents/tourism_agent.py`
- Test: `tests/test_tourism_agent.py`

- [ ] **Step 1: Write the failing prompt test**

Add this test near prompt contract tests:

```python
def test_final_answer_prompt_requires_timed_itinerary_choices():
    prompt = build_final_answer_prompt(
        question=TravelQuestion(
            question="上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。",
            detail_level="deep",
        ),
        evidence_context="证据",
        allowed_citations="[1] 山西景区 - 测试来源 - internal:shanxi",
        detail_level="deep",
        research_plan=TravelResearchPlan(
            original_question="上海出发，山西历史人文十日深度游",
            destination="山西",
            trip_days=10,
            required_entities=[],
            tasks=[],
        ),
        diy_plan=None,
        preference_profile=None,
        feasibility_check=None,
        service_enrichment=None,
        topic_evidence_context="专题证据包",
        topic_section_mode="inline",
    )

    assert "start_time / end_time" in prompt
    assert "08:30 到达景区" in prompt
    assert "12:00 午餐" in prompt
    assert "alternatives" in prompt
    assert "同一时段提供 1-3 个可选择方案" in prompt
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
uv run pytest -q tests/test_tourism_agent.py::test_final_answer_prompt_requires_timed_itinerary_choices
```

Expected: fail because the prompt does not yet mention typed time fields or alternatives.

- [ ] **Step 3: Update the itinerary rules**

In `src/huaxia_tourismrag/agents/tourism_agent.py`, extend the deep itinerary rules with this exact block:

```text
- 当 detail_level 是 deep 且生成 generated_itinerary 时，每个主要 activity 应尽量填写 start_time / end_time，使用 24 小时 HH:MM，例如 08:30 到达景区、12:00 午餐、18:00 搭乘火车、20:00 入住酒店。
- deep 行程每天至少覆盖上午、午餐、下午、晚餐或夜间、住宿/休息这几个执行节点；如果当天有跨城移动，必须单独写 transport activity。
- activity.description 要把美食、住宿、公交/接驳、购物、娱乐项目自然融入当天安排，例如“12:00 午餐：体验钟水饺、龙抄手、甜水面等成都小吃 [n]”，但只能写证据支持的名称。
- 对可弹性安排的晚间、用餐、购物或体验时段，activity.alternatives 应提供 1-3 个可选择方案，让游客决定，例如“锦里美食街”和“宽窄巷子茶馆夜游”；每个 alternative.description 必须有 [n] 引用。
- alternatives 不是泛泛备选景点清单，必须对应同一个时间槽内的真实选择，并说明适合哪类用户、体力强度、交通便利性或预约要求。
```

Also extend the structured output requirements with:

```text
- activity.start_time / activity.end_time 使用 HH:MM；不知道准确时间时可以省略，但不要编造火车/航班的精确时刻。
- activity.alternatives 最多 4 条；每条 alternative 必须有 title、description，且 description 必须带 [n] 引用。
- activity.citations 应包含 description 中使用的引用编号。
```

- [ ] **Step 4: Verify prompt test passes**

Run:

```bash
uv run pytest -q tests/test_tourism_agent.py::test_final_answer_prompt_requires_timed_itinerary_choices
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/agents/tourism_agent.py tests/test_tourism_agent.py
git commit -m "feat: require rich timed itinerary output"
```

---

### Task 3: Add Itinerary Schedule Quality Guard

**Files:**
- Create: `src/huaxia_tourismrag/services/itinerary_schedule_quality.py`
- Test: `tests/test_itinerary_schedule_quality.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_itinerary_schedule_quality.py`:

```python
from huaxia_tourismrag.schemas.evidence import TravelAnswer
from huaxia_tourismrag.services.itinerary_schedule_quality import ItineraryScheduleQualityGuard


def _answer_with_activities(activities):
    return TravelAnswer.model_validate(
        {
            "answer": "夏夏整理好了。",
            "highlights": [],
            "warnings": [],
            "citations": [],
            "generated_itinerary": {
                "destination": "成都",
                "itinerary": [
                    {
                        "day": 1,
                        "city": "成都",
                        "activities": activities,
                    }
                ],
            },
        }
    )


def test_guard_sorts_timed_activities_inside_each_day():
    answer = _answer_with_activities(
        [
            {
                "start_time": "18:00",
                "name": "晚餐",
                "description": "18:00 晚餐。",
            },
            {
                "start_time": "08:30",
                "name": "上午游览",
                "description": "08:30 到达景区。",
            },
        ]
    )

    result = ItineraryScheduleQualityGuard().validate(answer)

    activities = result.answer.generated_itinerary.itinerary[0].activities
    assert [item.name for item in activities] == ["上午游览", "晚餐"]
    assert result.issues == []


def test_guard_removes_alternative_without_description():
    answer = _answer_with_activities(
        [
            {
                "start_time": "19:00",
                "name": "夜间选择",
                "description": "19:00 夜游。",
                "alternatives": [
                    {
                        "title": "锦里",
                        "description": "锦里适合美食街体验。[1]",
                        "citations": [1],
                    },
                    {
                        "title": "空选项",
                        "description": " ",
                    },
                ],
            }
        ]
    )

    result = ItineraryScheduleQualityGuard().validate(answer)

    alternatives = result.answer.generated_itinerary.itinerary[0].activities[0].alternatives
    assert len(alternatives) == 1
    assert alternatives[0].title == "锦里"
    assert result.issues


def test_guard_flags_end_time_before_start_time():
    answer = _answer_with_activities(
        [
            {
                "start_time": "20:00",
                "end_time": "18:00",
                "name": "错误时段",
                "description": "时间错误。",
            }
        ]
    )

    result = ItineraryScheduleQualityGuard().validate(answer)

    activity = result.answer.generated_itinerary.itinerary[0].activities[0]
    assert activity.end_time is None
    assert result.issues[0].issue_type == "invalid_time_range"
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
uv run pytest -q tests/test_itinerary_schedule_quality.py
```

Expected: fail because the new guard does not exist.

- [ ] **Step 3: Implement guard**

Create `src/huaxia_tourismrag/services/itinerary_schedule_quality.py`:

```python
"""Quality normalization for structured timed itineraries."""

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel

from huaxia_tourismrag.schemas.evidence import TravelAnswer


class ItineraryScheduleIssue(BaseModel):
    """Non-fatal issue found in generated itinerary schedule structure."""

    issue_type: Literal[
        "invalid_time_range",
        "empty_alternative",
    ]

    message: str

    day: int | None = None

    activity_name: str | None = None


@dataclass(frozen=True)
class ItineraryScheduleQualityResult:
    """Normalized answer and schedule-quality issues."""

    answer: TravelAnswer
    issues: list[ItineraryScheduleIssue]


class ItineraryScheduleQualityGuard:
    """Normalize schedule fields without inventing itinerary content."""

    def validate(self, answer: TravelAnswer) -> ItineraryScheduleQualityResult:
        normalized = answer.model_copy(deep=True)
        issues: list[ItineraryScheduleIssue] = []
        itinerary = normalized.generated_itinerary
        if itinerary is None:
            return ItineraryScheduleQualityResult(answer=normalized, issues=issues)

        for day in itinerary.itinerary:
            for activity in day.activities:
                if (
                    activity.start_time is not None
                    and activity.end_time is not None
                    and activity.end_time <= activity.start_time
                ):
                    issues.append(
                        ItineraryScheduleIssue(
                            issue_type="invalid_time_range",
                            message="activity.end_time must be after activity.start_time; end_time was removed.",
                            day=day.day,
                            activity_name=activity.name,
                        )
                    )
                    activity.end_time = None

                kept_alternatives = []
                for alternative in activity.alternatives:
                    if not alternative.title.strip() or not alternative.description.strip():
                        issues.append(
                            ItineraryScheduleIssue(
                                issue_type="empty_alternative",
                                message="activity.alternatives entries must have title and description; empty alternative was removed.",
                                day=day.day,
                                activity_name=activity.name,
                            )
                        )
                        continue
                    kept_alternatives.append(alternative)
                activity.alternatives = kept_alternatives

            day.activities = sorted(
                day.activities,
                key=lambda item: (
                    item.start_time is None,
                    item.start_time.isoformat() if item.start_time else "",
                ),
            )

        return ItineraryScheduleQualityResult(answer=normalized, issues=issues)
```

- [ ] **Step 4: Verify guard tests pass**

Run:

```bash
uv run pytest -q tests/test_itinerary_schedule_quality.py
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/services/itinerary_schedule_quality.py tests/test_itinerary_schedule_quality.py
git commit -m "feat: validate timed itinerary structure"
```

---

### Task 4: Wire Schedule Guard Into QA and DIY Services

**Files:**
- Modify: `src/huaxia_tourismrag/services/qa_service.py`
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
- Test: `tests/test_qa_service.py`
- Test: `tests/test_diy_itinerary_service.py`

- [ ] **Step 1: Write service tests**

In `tests/test_qa_service.py`, add a test using the existing fake-agent patterns in that file:

```python
def test_qa_service_normalizes_invalid_itinerary_time_range():
    answer = _travel_answer(
        generated_itinerary={
            "destination": "成都",
            "itinerary": [
                {
                    "day": 1,
                    "city": "成都",
                    "activities": [
                        {
                            "start_time": "20:00",
                            "end_time": "18:00",
                            "name": "错误时段",
                            "description": "时间错误。[1]",
                        }
                    ],
                }
            ],
        }
    )

    normalized = _normalize_answer_through_service(answer)

    activity = normalized.generated_itinerary.itinerary[0].activities[0]
    assert activity.end_time is None
    assert any("行程时间结构" in warning for warning in normalized.warnings)
```

In `tests/test_diy_itinerary_service.py`, add the equivalent DIY service test with that file’s helper names. Use the same assertion: invalid `end_time` becomes `None` and a warning mentions `行程时间结构`.

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
uv run pytest -q tests/test_qa_service.py::test_qa_service_normalizes_invalid_itinerary_time_range tests/test_diy_itinerary_service.py::test_diy_service_normalizes_invalid_itinerary_time_range
```

Expected: fail because services do not call the guard.

- [ ] **Step 3: Wire the guard**

In both `src/huaxia_tourismrag/services/qa_service.py` and `src/huaxia_tourismrag/services/diy_itinerary_service.py`, import:

```python
from huaxia_tourismrag.services.itinerary_schedule_quality import ItineraryScheduleQualityGuard
```

After `answer = ensure_generated_itinerary(...)` and before topic/citation finalization, add:

```python
schedule_result = ItineraryScheduleQualityGuard().validate(answer)
answer = schedule_result.answer
if schedule_result.issues:
    answer.warnings.append(
        f"行程时间结构已自动校正：{len(schedule_result.issues)} 项。"
    )
```

- [ ] **Step 4: Verify service tests pass**

Run:

```bash
uv run pytest -q tests/test_qa_service.py::test_qa_service_normalizes_invalid_itinerary_time_range tests/test_diy_itinerary_service.py::test_diy_service_normalizes_invalid_itinerary_time_range
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/services/qa_service.py src/huaxia_tourismrag/services/diy_itinerary_service.py tests/test_qa_service.py tests/test_diy_itinerary_service.py
git commit -m "feat: normalize itinerary schedule in services"
```

---

### Task 5: Include Alternatives in Citation Guard

**Files:**
- Modify: `src/huaxia_tourismrag/tools/citation_guard.py`
- Test: `tests/test_citation_guard.py`

- [ ] **Step 1: Write failing citation test**

Add:

```python
def test_citation_guard_reads_itinerary_activity_alternatives():
    answer = TravelAnswer.model_validate(
        {
            "answer": "夏夏整理好了。",
            "highlights": [],
            "warnings": [],
            "citations": ["[1] 成都川剧 - 测试来源 - internal:opera"],
            "generated_itinerary": {
                "destination": "成都",
                "itinerary": [
                    {
                        "day": 1,
                        "city": "成都",
                        "activities": [
                            {
                                "name": "夜间选择",
                                "description": "19:00 可自由安排。",
                                "alternatives": [
                                    {
                                        "title": "看变脸",
                                        "description": "晚上可以看川剧变脸演出。[1]",
                                        "citations": [1],
                                    }
                                ],
                            }
                        ],
                    }
                ],
            },
        }
    )
    pack = CitationPack(
        context_text="",
        citations=["[1] 成都川剧 - 测试来源 - internal:opera"],
        evidence_quotes=[
            EvidenceQuote(
                citation_id=1,
                chunk_id="opera",
                source_type="internal",
                content_type="entertainment",
                title="成都川剧",
                source_name="测试来源",
                source_ref="internal:opera",
                quote="成都川剧演出。",
            )
        ],
    )

    result = CitationGuard().validate(answer, pack)

    assert result.answer.citations == ["[1] 成都川剧 - 测试来源 - internal:opera"]
    assert result.issues == []
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
uv run pytest -q tests/test_citation_guard.py::test_citation_guard_reads_itinerary_activity_alternatives
```

Expected: fail if alternative citations are ignored as unused.

- [ ] **Step 3: Update itinerary text extraction**

In `src/huaxia_tourismrag/tools/citation_guard.py`, update `_itinerary_text_parts(...)` so each activity contributes:

```python
parts.append(activity.description)
for alternative in activity.alternatives:
    parts.append(alternative.description)
```

Also include numeric `activity.citations` and `alternative.citations` in the referenced-id collection if the file already has a helper that reads structured citation lists. If no such helper exists, rely on `[n]` in descriptions and keep this task scoped.

- [ ] **Step 4: Verify test passes**

Run:

```bash
uv run pytest -q tests/test_citation_guard.py::test_citation_guard_reads_itinerary_activity_alternatives
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/tools/citation_guard.py tests/test_citation_guard.py
git commit -m "feat: validate citations in itinerary alternatives"
```

---

### Task 6: Render Timed Activities and Choices in Streamlit

**Files:**
- Modify: `src/huaxia_tourismrag/streamlit_app.py`
- Test: `tests/test_streamlit_frontend.py`

- [ ] **Step 1: Write failing frontend tests**

Add:

```python
def test_itinerary_text_version_renders_time_slots_and_alternatives():
    itinerary = {
        "destination": "成都",
        "itinerary": [
            {
                "day": 1,
                "city": "成都",
                "activities": [
                    {
                        "start_time": "12:00",
                        "end_time": "13:00",
                        "name": "午餐",
                        "description": "体验钟水饺、龙抄手、甜水面。[1]",
                        "alternatives": [
                            {
                                "title": "锦里美食街",
                                "description": "适合想边逛边吃的游客。[1]",
                            },
                            {
                                "title": "宽窄巷子茶馆",
                                "description": "适合想坐下来喝茶休息的游客。[1]",
                            },
                        ],
                    }
                ],
            }
        ],
    }

    text = streamlit_app._itinerary_text_version(itinerary, streamlit_app.UI_TEXT["zh"])

    assert "12:00-13:00" in text
    assert "午餐" in text
    assert "可选" in text
    assert "锦里美食街" in text
    assert "宽窄巷子茶馆" in text


def test_itinerary_timeline_renders_time_slots_and_alternatives():
    itinerary = {
        "destination": "成都",
        "itinerary": [
            {
                "day": 1,
                "city": "成都",
                "activities": [
                    {
                        "start_time": "19:00",
                        "name": "夜间选择",
                        "description": "夜间自由安排。",
                        "alternatives": [
                            {
                                "title": "看变脸",
                                "description": "适合想看演出的游客。[1]",
                            }
                        ],
                    }
                ],
            }
        ],
    }

    timeline = streamlit_app._itinerary_timeline_html(itinerary, streamlit_app.UI_TEXT["zh"])

    assert "19:00" in timeline
    assert "timeline-alternatives" in timeline
    assert "看变脸" in timeline
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
uv run pytest -q tests/test_streamlit_frontend.py::test_itinerary_text_version_renders_time_slots_and_alternatives tests/test_streamlit_frontend.py::test_itinerary_timeline_renders_time_slots_and_alternatives
```

Expected: fail because renderers ignore time fields and alternatives.

- [ ] **Step 3: Add helper functions**

In `src/huaxia_tourismrag/streamlit_app.py`, add:

```python
def _activity_time_label(activity: dict[str, Any]) -> str:
    start = str(activity.get("start_time") or "").strip()
    end = str(activity.get("end_time") or "").strip()
    if start and end:
        return f"{start}-{end}"
    return start or end


def _activity_alternative_lines(activity: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for alternative in activity.get("alternatives") or []:
        if not isinstance(alternative, dict):
            continue
        title = str(alternative.get("title") or "").strip()
        description = str(alternative.get("description") or "").strip()
        if title and description:
            lines.append(f"  - 可选：{title}｜{description}")
        elif title:
            lines.append(f"  - 可选：{title}")
    return lines
```

- [ ] **Step 4: Update text renderer**

In `_activity_text_lines(...)`, build the label like this:

```python
time_label = _activity_time_label(activity)
label = name or f"安排{index}"
if time_label:
    label = f"{time_label}｜{label}"
lines.append(f"- **{label}**：{body}")
lines.extend(_activity_alternative_lines(activity))
```

- [ ] **Step 5: Update timeline renderer**

Inside `_itinerary_timeline_html(...)`, when building each activity, prefix the name with `_activity_time_label(activity)`.

Add alternative HTML:

```python
alternatives = []
for alternative in activity.get("alternatives") or []:
    if not isinstance(alternative, dict):
        continue
    title = str(alternative.get("title") or "").strip()
    description = str(alternative.get("description") or "").strip()
    if title and description:
        alternatives.append(
            f'<div class="timeline-alt"><strong>{html.escape(title)}</strong>：{html.escape(description)}</div>'
        )
if alternatives:
    activities.append(f'<div class="timeline-alternatives">{"".join(alternatives)}</div>')
```

- [ ] **Step 6: Add CSS for alternatives**

In `_css()`, add:

```css
.timeline-alternatives {
  margin-top: 8px;
  display: grid;
  gap: 6px;
}
.timeline-alt {
  padding: 8px 10px;
  border-left: 3px solid rgba(0, 170, 180, 0.42);
  background: rgba(255, 255, 255, 0.52);
  border-radius: 6px;
}
```

- [ ] **Step 7: Verify frontend tests pass**

Run:

```bash
uv run pytest -q tests/test_streamlit_frontend.py::test_itinerary_text_version_renders_time_slots_and_alternatives tests/test_streamlit_frontend.py::test_itinerary_timeline_renders_time_slots_and_alternatives
```

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add src/huaxia_tourismrag/streamlit_app.py tests/test_streamlit_frontend.py
git commit -m "feat: render timed itinerary choices"
```

---

### Task 7: Update CSV and PDF Export

**Files:**
- Modify: `src/huaxia_tourismrag/streamlit_app.py`
- Test: `tests/test_streamlit_frontend.py`

- [ ] **Step 1: Write failing export tests**

Add:

```python
def test_itinerary_rows_include_time_and_choice_summary():
    itinerary = {
        "destination": "成都",
        "itinerary": [
            {
                "day": 1,
                "city": "成都",
                "activities": [
                    {
                        "start_time": "12:00",
                        "end_time": "13:00",
                        "name": "午餐",
                        "description": "体验成都小吃。",
                        "alternatives": [
                            {"title": "锦里", "description": "边逛边吃。"},
                            {"title": "宽窄巷子", "description": "茶馆休息。"},
                        ],
                    }
                ],
            }
        ],
    }

    rows = streamlit_app._itinerary_rows(itinerary)

    assert rows[0]["时间"] == "12:00-13:00"
    assert "锦里" in rows[0]["可选方案"]


def test_itinerary_pdf_lines_include_time_and_alternatives():
    itinerary = {
        "destination": "成都",
        "itinerary": [
            {
                "day": 1,
                "city": "成都",
                "activities": [
                    {
                        "start_time": "19:00",
                        "name": "夜间选择",
                        "description": "夜间自由安排。",
                        "alternatives": [
                            {"title": "看变脸", "description": "适合想看演出的游客。"}
                        ],
                    }
                ],
            }
        ],
    }

    lines = streamlit_app._itinerary_pdf_lines(itinerary, streamlit_app.UI_TEXT["zh"])
    text = "\n".join(line.text for line in lines)

    assert "19:00" in text
    assert "可选：看变脸" in text
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
uv run pytest -q tests/test_streamlit_frontend.py::test_itinerary_rows_include_time_and_choice_summary tests/test_streamlit_frontend.py::test_itinerary_pdf_lines_include_time_and_alternatives
```

Expected: fail.

- [ ] **Step 3: Update CSV rows**

Change `_itinerary_rows(...)` to emit one row per activity:

```python
for activity in activities:
    if not isinstance(activity, dict):
        continue
    rows.append(
        {
            "天数": day.get("day"),
            "城市": day.get("city"),
            "时间": _activity_time_label(activity),
            "主题/安排": str(activity.get("name") or ""),
            "说明": str(activity.get("description") or ""),
            "可选方案": "；".join(
                str(option.get("title") or "").strip()
                for option in activity.get("alternatives") or []
                if isinstance(option, dict) and str(option.get("title") or "").strip()
            ),
            "备注": day.get("notes"),
        }
    )
```

Change `_itinerary_csv_bytes(...)` field names to:

```python
fieldnames = ["天数", "城市", "时间", "主题/安排", "说明", "可选方案", "备注"]
```

- [ ] **Step 4: Update PDF lines**

In `_itinerary_pdf_lines(...)`, format the activity label with time:

```python
time_label = _activity_time_label(activity)
label = name or "当日安排"
if time_label:
    label = f"{time_label} | {label}"
```

After details, render alternatives:

```python
for alternative in activity.get("alternatives") or []:
    if not isinstance(alternative, dict):
        continue
    title = str(alternative.get("title") or "").strip()
    description = str(alternative.get("description") or "").strip()
    if title and description:
        lines.append(_PdfLine(f"可选：{title}｜{description}", "note", indent=30))
```

- [ ] **Step 5: Verify export tests pass**

Run:

```bash
uv run pytest -q tests/test_streamlit_frontend.py::test_itinerary_rows_include_time_and_choice_summary tests/test_streamlit_frontend.py::test_itinerary_pdf_lines_include_time_and_alternatives
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/huaxia_tourismrag/streamlit_app.py tests/test_streamlit_frontend.py
git commit -m "feat: export rich itinerary schedules"
```

---

### Task 8: Add Manual QA Cases

**Files:**
- Modify: `evals/manual_itinerary_quality.md`

- [ ] **Step 1: Add manual checks**

Append this section to `evals/manual_itinerary_quality.md`:

```markdown
## Rich Itinerary Schedule QA

Run these prompts after changing itinerary generation:

1. `上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。`
2. `成都和重庆6天，主要想吃本地美食，也想加一点轻松景点。`
3. `/diy 三国历史巡礼，北京往返，覆盖涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中。10到12天，高铁优先，必要时包车。`

Pass criteria:

- Deep itinerary days include visible clock times such as `08:30`, `12:00`, `18:00`, and `20:00` where evidence supports the schedule.
- Lunch/dinner slots include evidence-backed local food suggestions when available.
- Hotel/rest slots say the lodging area or lodging type rather than only “入住酒店”.
- Cross-city movement appears as a separate transport activity.
- At least one flexible evening/food/experience slot includes two or more alternatives when evidence supports them.
- Timeline and professional text views both show times and alternatives.
- CSV and PDF exports include time and alternative columns/content.
- Unsupported food, hotel, shopping, or entertainment claims are omitted rather than filled with `待核验`.
```

- [ ] **Step 2: Commit**

```bash
git add evals/manual_itinerary_quality.md
git commit -m "docs: add rich itinerary schedule QA"
```

---

### Task 9: Full Verification

**Files:**
- Verify all touched files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
uv run pytest -q \
  tests/test_tourism_agent.py \
  tests/test_itinerary_schedule_quality.py \
  tests/test_streamlit_frontend.py \
  tests/test_citation_guard.py
```

Expected: all pass.

- [ ] **Step 2: Run lint**

Run:

```bash
uv run ruff check src/huaxia_tourismrag tests scripts/benchmark_latency.py
```

Expected: `All checks passed!`

- [ ] **Step 3: Run project health**

Run:

```bash
uv run huaxia-tourismrag project-health --root . --fail-on-warning
```

Expected: `OK | checked files: ... | errors: 0 | warnings: 0`

- [ ] **Step 4: Run full suite**

Run:

```bash
uv run pytest -q
```

Expected: all tests pass.

- [ ] **Step 5: Manual Streamlit smoke**

Run backend:

```bash
uv run uvicorn huaxia_tourismrag.api.main:app --reload --port 8000
```

Run Streamlit:

```bash
uv run streamlit run src/huaxia_tourismrag/streamlit_app.py
```

Prompt:

```text
上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。
```

Expected UI result:

- `行程` tab defaults to a useful professional itinerary view.
- Time labels are visible.
- Day descriptions include food/lodging/transport details when evidence supports them.
- Some slots include alternatives.
- Timeline view does not display raw HTML.
- PDF and CSV export successfully.

- [ ] **Step 6: Commit verification updates if any**

If manual smoke required code/test adjustments:

```bash
git add src tests evals
git commit -m "fix: polish rich itinerary schedule rendering"
```

---

## Self-Review

**Spec coverage:** The plan covers explicit clock times, richer day descriptions, food/lodging/public transport/shopping/entertainment integration, and user-choice alternatives inside time slots.

**Placeholder scan:** No task uses `TBD`, `TODO`, “similar to”, or unspecified tests. Each code-changing task includes concrete code or exact behavior.

**Type consistency:** `ActivityAlternative`, `ActivityItem.start_time`, `ActivityItem.end_time`, `ActivityItem.citations`, and `ActivityItem.alternatives` are introduced before prompts/renderers/tests consume them.

**Scope control:** This plan does not add new retrieval providers or a new planner. It improves the structured itinerary contract and rendering on top of the existing RAG/citation pipeline.

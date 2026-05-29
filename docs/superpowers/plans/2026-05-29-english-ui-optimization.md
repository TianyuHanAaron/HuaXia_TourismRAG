# English UI Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the English Streamlit UI to the same product quality as the Chinese UI with natural, coherent, native-English copy and layout-safe wording.

**Architecture:** Keep the current `UI_TEXT["en"]` dictionary as the single frontend copy source, and add tests that enforce natural English labels, no literal Chinglish, no stale Chinese text, and no long labels that damage the Streamlit layout. This is a copy-and-polish layer only: no backend DTO, routing, prompt, or RAG behavior changes.

**Tech Stack:** Streamlit, pytest source/copy tests, existing `streamlit_app.py` translation dictionary.

---

## Product Principles

- English copy should sound like a polished travel product, not a literal translation.
- Xiaxia can keep a warm personality, but the English UI should feel professional and trustworthy.
- Labels must be concise enough for Streamlit controls.
- Avoid internal engineering words in user-facing UI:
  - Avoid: `Runtime settings`, `debug timings`, `service checks`, `DIY`, `endpoint`, `job`, `payload`.
  - Prefer: `App settings`, `response time`, `availability checks`, `custom route`, `planning task`.
- Keep the Chinese UI untouched except shared tests.
- Keep answer-generation language controlled by existing `language` / UI language flow.
- Do not introduce regex or keyword-trigger behavior.

---

## Current English UX Gaps

Observed in `src/huaxia_tourismrag/streamlit_app.py`:

- `Ready-made trip plan` is understandable but slightly stiff. Better: `Classic trip plan`.
- `Custom route co-creation` is literal and awkward. Better: `Build a custom route`.
- `Agency-grade deep plan` is accurate but clunky in a slider/control label. Better: `Travel-agency deep plan`.
- `HuaXia Travel Agency Dedicated AI Advisor` is grammatically heavy. Better: `HuaXia Travel Agency AI Advisor`.
- `Drop me your travel idea` is casual, but “drop me” can feel slangy. Better: `Tell me your travel idea`.
- `little traps` sounds odd. Better: `easy-to-miss details`.
- `Route scope`, `Route requirement`, `Theme pure` are literal. Better: `Trip area`, `Must-follow route`, `Theme-first`.
- `Elders` sounds unnatural for family travel. Better: `Older adults`.
- `Must include`, `Do not want / avoid`, and `Anything else for Xiaxia` are close, but can be more natural:
  - `Must include`
  - `Prefer to avoid`
  - `Anything else Xiaxia should know`
- `Send to HuaXia advisor` is okay but less business-polished. Better: `Send to a HuaXia advisor`.
- `The deep-planning job has been created...` is too technical. Better: `Your detailed plan is in progress...`.

---

## File Structure

- Modify: `src/huaxia_tourismrag/streamlit_app.py`
  - Rewrite `UI_TEXT["en"]` copy.
  - Add optional helper constants for copy QA only if needed.
- Modify: `tests/test_streamlit_frontend.py`
  - Add English copy quality tests.
  - Add parity tests to ensure English and Chinese dictionaries expose the same keys.
  - Add tests for native-feeling labels on critical controls.
- Optional Modify: `README.md`
  - Only if screenshots or public docs mention old English labels.

---

## Target English Copy

Use these replacements in `UI_TEXT["en"]`.

### Mode And Detail Labels

```python
"mode_labels": {
    "normal": "Classic trip plan",
    "diy": "Build a custom route",
},
"mode_help": {
    "normal": "Best for city breaks, family trips, parent-friendly routes, budget trips, luxury trips, and deeper domestic travel plans.",
    "diy": "Best for themed journeys, must-visit city lists, historical routes, and unusual trip ideas.",
},
"detail_labels": {
    "concise": "Quick outline",
    "standard": "Practical plan",
    "deep": "Travel-agency deep plan",
},
"detail_help": {
    "concise": "Route order, one line per day, and key reminders.",
    "standard": "Daily plan, transport, hotel areas, local food, and practical notes.",
    "deep": "Background context, pacing, transport logic, alternatives, risks, and citations.",
},
```

### Hero

```python
"hero_brand": "HuaXia Travel Agency AI Advisor",
"hero_title": "Hi, I’m Xiaxia.",
"hero_lead": (
    "Tell me your travel idea: where you want to go, how many days you have, "
    "who is going, and your rough budget. Share whatever you know. I can turn "
    "a loose idea into a smooth, ready-to-go route, or help you build a custom themed journey."
),
"hero_sublead": (
    "I’ll help sort out the route, transport, hotel areas, local food, reservations, "
    "and the easy-to-miss details that can make or break a trip."
),
"hero_note_label": "First time here?",
"hero_note_title": "Start anywhere",
"hero_note_body": "Even if you are not sure where to go yet, I’ll ask the right next question.",
```

### Sidebar And Status

```python
"settings": "App settings",
"api_base": "FastAPI URL",
"api_help": "Start FastAPI locally, or set STREAMLIT_API_BASE_URL after deployment.",
"timeout": "Request timeout",
"timeout_help": "Deep custom routes may need 600 seconds or more.",
"debug_timing": "Show response time details",
"timing_title": "Response time details",
"sidebar_note": "This demo focuses on trip planning. Booking and payment actions can be connected later through MCP service integrations.",
"pending": "This plan needs one more detail. Reply below, or use Clear chat to start over.",
```

### Quick Form

```python
"form_mode": "Quick planning form",
"free_text_mode": "Write freely",
"form_intro": "Choose cities, dates, travelers, and preferences. Xiaxia will turn them into a clear trip request.",
"form_expand": "Open the quick form",
"form_collapse": "Close the quick form",
"form_section_where": "1. Trip area",
"form_section_dates": "2. Travel dates",
"form_section_people": "3. Travelers",
"form_section_style": "4. Travel style",
"form_section_budget": "5. Budget and comfort",
"form_section_notes": "6. Special requests",
"form_submit": "Create my trip plan",
"required_stops_help": "Enter one city or attraction per line.",
"city_select_help": "Type a city name or choose one from the list.",
"date_period": "Travel dates",
"date_period_help": "Pick a start and end date, or leave this blank if your dates are not fixed yet.",
"origin_city": "Starting city",
"destination": "Main destination",
"return_city": "Return city",
"required_stops": "Must-visit places",
"duration_days": "Trip length",
"adults": "Adults",
"elders": "Older adults",
"children": "Children",
"budget_level_form": "Budget style",
"travel_mode_preference": "Transport preference",
"pace": "Trip pace",
"route_strictness": "Route flexibility",
"attraction_preferences": "Travel interests",
"accommodation_preference": "Hotel preference",
"food_preference": "Food preference",
"must_have": "Must include",
"avoid": "Prefer to avoid",
"extra_notes": "Anything else Xiaxia should know",
```

### Option Labels

```python
"budget_options": {
    "budget": "Value-conscious",
    "mid_range": "Comfortable mid-range",
    "luxury": "Luxury",
},
"travel_mode_options": {
    "mixed": "Flexible mix",
    "train_first": "High-speed rail first",
    "flight_first": "Flights first",
    "self_drive": "Self-drive",
    "charter_when_needed": "Private car when needed",
},
"pace_options": {
    "relaxed": "Easygoing",
    "balanced": "Balanced",
    "intensive": "See more each day",
},
"route_strictness_options": {
    "flexible": "Flexible",
    "must_cover_all": "Cover every must-visit place",
    "theme_pure": "Theme-first",
    "balanced_city": "Theme plus city highlights",
},
"attraction_options": {
    "history_culture": "History and culture",
    "nature": "Nature and scenery",
    "food": "Local food",
    "family_friendly": "Family-friendly",
    "photography": "Photo spots",
    "theme_route": "Themed route",
    "heritage": "Cultural heritage",
    "city_classics": "City highlights",
},
"accommodation_options": {
    "convenient": "Convenient location",
    "luxury": "Luxury hotel",
    "boutique": "Boutique stay",
    "budget": "Keep costs down",
},
"food_options": {
    "balanced": "Balanced",
    "local_snacks": "Local snacks",
    "classic_restaurants": "Classic restaurants",
    "fine_dining": "Fine dining",
},
```

### Input, Progress, Tabs, And Empty States

```python
"input_label": "Travel idea",
"send": "Send to Xiaxia",
"placeholder": "Tell me your trip idea: destination, dates, travelers, budget, or a custom theme and city list.",
"thinking": "Xiaxia is checking the route and gathering evidence...",
"tabs": ["Highlights", "Things to watch", "Itinerary", "Sources", "Service checks"],
"empty_highlights": "Xiaxia will summarize the key points once the answer is ready.",
"empty_warnings": "No extra risk notes yet.",
"empty_citations": "No sources yet.",
"empty_itinerary": "No structured itinerary for this answer; the main plan is in the response text.",
"empty_service": "No external service checks yet.",
"job_submitted": "Your detailed plan is in progress...",
"job_polling": "Xiaxia is still building your detailed plan. Waited {seconds} seconds...",
"job_done": "Your detailed plan is ready.",
"answer_done": "Answer ready.",
```

### Sales Handoff

```python
"handoff_title": "Send to a HuaXia advisor",
"handoff_intro": (
    "Like this route? Send the full plan and your key requirements to a HuaXia advisor "
    "for pricing, hotels, transport, and trip arrangements. Your original request and "
    "Xiaxia’s generated plan will be included automatically."
),
"handoff_name": "Your name",
"handoff_contact": "Contact details",
"handoff_channel": "Preferred contact method",
"handoff_channel_labels": {
    "any": "Any method",
    "wechat": "WeChat",
    "phone": "Phone",
    "email": "Email",
},
"handoff_must_keep": "Must keep",
"handoff_flexible": "Flexible items",
"handoff_quote": "Needs pricing",
"handoff_submit": "Send to an advisor",
"handoff_contact_required": "Please leave at least one way to contact you.",
"handoff_success": "Sent to a HuaXia advisor. Lead ID: {lead_id}",
"handoff_original": "Original request",
"handoff_snapshot": "Plan snapshot",
```

---

## Task 1: Add English Copy Quality Tests

**Files:**
- Modify: `tests/test_streamlit_frontend.py`

- [ ] **Step 1: Add critical English copy tests**

Add:

```python
def test_english_ui_copy_uses_native_product_language():
    copy = streamlit_app.UI_TEXT["en"]

    assert copy["hero_brand"] == "HuaXia Travel Agency AI Advisor"
    assert copy["mode_labels"]["normal"] == "Classic trip plan"
    assert copy["mode_labels"]["diy"] == "Build a custom route"
    assert copy["detail_labels"]["deep"] == "Travel-agency deep plan"
    assert copy["form_mode"] == "Quick planning form"
    assert copy["form_submit"] == "Create my trip plan"
    assert copy["elders"] == "Older adults"
    assert copy["avoid"] == "Prefer to avoid"
    assert copy["extra_notes"] == "Anything else Xiaxia should know"
    assert copy["handoff_title"] == "Send to a HuaXia advisor"
```

- [ ] **Step 2: Add translation parity test**

Add:

```python
def test_english_and_chinese_ui_copy_have_matching_keys():
    zh = streamlit_app.UI_TEXT["zh"]
    en = streamlit_app.UI_TEXT["en"]

    assert set(en) == set(zh)
    for nested_key in (
        "mode_labels",
        "mode_help",
        "detail_labels",
        "detail_help",
        "budget_options",
        "travel_mode_options",
        "pace_options",
        "route_strictness_options",
        "attraction_options",
        "accommodation_options",
        "food_options",
        "handoff_channel_labels",
    ):
        assert set(en[nested_key]) == set(zh[nested_key])
```

- [ ] **Step 3: Add banned awkward phrase test**

Add:

```python
def test_english_ui_copy_avoids_literal_or_internal_phrases():
    copy_text = json.dumps(streamlit_app.UI_TEXT["en"], ensure_ascii=False)
    banned = [
        "Dedicated AI Advisor",
        "Drop me",
        "little traps",
        "Runtime settings",
        "debug timings",
        "Ready-made trip plan",
        "Custom route co-creation",
        "Theme pure",
        "Elders",
        "The deep-planning job",
    ]

    for phrase in banned:
        assert phrase not in copy_text
```

Also add `import json` at the top of the file if missing.

- [ ] **Step 4: Run tests and verify red**

Run:

```bash
uv run pytest tests/test_streamlit_frontend.py::test_english_ui_copy_uses_native_product_language tests/test_streamlit_frontend.py::test_english_ui_copy_avoids_literal_or_internal_phrases -q
```

Expected: fails because the English UI copy still contains old literal phrases.

---

## Task 2: Rewrite `UI_TEXT["en"]`

**Files:**
- Modify: `src/huaxia_tourismrag/streamlit_app.py`

- [ ] **Step 1: Replace English copy values**

Update `UI_TEXT["en"]` with the exact strings listed in “Target English Copy”.

Keep these existing values unless a test requires otherwise:

```python
"page_title": "Xiaxia | HuaXia Travel AI",
"language_label": "Interface language",
"health": "Health check",
"clear": "Clear chat",
"health_ok": "Service status",
"health_fail": "Connection failed",
```

- [ ] **Step 2: Run the critical English copy tests**

Run:

```bash
uv run pytest tests/test_streamlit_frontend.py::test_english_ui_copy_uses_native_product_language tests/test_streamlit_frontend.py::test_english_ui_copy_avoids_literal_or_internal_phrases -q
```

Expected: passes.

- [ ] **Step 3: Run parity test**

Run:

```bash
uv run pytest tests/test_streamlit_frontend.py::test_english_and_chinese_ui_copy_have_matching_keys -q
```

Expected: passes.

---

## Task 3: Add English Layout-Safety Tests

**Files:**
- Modify: `tests/test_streamlit_frontend.py`

- [ ] **Step 1: Add concise-label test**

Add:

```python
def test_english_control_labels_are_short_enough_for_streamlit_layout():
    copy = streamlit_app.UI_TEXT["en"]
    labels = [
        copy["mode_labels"]["normal"],
        copy["mode_labels"]["diy"],
        copy["detail_labels"]["concise"],
        copy["detail_labels"]["standard"],
        copy["detail_labels"]["deep"],
        copy["form_expand"],
        copy["form_collapse"],
        copy["form_submit"],
        copy["handoff_submit"],
    ]

    assert all(len(label) <= 32 for label in labels)
```

- [ ] **Step 2: Add no-Chinese-in-English-copy test**

Add:

```python
def test_english_ui_copy_contains_no_chinese_characters():
    copy_text = json.dumps(streamlit_app.UI_TEXT["en"], ensure_ascii=False)

    assert not any("\u4e00" <= char <= "\u9fff" for char in copy_text)
```

- [ ] **Step 3: Run layout-safety tests**

Run:

```bash
uv run pytest tests/test_streamlit_frontend.py::test_english_control_labels_are_short_enough_for_streamlit_layout tests/test_streamlit_frontend.py::test_english_ui_copy_contains_no_chinese_characters -q
```

Expected: passes.

---

## Task 4: Manual English UI Smoke Check

**Files:**
- No code changes unless smoke check finds a layout issue.

- [ ] **Step 1: Start Streamlit**

Run:

```bash
uv run streamlit run src/huaxia_tourismrag/streamlit_app.py --server.headless true --server.port 8504
```

Expected: local URL appears and app serves HTTP 200.

- [ ] **Step 2: Open English UI**

In the app:

- Select `English` in the sidebar.
- Confirm hero copy reads naturally.
- Confirm quick form collapsed state reads naturally.
- Expand quick form and inspect:
  - mode labels,
  - detail slider labels,
  - form section labels,
  - city/date/traveler fields,
  - special request labels,
  - submit button.

- [ ] **Step 3: Run one English form request**

Use:

```text
Starting city: Shanghai
Main destination: Shanxi
Return city: Shanghai
Travel dates: any 5-day range
Must-visit places: Datong, Pingyao, Yungang Grottoes
Travel interests: History and culture, Cultural heritage
Trip pace: Balanced
```

Expected:

- The user-visible form summary is understandable in English.
- The response is in English if the UI language is English.
- Sales handoff copy appears only after a completed itinerary response.

- [ ] **Step 4: Stop Streamlit**

Press `Ctrl+C` in the Streamlit terminal.

---

## Task 5: Final Verification

**Files:**
- No new files unless tests reveal issues.

- [ ] **Step 1: Run frontend tests**

```bash
uv run pytest tests/test_streamlit_frontend.py -q
```

Expected: all Streamlit frontend tests pass.

- [ ] **Step 2: Run lint**

```bash
uv run ruff check src/huaxia_tourismrag tests
```

Expected: `All checks passed!`

- [ ] **Step 3: Run full test suite**

```bash
uv run pytest -q
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/huaxia_tourismrag/streamlit_app.py tests/test_streamlit_frontend.py docs/superpowers/plans/2026-05-29-english-ui-optimization.md
git commit -m "feat: polish English Streamlit UI copy"
```

---

## Self-Review

- Requirement coverage:
  - Accurate, coherent, native English copy: Tasks 1-2.
  - Same quality as Chinese UI: Tasks 1-4 cover hero, mode/detail controls, form, progress, tabs, and sales handoff.
  - Layout safety: Task 3.
  - Verification: Task 5.
- Scope:
  - No backend or RAG behavior changes.
  - No regex or keyword-trigger logic.
  - No third-party copy dependency.
- No placeholders:
  - Each test and replacement string is specified explicitly.

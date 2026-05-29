# Form UX Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Streamlit quick form feel polished, collapsible, faster to fill, and visually aligned with the referenced Uiverse form style while preserving the DTO-driven form pipeline.

**Architecture:** Keep the existing `TravelFormRequest` and `build_form_payload` flow. Implement the UX as a Streamlit-only enhancement: a custom collapsed/expanded shell, fuzzy city select/type widgets, real date period input, friendlier labels, and CSS scoped to the quick form. No backend routing changes are needed unless tests reveal a missing DTO field.

**Tech Stack:** Streamlit 1.57, CSS injected through `st.markdown`, existing Pydantic DTOs, pytest.

---

## Product Requirements

- The quick form is collapsed by default after page refresh.
- Clicking the quick-form header expands the form in-place.
- The collapse/expand visual treatment follows the referenced Uiverse style direction:
  - crisp form controls,
  - rounded rectangular inputs/buttons,
  - subtle shadow/border interaction,
  - strong focus states,
  - clean spacing,
  - no colored form-panel background.
- The form must fit the current Xiaxia Streamlit layout and scenic background.
- `出发城市`, `目的地`, and `返回城市` must allow both:
  - typing a custom city,
  - choosing from a Chinese city list with fuzzy matching/dropdown.
- Replace raw “旅行天数” as the primary trip timing control with a real date-period picker.
- Keep a computed or fallback day count for `TravelFormRequest.duration_days`.
- Refine option UI and labels so users understand the field intent quickly.
- Make the labels more user-friendly:
  - `不可删除项` becomes `一定要安排`
  - `尽量避开` becomes `不想要 / 尽量避开`
  - `补充说明` becomes `还有什么想告诉夏夏`
- Do not change form options/content based on Uiverse; only borrow visual style.
- Do not add behavior-critical keyword triggers or regex.

---

## Constraints And Decisions

- The Uiverse page was Cloudflare-blocked from CLI inspection, so implementation should treat it as a visual direction rather than a dependency. Do not fetch or vendor third-party CSS at runtime.
- Use Streamlit 1.57 `st.selectbox(..., accept_new_options=True, filter_mode="fuzzy")` for city type-or-select fields.
- Do not use `st.expander` for the main quick form because its default Streamlit panel background is hard to align with the “no form background color” requirement.
- Use a custom toggle button plus `st.session_state["quick_form_expanded"]`.
- The quick form wrapper should be visually transparent. Individual controls may have white or near-white backgrounds for readability, but the form container itself should not have a solid background color.
- Preserve the existing free-text tab/path.

---

## File Structure

- Modify: `src/huaxia_tourismrag/streamlit_app.py`
  - Add city options.
  - Add helper widgets for city select/type and date period.
  - Replace tab-first quick form with a collapsed/expanded quick-form shell.
  - Update copy labels and help text.
  - Add scoped CSS for the quick form.
- Modify: `src/huaxia_tourismrag/frontend/streamlit_client.py`
  - Only if date-period payload handling needs stricter normalization.
- Modify: `tests/test_streamlit_frontend.py`
  - Add tests for collapsed default, fuzzy city field support, date period support, and friendlier labels.
- Optional Modify: `tests/test_travel_form_request.py`
  - Only if DTO conversion needs explicit date-period coverage.

---

## Visual Design Spec

### Collapsed State

Render a single prominent strip above the free-text composer area:

```text
快速表单规划
选城市、日期、同行人和偏好，夏夏会自动整理成完整旅行需求。
[展开快速表单]
```

Visual behavior:

- Transparent outer wrapper.
- Inner row uses only border, shadow, and blur-light readability if needed.
- Button uses Uiverse-like raised interaction:
  - 8px radius,
  - cyan accent border/focus,
  - subtle transform on hover,
  - no pink/red accent.

### Expanded State

Render the form as a transparent section with grouped field blocks:

1. `先定出行范围`
2. `选择时间`
3. `同行人`
4. `旅行偏好`
5. `预算与舒适度`
6. `特别想法`

Each group should use:

- small section label,
- compact spacing,
- no card-inside-card look,
- controls aligned in responsive columns.

### Form Controls

CSS should target only the quick form area:

```css
.quick-form-shell { ... }
.quick-form-toggle { ... }
.quick-form-body { ... }
.quick-form-section-title { ... }
```

Streamlit widget selectors should be scoped under a quick-form anchor where possible:

```css
.quick-form-scope div[data-testid="stSelectbox"] div[data-baseweb="select"] { ... }
.quick-form-scope div[data-testid="stTextArea"] textarea { ... }
.quick-form-scope div[data-testid="stDateInput"] input { ... }
```

Do not globally restyle all `stForm` blocks, because the sales handoff form and free-text form have different jobs.

---

## Task 1: Add Tests For Quick Form UX Contract

**Files:**
- Modify: `tests/test_streamlit_frontend.py`

- [ ] **Step 1: Add tests for copy and default collapsed state**

Add tests that assert:

```python
def test_quick_form_is_collapsed_by_default():
    state = streamlit_app._default_template_state()
    assert state["quick_form_expanded"] is False


def test_form_copy_uses_user_friendly_labels():
    copy = streamlit_app.COPY["zh-CN"]
    assert copy["must_have"] == "一定要安排"
    assert copy["avoid"] == "不想要 / 尽量避开"
    assert copy["extra_notes"] == "还有什么想告诉夏夏"
```

- [ ] **Step 2: Add tests for city widget and date period helper names**

Add source-level tests:

```python
def test_city_fields_use_fuzzy_type_or_select_widget():
    source = Path(streamlit_app.__file__).read_text()
    assert "_city_select_or_type(" in source
    assert "accept_new_options=True" in source
    assert 'filter_mode="fuzzy"' in source


def test_form_uses_date_period_picker():
    source = Path(streamlit_app.__file__).read_text()
    assert "_render_trip_date_period(" in source
    assert "st.date_input" in source
```

- [ ] **Step 3: Run tests and confirm failure**

Run:

```bash
uv run pytest tests/test_streamlit_frontend.py -q
```

Expected: fails because the quick form state/helpers are not implemented yet.

---

## Task 2: Add City Options And Date Helpers

**Files:**
- Modify: `src/huaxia_tourismrag/streamlit_app.py`

- [ ] **Step 1: Add curated Chinese city options**

Add a top-level tuple near UI constants:

```python
CHINESE_CITY_OPTIONS = (
    "北京", "上海", "广州", "深圳", "成都", "重庆", "西安", "杭州", "南京", "苏州",
    "武汉", "长沙", "郑州", "济南", "青岛", "天津", "沈阳", "哈尔滨", "长春", "大连",
    "厦门", "福州", "南昌", "合肥", "太原", "呼和浩特", "石家庄", "兰州", "西宁",
    "银川", "乌鲁木齐", "拉萨", "昆明", "贵阳", "南宁", "桂林", "北海", "海口",
    "三亚", "洛阳", "开封", "大同", "平遥", "敦煌", "张掖", "阿勒泰", "喀什",
)
```

This is a UI affordance list, not a routing trigger. It is safe because the selected value becomes a typed form field.

- [ ] **Step 2: Add `_city_select_or_type` helper**

Add:

```python
def _city_select_or_type(label: str, key: str, value: str | None = None) -> str:
    options = [""] + list(CHINESE_CITY_OPTIONS)
    index = options.index(value) if value in options else 0
    selected = st.selectbox(
        label,
        options=options,
        index=index,
        key=key,
        placeholder="输入或选择城市",
        accept_new_options=True,
        filter_mode="fuzzy",
    )
    return str(selected or "").strip()
```

- [ ] **Step 3: Add `_render_trip_date_period` helper**

Add:

```python
def _render_trip_date_period(copy: dict[str, Any]) -> tuple[date | None, date | None, int | None]:
    value = st.date_input(
        copy["date_period"],
        value=(),
        key="form-date-period",
        help=copy["date_period_help"],
    )
    if isinstance(value, tuple) and len(value) == 2:
        start_date, end_date = value
        duration = (end_date - start_date).days + 1
        return start_date, end_date, max(duration, 1)
    return None, None, int(st.session_state.get("duration_days", 5))
```

If Streamlit returns a single date while the user is mid-selection, return `(date, None, fallback_days)` and keep validation friendly.

- [ ] **Step 4: Run focused tests**

Run:

```bash
uv run pytest tests/test_streamlit_frontend.py::test_city_fields_use_fuzzy_type_or_select_widget tests/test_streamlit_frontend.py::test_form_uses_date_period_picker -q
```

Expected: passes after helpers exist.

---

## Task 3: Implement Collapsed/Expanded Quick Form Shell

**Files:**
- Modify: `src/huaxia_tourismrag/streamlit_app.py`

- [ ] **Step 1: Extend default state**

In `_default_template_state()`, add:

```python
"quick_form_expanded": False,
```

- [ ] **Step 2: Replace tabs with custom shell**

In `_render_input(...)`, replace the tab-first quick form rendering with:

```python
_render_quick_form_shell(mode=mode, detail_level=detail_level, copy=copy)
_render_free_text_composer(mode=mode, detail_level=detail_level, copy=copy)
```

Keep the `needs_reply` branch unchanged so checkpoint replies still show only the reply composer.

- [ ] **Step 3: Add `_render_quick_form_shell`**

Add:

```python
def _render_quick_form_shell(mode: RequestMode, detail_level: DetailLevel, copy: dict[str, Any]) -> None:
    expanded = bool(st.session_state.get("quick_form_expanded", False))
    st.markdown(
        f"""
        <div class="quick-form-shell quick-form-scope">
          <div class="quick-form-head">
            <div>
              <div class="quick-form-kicker">{copy["form_mode"]}</div>
              <div class="quick-form-subtitle">{copy["form_intro"]}</div>
            </div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    button_label = copy["form_collapse"] if expanded else copy["form_expand"]
    if st.button(button_label, key="quick-form-toggle", use_container_width=True):
        st.session_state["quick_form_expanded"] = not expanded
        st.rerun()
    if st.session_state.get("quick_form_expanded", False):
        st.markdown('<div class="quick-form-scope quick-form-body">', unsafe_allow_html=True)
        _render_form_composer(mode=mode, detail_level=detail_level, copy=copy)
        st.markdown("</div>", unsafe_allow_html=True)
```

Streamlit does not keep arbitrary HTML wrappers open around widgets reliably, so use CSS selectors around the nearby button/form and test visually.

- [ ] **Step 4: Run default-state test**

Run:

```bash
uv run pytest tests/test_streamlit_frontend.py::test_quick_form_is_collapsed_by_default -q
```

Expected: passes.

---

## Task 4: Refine Form Fields And Labels

**Files:**
- Modify: `src/huaxia_tourismrag/streamlit_app.py`
- Optional Modify: `src/huaxia_tourismrag/frontend/streamlit_client.py`

- [ ] **Step 1: Update Chinese copy keys**

Change:

```python
"form_section_where": "1. 先定出行范围",
"form_section_people": "3. 同行人",
"form_section_style": "4. 旅行偏好",
"form_section_budget": "5. 预算与舒适度",
"form_section_notes": "6. 特别想法",
"must_have": "一定要安排",
"avoid": "不想要 / 尽量避开",
"extra_notes": "还有什么想告诉夏夏",
"form_intro": "选城市、日期、同行人和偏好，夏夏会自动整理成完整旅行需求。",
"form_expand": "展开快速表单",
"form_collapse": "收起快速表单",
"date_period": "出行日期",
"date_period_help": "选择开始和结束日期；还没定日期也可以先留空。",
```

Update English equivalents as well.

- [ ] **Step 2: Replace city text inputs**

In `_render_form_composer`, replace three `st.text_input` city fields with:

```python
origin_city = _city_select_or_type(copy["origin_city"], "form-origin-city", st.session_state.get("origin_city"))
destination = _city_select_or_type(copy["destination"], "form-destination", st.session_state.get("destination"))
return_city = _city_select_or_type(copy["return_city"], "form-return-city", st.session_state.get("return_city"))
```

- [ ] **Step 3: Replace primary day count with date period**

Replace the fourth column number input with:

```python
start_date, end_date, duration_days = _render_trip_date_period(copy)
if duration_days is None:
    duration_days = int(st.session_state.get("duration_days", 5))
```

If the DTO payload builder already accepts `start_date` and `end_date`, pass them. If not, add optional parameters to `build_form_payload` and tests.

- [ ] **Step 4: Improve choice freedom**

Keep current DTO options, but present them as friendlier segmented/radio-like blocks:

- Request mode:
  - `成熟旅行方案`
  - `专属路线共创`
- Travel mode:
  - `高铁优先`
  - `飞机优先`
  - `包车/当地用车`
  - `混合安排`
- Pace:
  - `轻松慢游`
  - `均衡`
  - `多看一点`
- Route strictness:
  - `灵活调整`
  - `指定地点都要覆盖`
  - `主题更纯粹`
  - `主题+城市体验平衡`

Do this through existing `copy["..._options"]` mappings so submitted DTO values remain unchanged.

- [ ] **Step 5: Run frontend tests**

Run:

```bash
uv run pytest tests/test_streamlit_frontend.py -q
```

Expected: passes.

---

## Task 5: Add Scoped Uiverse-Inspired CSS

**Files:**
- Modify: `src/huaxia_tourismrag/streamlit_app.py`

- [ ] **Step 1: Remove global form card styling**

The current CSS targets all `div[data-testid="stForm"]` with a white background. Replace this with scoped selectors, or make global form styling neutral and add quick-form-specific styling.

Do not style the form container with a solid background color.

- [ ] **Step 2: Add quick form CSS**

Add inside `_css()`:

```css
.quick-form-shell {
  margin: 26px 0 10px;
  color: var(--hx-ink);
}
.quick-form-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 0;
  background: transparent;
}
.quick-form-kicker {
  font-weight: 850;
  font-size: 20px;
  color: var(--hx-ink);
}
.quick-form-subtitle {
  margin-top: 6px;
  color: rgba(7, 26, 51, 0.78);
  font-weight: 650;
}
div[data-testid="stButton"] button[kind="secondary"],
div[data-testid="stFormSubmitButton"] button {
  border-radius: 8px !important;
  border: 1px solid rgba(7, 26, 51, 0.18) !important;
  background: rgba(255, 255, 255, 0.94) !important;
  color: var(--hx-ink) !important;
  box-shadow: 0 8px 0 #212121, 0 18px 36px rgba(7, 26, 51, 0.10) !important;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}
div[data-testid="stButton"] button[kind="secondary"]:hover,
div[data-testid="stFormSubmitButton"] button:hover {
  transform: translateY(2px);
  box-shadow: 0 6px 0 #212121, 0 14px 28px rgba(7, 26, 51, 0.12) !important;
  border-color: var(--hx-cyan) !important;
}
div[data-testid="stForm"] {
  margin: 18px 0 34px;
  padding: 0;
  border: 0;
  background: transparent !important;
  box-shadow: none;
}
div[data-testid="stForm"] input,
div[data-testid="stForm"] textarea,
div[data-testid="stForm"] [data-baseweb="select"] > div {
  border-radius: 8px !important;
  border-color: rgba(7, 26, 51, 0.22) !important;
  background: rgba(255, 255, 255, 0.92) !important;
  color: var(--hx-ink) !important;
  font-weight: 700 !important;
}
div[data-testid="stForm"] input:focus,
div[data-testid="stForm"] textarea:focus {
  border-color: var(--hx-cyan) !important;
  box-shadow: 0 0 0 3px rgba(8, 199, 217, 0.18) !important;
}
```

Adjust selector scope if Streamlit emits slightly different DOM in local browser.

- [ ] **Step 3: Add responsive spacing**

Add:

```css
@media (max-width: 760px) {
  .quick-form-kicker { font-size: 18px; }
  .quick-form-subtitle { font-size: 14px; }
}
```

- [ ] **Step 4: Run CSS source tests**

Add or update `tests/test_streamlit_frontend.py`:

```python
def test_quick_form_css_has_no_solid_panel_background():
    css = streamlit_app._css()
    assert ".quick-form-shell" in css
    assert "background: transparent" in css
```

Run:

```bash
uv run pytest tests/test_streamlit_frontend.py -q
```

Expected: passes.

---

## Task 6: Visual QA Locally

**Files:**
- No code changes unless QA finds issues.

- [ ] **Step 1: Start API**

Run:

```bash
uv run uvicorn huaxia_tourismrag.api.routes:app --reload --port 8000
```

Expected: health route responds.

- [ ] **Step 2: Start Streamlit**

Run in another terminal:

```bash
uv run streamlit run src/huaxia_tourismrag/streamlit_app.py
```

- [ ] **Step 3: Check collapsed state**

Open the local Streamlit URL and verify:

- quick form is collapsed after refresh,
- background image remains visible,
- no large colored form background appears,
- free-text composer still exists.

- [ ] **Step 4: Check expanded state**

Click `展开快速表单` and verify:

- city fields allow typing custom input,
- city fields show dropdown suggestions,
- date period picker works,
- labels read naturally,
- controls do not overlap on mobile width,
- submit button visually matches the Uiverse-inspired raised style.

- [ ] **Step 5: Submit one quick form**

Use:

```text
出发城市: 广州
目的地: 广西
返回城市: 广州
日期: pick a 5-day period
一定要安排: 桂林漓江, 阳朔遇龙河, 北海涠洲岛
```

Expected:

- request summary includes date period and computed duration,
- backend receives a valid form payload,
- no unnecessary checkpoint for already-filled core fields.

---

## Task 7: Final Verification

**Files:**
- No new files unless bugs are found.

- [ ] **Step 1: Run targeted frontend tests**

```bash
uv run pytest tests/test_streamlit_frontend.py tests/test_travel_form_request.py tests/test_routes.py -q
```

Expected: all pass.

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
git add src/huaxia_tourismrag/streamlit_app.py src/huaxia_tourismrag/frontend/streamlit_client.py tests/test_streamlit_frontend.py tests/test_travel_form_request.py tests/test_routes.py
git commit -m "feat: polish collapsible travel form UX"
```

---

## Self-Review

- Requirement coverage:
  - Uiverse-inspired CSS direction: Task 5.
  - City type/select fields: Task 2 and Task 4.
  - Real date-period picker: Task 2 and Task 4.
  - Friendlier labels: Task 4.
  - Collapsed/expanded behavior: Task 3.
  - No form background color: Task 5 and Task 6.
  - Streamlit layout fit: Task 6.
- DTO-driven rule:
  - City list is a UI selection list only; selected values flow into typed payload fields.
  - No regex or term-trigger inference is introduced.
- No placeholders:
  - Each task includes exact files, test intent, commands, and expected output.

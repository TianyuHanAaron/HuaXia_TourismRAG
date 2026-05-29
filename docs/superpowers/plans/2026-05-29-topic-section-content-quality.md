# Topic Section Content Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement this plan task-by-task. Keep tests red/green at each stage.

## Summary

Improve the content quality of the newly added itinerary topic sections:

- 美食
- 住宿
- 公交
- 购物
- 娱乐项目

The goal is to make each section feel like a professional travel-agency addendum, not a generic LLM paragraph. Each recommendation must be specific to the user's destination and route, cite a traceable source, and avoid unsupported claims.

This plan must stay consistent with the project's DTO-driven principle:

- Do not add regex or term-trigger routing.
- Do not infer checkpoint or section behavior from hard-coded phrase lists.
- Drive behavior from typed DTOs: `TravelQuestion`, `TravelFormRequest`, `TravelResearchPlan`, `DIYItineraryPlan`, `TravelTopicSection`, `ContentType`, source metadata, and citation packs.

## Success Criteria

- Each topic section is route-aware and uses the user's cities, travel dates, traveler composition, budget level, and pace when available.
- Each concrete claim has an in-text citation such as `[1]`, and the returned citation line exactly matches the source used.
- If evidence is missing, the section says what needs verification instead of inventing restaurant, hotel, transport, shopping, or performance details.
- Food and shopping sections prefer `local_cuisine` / `local_specialty` evidence.
- Accommodation sections prefer `accommodation`, `destination`, `travel_guide`, and fresh web product/service evidence.
- Public transport sections prefer `transport`, `railway`, `aviation`, `road_transport`, `travel_guide`, or current web evidence.
- Entertainment sections prefer `activity`, `entertainment`, `travel_guide`, and current web evidence.
- Policy, railway, legal, or insurance sources are not used to support food, shopping, accommodation quality, or entertainment desirability.
- Streamlit renders the sections as readable, scan-friendly cards with no raw payload leakage.

## Current State

Relevant files:

- `src/huaxia_tourismrag/schemas/evidence.py`
  - `TravelTopicSection` currently has `category`, `title`, `summary`, and `recommendations`.
- `src/huaxia_tourismrag/agents/tourism_agent.py`
  - Final-answer prompt asks for `topic_sections`, but the quality rules are still broad.
- `src/huaxia_tourismrag/services/evidence_relevance.py`
  - Content type gating exists, but topic-section evidence selection is not explicit.
- `src/huaxia_tourismrag/tools/citation_guard.py`
  - Citation guard already scans topic sections for citation IDs.
- `src/huaxia_tourismrag/streamlit_app.py`
  - Topic sections render as tabs after the itinerary.
- `src/huaxia_tourismrag/schemas/service_enrichment.py`
  - Fresh web evidence can now be converted into allowed citations.

## Target UX

For a deep itinerary answer, users should see topic tabs that read like this:

- 美食: "在成都段优先安排钟水饺、担担面、甜水面等小吃，晚餐可放在宽窄巷子或奎星楼街一带；若同行有老人儿童，辣度按微辣或分餐处理 [n]。"
- 住宿: "成都建议住春熙路/天府广场片区，方便地铁、餐饮和夜间返程；若预算为豪华，优先选有电梯、双床/套房和早餐稳定的高星酒店 [n]。"
- 公交: "城市内短距离以地铁+打车为主；跨城高铁段要预留进站、安检和老人儿童休息时间 [n]。"
- 购物: "成都可把蜀绣、茶叶、熊猫文创作为伴手礼方向，购买时优先选择博物馆/景区官方店或信誉稳定商圈 [n]。"
- 娱乐项目: "成都可考虑川剧变脸或茶馆体验，放在非长途转场日晚间；南阳若安排越调体验，需要提前核验演出排期 [n]。"

The exact wording should come from the model, but the structure and evidence requirements must be enforced by code and tests.

## Implementation Tasks

### 1. Extend Topic Section DTOs Without Breaking Existing API

Add richer, optional structure while preserving existing fields.

Proposed schema additions in `src/huaxia_tourismrag/schemas/evidence.py`:

- `TopicRecommendationKind`
  - `signature_item`
  - `area_strategy`
  - `booking_or_timing`
  - `accessibility`
  - `budget_fit`
  - `verification_needed`
- `TopicRecommendation`
  - `title`
  - `description`
  - `city`
  - `day`
  - `kind`
  - `citations`
  - `verification_note`
- Extend `TravelTopicSection` with:
  - `items: list[TopicRecommendation] = []`
  - keep `summary` and `recommendations` for backward compatibility.

TDD tests:

- `tests/test_topic_section_schemas.py`
  - accepts legacy `recommendations`
  - accepts structured `items`
  - rejects unknown topic categories
  - caps item count to avoid bloated answers
  - preserves backward-compatible JSON shape

### 2. Add a DTO-Driven Topic Section Quality Guard

Create `src/huaxia_tourismrag/services/topic_section_quality.py`.

Responsibilities:

- Validate each topic section after LLM generation and before final response return.
- Require citations for concrete `summary`, `recommendations`, and structured `items`.
- Remove or downgrade unsupported recommendations to `verification_needed`.
- Check source compatibility by category using `EvidenceQuote.content_type` and `TravelTopicSection.category`.
- Add warning-level quality issues to `TravelAnswer.performance` metadata or warnings.

Category-to-source compatibility should use typed `ContentType`, not regex:

- `food`: `local_cuisine`, `local_specialty`, `destination`, `travel_guide`, web restaurant/food evidence.
- `accommodation`: `accommodation`, `destination`, `travel_guide`, fresh web hotel/product evidence.
- `public_transport`: `transport`, `railway`, `aviation`, `road_transport`, `travel_guide`, current web evidence.
- `shopping`: `local_specialty`, `shopping`, `destination`, `travel_guide`, fresh web evidence.
- `entertainment`: `activity`, `entertainment`, `heritage_site`, `travel_guide`, fresh web evidence.

TDD tests:

- `tests/test_topic_section_quality.py`
  - food section cannot cite railway/legal-only evidence for restaurant claims
  - shopping section cannot cite insurance/legal evidence
  - missing citations become quality warnings
  - unsupported concrete lines are pruned or converted to "待核验"
  - section ordering remains stable
  - guard does not use natural-language term triggers

### 3. Improve Evidence Targeting For Topic Sections

Add a topic-section evidence selection layer that runs before final prompt assembly.

Suggested service:

- `src/huaxia_tourismrag/services/topic_evidence_selector.py`

Inputs:

- `TravelQuestion`
- `TravelResearchPlan | None`
- `DIYItineraryPlan | None`
- retrieved `TravelChunk` list
- `ServiceEnrichmentContext | None`

Outputs:

- `TopicEvidenceBundle`
  - `category`
  - `destination_scope`
  - `evidence_quotes`
  - `source_gaps`

Rules:

- Use DTO fields and evidence metadata only.
- Do not add phrase-list triggers.
- Prefer evidence with route city matches already present in DTOs or itinerary stops.
- Prefer fresh web evidence when the topic is likely operational or current, such as performances, hotel/product pages, opening/booking rules, or transport changes.
- Cap evidence per category to prevent final prompt bloat:
  - food: 4 quotes
  - accommodation: 4 quotes
  - public_transport: 4 quotes
  - shopping: 3 quotes
  - entertainment: 3 quotes

TDD tests:

- `tests/test_topic_evidence_selector.py`
  - selected food evidence prefers `local_cuisine`
  - selected shopping evidence prefers `local_specialty`
  - selected public transport evidence prefers transport content types
  - fresh web evidence with title/url is included when available
  - evidence caps are enforced

### 4. Make The Final Answer Prompt Category-Specific

Update `src/huaxia_tourismrag/agents/tourism_agent.py`.

Add a compact "topic section contract" to the prompt:

- Generate sections only from provided topic evidence bundles.
- Each section must include:
  - one short route-aware summary
  - 2-5 practical recommendations
  - citations on every recommendation
  - no generic city slogans
  - no invented business names, prices, opening hours, or booking methods
- For each category:
  - 美食: dishes/snacks, local dining areas, meal timing, spice/diet fit.
  - 住宿: stay areas, hotel type, room/elder/child/accessibility fit, check-in logistics.
  - 公交: city transit, station/airport transfer, first/last-mile advice, when to taxi/charter.
  - 购物: specialty/souvenir categories, where-type guidance, authenticity/shipping caveats.
  - 娱乐项目: shows, local cultural experiences, timing, age/physical suitability, booking caveats.

TDD tests:

- `tests/test_tourism_agent.py`
  - final prompt includes the five category-specific contracts
  - final prompt says topic sections must use topic evidence bundles
  - final prompt forbids invented business names and unsupported prices
  - final prompt preserves exact citation-copying contract

### 5. Wire Topic Quality Into QA And DIY Services

Update:

- `src/huaxia_tourismrag/services/qa_service.py`
- `src/huaxia_tourismrag/services/diy_itinerary_service.py`

Flow:

1. Retrieve and enrich evidence.
2. Build citation pack.
3. Build topic evidence bundles from citation/evidence metadata.
4. Add topic evidence context to final-answer prompt.
5. Generate `TravelAnswer`.
6. Run `TopicSectionQualityGuard`.
7. Run or re-run `CitationGuard` so final citations exactly match used IDs.
8. Cache only the guarded final answer.

TDD tests:

- `tests/test_qa_service.py`
  - topic evidence context is passed to final answer generation
  - topic quality guard warnings are surfaced
  - final citations match topic-section used IDs
- `tests/test_diy_itinerary_service.py`
  - DIY route with multiple cities produces route-aware topic evidence bundles
  - unsupported topic sections are downgraded rather than hallucinated

### 6. Streamlit Rendering Upgrade

Update `src/huaxia_tourismrag/streamlit_app.py`.

Rendering goals:

- Keep the current topic tabs.
- Render structured `items` as polished mini cards.
- Legacy `recommendations` still render as bullets.
- Show `city`, `day`, and `verification_note` when present.
- Keep visual hierarchy light; no heavy shadows or nested-card clutter.

TDD tests:

- `tests/test_streamlit_frontend.py`
  - structured topic items render without raw keys
  - legacy recommendation lines still render
  - empty topic sections show a friendly empty state

### 7. Add Manual Evaluation Cases

Create `evals/topic_section_quality_cases.md` or `.json`.

Include at least:

- 山西历史人文十日深度游，5人含老人儿童，豪华级别
- 三国历史巡礼 DIY，北京往返，多城市必达
- 成都/重庆6天，美食为主
- 广西5天，桂林阳朔北海涠洲岛
- 新疆北疆8天，越野车和禾木小木屋

For each case, check:

- Does each section mention only route-relevant places?
- Does every concrete recommendation cite a valid source?
- Are local food and local specialties real and source-backed?
- Are hotel/transport recommendations operationally useful?
- Does entertainment avoid generic filler?
- Are missing sources marked as verification needs?

### 8. Verification Commands

Run:

```bash
uv run ruff check src/huaxia_tourismrag tests
uv run pytest -q
```

Manual smoke:

```bash
uv run python -m huaxia_tourismrag.api.app
uv run streamlit run src/huaxia_tourismrag/streamlit_app.py
```

Then test:

- 上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。
- 我想做一条三国历史巡礼路线，从北京出发并回到北京，必须覆盖涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中。10到12天，高铁优先，必要时包车。
- 成都和重庆6天，主要想吃本地美食，也想加一点轻松景点。

## Rollout Strategy

Phase 1:

- Add schemas, prompt contract, quality guard, and tests.
- Keep frontend backward compatible.

Phase 2:

- Add topic evidence selector and service wiring.
- Verify citations and source compatibility.

Phase 3:

- Improve Streamlit topic cards.
- Add manual eval script.

Phase 4:

- Tune prompts and evidence caps based on four to five live prompt runs.

## Non-Goals

- Do not add more checkpoint questions.
- Do not force every answer to include every section when the answer is not an itinerary.
- Do not use regex or literal phrase triggers to decide behavior.
- Do not invent restaurants, hotel names, prices, show schedules, opening hours, or transport times without evidence.
- Do not let Firecrawl/Tavily/Mapbox appear only as service logs; their usable evidence must enter the citation pack or stay hidden from the answer.

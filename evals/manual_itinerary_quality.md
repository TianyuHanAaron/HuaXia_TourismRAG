# Manual Itinerary Quality Smoke Test

Use this checklist before investor demos or after changes to retrieval, parsing, prompts, or service enrichment. Run each prompt in the Streamlit UI with the default `深度旅行社版` detail level unless the prompt explicitly asks for a concise answer.

## Global Pass Criteria

- Scenic names are clean: no city/county/district prefix in attraction names unless it is part of the official attraction name.
- Cuisine suggestions are edible local dishes, snacks, drinks, or food specialties. They must not be artware, medicine, craft workshops, temples, practice bases, or generic route fragments.
- Citations are actual internal parsed sources or fresh web sources. Policy, railway, and tourism-law citations should appear only when they support transport, contract, safety, or compliance claims.
- Every in-text citation id such as `[1]` must appear in the returned citation list, and every returned citation line must be used in the answer/highlights/warnings/generated itinerary.
- Returned citation lines must exactly match the formatter-approved source line. The model should not rewrite titles, source names, URLs, or `internal:<chunk_id>` refs.
- The answer uses one short uncertainty or confirmation section instead of repeating “证据不足” throughout the daily plan.
- If the answer asks a checkpoint question, the Streamlit UI should show quick-reply buttons beneath it.
- For DIY or must-cover routes, the required cities and must-have attractions are preserved in the final plan or explicitly flagged as infeasible before any removal.

## Citation Faithfulness QA

Structured cases live in `evals/citation_faithfulness_cases.json`. For each case, inspect the API or Streamlit response and verify:

- `answer`, `highlights`, `warnings`, and `generated_itinerary` contain no unknown citation ids.
- The returned `citations` array includes exactly the used ids, no extras.
- Each returned citation line is copied exactly from the allowed citation formatter output.
- Scenic/food recommendations are backed by scenic, heritage, destination, local cuisine, local specialty, or current web evidence. Policy/railway/legal sources should only support rules, transport, safety, contract, or compliance claims.
- If citation guard warnings appear, they should be understandable and should not block the user-facing answer.

## Prompt 1: 山西历史人文十日深度游

Prompt:

```text
上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。
```

Expected checks:

- Mentions core Shanxi heritage/scenic anchors such as 太原/晋祠, 平遥古城, 双林寺/镇国寺, 大同云冈石窟, 应县木塔, 悬空寺/恒山, 五台山, 壶口瀑布 where appropriate.
- Elder/child pacing is realistic and avoids overloading every day.
- Accommodation strategy fits “豪华级别” and transport nodes.
- Food includes real Shanxi cuisine such as 刀削面, 过油肉, 平遥牛肉, 太谷饼, 汾酒/醋文化 as applicable.

## Prompt 2: 三国历史巡礼 DIY

Prompt:

```text
/diy 我想做一条三国历史巡礼路线，从北京出发并回到北京，必须覆盖涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中。10到12天，高铁优先，必要时包车。
```

Expected checks:

- Routes as DIY, not generic city travel.
- Preserves all required cities or asks a checkpoint before changing scope.
- Uses 三国叙事线: 涿州/刘备张飞, 临漳/邺城铜雀台, 许昌/许都曹魏, 南阳/卧龙岗, 赤壁/咸宁, 南京/东吴建业, 成都/蜀汉, 汉中/北伐与定军山.
- Does not let railway-law citations dominate the historical itinerary.

## Prompt 3: 海南亲子/父母轻松游

Prompt:

```text
陪爸妈去海南岛7天，人均3000，想轻松一点。
```

Expected checks:

- Asks or assumes departure city if needed.
- Prioritizes low-fatigue pacing and fewer hotel moves.
- Includes real local food such as 文昌鸡, 清补凉, 椰子鸡, 抱罗粉, 海南粉, 海鲜 while respecting older travelers.
- Avoids luxury recommendations that exceed 人均3000 unless framed as optional upgrades.

## Prompt 4: 成都/重庆美食路线

Prompt:

```text
成都和重庆6天，主要想吃本地美食，也想加一点轻松景点，不想每天赶路。
```

Expected checks:

- Food recommendations are real dishes/snacks: 火锅, 小面, 抄手, 串串, 担担面, 甜水面, 钵钵鸡, 豆花, 冰粉等.
- No non-food artifacts or venue fragments appear as “美食”.
- Itinerary balances food neighborhoods with light sightseeing and digestion/rest time.
- Transport between 成都 and 重庆 is realistic.

## Prompt 5: 北京/西安文化遗产路线

Prompt:

```text
北京和西安8天，第一次来中国，想看文化遗产和博物馆，节奏不要太累。
```

Expected checks:

- Includes clean heritage/scenic anchors such as 故宫, 天坛, 颐和园, 长城, 国家博物馆, 兵马俑, 陕西历史博物馆, 西安城墙, 大雁塔.
- Adds reservation reminders for high-demand museums/sites without overusing legal citations.
- Keeps first-time visitor logistics clear: airport/rail transfer, city split, rest blocks.
- Local food suggestions are real and accessible: 北京烤鸭, 炸酱面, 豆汁 as optional, 肉夹馍, biangbiang面, 羊肉泡馍, 凉皮.

## Sales Handoff QA

After any complete answer:

- Expand `转给华夏旅行社顾问`.
- Enter a test contact and fill:
  - `不可删除项`: one or two must-have sites from the prompt.
  - `可调整项`: hotel area or meal flexibility.
  - `待报价项`: hotel, vehicle, guide, tickets.
- Submit and confirm the UI returns a lead id.
- Confirm backend receives original request, generated itinerary snapshot, and the three requirement lists.

## Quick Form Template QA

Run these before a public demo after changing Streamlit, checkpoint, or form DTO code:

- Default landing composer opens on `快速表单`, with `自由描述` still available as a secondary tab.
- Submit a normal form: 上海出发, 山西, 10 天, 5 人含老人儿童, 豪华级别, 历史人文, 高铁优先. It should create one typed request and should not ask for the same basic information again.
- Submit a DIY form: 北京往返, 必须覆盖涿州/临漳/许昌/南阳/咸宁/南京/成都/汉中, 12 天, 高铁优先, 必须全部覆盖, 深度旅行社版. It should route through the DIY flow and preserve all required stops.
- During checkpoint replies, the form should not appear; the UI should show quick-reply buttons or the free-text reply box only.
- `转给华夏旅行社顾问` should appear only after a completed itinerary answer, never during a pending multi-hop checkpoint.
- Form-derived answers should still pass citation checks: no unknown citation ids, no unused citation lines, and food/scenic claims should not cite unrelated railway/legal sources.

## Latest Lightweight API Smoke Notes

Run date: 2026-05-27.

- 成都/重庆美食路线: completed. Spot check found real food terms such as 火锅、小面、串串、钵钵鸡、抄手; no craft/artware pollution terms found. Citations focused on food/specialty sources, but the answer still used several “当前证据不足” caveats.
- 山西历史人文十日深度游: returned a checkpoint quickly, as expected for a complex family/luxury route.
- 三国历史巡礼 DIY: returned a checkpoint quickly, as expected for a complex must-cover thematic route.
- 海南亲子/父母轻松游: completed; no craft/artware pollution found. One transport/policy citation appeared.
- 北京/西安文化遗产路线: completed; no craft/artware pollution found. Two transport/policy citations appeared.

Runtime note: complete answers still took minutes in the live API path, so production testing should keep async job mode, retrieval cache, and visible progress states enabled.

## Destination Evidence Smoke Cases

Use `evals/destination_evidence_cases.json` after any retrieval, citation, planner, or context-budgeting change.

Pass criteria:

- `needs_reply=false` for all four conventional prompts.
- Returned citation IDs exactly match used in-text citation IDs.
- Scenic and food highlights do not cite policy/legal/railway sources except for explicit transport or risk warnings.
- Each expected entity is either planned with direct destination evidence or explicitly marked as missing/needs real-time verification.
- Deep job runtime should trend below 60 seconds for cached/common routes and below 90 seconds uncached.

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

## Engagement Feed Waiting-Room QA

Run this after changing async jobs, Streamlit polling, or Pydantic Graph orchestration.

Prompt:

```text
河南计划：一家四口（两大两小）从郑州本地出发，用10天深度游中原文化，预算14000元。7月初想走“寻根+古都”线：安阳殷墟和文字博物馆住两天，洛阳龙门石窟、白马寺、二里头夏都遗址三天，登封少林寺和嵩阳书院两天，开封清明上河园、州桥遗址两天，最后一天去三门峡地坑院，吃烩面、水席和汴京烤鸭。
```

Pass criteria:

- The deep job returns a `job_id` quickly and Streamlit shows the waiting-room shell immediately.
- The shell title explains this is a destination mini encyclopedia while the cited itinerary is generated.
- The first real batch, if available, contains up to six cards and does not block the main RAG job.
- Cards rotate locally about every 10 seconds when more than one batch is ready.
- Card mix covers 景点冷知识、城市民俗、本地味道、旅客提醒.
- Card bodies are informative mini-encyclopedia paragraphs, not short one-line tips.
- Cards do not show `为什么值得注意`.
- Cards do not claim real-time ticket prices, current opening hours, hotel availability, live weather, live traffic, or booking status.
- When the final answer arrives, the waiting room disappears from the main view and becomes a collapsed `刚才路上看的小百科` expander below the final answer.
- No engagement card text appears in final citations, `CitationPack`, or citation guard warnings.

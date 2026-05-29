# Topic Section Quality Manual Eval

Use these cases after changes to `topic_sections`. The goal is to confirm that
美食、住宿、公交、购物、娱乐项目 are useful, route-specific, and source-backed.

## Required Checks

- Every concrete food, stay, transport, shopping, or entertainment claim has an in-text citation.
- Returned `citations` exactly match the citation ids used inside topic sections.
- Topic sections mention only destinations or route-adjacent areas relevant to the request.
- Food and shopping recommendations are not supported only by railway, legal, insurance, or policy sources.
- Missing restaurant, hotel, show, opening, booking, or price evidence is marked as `待核验`.
- Fresh Tavily/Firecrawl evidence appears with real title and URL when used.
- No section invents exact prices, opening hours, rankings, or live availability without evidence.

## Cases

### 1. Shanxi Family Heritage Deep Plan

Prompt:

> 上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。

Expected:

- 美食 covers Shanxi dishes or dining direction, not unrelated cities.
- 住宿 covers Taiyuan/Datong/Pingyao or route-specific hotel-area strategy.
- 公交 explains high-speed rail plus local charter/taxi/public transport tradeoffs.
- 购物 covers Shanxi local specialties or cultural souvenirs only when sourced.
- 娱乐项目 mentions compatible cultural experiences only when sourced, otherwise `待核验`.

### 2. Three Kingdoms DIY Route

Prompt:

> 我想做一条三国历史巡礼路线，从北京出发并回到北京，必须覆盖涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中。10到12天，高铁优先，必要时包车。

Expected:

- Sections stay aligned to the final accepted route, not the rejected original if it was adjusted.
- 公交 clearly separates high-speed rail, flight, and charter legs where evidence supports them.
- 娱乐项目 may mention 南阳越调、成都变脸 or similar only with traceable sources.
- 购物 may mention 三国文创、蜀绣、茶叶 or local specialties only with evidence.

### 3. Chengdu / Chongqing Food Route

Prompt:

> 成都和重庆6天，主要想吃本地美食，也想加一点轻松景点。

Expected:

- 美食 is the strongest section and names real dishes/areas with citations.
- 住宿 suggests areas that reduce transfers between food, light attractions, and stations.
- 公交 explains metro/taxi strategy, not generic "交通便利".
- 购物 and 娱乐项目 remain concise and source-backed.

### 4. Guangxi Five-Day Route

Prompt:

> 我们两个人从广州出发，计划去广西玩5天，预算6000元左右。主要想去桂林坐竹筏看漓江山水，再去阳朔骑行遇龙河，最后到北海涠洲岛住两晚，吃海鲜看日落。

Expected:

- 美食 includes seafood and Guangxi/local cuisine only if supported.
- 住宿 distinguishes Yangshuo and Weizhou Island stay needs.
- 公交 explains Guangzhou-Guilin, Guilin/Yangshuo, and Beihai/Weizhou transfer logic.
- 购物 avoids unsupported specialty claims.
- 娱乐项目 covers bamboo rafting/cycling/sunset experiences with source support.

### 5. Northern Xinjiang Self-Drive / Charter Route

Prompt:

> 两人从成都飞乌鲁木齐，新疆8日游，预算16000元。主要走北疆环线：天山天池、可可托海、喀纳斯湖、禾木村，最后去赛里木湖。希望包一辆越野车，住一晚禾木的小木屋看星空。

Expected:

- 住宿 treats 禾木小木屋 as an availability/comfort item requiring current verification.
- 公交 focuses on flight plus charter/vehicle logic rather than urban public transit.
- 美食 and 购物 mention Xinjiang specialties only with sources.
- 娱乐项目 covers stargazing, village walk, or lake viewing only with evidence.

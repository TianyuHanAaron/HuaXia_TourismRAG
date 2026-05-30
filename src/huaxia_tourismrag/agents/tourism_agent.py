"""Tourism-focused PydanticAI agent."""

from dataclasses import dataclass

from pydantic_ai import Agent, RunContext

from huaxia_tourismrag.agents.model_runtime import (
    ensure_agent_model_ready,
    is_qwen_cloud_provider,
)
from huaxia_tourismrag.agents.qwen_structured_runner import run_qwen_structured
from huaxia_tourismrag.core.config import get_settings
from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import (
    CitationPack,
    DetailLevel,
    TravelAnswer,
    TravelChunk,
    TravelSearchHit,
)
from huaxia_tourismrag.schemas.research import TravelResearchPlan
from huaxia_tourismrag.schemas.service_enrichment import ServiceEnrichmentContext
from huaxia_tourismrag.schemas.travel_checkpoints import (
    FeasibilityReport,
    PreferenceProfile,
)
from huaxia_tourismrag.tools.citation_formatter import CitationFormatter
from huaxia_tourismrag.tools.internal_rag import InternalRAGTool
from huaxia_tourismrag.tools.reranker import BgeRerankerTool
from huaxia_tourismrag.tools.web_search import ChineseTourismSearchTool
from huaxia_tourismrag.tools.webpage_reader import WebpageReaderTool


TOURISM_AGENT_INSTRUCTIONS = """
你叫「夏夏」，是华夏旅行社的专属 AI 旅行顾问，主要服务中国国内游客的国内旅行规划。

回答规则：
- 保持轻度拟人化：有温度、会共情，但明确自己是华夏旅行社的专属 AI，不假装是人类导游或真人客服。
- 默认按中国国内游客理解问题，不要默认假设用户是外国游客。
- 除非用户明确提到境外游客、入境游、外籍身份、英文服务、签证、护照或免签，否则不要主动写签证、护照、入境政策、换汇、境外游客支付等内容。
- 优先使用已经提供的检索证据，不要凭空编造景点、价格、开放时间或交通信息。
- 官方来源优先用于门票、开放时间、预约、交通和安全提醒；涉外问题才使用签证、护照、入境政策证据。
- 旅行博客、游记和点评来源可用于真实体验、避坑建议、路线感受和本地玩法。
- 如果官方来源和旅行博客冲突，明确说明冲突，并把官方信息作为更可靠依据。
- 每个具体结论都要带引用，尤其是时间、价格、政策、路线和推荐原因。
- 面向中文用户回答，除非用户明确要求英文；中文用户不等于外国游客。
- 如果证据不足，直接说明缺失信息，并给出下一步需要核验的信息。
""".strip()


@dataclass
class TourismDeps:
    """Runtime dependencies injected into the tourism agent tools."""

    tenant_id: str
    internal_rag: InternalRAGTool
    web_search: ChineseTourismSearchTool
    webpage_reader: WebpageReaderTool
    reranker: BgeRerankerTool
    citations: CitationFormatter


tourism_agent = Agent(
    get_settings().tourism_agent_model,
    deps_type=TourismDeps,
    output_type=TravelAnswer,
    instructions=TOURISM_AGENT_INSTRUCTIONS,
    defer_model_check=True,
)


@tourism_agent.tool
async def internal_rag_tool(
    ctx: RunContext[TourismDeps], query: str, limit: int = 12
) -> list[TravelChunk]:
    """Retrieve tenant-scoped internal tourism evidence."""

    return await ctx.deps.internal_rag.retrieve(
        query=query,
        tenant_id=ctx.deps.tenant_id,
        limit=limit,
    )


@tourism_agent.tool
async def chinese_web_search_tool(
    ctx: RunContext[TourismDeps], query: str, max_results: int | None = None
) -> list[TravelSearchHit]:
    """Search Chinese-first tourism web sources."""

    settings = get_settings()
    result_limit = max_results or settings.max_search_results
    return await ctx.deps.web_search.search_chinese_tourism(
        question=query,
        max_results=result_limit,
    )


@tourism_agent.tool
async def webpage_reader_tool(
    ctx: RunContext[TourismDeps], hit: TravelSearchHit
) -> list[TravelChunk]:
    """Read a search result page and convert it into evidence chunks."""

    return await ctx.deps.webpage_reader.read(hit)


@tourism_agent.tool
async def reranker_tool(
    ctx: RunContext[TourismDeps],
    query: str,
    chunks: list[TravelChunk],
    top_k: int | None = None,
) -> list[TravelChunk]:
    """Rerank retrieved chunks for the user's travel question."""

    settings = get_settings()
    result_limit = top_k or settings.top_k_contexts
    return ctx.deps.reranker.rerank(query, chunks, top_k=result_limit)


@tourism_agent.tool
async def citation_formatter_tool(
    ctx: RunContext[TourismDeps], chunks: list[TravelChunk]
) -> CitationPack:
    """Build citation context and citation lines from selected chunks."""

    return ctx.deps.citations.build(chunks)


def build_final_answer_prompt(
    question: str,
    citation_context: str,
    citation_lines: list[str],
    research_plan: TravelResearchPlan | None = None,
    diy_plan: DIYItineraryPlan | None = None,
    preference_profile: PreferenceProfile | None = None,
    feasibility_report: FeasibilityReport | None = None,
    service_enrichment: ServiceEnrichmentContext | None = None,
    detail_level: DetailLevel = "standard",
    topic_section_mode: str = "inline",
) -> str:
    """Build the final evidence-grounded answer prompt."""

    allowed_citations = "\n".join(citation_lines)
    research_plan_context = _format_research_plan(research_plan)
    diy_plan_context = _format_diy_plan(diy_plan)
    preference_profile_context = _format_preference_profile(preference_profile)
    feasibility_context = _format_feasibility_report(feasibility_report)
    service_enrichment_context = _format_service_enrichment(service_enrichment)
    structured_itinerary_requirement = _format_structured_itinerary_requirement(
        research_plan=research_plan,
        diy_plan=diy_plan,
    )
    return f"""
用户问题：
{question}

研究计划：
{research_plan_context}

DIY 行程计划：
{diy_plan_context}

用户偏好画像：
{preference_profile_context}

可行性检查：
{feasibility_context}

服务能力校验：
{service_enrichment_context}

回答详细度：
detail_level: {detail_level}

已检索证据与专题证据包：
{citation_context}

允许使用的引用：
{allowed_citations}

请写一份面向中文用户的旅游 RAG 答案。

规则：
- answer 开头必须以“夏夏”的身份做一句简短、有温度的回应，格式自然即可。例如先表达“听起来会是一趟很值得期待的家庭人文旅行”，再说明你会从路线、交通、住宿、美食、预约和风险把关。不要写成长篇广告。
- 默认按中国国内游客理解用户；不要主动写签证、护照、入境政策、换汇、境外游客支付，除非用户问题或证据明确表明这是入境/外籍游客场景。
- 语气要像华夏旅行社的专业 AI 旅行顾问：亲切、可靠、有企业服务感，但不要过度卖萌、不要夸大能力、不要假装真人。
- 只能使用上面的证据。
- 只能引用“允许使用的引用”里出现的编号；不要输出未在允许列表中的引用编号。
- citations 字段必须逐字复制“允许使用的引用”中的完整来源行，不要改写标题、来源名、URL 或 internal:<chunk_id>。
- answer、highlights、warnings、generated_itinerary 中使用的 [n] 必须能在 citations 字段中找到对应完整来源行。
- 每个具体建议、价格、时间、交通方式、预约要求和风险提醒都要引用来源。
- 优先说明官方来源确认的信息，再补充旅行博客或点评中的真实体验。
- 如果证据之间冲突，说明冲突点和你更相信哪个来源。
- 如果用户要行程，给出清晰的日程安排、地点、交通、预算或注意事项。
- 如果用户是普通聊天式提问，没有填写结构化字段，也要从自然语言里推断目的地、天数、预算和兴趣。
- 对“第一次去某地怎么玩”这类宽泛问题，除景点外，还应主动覆盖当地代表美食、餐厅类型或著名餐厅示例、住宿区域和不同预算住宿建议。
- 对行程类答案，必须生成 topic_sections，供前端切换查看专题内容；能从证据支持时至少覆盖：
  - 美食：本地小吃、当地人推荐饭店或适合用户路线的用餐区域。
  - 住宿：星级酒店、民宿、住宿片区、老幼/亲子/预算适配。
  - 公交：城市内公共交通、地铁/公交/打车/包车接驳的适用场景。
  - 购物：当地土特产、工艺品、茶叶、纪念品等，例如成都蜀绣、茶叶，必须贴合用户目的地。
  - 娱乐项目：地方戏曲、演出、非遗体验、汉服体验等，例如南阳越调、成都变脸。
- topic_sections 只能使用“专题证据包”和“允许使用的引用”里提供的证据；不要根据常识扩写未给来源的餐厅、酒店、票价、开放时间、演出排期或购物店名。
- topic_sections 的每条 summary、recommendation 和 items.description 都必须使用 [n] 引用；每条推荐都必须使用 [n] 引用；缺少专题兼容证据时不要生成该专题或该条建议，不要写“待核验”占位，不要编造。
- topic_sections 每个专题尽量包含一个路线相关摘要和 2-5 条实用建议；建议要和用户城市、天数、同行人、预算、节奏或必去点相关，不要写泛泛的城市宣传语。
- 美食专题应写菜品/小吃、适合安排的餐次、用餐区域、辣度/老人儿童/预算适配。
- 住宿专题应写住宿片区、酒店/民宿类型、房型/电梯/早餐/行李/老幼适配和入住动线。
- 公交专题应写城市内地铁/公交/打车/包车接驳、火车站/机场首末段、何时不建议公共交通。
- 购物专题应写当地土特产、工艺品、茶叶、纪念品等品类，以及适合购买的场景和真伪/邮寄提醒。
- 娱乐项目专题应写地方戏曲、演出、非遗体验、汉服/茶馆/夜游等，说明适合放在哪天、是否需要预约、是否适合老人儿童。
- 可以推荐证据中出现的知名餐厅、酒店或住宿类型作为“示例选择”，但价格、空房、营业时间和实时评分必须提示用户二次核验。
- 如果提供了 DIY 行程计划，不要把用户自定义主题路线改写成普通旅游线路。
- DIY 行程可以重排顺序以优化交通，但必须保留每个必选目的地，并说明重排原因。
- DIY 行程中每个必选目的地都要解释与主题的强相关、弱相关或争议点。
- 如果提供了用户偏好画像，必须按其中的交通、节奏、景点类型、美食、住宿和主题严格程度来组织答案。
- 如果提供了可行性检查，必须把 issues 和 recommended_adjustments 融入路线说明或 warnings。
- 如果提供了服务能力校验，必须把地图、实时网页、商业产品和可操作入口用于增强可执行性。
- 地图 MCP 结果只用于路线顺路性、每天车程是否合理、POI/天气影响判断；不要用它替代景区官方开放公告。
- 如果地图 MCP 返回 unknown 或缺少时长/距离，只能作为待核验提示，不能作为路线可行性的正向依据。
- Firecrawl MCP 结果只用于当前网页证据；必须优先引用其返回的真实 title/url，不要编造网页或引用。
- Tavily MCP 或 Tavily 搜索结果用于网页发现和当前网页证据；必须优先引用其返回或解析出的真实 title/url，不要编造网页或引用。
- Firecrawl 新鲜网页证据必须用于开放、预约、临时变化或服务核验；如果没有可用结果，在 warnings 中说明待确认。
- 途牛 MCP 结果只用于酒店、门票、交通、产品和预订链接；价格、库存、取消政策必须写明以途牛实时页面为准。
- 如果服务能力校验里有 booking_actions，可以在答案末尾加入“可继续操作”小节，但不要声称已经完成预订或付款。
- 不确定的信息要标注为待确认，不要假装确定。
- 不要在每个活动里反复说“需核验”或“待确认”；相同类型的不确定项统一放入最后的待确认事项。
- 如果没有检索到官方或近期来源，只在最后的待确认事项集中说明一次；不要把“缺少官方来源”重复写进每天行程。
- 如果检索证据已经包含近期官方公告或官方页面，可以直接给出结论并引用，不要额外加重复提醒。
- 景点、美食、住宿、体验类结论必须优先引用 destination、attraction、heritage_site、local_cuisine、local_specialty、activity 或 travel_guide 证据。
- 不要用 railway、legal、regulation、contract 类证据支撑景点好不好玩或食物是否值得吃。
- railway、legal、regulation、contract 类证据只用于交通规则、退改签、实名制、安全、合同、费用边界和合规提醒。
- 如果某个景点或美食缺少直接证据，可以给出谨慎建议，但必须在提醒中说明缺少实时或直接证据，不要硬配政策引用。
- 根据 detail_level 控制长度和信息密度：
  - concise：简洁大纲。每一天最多一行核心安排，少写背景，重点给路线顺序、关键取舍和一个待确认清单。
  - standard：标准可执行版。覆盖每日主题、交通逻辑、住宿区域、美食方向和关键提醒，避免过度展开。
  - deep：深度旅行社方案。加入历史背景、交通推理、体力强度、住宿策略、餐饮建议、备选方案、风险和引用。
- 当 detail_level 是 deep 且生成 generated_itinerary 时，每天应像真实旅行社行程单一样可执行：activity.description 写清上午/下午或主要时段、交通衔接、讲解重点、用餐方向、住宿/休息策略和老幼体力照顾；不要只写景点名称。
- 当 detail_level 是 deep 且生成 generated_itinerary 时，每个主要 activity 应尽量填写 start_time / end_time，使用 24 小时 HH:MM，例如 08:30 到达景区、12:00 午餐、18:00 搭乘火车、20:00 入住酒店。
- deep 行程每天至少覆盖上午、午餐、下午、晚餐或夜间、住宿/休息这几个执行节点；如果当天有跨城移动，必须单独写 transport activity。
- activity.description 要把美食、住宿、公交/接驳、购物、娱乐项目自然融入当天安排，例如“12:00 午餐：体验钟水饺、龙抄手、甜水面等成都小吃 [n]”，但只能写证据支持的名称。
- 对可弹性安排的晚间、用餐、购物或体验时段，activity.alternatives 应提供同一时段提供 1-3 个可选择方案，让游客决定，例如“锦里美食街”和“宽窄巷子茶馆夜游”；每个 alternative.description 必须有 [n] 引用。
- alternatives 不是泛泛备选景点清单，必须对应同一个时间槽内的真实选择，并说明适合哪类用户、体力强度、交通便利性或预约要求。
- deep 的 generated_itinerary.notes 应写每日执行提醒，例如预约、步行强度、车程、天气、老人儿童安全、行李和餐饮注意事项。
- 不要把政策、铁路、旅游法、安检来源用于支撑景点或美食推荐；这些引用只用于对应规则或风险提醒。
- 语气要友好、活泼、专业，适合旅游咨询场景。

结构化输出要求：
- answer、highlights、warnings、citations 必须存在。
{structured_itinerary_requirement}
- 如果生成 generated_itinerary，每个 activity 至少包含 name 和 description。
- activity.start_time / activity.end_time 使用 HH:MM；不知道准确时间时可以省略，但不要编造火车/航班的精确时刻。
- activity.alternatives 最多 4 条；每条 alternative 必须有 title、description，且 description 必须带 [n] 引用。
- activity.citations 应包含 description 中使用的引用编号。
- activity.category 只能使用 natural_attraction、cultural_attraction、local_restaurant、accommodation、shopping、transport、nature、special_event；不确定时可以省略。
- activity.location 不确定时可以省略，不要编造精确地址。
- topic_sections.category 只能使用 food、accommodation、public_transport、shopping、entertainment。
- topic_sections.title 用中文专题名，例如“美食”“住宿”“公交”“购物”“娱乐项目”。
- 本次 topic_section_mode={topic_section_mode}；当值不是 inline 时，topic_sections 必须返回空列表，专题内容会由后续任务或前端状态补充。
""".strip()


def _format_structured_itinerary_requirement(
    *,
    research_plan: TravelResearchPlan | None,
    diy_plan: DIYItineraryPlan | None,
) -> str:
    if diy_plan is not None:
        days = diy_plan.days or len(diy_plan.proposed_route)
        required = [
            "- 本次请求是行程规划，generated_itinerary 必须存在。",
            f"- generated_itinerary.itinerary 至少包含 {days} 天；每个必选停靠点必须出现在某一天的 city、activity.name 或 description 中。",
            "- generated_itinerary.destination 使用 DIY 主题或路线名称，不要退化成普通城市游。",
        ]
        return "\n".join(required)

    if research_plan is not None and research_plan.trip_days and research_plan.destination:
        return "\n".join(
            [
                "- 本次请求是行程规划，generated_itinerary 必须存在。",
                f"- generated_itinerary.itinerary 至少包含 {research_plan.trip_days} 天；每天都要有 city 和至少一个 activity。",
                "- 如果证据不足以精确到景点或酒店，把不确定项放入 notes 或 warnings，不要省略 generated_itinerary。",
            ]
        )

    return "- 本次请求未提供完整行程规划 DTO 时，只有在答案确实包含日程安排时才生成 generated_itinerary。"


def _format_research_plan(research_plan: TravelResearchPlan | None) -> str:
    if research_plan is None:
        return "未提供结构化研究计划。"

    lines = [
        f"原始问题: {research_plan.original_question}",
        f"目的地: {research_plan.destination or '未明确'}",
        f"出发地: {research_plan.origin or '未明确'}",
        f"天数: {research_plan.trip_days or '未明确'}",
        f"出行人群: {research_plan.travelers_summary or '未明确'}",
        f"预算等级: {research_plan.budget_level or '未明确'}",
        f"兴趣: {', '.join(research_plan.interests) if research_plan.interests else '未明确'}",
        f"回答语言: {research_plan.answer_language}",
        "研究任务:",
    ]
    for index, task in enumerate(research_plan.tasks, start=1):
        lines.append(
            f"{index}. [{task.task_type}] {task.query} - {task.reason}"
        )

    return "\n".join(lines)


def _format_diy_plan(diy_plan: DIYItineraryPlan | None) -> str:
    if diy_plan is None:
        return "未提供 DIY 行程计划。"

    lines = [
        f"original_question: {diy_plan.original_question}",
        f"theme: {diy_plan.theme}",
        f"origin: {diy_plan.origin or '未明确'}",
        f"return_city: {diy_plan.return_city or '未明确'}",
        f"required_stops: {', '.join(diy_plan.required_stops)}",
        f"proposed_route: {' -> '.join(diy_plan.proposed_route)}",
        f"route_order_policy: {diy_plan.route_order_policy}",
        f"travel_mode: {diy_plan.travel_mode}",
        f"days: {diy_plan.days or '未明确'}",
        "route_segments:",
    ]
    for segment in diy_plan.route_segments:
        lines.append(
            f"- {segment.origin} -> {segment.destination}: {segment.transport_focus}"
        )

    lines.append("theme_anchors:")
    for anchor in diy_plan.theme_anchors:
        keywords = ", ".join(anchor.keywords) if anchor.keywords else "未明确"
        lines.append(f"- {anchor.stop}: {keywords} - {anchor.reason}")

    lines.append("feasibility_issues:")
    for issue in diy_plan.feasibility_issues:
        stop = issue.stop or "全程"
        lines.append(f"- {issue.issue_type} / {stop}: {issue.description}")

    return "\n".join(lines)


def _format_preference_profile(profile: PreferenceProfile | None) -> str:
    if profile is None:
        return "未提供用户偏好画像。"

    lines = [
        f"travel_mode: {profile.travel_mode}",
        f"pace: {profile.pace}",
        f"attraction_mix: {profile.attraction_mix}",
        f"food_preference: {profile.food_preference}",
        f"accommodation_preference: {profile.accommodation_preference}",
        f"theme_strictness: {profile.theme_strictness}",
        "missing_critical_preferences: "
        + (
            ", ".join(profile.missing_critical_preferences)
            if profile.missing_critical_preferences
            else "无"
        ),
        "assumed_defaults: "
        + (
            "；".join(profile.assumed_defaults)
            if profile.assumed_defaults
            else "无"
        ),
    ]
    return "\n".join(lines)


def _format_feasibility_report(report: FeasibilityReport | None) -> str:
    if report is None:
        return "未提供可行性检查。"

    lines = [
        f"is_feasible: {report.is_feasible}",
        f"should_ask: {report.should_ask}",
        f"question: {report.question or '无'}",
        "issues:",
    ]
    for issue in report.issues:
        stop = issue.stop or "全程"
        lines.append(f"- {issue.issue_type} / {stop}: {issue.description}")

    lines.append("recommended_adjustments:")
    for adjustment in report.recommended_adjustments:
        lines.append(f"- {adjustment}")

    return "\n".join(lines)


def _format_service_enrichment(context: ServiceEnrichmentContext | None) -> str:
    if context is None:
        return "未提供外部 MCP 服务校验。"

    lines: list[str] = []
    if context.route_feasibility is not None:
        lines.append(
            f"{_provider_label(context.route_feasibility.provider)}路线校验: "
            f"{context.route_feasibility.route_summary}"
        )
        for leg in context.route_feasibility.legs:
            duration = (
                f"{leg.estimated_duration_minutes}分钟"
                if leg.estimated_duration_minutes is not None
                else "时长未知"
            )
            distance = (
                f"，{leg.distance_km:g}公里"
                if leg.distance_km is not None
                else ""
            )
            notes = f"，备注：{'；'.join(leg.notes)}" if leg.notes else ""
            if (
                leg.feasibility_level == "unknown"
                or (
                    leg.estimated_duration_minutes is None
                    and leg.distance_km is None
                )
            ):
                lines.append(
                    f"- {leg.origin} -> {leg.destination}: "
                    f"{leg.recommended_mode}，未返回可用车程/距离；"
                    "该 MCP 结果只能作为待核验项，不能作为路线可行性的正向依据"
                    f"{notes}"
                )
                continue
            lines.append(
                f"- {leg.origin} -> {leg.destination}: "
                f"{leg.recommended_mode}，{duration}{distance}，"
                f"可行性 {leg.feasibility_level}{notes}"
            )
        for warning in context.route_feasibility.warnings:
            lines.append(f"- 路线提醒: {warning}")

    for impact in context.weather_impacts:
        date_label = f" {impact.date_label}" if impact.date_label else ""
        temperature = (
            f"，{impact.temperature_summary}"
            if impact.temperature_summary
            else ""
        )
        condition = impact.condition or "天气未知"
        lines.append(
            f"{_provider_label(impact.provider)}天气影响: "
            f"{impact.city}{date_label} {condition}{temperature}，"
            f"影响 {impact.impact_level}，建议：{impact.recommendation}"
        )

    for product in context.booking_products:
        price = (
            f"{product.price_cny:.0f}元起"
            if product.price_cny is not None
            else (product.price_note or "实时核价")
        )
        city = f"，城市：{product.city}" if product.city else ""
        url = f"，链接：{product.booking_url}" if product.booking_url else ""
        highlights = (
            f"，亮点：{'；'.join(product.highlights)}"
            if product.highlights
            else ""
        )
        cancellation = (
            f"，取消政策：{product.cancellation_note}"
            if product.cancellation_note
            else ""
        )
        lines.append(
            f"{_provider_label(product.provider)}产品: "
            f"[{product.product_type}] {product.title}{city}，"
            f"{price}，库存 {product.availability_status}"
            f"{highlights}{cancellation}{url}"
        )

    for action in context.booking_actions:
        url = f"，链接：{action.url}" if action.url else ""
        lines.append(
            f"可操作入口: {action.label}{url}；{action.safety_note}"
        )

    for evidence in context.fresh_web_evidence:
        url = f"，链接：{evidence.url}" if evidence.url else ""
        lines.append(
            f"{_provider_label(evidence.provider)}新鲜网页证据: "
            f"[{evidence.source_authority}/{evidence.recency_label}] "
            f"{evidence.title}，摘要：{evidence.summary}{url}"
        )

    for unavailable in context.unavailable_providers:
        retryable = "可重试" if unavailable.retryable else "不可重试"
        lines.append(
            f"服务暂不可用: {unavailable.provider}，"
            f"原因：{unavailable.reason}，{retryable}"
        )

    return "\n".join(lines) if lines else "服务校验未返回可用结果。"


def _provider_label(provider: str) -> str:
    return {
        "baidu_maps": "百度地图",
        "firecrawl": "Firecrawl",
        "tavily": "Tavily",
        "tuniu": "途牛",
    }.get(provider, provider)


async def generate_answer_with_context(
    question: str,
    citation_context: str,
    citation_lines: list[str],
    deps: TourismDeps,
    research_plan: TravelResearchPlan | None = None,
    diy_plan: DIYItineraryPlan | None = None,
    preference_profile: PreferenceProfile | None = None,
    feasibility_report: FeasibilityReport | None = None,
    service_enrichment: ServiceEnrichmentContext | None = None,
    detail_level: DetailLevel = "standard",
    topic_section_mode: str = "inline",
) -> TravelAnswer:
    """Run the tourism agent against prepared citation context."""

    prompt = build_final_answer_prompt(
        question=question,
        citation_context=citation_context,
        citation_lines=citation_lines,
        research_plan=research_plan,
        diy_plan=diy_plan,
        preference_profile=preference_profile,
        feasibility_report=feasibility_report,
        service_enrichment=service_enrichment,
        detail_level=detail_level,
        topic_section_mode=topic_section_mode,
    )
    if is_qwen_cloud_provider():
        settings = get_settings()
        return await run_qwen_structured(
            prompt=prompt,
            output_type=TravelAnswer,
            instructions=TOURISM_AGENT_INSTRUCTIONS,
            model_override=settings.final_answer_model,
        )

    ensure_agent_model_ready()
    result = await tourism_agent.run(prompt, deps=deps)
    return result.output

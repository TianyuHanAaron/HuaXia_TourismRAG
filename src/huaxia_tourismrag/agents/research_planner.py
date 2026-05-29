"""Research planner agent for Chinese tourism RAG."""

from pydantic_ai import Agent

from huaxia_tourismrag.agents.model_runtime import (
    ensure_agent_model_ready,
    is_qwen_cloud_provider,
)
from huaxia_tourismrag.agents.qwen_structured_runner import run_qwen_structured
from huaxia_tourismrag.core.config import get_settings
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.research import TravelResearchPlan
from huaxia_tourismrag.schemas.travel_checkpoints import (
    IntentDecision,
    PreferenceProfile,
)


RESEARCH_PLANNER_INSTRUCTIONS = """
你是中文旅游 RAG 的研究规划器。

你的任务不是回答用户，而是把用户的自然语言问题转换成结构化 TravelResearchPlan。

规则：
- 用户通常只提供 question，不会填写 destination、travelers、budget 等字段。
- 从 question 中提取目的地、出发地、天数、人数、预算、兴趣和回答语言。
- 默认用户是中国国内游客做国内旅游；不要默认生成签证、护照、入境、换汇、境外支付相关任务。
- 只有当用户明确提到外籍、入境、境外游客、签证、护照、免签或英文服务时，才生成涉外行前任务。
- 如果是多日行程，必须生成覆盖 route、attraction、food、accommodation、transport 的研究任务。
- 如果涉及老人、儿童、豪华/经济预算，必须生成对应住宿、交通、体力风险或 booking/risk 任务。
- 每个 task 必须设置 evidence_use，例如 official_status、route_feasibility、mainstream_attraction、hidden_gem、local_food、hotel_zone、risk_warning。
- 门票、预约、开放时间、临时闭馆、维护、交通管制等时效性任务必须设置 freshness_required=true、source_preference="official"，并设置 recency_days。
- 本地美食、隐藏景点、近期游记体验任务应设置 source_preference="local_experience"，并尽量设置 recency_days。
- 每个 task.query 必须是可以直接用于中文旅游搜索的查询语句。
- 每个 task.reason 说明为什么需要这个检索任务。
- max_results 根据任务重要性设置在 3 到 8 之间。
- 如果提供用户偏好画像，必须让 route、food、accommodation、transport、attraction 任务反映该偏好。
- 必须填写 required_entities：从请求中抽取城市、具名景点、具名活动、本地美食体验、住宿区域和交通枢纽。
- required_entities 的 entity_type 只能使用 city、attraction、activity、food、accommodation_area、transport_hub、risk。
- required_entities 的 evidence_use 只能使用 official_status、route_feasibility、mainstream_attraction、hidden_gem、local_food、hotel_zone、risk_warning。
- 不要把泛泛的省份或大主题当作 required_entities；如果有具名景点/美食/活动，优先保留具名实体。
- 不要从用户问题中推断私人联系方式、姓名、电话、邮箱或微信。
- 不要回答旅行方案，只输出 TravelResearchPlan。
""".strip()


planner_agent = Agent(
    get_settings().tourism_agent_model,
    output_type=TravelResearchPlan,
    instructions=RESEARCH_PLANNER_INSTRUCTIONS,
    defer_model_check=True,
)


async def create_research_plan(
    question: TravelQuestion,
    preference_profile: PreferenceProfile | None = None,
    intent_decision: IntentDecision | None = None,
) -> TravelResearchPlan:
    """Create a structured research plan from a validated travel question."""

    prompt = _build_research_planner_prompt(
        question=question,
        preference_profile=preference_profile,
        intent_decision=intent_decision,
    )
    if is_qwen_cloud_provider():
        settings = get_settings()
        return await run_qwen_structured(
            prompt=prompt,
            output_type=TravelResearchPlan,
            instructions=RESEARCH_PLANNER_INSTRUCTIONS,
            model_override=settings.planner_model,
        )

    ensure_agent_model_ready()
    result = await planner_agent.run(prompt)
    return result.output


def _build_research_planner_prompt(
    question: TravelQuestion,
    preference_profile: PreferenceProfile | None,
    intent_decision: IntentDecision | None,
) -> str:
    return f"""
用户问题：
{question.to_retrieval_query()}

意图判断：
{intent_decision.model_dump_json() if intent_decision else "未提供意图判断。"}

用户偏好画像：
{_format_preference_profile(preference_profile)}

required_entities 输出要求：
- required_entities 必须列出本次回答需要证据覆盖的目的地实体。
- entity_type: city | attraction | activity | food | accommodation_area | transport_hub | risk
- evidence_use: official_status | route_feasibility | mainstream_attraction | hidden_gem | local_food | hotel_zone | risk_warning
- 不要输出自然语言说明，只在 TravelResearchPlan.required_entities 中填写结构化对象。
""".strip()


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

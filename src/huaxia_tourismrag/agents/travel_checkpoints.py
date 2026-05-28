"""PydanticAI agents for multi-hop travel planning checkpoints."""

from pydantic_ai import Agent

from huaxia_tourismrag.core.config import get_settings
from huaxia_tourismrag.agents.model_runtime import (
    ensure_agent_model_ready,
    is_qwen_cloud_provider,
)
from huaxia_tourismrag.agents.qwen_structured_runner import run_qwen_structured
from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.research import TravelResearchPlan
from huaxia_tourismrag.schemas.travel_checkpoints import (
    ClarificationDecision,
    FeasibilityReport,
    IntentDecision,
    PreferenceProfile,
    RequestMode,
)


INTENT_CHECKPOINT_INSTRUCTIONS = """
Intent Checkpoint：判断用户请求属于普通问答、常规行程、DIY 主题路线，还是实时状态查询。

规则：
- 不回答旅行方案，只输出 IntentDecision。
- request_mode 来自调用方，只能是 general 或 diy。
- general_question: 普通咨询，例如住宿区域、美食、景点介绍。
- conventional_itinerary: 成熟旅行模式，例如山西十日深度游、川西小环线、北京三日游。
- diy_itinerary: 用户自定义主题路线或非常规路线，例如三国历史巡礼、唐诗之路、古蜀道寻访。
- operational_status: 开放、闭馆、维护、交通管制、门票预约等实时状态。
- 如果用户在 general endpoint 明确请求 DIY 主题路线，可设置 should_redirect=true，并推荐 /tourism/itineraries/diy。
- 如果用户在 diy endpoint 问常规旅行，可以设置 should_redirect=true，并推荐 /tourism/questions。
""".strip()


PREFERENCE_CHECKPOINT_INSTRUCTIONS = """
Preference Checkpoint：生成紧凑偏好画像，并判断是否需要向用户追问。

规则：
- 不回答旅行方案，只输出 ClarificationDecision。
- 最多问一个用户问题，问题可以包含 1-2 个关键选择。
- 不要把酒店、美食、交通、景点偏好拆成多轮问卷。
- 只有缺失偏好会显著改变路线架构时才 should_ask=true。
- normal/general 模式尽量少问；DIY 模式更重视 theme_strictness、travel_mode、route order、days。
- 如果用户说“你来决定”“你帮我推荐”“无所谓”“都可以”，should_ask=false，并写入 assumed_defaults。
- 三国/唐诗/丝路等主题 DIY 如果 theme_strictness 不明确，优先询问“主题纯粹型”还是“平衡城市旅行型”。
- 自驾、高铁、包车会显著改变路线时，优先询问 travel_mode。
- food_preference、accommodation_preference 一般用默认值，除非用户请求以美食或住宿为核心。
""".strip()


FEASIBILITY_CHECKPOINT_INSTRUCTIONS = """
Feasibility Checkpoint：检查规划结果是否可执行。

规则：
- 不生成最终答案，只输出 FeasibilityReport。
- 检查路线是否过度绕路、城市过多、天数不足、交通段过长、老人儿童不友好、主题相关性弱、开放/预约证据缺失。
- 通常不要追问用户；将问题作为 issues 和 recommended_adjustments 交给最终答案说明。
- 只有计划被严重阻塞时才 should_ask=true，例如用户要求 3 天覆盖 8 个跨省城市，且无法给出可信压缩版。
- 对 DIY 主题路线，不能删除 required_stops；如果某站弱相关，标记 weak_theme_match。
""".strip()


intent_checkpoint_agent = Agent(
    get_settings().tourism_agent_model,
    output_type=IntentDecision,
    instructions=INTENT_CHECKPOINT_INSTRUCTIONS,
    defer_model_check=True,
)


preference_checkpoint_agent = Agent(
    get_settings().tourism_agent_model,
    output_type=ClarificationDecision,
    instructions=PREFERENCE_CHECKPOINT_INSTRUCTIONS,
    defer_model_check=True,
)


feasibility_checkpoint_agent = Agent(
    get_settings().tourism_agent_model,
    output_type=FeasibilityReport,
    instructions=FEASIBILITY_CHECKPOINT_INSTRUCTIONS,
    defer_model_check=True,
)


async def create_intent_decision(
    question: TravelQuestion,
    request_mode: RequestMode,
) -> IntentDecision:
    """Run the intent checkpoint."""

    prompt = f"""
request_mode: {request_mode}
question:
{question.to_retrieval_query()}
""".strip()
    if is_qwen_cloud_provider():
        settings = get_settings()
        return await run_qwen_structured(
            prompt=prompt,
            output_type=IntentDecision,
            instructions=INTENT_CHECKPOINT_INSTRUCTIONS,
            model_override=settings.checkpoint_model,
        )

    ensure_agent_model_ready()
    result = await intent_checkpoint_agent.run(prompt)
    return result.output


async def create_preference_decision(
    question: TravelQuestion,
    request_mode: RequestMode,
    intent_decision: IntentDecision,
) -> ClarificationDecision:
    """Run the preference checkpoint."""

    prompt = f"""
request_mode: {request_mode}
intent: {intent_decision.intent}
intent_reason: {intent_decision.reason}
question:
{question.to_retrieval_query()}
""".strip()
    if is_qwen_cloud_provider():
        settings = get_settings()
        return await run_qwen_structured(
            prompt=prompt,
            output_type=ClarificationDecision,
            instructions=PREFERENCE_CHECKPOINT_INSTRUCTIONS,
            model_override=settings.checkpoint_model,
        )

    ensure_agent_model_ready()
    result = await preference_checkpoint_agent.run(prompt)
    return result.output


async def create_feasibility_report(
    question: TravelQuestion,
    request_mode: RequestMode,
    research_plan: TravelResearchPlan | None = None,
    diy_plan: DIYItineraryPlan | None = None,
    preference_profile: PreferenceProfile | None = None,
) -> FeasibilityReport:
    """Run the feasibility checkpoint."""

    prompt = f"""
request_mode: {request_mode}
question:
{question.to_retrieval_query()}

preference_profile:
{_format_preference_profile(preference_profile)}

research_plan:
{research_plan.model_dump_json() if research_plan else "未提供"}

diy_plan:
{diy_plan.model_dump_json() if diy_plan else "未提供"}
""".strip()
    if is_qwen_cloud_provider():
        settings = get_settings()
        return await run_qwen_structured(
            prompt=prompt,
            output_type=FeasibilityReport,
            instructions=FEASIBILITY_CHECKPOINT_INSTRUCTIONS,
            model_override=settings.checkpoint_model,
        )

    ensure_agent_model_ready()
    result = await feasibility_checkpoint_agent.run(prompt)
    return result.output


def _format_preference_profile(profile: PreferenceProfile | None) -> str:
    if profile is None:
        return "未提供偏好画像。"

    return profile.model_dump_json()

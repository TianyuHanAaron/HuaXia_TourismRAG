"""Planner agent for user-defined DIY thematic itineraries."""

from pydantic_ai import Agent

from huaxia_tourismrag.core.config import get_settings
from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.travel_checkpoints import (
    IntentDecision,
    PreferenceProfile,
)


DIY_ITINERARY_PLANNER_INSTRUCTIONS = """
你是中文旅游 RAG 的 DIY 行程规划器。

你的任务不是回答用户，而是把用户自定义、非标准、主题化路线转换成结构化 DIYItineraryPlan。

适用场景：
- 用户自定义主题路线，例如“三国历史巡礼”“唐诗之路”“古蜀道寻访”“丝路支线”。
- 用户给出一组不一定常见于旅行社产品的目的地，要求你设计可信、顺路、可执行的行程。

规则：
- 从 question 中提取 theme、origin、return_city、required_stops、travel_mode、days。
- 如果提供用户偏好画像，必须使用其中的 travel_mode、theme_strictness、pace、food_preference 和 accommodation_preference。
- required_stops 是用户给出的必选目的地，不能删除，不能静默替换。
- 如果用户说“从北京出发，北京结束”，必须设置 origin="北京"、return_city="北京"，并把它们放进 proposed_route 的首尾。
- 不要默认锁定用户列出的顺序；默认 route_order_policy="optimize_for_transport"。
- 只有当用户明确说“按这个顺序走”“顺序不要变”时，才设置 route_order_policy="preserve_user_order"。
- proposed_route 必须包含所有 required_stops，可以为了交通顺路性重排目的地。
- 如果重排了用户顺序，reason 或 feasibility_issues 里要说明重排逻辑。
- 如果某站主题相关性弱，保留该站，但在 theme_anchors 或 feasibility_issues 里诚实说明。
- 每个 route_segments 项要描述相邻城市之间需要核验的交通重点。
- tasks 必须覆盖 route、transport、attraction、food、accommodation；如涉及门票、开放时间、预约，增加 booking/risk。
- 交通、开放、预约、临时关闭等任务使用 source_preference="official" 和 freshness_required=true。
- 主题景点任务要包含主题关键词和城市名，例如“许昌 曹魏 三国 遗址 博物馆 官方”。
- 美食和本地体验任务使用 source_preference="local_experience"。
- 不要回答旅行方案，只输出 DIYItineraryPlan。
""".strip()


diy_itinerary_planner_agent = Agent(
    get_settings().tourism_agent_model,
    output_type=DIYItineraryPlan,
    instructions=DIY_ITINERARY_PLANNER_INSTRUCTIONS,
    defer_model_check=True,
)


async def create_diy_itinerary_plan(
    question: TravelQuestion,
    preference_profile: PreferenceProfile | None = None,
    intent_decision: IntentDecision | None = None,
) -> DIYItineraryPlan:
    """Create a structured DIY itinerary plan from a validated question."""

    result = await diy_itinerary_planner_agent.run(
        _build_diy_planner_prompt(
            question=question,
            preference_profile=preference_profile,
            intent_decision=intent_decision,
        )
    )
    return result.output


def _build_diy_planner_prompt(
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

import pytest

from huaxia_tourismrag.agents.diy_itinerary_planner import (
    DIY_ITINERARY_PLANNER_INSTRUCTIONS,
    diy_itinerary_planner_agent,
)
from huaxia_tourismrag.schemas.diy_itinerary import (
    DIYItineraryPlan,
    DIYRouteSegment,
    DIYRouteStop,
)
from huaxia_tourismrag.schemas.research import TravelResearchTask
from huaxia_tourismrag.schemas.travel_checkpoints import PreferenceProfile


def test_diy_itinerary_plan_allows_transport_optimized_order():
    plan = DIYItineraryPlan(
        original_question="从北京出发，北京结束，三国历史巡礼：涿州-安阳-许昌-南阳-咸宁-南京-成都-汉中。",
        theme="三国历史巡礼",
        origin="北京",
        return_city="北京",
        required_stops=[
            "涿州",
            "安阳",
            "许昌",
            "南阳",
            "咸宁",
            "南京",
            "成都",
            "汉中",
        ],
        proposed_route=[
            "北京",
            "涿州",
            "安阳",
            "许昌",
            "南阳",
            "咸宁",
            "南京",
            "成都",
            "汉中",
            "北京",
        ],
        route_order_policy="optimize_for_transport",
        travel_mode="mixed",
        days=12,
        stops=[
            DIYRouteStop(
                city="许昌",
                theme_relevance="曹魏政治中心相关。",
            )
        ],
        route_segments=[
            DIYRouteSegment(
                origin="北京",
                destination="涿州",
                transport_focus="高铁或自驾衔接。",
            )
        ],
        tasks=[
            TravelResearchTask(
                task_type="attraction",
                evidence_use="mainstream_attraction",
                query="许昌 曹魏 三国 遗址 博物馆 官方",
                reason="核验许昌三国主题景点。",
            ),
            TravelResearchTask(
                task_type="transport",
                evidence_use="route_feasibility",
                query="北京 到 涿州 交通 高铁 自驾",
                reason="核验第一段交通。",
            ),
            TravelResearchTask(
                task_type="food",
                evidence_use="local_food",
                query="许昌 本地美食 老字号 三国 旅行",
                reason="补充当地餐饮。",
            ),
        ],
    )

    assert plan.required_stops[0] == "涿州"
    assert plan.proposed_route[0] == "北京"
    assert plan.proposed_route[-1] == "北京"
    assert plan.route_order_policy == "optimize_for_transport"


def test_diy_itinerary_plan_rejects_missing_required_stop():
    with pytest.raises(ValueError, match="required_stops"):
        DIYItineraryPlan(
            original_question="三国历史巡礼：涿州-许昌-成都。",
            theme="三国历史巡礼",
            required_stops=["涿州", "许昌", "成都"],
            proposed_route=["涿州", "许昌"],
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    query="三国历史巡礼 涿州 许昌 成都 路线",
                    reason="规划路线。",
                ),
                TravelResearchTask(
                    task_type="transport",
                    query="涿州 到 许昌 交通",
                    reason="核验交通。",
                ),
                TravelResearchTask(
                    task_type="attraction",
                    query="成都 三国 武侯祠 官方",
                    reason="核验景点。",
                ),
            ],
        )


def test_diy_itinerary_planner_instruction_targets_user_defined_routes():
    assert "用户自定义" in DIY_ITINERARY_PLANNER_INSTRUCTIONS
    assert "required_stops" in DIY_ITINERARY_PLANNER_INSTRUCTIONS
    assert "不要默认锁定用户列出的顺序" in DIY_ITINERARY_PLANNER_INSTRUCTIONS
    assert "origin" in DIY_ITINERARY_PLANNER_INSTRUCTIONS
    assert "return_city" in DIY_ITINERARY_PLANNER_INSTRUCTIONS
    assert "不能删除" in DIY_ITINERARY_PLANNER_INSTRUCTIONS
    assert "用户偏好画像" in DIY_ITINERARY_PLANNER_INSTRUCTIONS


def test_diy_itinerary_planner_formats_preference_profile():
    from huaxia_tourismrag.agents.diy_itinerary_planner import _format_preference_profile

    text = _format_preference_profile(
        PreferenceProfile(
            travel_mode="mixed",
            theme_strictness="theme_pure",
            assumed_defaults=["默认保留全部必选城市。"],
        )
    )

    assert "travel_mode: mixed" in text
    assert "theme_strictness: theme_pure" in text
    assert "默认保留全部必选城市" in text


def test_diy_itinerary_planner_agent_is_defined():
    assert diy_itinerary_planner_agent is not None

import pytest

from huaxia_tourismrag.core.config import Settings
from huaxia_tourismrag.agents.research_planner import (
    RESEARCH_PLANNER_INSTRUCTIONS,
    _build_research_planner_prompt,
    create_research_plan,
    planner_agent,
)
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.research import (
    ResearchEntity,
    TravelResearchPlan,
    TravelResearchTask,
)
from huaxia_tourismrag.schemas.travel_checkpoints import PreferenceProfile


def test_research_plan_accepts_structured_destination_entities() -> None:
    plan = TravelResearchPlan(
        original_question="广州出发广西五日游",
        destination="广西",
        origin="广州",
        trip_days=5,
        required_entities=[
            ResearchEntity(
                name="桂林",
                entity_type="city",
                evidence_use="mainstream_attraction",
            ),
            ResearchEntity(
                name="漓江",
                entity_type="attraction",
                evidence_use="mainstream_attraction",
            ),
            ResearchEntity(
                name="遇龙河骑行",
                entity_type="activity",
                evidence_use="mainstream_attraction",
            ),
            ResearchEntity(
                name="涠洲岛",
                entity_type="attraction",
                evidence_use="mainstream_attraction",
            ),
            ResearchEntity(
                name="海鲜",
                entity_type="food",
                evidence_use="local_food",
            ),
        ],
        tasks=[
            TravelResearchTask(
                task_type="route",
                query="广州 广西 桂林 阳朔 北海 路线",
                reason="route",
            ),
            TravelResearchTask(
                task_type="attraction",
                query="桂林 漓江 阳朔 涠洲岛 景点",
                reason="attraction",
            ),
            TravelResearchTask(
                task_type="food",
                query="北海 涠洲岛 海鲜 本地美食",
                reason="food",
            ),
        ],
    )

    assert [entity.name for entity in plan.required_entities] == [
        "桂林",
        "漓江",
        "遇龙河骑行",
        "涠洲岛",
        "海鲜",
    ]


def test_research_plan_requires_multiple_structured_tasks():
    plan = TravelResearchPlan(
        original_question="四川云南十日游怎么安排？",
        destination="四川、云南",
        trip_days=10,
        interests=["自然风景", "民族文化", "本地美食"],
        tasks=[
            TravelResearchTask(
                task_type="route",
                evidence_use="route_feasibility",
                query="四川云南十日游 成都 昆明 大理 丽江 路线 不赶路",
                reason="需要先确定顺路路线。",
            ),
            TravelResearchTask(
                task_type="food",
                evidence_use="local_food",
                query="成都 云南 十日游 代表美食 火锅 米线 菌菇 本地推荐",
                reason="用户要求覆盖本地美食。",
                source_preference="local_experience",
            ),
            TravelResearchTask(
                task_type="accommodation",
                evidence_use="hotel_zone",
                query="成都 大理 丽江 住宿区域 推荐 第一次去",
                reason="用户要求住宿区域建议。",
            ),
        ],
    )

    assert plan.tasks[0].task_type == "route"
    assert plan.tasks[1].max_results == 5
    assert plan.tasks[1].source_preference == "local_experience"


def test_research_task_builds_freshness_aware_search_options():
    task = TravelResearchTask(
        task_type="booking",
        evidence_use="official_status",
        query="云冈石窟 官方 开放时间 预约 临时闭馆 维护 公告 2026",
        reason="核验景区实时预约和开放状态。",
        freshness_required=True,
        recency_days=90,
        source_preference="official",
    )

    options = task.to_search_options()

    assert options.freshness_required is True
    assert options.recency_days == 90
    assert options.source_preference == "official"
    assert options.topic == "general"


def test_research_planner_instruction_requires_core_travel_tasks():
    assert "route" in RESEARCH_PLANNER_INSTRUCTIONS
    assert "attraction" in RESEARCH_PLANNER_INSTRUCTIONS
    assert "food" in RESEARCH_PLANNER_INSTRUCTIONS
    assert "accommodation" in RESEARCH_PLANNER_INSTRUCTIONS
    assert "transport" in RESEARCH_PLANNER_INSTRUCTIONS
    assert "中国国内游客" in RESEARCH_PLANNER_INSTRUCTIONS
    assert "不要默认生成签证" in RESEARCH_PLANNER_INSTRUCTIONS
    assert "freshness_required" in RESEARCH_PLANNER_INSTRUCTIONS
    assert "official_status" in RESEARCH_PLANNER_INSTRUCTIONS
    assert "local_food" in RESEARCH_PLANNER_INSTRUCTIONS
    assert "不要回答旅行方案" in RESEARCH_PLANNER_INSTRUCTIONS
    assert "用户偏好画像" in RESEARCH_PLANNER_INSTRUCTIONS


def test_research_planner_prompt_requires_destination_entities() -> None:
    prompt = _build_research_planner_prompt(
        TravelQuestion(question="贵州六日游，黄果树、小七孔、西江苗寨"),
        preference_profile=None,
        intent_decision=None,
    )

    assert "required_entities" in prompt
    assert "entity_type" in prompt
    assert "evidence_use" in prompt


def test_research_planner_formats_preference_profile():
    profile = PreferenceProfile(
        travel_mode="train",
        pace="relaxed",
        food_preference="local",
        assumed_defaults=["默认本地美食优先。"],
    )

    from huaxia_tourismrag.agents.research_planner import _format_preference_profile

    text = _format_preference_profile(profile)

    assert "travel_mode: train" in text
    assert "pace: relaxed" in text
    assert "默认本地美食优先" in text


def test_research_planner_agent_is_defined():
    assert planner_agent is not None


@pytest.mark.asyncio
async def test_research_planner_uses_qwen_cloud_runner(monkeypatch):
    calls = []

    async def fake_run_qwen_structured(
        prompt,
        output_type,
        instructions,
        model_override=None,
    ):
        calls.append((prompt, output_type, instructions, model_override))
        return TravelResearchPlan(
            original_question="成都重庆美食路线怎么安排？",
            destination="成都、重庆",
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    query="成都 重庆 美食 路线",
                    reason="规划路线。",
                ),
                TravelResearchTask(
                    task_type="food",
                    query="成都 重庆 本地美食",
                    reason="查美食。",
                ),
                TravelResearchTask(
                    task_type="transport",
                    query="成都 重庆 高铁",
                    reason="查交通。",
                ),
            ],
        )

    monkeypatch.setattr(
        "huaxia_tourismrag.agents.research_planner.is_qwen_cloud_provider",
        lambda: True,
    )
    monkeypatch.setattr(
        "huaxia_tourismrag.agents.research_planner.get_settings",
        lambda: Settings(
            _env_file=None,
            TOURISM_AGENT_MODEL="qwen3.7-max",
            PLANNER_MODEL="qwen3.6-plus",
        ),
    )
    monkeypatch.setattr(
        "huaxia_tourismrag.agents.research_planner.run_qwen_structured",
        fake_run_qwen_structured,
    )

    plan = await create_research_plan(TravelQuestion(question="成都重庆美食路线怎么安排？"))

    assert plan.destination == "成都、重庆"
    assert calls[0][1] is TravelResearchPlan
    assert calls[0][2] == RESEARCH_PLANNER_INSTRUCTIONS
    assert calls[0][3] == "qwen3.6-plus"

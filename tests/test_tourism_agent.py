from huaxia_tourismrag.agents.tourism_agent import (
    TOURISM_AGENT_INSTRUCTIONS,
    TourismDeps,
    build_final_answer_prompt,
    tourism_agent,
)
from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import TravelAnswer
from huaxia_tourismrag.schemas.research import TravelResearchPlan, TravelResearchTask
from huaxia_tourismrag.schemas.travel_checkpoints import (
    FeasibilityIssue,
    FeasibilityReport,
    PreferenceProfile,
)


def test_tourism_agent_uses_chinese_evidence_rules():
    assert "中国国内游客" in TOURISM_AGENT_INSTRUCTIONS
    assert "不要默认假设用户是外国游客" in TOURISM_AGENT_INSTRUCTIONS
    assert "签证、护照、入境政策" in TOURISM_AGENT_INSTRUCTIONS
    assert "夏夏" in TOURISM_AGENT_INSTRUCTIONS
    assert "华夏旅行社的专属 AI" in TOURISM_AGENT_INSTRUCTIONS
    assert "官方来源" in TOURISM_AGENT_INSTRUCTIONS
    assert "旅行博客" in TOURISM_AGENT_INSTRUCTIONS


def test_tourism_deps_exposes_required_tools():
    fields = TourismDeps.__dataclass_fields__

    assert "tenant_id" in fields
    assert "internal_rag" in fields
    assert "web_search" in fields
    assert "webpage_reader" in fields
    assert "reranker" in fields
    assert "citations" in fields


def test_build_final_answer_prompt_includes_question_context_and_citations():
    research_plan = TravelResearchPlan(
        original_question="北京三天怎么玩？",
        destination="北京",
        trip_days=3,
        tasks=[
            TravelResearchTask(
                task_type="route",
                query="北京 三天 路线 第一次去",
                reason="规划整体路线。",
            ),
            TravelResearchTask(
                task_type="food",
                query="北京 三天 本地美食 餐厅 推荐",
                reason="覆盖本地美食。",
            ),
            TravelResearchTask(
                task_type="accommodation",
                query="北京 三天 住宿区域 推荐",
                reason="覆盖住宿区域。",
            ),
        ],
    )
    prompt = build_final_answer_prompt(
        question="北京三天怎么玩？",
        citation_context="[1] text=故宫建议提前预约。",
        citation_lines=["[1] 北京故宫 - official - https://example.com"],
        research_plan=research_plan,
        detail_level="concise",
    )

    assert "北京三天怎么玩？" in prompt
    assert "研究计划" in prompt
    assert "北京 三天 本地美食 餐厅 推荐" in prompt
    assert "[1] text=故宫建议提前预约。" in prompt
    assert "[1] 北京故宫" in prompt
    assert "只能使用上面的证据" in prompt
    assert "知名餐厅" in prompt
    assert "住宿区域" in prompt
    assert "以“夏夏”的身份" in prompt
    assert "一句简短、有温度的回应" in prompt
    assert "默认按中国国内游客" in prompt
    assert "不要主动写签证、护照、入境政策" in prompt
    assert "不要在每个活动里反复说" in prompt
    assert "统一放入最后的待确认事项" in prompt
    assert "没有检索到官方或近期来源" in prompt
    assert "只在最后的待确认事项集中说明一次" in prompt
    assert "detail_level: concise" in prompt
    assert "每一天最多一行核心安排" in prompt


def test_build_final_answer_prompt_includes_deep_detail_rules():
    prompt = build_final_answer_prompt(
        question="三国历史巡礼怎么安排？",
        citation_context="[1] text=三国主题资料。",
        citation_lines=["[1] 三国主题 - internal - internal"],
        detail_level="deep",
    )

    assert "detail_level: deep" in prompt
    assert "深度旅行社方案" in prompt
    assert "历史背景" in prompt


def test_build_final_answer_prompt_includes_diy_plan_rules():
    diy_plan = DIYItineraryPlan(
        original_question="从北京出发，北京结束，三国历史巡礼：涿州-许昌-成都。",
        theme="三国历史巡礼",
        origin="北京",
        return_city="北京",
        required_stops=["涿州", "许昌", "成都"],
        proposed_route=["北京", "涿州", "许昌", "成都", "北京"],
        route_order_policy="optimize_for_transport",
        travel_mode="mixed",
        tasks=[
            TravelResearchTask(
                task_type="route",
                query="三国历史巡礼 涿州 许昌 成都 路线",
                reason="规划路线。",
            ),
            TravelResearchTask(
                task_type="transport",
                query="北京 涿州 许昌 成都 交通",
                reason="核验交通。",
            ),
            TravelResearchTask(
                task_type="attraction",
                query="成都 三国 武侯祠 官方",
                reason="核验景点。",
            ),
        ],
    )

    prompt = build_final_answer_prompt(
        question="从北京出发，北京结束，三国历史巡礼：涿州-许昌-成都。",
        citation_context="[1] text=三国主题资料。",
        citation_lines=["[1] 三国主题 - internal - internal"],
        diy_plan=diy_plan,
    )

    assert "DIY 行程计划" in prompt
    assert "三国历史巡礼" in prompt
    assert "required_stops" in prompt
    assert "proposed_route" in prompt
    assert "不要把用户自定义主题路线改写成普通旅游线路" in prompt
    assert "可以重排顺序" in prompt
    assert "每个必选目的地" in prompt


def test_build_final_answer_prompt_includes_preference_and_feasibility_context():
    prompt = build_final_answer_prompt(
        question="三国历史巡礼怎么安排？",
        citation_context="[1] text=三国主题资料。",
        citation_lines=["[1] 三国主题 - internal - internal"],
        preference_profile=PreferenceProfile(
            travel_mode="mixed",
            attraction_mix="balanced",
            food_preference="local",
            theme_strictness="balanced_city",
            assumed_defaults=["默认平衡主题和城市体验。"],
        ),
        feasibility_report=FeasibilityReport(
            is_feasible=True,
            should_ask=False,
            question=None,
            issues=[
                FeasibilityIssue(
                    issue_type="weak_theme_match",
                    description="南京与三国主题需要用东吴建业线索解释。",
                    stop="南京",
                )
            ],
            recommended_adjustments=["每站标注主题强弱。"],
        ),
    )

    assert "用户偏好画像" in prompt
    assert "travel_mode: mixed" in prompt
    assert "theme_strictness: balanced_city" in prompt
    assert "可行性检查" in prompt
    assert "weak_theme_match" in prompt
    assert "每站标注主题强弱" in prompt


def test_tourism_agent_is_defined():
    assert tourism_agent is not None


def test_travel_answer_accepts_partial_generated_itinerary_activities():
    answer = TravelAnswer.model_validate(
        {
            "answer": "北京三天两晚可以先安排故宫，再安排长城。",
            "highlights": ["故宫", "八达岭长城"],
            "warnings": [],
            "citations": ["[1] 故宫博物院"],
            "session_id": "session-123",
            "needs_reply": True,
            "generated_itinerary": {
                "destination": "北京",
                "itinerary": [
                    {
                        "day": 1,
                        "city": "北京",
                        "activities": [
                            {
                                "name": "故宫主线",
                                "description": "从午门进入，沿中轴线游览。",
                            }
                        ],
                    }
                ],
            },
        }
    )

    assert answer.generated_itinerary is not None
    assert answer.session_id == "session-123"
    assert answer.needs_reply is True
    activity = answer.generated_itinerary.itinerary[0].activities[0]
    assert activity.name == "故宫主线"
    assert activity.category is None
    assert activity.location is None

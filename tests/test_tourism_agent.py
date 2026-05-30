import pytest

from huaxia_tourismrag.core.config import Settings
from huaxia_tourismrag.agents.tourism_agent import (
    TOURISM_AGENT_INSTRUCTIONS,
    TourismDeps,
    build_final_answer_prompt,
    generate_answer_with_context,
    tourism_agent,
)
from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import TravelAnswer
from huaxia_tourismrag.schemas.research import TravelResearchPlan, TravelResearchTask
from huaxia_tourismrag.schemas.service_enrichment import (
    BookingAction,
    BookingProduct,
    FreshWebEvidence,
    RouteFeasibilityReport,
    RouteLegCheck,
    ServiceEnrichmentContext,
    WeatherImpact,
)
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
    assert "本次请求是行程规划，generated_itinerary 必须存在" in prompt
    assert "generated_itinerary.itinerary 至少包含 3 天" in prompt


def test_build_final_answer_prompt_includes_strict_citation_contract():
    prompt = build_final_answer_prompt(
        question="成都重庆美食路线怎么安排？",
        citation_context="[1] citation_id=1\nquote=成都火锅。",
        citation_lines=["[1] 成都美食 - 成都文旅 - https://example.cn/food"],
    )

    assert "只能引用“允许使用的引用”里出现的编号" in prompt
    assert "citations 字段必须逐字复制" in prompt
    assert "不要输出未在允许列表中的引用编号" in prompt
    assert "不要把政策、铁路、旅游法、安检来源用于支撑景点或美食推荐" in prompt


def test_final_answer_prompt_requires_dedicated_trip_topic_sections():
    prompt = build_final_answer_prompt(
        question="成都、南阳、汉中三国路线怎么安排？",
        citation_context="[1] citation_id=1\nquote=成都蜀绣和川剧体验。",
        citation_lines=["[1] 成都体验 - tavily - https://example.cn/chengdu"],
        detail_level="deep",
    )

    assert "topic_sections" in prompt
    assert "美食" in prompt
    assert "住宿" in prompt
    assert "公交" in prompt
    assert "购物" in prompt
    assert "娱乐项目" in prompt
    assert "每条推荐都必须使用 [n] 引用" in prompt
    assert "专题证据包" in prompt
    assert "只能使用“专题证据包”和“允许使用的引用”" in prompt
    assert "不要根据常识扩写未给来源的餐厅、酒店、票价、开放时间、演出排期或购物店名" in prompt
    assert "美食专题应写菜品/小吃、适合安排的餐次、用餐区域、辣度/老人儿童/预算适配" in prompt
    assert "住宿专题应写住宿片区、酒店/民宿类型、房型/电梯/早餐/行李/老幼适配" in prompt
    assert "公交专题应写城市内地铁/公交/打车/包车接驳" in prompt


def test_final_answer_prompt_prevents_single_block_deep_itinerary_days():
    prompt = build_final_answer_prompt(
        question="甘肃石窟14天深度游怎么安排？",
        citation_context="[1] citation_id=1\nquote=麦积山石窟预约讲解。",
        citation_lines=["[1] 麦积山石窟 - 官方 - https://example.cn/maiji"],
        detail_level="deep",
    )

    assert "不要把一天压缩成单个全天 activity" in prompt
    assert "非纯休息日每天至少 3 个 activity" in prompt
    assert "转场日也要拆成出发交通、午餐或中途休息、抵达入住/晚餐" in prompt
    assert "不要因为航班或火车精确时刻未知就省略所有 start_time" in prompt
    assert "宁可压缩每条 description，也不要减少 activity 数量" in prompt
    assert "优先保证 generated_itinerary 的多时间节点" in prompt
    assert "topic_sections 可以简洁" in prompt


def test_final_answer_prompt_can_defer_topic_sections():
    prompt = build_final_answer_prompt(
        question="山西深度游怎么安排？",
        citation_context="[1] citation_id=1\nquote=云冈石窟。",
        citation_lines=["[1] 云冈石窟 - 内部资料 - internal:chunk-1"],
        detail_level="deep",
        topic_section_mode="async_for_deep",
    )

    assert "topic_section_mode=async_for_deep" in prompt
    assert "topic_sections 必须返回空列表" in prompt


def test_final_answer_prompt_requires_source_fit_for_destination_claims():
    prompt = build_final_answer_prompt(
        question="贵州六日游",
        citation_context="",
        citation_lines=[],
        detail_level="standard",
    )

    assert (
        "景点、美食、住宿、体验类结论必须优先引用 destination、attraction、"
        "heritage_site、local_cuisine、local_specialty、activity 或 travel_guide 证据"
    ) in prompt
    assert (
        "不要用 railway、legal、regulation、contract 类证据支撑景点好不好玩或食物是否值得吃"
        in prompt
    )


def test_build_final_answer_prompt_includes_deep_detail_rules():
    prompt = build_final_answer_prompt(
        question="三国历史巡礼怎么安排？",
        citation_context="[1] text=三国主题资料。",
        citation_lines=["[1] 三国主题 - internal - internal"],
        detail_level="deep",
    )

    assert "detail_level: deep" in prompt
    assert "深度旅行社方案" in prompt


def test_final_answer_prompt_requires_timed_itinerary_choices():
    prompt = build_final_answer_prompt(
        question="上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。",
        citation_context="证据",
        citation_lines=["[1] 山西景区 - 测试来源 - internal:shanxi"],
        detail_level="deep",
        research_plan=TravelResearchPlan(
            original_question="上海出发，山西历史人文十日深度游",
            destination="山西",
            trip_days=10,
            required_entities=[],
            tasks=[
                TravelResearchTask(
                    task_type="route",
                    query="山西十日人文路线",
                    reason="规划路线。",
                ),
                TravelResearchTask(
                    task_type="food",
                    query="山西本地美食",
                    reason="规划餐饮。",
                ),
                TravelResearchTask(
                    task_type="accommodation",
                    query="山西豪华住宿",
                    reason="规划住宿。",
                ),
            ],
        ),
        topic_section_mode="inline",
    )

    assert "start_time / end_time" in prompt
    assert "08:30 到达景区" in prompt
    assert "12:00 午餐" in prompt
    assert "alternatives" in prompt
    assert "同一时段提供 1-3 个可选择方案" in prompt
    assert "每一天的午餐和晚餐" in prompt
    assert "尽量不要每天重复同一种小吃" in prompt
    assert "夜市、美食街、老店" in prompt
    assert "历史背景" in prompt
    assert "像真实旅行社行程单一样可执行" in prompt
    assert "不要只写景点名称" in prompt


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
    assert "本次请求是行程规划，generated_itinerary 必须存在" in prompt
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


def test_build_final_answer_prompt_includes_service_enrichment_context():
    service_enrichment = ServiceEnrichmentContext(
        route_feasibility=RouteFeasibilityReport(
            provider="baidu_maps",
            route_summary="百度地图 MCP 检查显示路线整体可执行。",
            legs=[
                RouteLegCheck(
                    origin="北京",
                    destination="涿州",
                    recommended_mode="driving",
                    estimated_duration_minutes=70,
                    feasibility_level="reasonable",
                )
            ],
        ),
        weather_impacts=[
            WeatherImpact(
                provider="baidu_maps",
                city="成都",
                condition="小雨",
                impact_level="medium",
                recommendation="建议调整户外时段。",
            )
        ],
        booking_products=[
            BookingProduct(
                provider="tuniu",
                product_type="hotel",
                title="成都武侯祠周边酒店",
                city="成都",
                price_cny=680,
                availability_status="available",
                booking_url="https://example.com/hotel",
            )
        ],
        booking_actions=[
            BookingAction(
                provider="tuniu",
                action_type="open_booking_link",
                label="查看酒店实时价格",
                url="https://example.com/hotel",
                safety_note="以途牛实时页面为准。",
            )
        ],
        fresh_web_evidence=[
            FreshWebEvidence(
                provider="firecrawl",
                query="成都武侯祠 官方 开放 最新",
                title="成都武侯祠官方参观信息",
                url="https://www.example.com/wuhou",
                summary="提供开放、预约和参观提示。",
                source_authority="official",
                recency_label="recent",
            )
        ],
    )

    prompt = build_final_answer_prompt(
        question="北京出发三国历史巡礼。",
        citation_context="[1] text=三国主题资料。",
        citation_lines=["[1] 三国主题 - internal - internal"],
        service_enrichment=service_enrichment,
    )

    assert "服务能力校验" in prompt
    assert "百度地图路线校验" in prompt
    assert "北京 -> 涿州" in prompt
    assert "70分钟" in prompt
    assert "成都 小雨" in prompt
    assert "途牛产品" in prompt
    assert "成都武侯祠周边酒店" in prompt
    assert "可操作入口" in prompt
    assert "查看酒店实时价格" in prompt
    assert "Firecrawl新鲜网页证据" in prompt
    assert "成都武侯祠官方参观信息" in prompt
    assert "地图 MCP 结果只用于路线顺路性" in prompt
    assert "途牛 MCP 结果只用于酒店、门票、交通、产品和预订链接" in prompt
    assert "Firecrawl MCP 结果只用于当前网页证据" in prompt
    assert "不要声称已经完成预订或付款" in prompt


def test_service_enrichment_context_marks_unknown_map_leg_as_unverified():
    service_enrichment = ServiceEnrichmentContext(
        route_feasibility=RouteFeasibilityReport(
            provider="baidu_maps",
            route_summary="地图 MCP 未返回可用时长。",
            legs=[
                RouteLegCheck(
                    origin="上海",
                    destination="山西",
                    recommended_mode="driving",
                    feasibility_level="unknown",
                )
            ],
        )
    )

    prompt = build_final_answer_prompt(
        question="上海出发山西历史人文十日游。",
        citation_context="[1] text=山西景区资料。",
        citation_lines=["[1] 山西景区 - internal - internal:1"],
        service_enrichment=service_enrichment,
    )

    assert "上海 -> 山西" in prompt
    assert "未返回可用车程/距离" in prompt
    assert "不能作为路线可行性的正向依据" in prompt
    assert "地图 MCP 返回 unknown 或缺少时长/距离" in prompt


def test_tourism_agent_is_defined():
    assert tourism_agent is not None


@pytest.mark.asyncio
async def test_generate_answer_with_context_uses_qwen_cloud_runner(monkeypatch):
    calls = []

    async def fake_run_qwen_structured(
        prompt,
        output_type,
        instructions,
        model_override=None,
    ):
        calls.append((prompt, output_type, instructions, model_override))
        return TravelAnswer(
            answer="夏夏建议先走成都再去重庆。",
            highlights=["成渝美食线"],
            warnings=[],
            citations=[],
        )

    monkeypatch.setattr(
        "huaxia_tourismrag.agents.tourism_agent.is_qwen_cloud_provider",
        lambda: True,
    )
    monkeypatch.setattr(
        "huaxia_tourismrag.agents.tourism_agent.get_settings",
        lambda: Settings(
            _env_file=None,
            TOURISM_AGENT_MODEL="qwen3.7-max",
            FINAL_ANSWER_MODEL="qwen3.7-max",
        ),
    )
    monkeypatch.setattr(
        "huaxia_tourismrag.agents.tourism_agent.run_qwen_structured",
        fake_run_qwen_structured,
    )

    answer = await generate_answer_with_context(
        question="成都重庆美食路线怎么安排？",
        citation_context="[1] quote=成都火锅。",
        citation_lines=["[1] 成都文旅 - https://example.cn"],
        deps=None,
    )

    assert answer.answer == "夏夏建议先走成都再去重庆。"
    assert calls[0][1] is TravelAnswer
    assert calls[0][2] == TOURISM_AGENT_INSTRUCTIONS
    assert calls[0][3] == "qwen3.7-max"


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


def test_activity_item_accepts_time_slots_and_alternatives():
    answer = TravelAnswer.model_validate(
        {
            "answer": "夏夏整理好了。[1]",
            "highlights": [],
            "warnings": [],
            "citations": ["[1] 成都美食 - 测试来源 - internal:food"],
            "generated_itinerary": {
                "destination": "成都",
                "itinerary": [
                    {
                        "day": 1,
                        "city": "成都",
                        "activities": [
                            {
                                "start_time": "08:30",
                                "end_time": "10:30",
                                "name": "武侯祠深度讲解",
                                "category": "cultural_attraction",
                                "description": "08:30 到达武侯祠，安排讲解员讲三国人物线索。[1]",
                                "citations": [1],
                                "alternatives": [
                                    {
                                        "title": "轻松版",
                                        "description": "如果同行人想少走路，可缩短讲解时间并增加茶馆休息。[1]",
                                        "category": "special_event",
                                        "citations": [1],
                                    }
                                ],
                            }
                        ],
                    }
                ],
            },
        }
    )

    assert answer.generated_itinerary is not None
    activity = answer.generated_itinerary.itinerary[0].activities[0]
    assert activity.start_time.strftime("%H:%M") == "08:30"
    assert activity.end_time.strftime("%H:%M") == "10:30"
    assert activity.citations == [1]
    assert activity.alternatives[0].title == "轻松版"

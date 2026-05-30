import pytest

from huaxia_tourismrag.core.config import Settings
from huaxia_tourismrag.agents.travel_checkpoints import (
    FEASIBILITY_CHECKPOINT_INSTRUCTIONS,
    INTENT_CHECKPOINT_INSTRUCTIONS,
    PREFERENCE_CHECKPOINT_INSTRUCTIONS,
    create_intent_decision,
    feasibility_checkpoint_agent,
    intent_checkpoint_agent,
    preference_checkpoint_agent,
)
from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelFormRequest, TravelQuestion
from huaxia_tourismrag.schemas.travel_checkpoints import (
    CheckpointResponseOption,
    ClarificationDecision,
    FeasibilityIssue,
    FeasibilityReport,
    IntentDecision,
    PreferenceProfile,
)
from huaxia_tourismrag.services.travel_checkpoints import (
    build_checkpoint_context,
    build_clarification_answer,
    build_detail_level_answer,
    build_feasibility_answer,
    build_intent_redirect_answer,
    clear_unbacked_reply_state,
    evaluate_checkpoint_policy,
    should_ask_detail_level,
)


def test_preference_profile_defaults_to_unknown_values():
    profile = PreferenceProfile()

    assert profile.travel_mode == "unknown"
    assert profile.pace == "unknown"
    assert profile.theme_strictness == "unknown"
    assert profile.missing_critical_preferences == []


def test_build_clarification_answer_uses_travel_answer_shape():
    decision = ClarificationDecision(
        should_ask=True,
        question="您希望只看三国强相关，还是平衡城市经典景点和美食？",
        reason="主题严格程度会改变检索和路线。",
        profile=PreferenceProfile(theme_strictness="unknown"),
        assumed_defaults=["如果不指定，默认平衡路线。"],
    )

    answer = build_clarification_answer(decision)

    assert answer.generated_itinerary is None
    assert "夏夏" in answer.answer
    assert "三国强相关" in answer.answer
    assert answer.citations == []
    assert answer.needs_reply is True
    assert [option.label for option in answer.quick_replies] == [
        "选择 A",
        "选择 B",
        "默认偏好",
    ]
    assert [option.action_id for option in answer.quick_replies] == [
        "preference_option_a",
        "preference_option_b",
        "default_preferences",
    ]


def test_build_clarification_answer_hides_internal_enum_defaults():
    decision = ClarificationDecision(
        should_ask=True,
        question="您希望高铁为主，还是必要时包车？",
        reason="交通方式会影响路线。",
        profile=PreferenceProfile(
            travel_mode="mixed",
            pace="relaxed",
            attraction_mix="cultural",
            food_preference="local",
            accommodation_preference="luxury",
            theme_strictness="balanced_city",
        ),
        assumed_defaults=[
            "pace: relaxed (due to elderly and children)",
            "theme_strictness: balanced_city",
        ],
    )

    answer = build_clarification_answer(decision)

    assert "pace:" not in answer.answer
    assert "balanced_city" not in answer.answer
    assert "relaxed" not in answer.answer
    assert "节奏偏轻松" in answer.answer
    assert "住宿按豪华级别" in answer.answer


def test_build_feasibility_answer_uses_travel_answer_shape():
    report = FeasibilityReport(
        is_feasible=False,
        should_ask=True,
        question="10 天保留全部城市会偏赶，是否允许调整到 12 天？",
        issues=[
            FeasibilityIssue(
                issue_type="travel_time",
                description="跨省城市过多。",
            )
        ],
        recommended_adjustments=["给出 12 天舒适版和 10 天压缩版。"],
        response_options=[
            CheckpointResponseOption(
                label="方案 A",
                message="拆成中原线和巴蜀线两次旅行。",
            ),
            CheckpointResponseOption(
                label="方案 B",
                message="延长到 15 天以上并保留全部城市。",
            ),
            CheckpointResponseOption(
                label="方案 C",
                message="保留原需求，生成风险提示和压缩版。",
            ),
        ],
    )

    answer = build_feasibility_answer(report)

    assert answer.generated_itinerary is None
    assert "10 天" in answer.answer
    assert any("跨省城市过多" in warning for warning in answer.warnings)
    assert answer.needs_reply is True
    assert "我建议" not in answer.answer
    assert "选择权" in answer.answer
    assert "手动告诉我" in answer.answer
    assert [option.label for option in answer.quick_replies] == [
        "方案 A",
        "方案 B",
        "方案 C",
    ]
    assert [option.message for option in answer.quick_replies] == [
        "拆成中原线和巴蜀线两次旅行。",
        "延长到 15 天以上并保留全部城市。",
        "保留原需求，生成风险提示和压缩版。",
    ]
    assert [option.action_id for option in answer.quick_replies] == [None, None, None]


def test_clear_unbacked_reply_state_removes_stale_completed_session():
    answer = build_feasibility_answer(
        FeasibilityReport(
            is_feasible=True,
            should_ask=False,
            question="可以继续。",
        )
    )
    answer.needs_reply = False
    answer.session_id = "stale-session"

    normalized = clear_unbacked_reply_state(answer)

    assert normalized.needs_reply is False
    assert normalized.session_id is None
    assert normalized.quick_replies == []


def test_clear_unbacked_reply_state_removes_model_created_session_on_itinerary():
    answer = TravelAnswer(
        answer="已生成完整行程。",
        highlights=[],
        warnings=[],
        citations=[],
        generated_itinerary={
            "destination": "河南",
            "itinerary": [
                {
                    "day": 1,
                    "city": "郑州",
                    "activities": [
                        {
                            "name": "抵达郑州",
                            "description": "入住酒店。",
                        }
                    ],
                }
            ],
        },
        needs_reply=True,
        session_id="model-made-session",
        quick_replies=[
            {
                "label": "继续追问",
                "message": "继续追问",
            }
        ],
    )

    normalized = clear_unbacked_reply_state(answer)

    assert normalized.needs_reply is False
    assert normalized.session_id is None
    assert normalized.quick_replies == []


def test_detail_level_is_validated_on_question_dto():
    question = TravelQuestion(question="北京三天怎么玩？", detail_level="concise")

    assert question.detail_level == "concise"
    assert "回答详细度: concise" in question.to_retrieval_query()


def test_detail_level_checkpoint_asks_for_diy_when_missing():
    question = TravelQuestion(
        question="请规划一条自定义主题旅行。",
    )

    decision = should_ask_detail_level(question, request_mode="diy")

    assert decision.should_ask is True
    assert "这条线可以写得很细" in decision.question
    assert decision.profile.detail_level == "standard"


def test_complete_form_skips_preference_checkpoint_without_text_scanning():
    form = TravelFormRequest(
        request_mode="diy",
        origin_city="北京",
        return_city="北京",
        required_stops=["涿州", "许昌", "成都"],
        duration_days=10,
        traveler_composition={"adults": 2, "elders": 1, "children": 1},
        budget_level="luxury",
        route_strictness="must_cover_all",
        travel_mode_preference="train_first",
        pace="balanced",
        attraction_preferences=["history_culture", "theme_route"],
        accommodation_preference="convenient",
        food_preference="local_snacks",
        detail_level="deep",
    )

    context = build_checkpoint_context(
        form.to_travel_question(),
        request_mode="diy",
        form_request=form,
    )
    decision = evaluate_checkpoint_policy(context)

    assert decision.run_intent_checkpoint is False
    assert decision.run_preference_checkpoint is False
    assert decision.synthesized_preference_profile is not None
    assert decision.synthesized_preference_profile.travel_mode == "train"


def test_detail_level_checkpoint_skips_when_user_already_specifies_level():
    question = TravelQuestion(
        question="请规划一条自定义主题旅行。",
        detail_level="deep",
    )

    decision = should_ask_detail_level(question, request_mode="diy")

    assert decision.should_ask is False
    assert decision.profile.detail_level == "deep"


def test_build_detail_level_answer_uses_travel_answer_shape():
    decision = should_ask_detail_level(
        TravelQuestion(question="三国历史巡礼：涿州-许昌-成都，10天。"),
        request_mode="diy",
    )

    answer = build_detail_level_answer(decision)

    assert answer.needs_reply is True
    assert "先看大方向" in answer.answer
    assert [option.label for option in answer.quick_replies] == [
        "先看大方向",
        "标准可执行版",
        "深度旅行社版",
    ]
    assert [option.action_id for option in answer.quick_replies] == [
        "detail_concise",
        "detail_standard",
        "detail_deep",
    ]
    assert answer.citations == []


def test_checkpoint_agent_instructions_cover_three_checkpoints():
    assert "Intent Checkpoint" in INTENT_CHECKPOINT_INSTRUCTIONS
    assert "Preference Checkpoint" in PREFERENCE_CHECKPOINT_INSTRUCTIONS
    assert "Feasibility Checkpoint" in FEASIBILITY_CHECKPOINT_INSTRUCTIONS
    assert "theme_strictness" in PREFERENCE_CHECKPOINT_INSTRUCTIONS
    assert "最多问一个" in PREFERENCE_CHECKPOINT_INSTRUCTIONS
    assert intent_checkpoint_agent is not None
    assert preference_checkpoint_agent is not None
    assert feasibility_checkpoint_agent is not None


def test_intent_decision_can_recommend_diy_endpoint():
    decision = IntentDecision(
        request_mode="general",
        intent="diy_itinerary",
        should_redirect=True,
        recommended_endpoint="/tourism/itineraries/diy",
        reason="用户请求是自定义主题路线。",
    )

    assert decision.should_redirect is True
    assert decision.recommended_endpoint == "/tourism/itineraries/diy"


@pytest.mark.asyncio
async def test_intent_checkpoint_uses_qwen_cloud_runner(monkeypatch):
    calls = []

    async def fake_run_qwen_structured(
        prompt,
        output_type,
        instructions,
        model_override=None,
    ):
        calls.append((prompt, output_type, instructions, model_override))
        return IntentDecision(
            request_mode="general",
            intent="diy_itinerary",
            should_redirect=True,
            recommended_endpoint="/tourism/itineraries/diy",
            reason="用户请求是 DIY 主题路线。",
        )

    monkeypatch.setattr(
        "huaxia_tourismrag.agents.travel_checkpoints.is_qwen_cloud_provider",
        lambda: True,
    )
    monkeypatch.setattr(
        "huaxia_tourismrag.agents.travel_checkpoints.get_settings",
        lambda: Settings(
            _env_file=None,
            TOURISM_AGENT_MODEL="qwen3.7-max",
            CHECKPOINT_MODEL="qwen3.6-flash",
        ),
    )
    monkeypatch.setattr(
        "huaxia_tourismrag.agents.travel_checkpoints.run_qwen_structured",
        fake_run_qwen_structured,
    )

    decision = await create_intent_decision(
        TravelQuestion(question="三国历史巡礼怎么安排？"),
        request_mode="general",
    )

    assert decision.intent == "diy_itinerary"
    assert calls[0][1] is IntentDecision
    assert calls[0][2] == INTENT_CHECKPOINT_INSTRUCTIONS
    assert calls[0][3] == "qwen3.6-flash"


def test_build_intent_redirect_answer_uses_same_response_shape():
    decision = IntentDecision(
        request_mode="general",
        intent="diy_itinerary",
        should_redirect=True,
        recommended_endpoint="/tourism/itineraries/diy",
        reason="这是用户自定义主题路线。",
    )

    answer = build_intent_redirect_answer(decision)

    assert answer.generated_itinerary is None
    assert "/tourism/itineraries/diy" in answer.answer
    assert "用户自定义主题路线" in answer.warnings[0]

from huaxia_tourismrag.agents.travel_checkpoints import (
    FEASIBILITY_CHECKPOINT_INSTRUCTIONS,
    INTENT_CHECKPOINT_INSTRUCTIONS,
    PREFERENCE_CHECKPOINT_INSTRUCTIONS,
    feasibility_checkpoint_agent,
    intent_checkpoint_agent,
    preference_checkpoint_agent,
)
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.travel_checkpoints import (
    ClarificationDecision,
    FeasibilityIssue,
    FeasibilityReport,
    IntentDecision,
    PreferenceProfile,
)
from huaxia_tourismrag.services.travel_checkpoints import (
    build_clarification_answer,
    build_detail_level_answer,
    build_feasibility_answer,
    build_intent_redirect_answer,
    infer_detail_level,
    should_ask_detail_level,
    should_skip_clarification,
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
    )

    answer = build_feasibility_answer(report)

    assert answer.generated_itinerary is None
    assert "10 天" in answer.answer
    assert any("跨省城市过多" in warning for warning in answer.warnings)
    assert answer.needs_reply is True


def test_should_skip_clarification_when_user_delegates_preferences():
    question = TravelQuestion(question="三国历史巡礼：涿州-许昌-成都，你来决定怎么安排。")

    assert should_skip_clarification(question) is True


def test_detail_level_is_validated_on_question_dto():
    question = TravelQuestion(question="北京三天怎么玩？", detail_level="concise")

    assert question.detail_level == "concise"
    assert "回答详细度: concise" in question.to_retrieval_query()


def test_detail_level_inference_from_user_text():
    assert infer_detail_level(TravelQuestion(question="北京三天怎么玩，简单说一下。")) == "concise"
    assert infer_detail_level(TravelQuestion(question="山西十日深度旅行社级别规划。")) == "deep"
    assert infer_detail_level(TravelQuestion(question="成都五天给我可执行版本。")) == "standard"


def test_detail_level_checkpoint_asks_for_complex_diy_when_missing():
    question = TravelQuestion(
        question=(
            "三国历史巡礼路线，从北京出发并回到北京，必须覆盖涿州、临漳、"
            "许昌、南阳、咸宁、南京、成都、汉中，10到12天。"
        )
    )

    decision = should_ask_detail_level(question, request_mode="diy")

    assert decision.should_ask is True
    assert "这条线可以写得很细" in decision.question
    assert decision.profile.detail_level == "standard"


def test_detail_level_checkpoint_skips_when_user_already_specifies_level():
    question = TravelQuestion(question="三国历史巡礼，给我深度旅行社方案。")

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

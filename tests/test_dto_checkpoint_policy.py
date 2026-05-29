from datetime import date

from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.services.travel_checkpoints import (
    build_checkpoint_context,
    evaluate_checkpoint_policy,
)


def test_policy_ignores_natural_language_trigger_words() -> None:
    question = TravelQuestion(
        question="必须覆盖巡礼深度游老人儿童豪华包车多城，文本里故意放很多词。",
    )

    context = build_checkpoint_context(question, request_mode="general")
    decision = evaluate_checkpoint_policy(context)

    assert decision.run_intent_checkpoint is True
    assert decision.run_preference_checkpoint is True
    assert decision.run_feasibility_checkpoint is True


def test_diy_endpoint_skips_intent_from_endpoint_mode_only() -> None:
    question = TravelQuestion(question="普通自然语言，不包含任何特殊词。")

    context = build_checkpoint_context(question, request_mode="diy")
    decision = evaluate_checkpoint_policy(context)

    assert decision.run_intent_checkpoint is False
    assert decision.synthesized_intent == "diy_itinerary"


def test_typed_short_general_trip_can_skip_preference_and_feasibility() -> None:
    question = TravelQuestion(
        question="请规划旅行。",
        destination="北京",
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 3),
        travelers=2,
        detail_level="concise",
    )

    context = build_checkpoint_context(question, request_mode="general")
    decision = evaluate_checkpoint_policy(context)

    assert decision.run_preference_checkpoint is False
    assert decision.run_feasibility_checkpoint is False
    assert decision.synthesized_preference_profile is not None
    assert decision.synthesized_preference_profile.detail_level == "concise"
    assert decision.synthesized_feasibility_report is not None
    assert decision.synthesized_feasibility_report.is_feasible is True


def test_general_request_with_explicit_detail_uses_default_preferences() -> None:
    question = TravelQuestion(
        question="上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。",
        detail_level="deep",
    )

    context = build_checkpoint_context(question, request_mode="general")
    decision = evaluate_checkpoint_policy(context)

    assert decision.run_preference_checkpoint is False
    assert decision.synthesized_preference_profile is not None
    assert decision.synthesized_preference_profile.detail_level == "deep"
    assert "explicit_detail_general_preferences" in decision.reasons


def test_answered_preference_checkpoint_is_not_asked_again() -> None:
    question = TravelQuestion(
        question="原始请求和上一轮偏好问题都已在会话里结构化传入。",
        continuation_pending_kind="preference",
        continuation_quick_reply_action_id="preference_option_b",
    )

    context = build_checkpoint_context(question, request_mode="diy")
    decision = evaluate_checkpoint_policy(context)

    assert decision.run_preference_checkpoint is False
    assert decision.synthesized_preference_profile is not None
    assert "answered_preference_checkpoint" in decision.reasons


def test_answered_feasibility_checkpoint_is_not_asked_again() -> None:
    question = TravelQuestion(
        question="用户已经选择了其中一个可行性调整方案。",
        continuation_pending_kind="feasibility",
    )

    context = build_checkpoint_context(question, request_mode="diy")
    decision = evaluate_checkpoint_policy(context)

    assert decision.run_feasibility_checkpoint is False
    assert decision.synthesized_feasibility_report is not None
    assert decision.synthesized_feasibility_report.is_feasible is True
    assert "answered_feasibility_checkpoint" in decision.reasons

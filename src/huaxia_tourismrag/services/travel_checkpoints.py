"""Deterministic helpers for travel planning checkpoints."""

from huaxia_tourismrag.schemas.evidence import (
    DetailLevel,
    QuickReplyOption,
    TravelAnswer,
    TravelQuestion,
)
from huaxia_tourismrag.schemas.travel_checkpoints import (
    CheckpointContext,
    CheckpointPolicyDecision,
    ClarificationDecision,
    FeasibilityReport,
    IntentType,
    IntentDecision,
    PreferenceProfile,
    RequestMode,
)


def resolved_detail_level(question: TravelQuestion) -> DetailLevel:
    """Return a concrete detail level for final answer generation."""

    return question.detail_level or "standard"


def build_checkpoint_context(
    question: TravelQuestion,
    request_mode: RequestMode,
) -> CheckpointContext:
    """Build the typed-only context available to deterministic checkpoint policy."""

    duration_days = None
    if question.start_date and question.end_date:
        duration_days = (question.end_date - question.start_date).days + 1

    return CheckpointContext(
        request_mode=request_mode,
        detail_level=question.detail_level,
        has_destination=question.destination is not None,
        has_start_date=question.start_date is not None,
        has_end_date=question.end_date is not None,
        duration_days=duration_days,
        travelers=question.travelers,
        budget_level=question.budget_level,
        interest_count=len(question.interests),
    )


def evaluate_checkpoint_policy(context: CheckpointContext) -> CheckpointPolicyDecision:
    """Evaluate deterministic fast paths from DTO facts only."""

    decision = CheckpointPolicyDecision()

    if context.request_mode == "diy":
        decision.run_intent_checkpoint = False
        decision.synthesized_intent = "diy_itinerary"
        decision.reasons.append("endpoint_diy_mode")

    if context.detail_level == "concise":
        decision.run_preference_checkpoint = False
        decision.synthesized_preference_profile = PreferenceProfile(
            pace="balanced",
            attraction_mix="balanced",
            food_preference="local",
            accommodation_preference="convenient",
            detail_level="concise",
            assumed_defaults=["使用简洁回答深度与通用平衡偏好。"],
        )
        decision.reasons.append("explicit_concise_detail")

    typed_short_single_destination = (
        context.request_mode == "general"
        and context.has_destination
        and context.duration_days is not None
        and context.duration_days <= 4
        and (context.travelers is None or context.travelers <= 4)
        and context.budget_level != "luxury"
        and context.interest_count <= 3
    )
    if typed_short_single_destination:
        decision.run_feasibility_checkpoint = False
        decision.synthesized_feasibility_report = synthesize_feasibility_report()
        decision.reasons.append("typed_short_single_destination")

    return decision


def synthesize_intent_decision(
    request_mode: RequestMode,
    intent: IntentType | None = None,
) -> IntentDecision:
    """Build a conservative typed intent decision without an LLM call."""

    if request_mode == "diy":
        return IntentDecision(
            request_mode=request_mode,
            intent="diy_itinerary",
            reason="DIY endpoint already identifies this as a custom route request.",
        )

    return IntentDecision(
        request_mode=request_mode,
        intent=intent or "general_question",
        reason="Typed request context is sufficient for fast-path intent routing.",
    )


def synthesize_preference_decision(
    question: TravelQuestion,
    profile: PreferenceProfile | None = None,
) -> ClarificationDecision:
    """Build a default preference profile for skipped preference checkpoints."""

    profile = profile or PreferenceProfile(
        pace="balanced",
        attraction_mix="balanced",
        food_preference="local",
        accommodation_preference="convenient",
        detail_level=resolved_detail_level(question),
        assumed_defaults=["默认平衡节奏、本地美食优先、住宿以交通便利为主。"],
    )
    return ClarificationDecision(
        should_ask=False,
        question=None,
        reason="请求足够明确，已使用默认偏好跳过偏好追问。",
        profile=profile,
        assumed_defaults=profile.assumed_defaults,
    )


def synthesize_feasibility_report() -> FeasibilityReport:
    """Build a passing feasibility report for skipped feasibility checkpoints."""

    return FeasibilityReport(
        is_feasible=True,
        should_ask=False,
        question=None,
        issues=[],
        recommended_adjustments=[],
    )


def should_ask_detail_level(
    question: TravelQuestion,
    request_mode: RequestMode,
) -> ClarificationDecision:
    """Ask for response depth only from typed request mode/context."""

    if question.detail_level:
        return ClarificationDecision(
            should_ask=False,
            question=None,
            reason="用户已指定回答详细度。",
            profile=PreferenceProfile(detail_level=question.detail_level),
        )

    context = build_checkpoint_context(question, request_mode=request_mode)
    should_ask = (
        context.request_mode == "diy"
        or (context.duration_days is not None and context.duration_days >= 7)
        or (context.travelers is not None and context.travelers >= 5)
        or context.budget_level == "luxury"
        or context.interest_count >= 4
    )
    if not should_ask:
        return ClarificationDecision(
            should_ask=False,
            question=None,
            reason="请求复杂度不高，默认使用标准可执行版。",
            profile=PreferenceProfile(detail_level="standard"),
            assumed_defaults=["默认使用标准可执行版。"],
        )

    return ClarificationDecision(
        should_ask=True,
        question=(
            "这条线可以写得很细，也可以先给你一个轻量版。你想看哪种？\n"
            "1. 先看大方向\n"
            "2. 给我可执行版本\n"
            "3. 来一版深度旅行社方案"
        ),
        reason="复杂路线的回答详细度会显著影响长度和信息密度。",
        profile=PreferenceProfile(detail_level="standard"),
        assumed_defaults=["如果不指定，默认给出标准可执行版。"],
    )


def build_clarification_answer(decision: ClarificationDecision) -> TravelAnswer:
    """Convert a clarification decision into the public response shape."""

    assumptions = "；".join(decision.assumed_defaults)
    suffix = f"\n\n如果您不想补充，我可以按默认偏好继续：{assumptions}" if assumptions else ""
    return TravelAnswer(
        answer=f"夏夏先帮您把关键偏好确认一下：{decision.question}{suffix}",
        highlights=["需要补充一个会显著影响行程质量的偏好。"],
        warnings=[decision.reason],
        citations=[],
        quick_replies=_preference_quick_replies(decision),
        needs_reply=True,
    )


def build_detail_level_answer(decision: ClarificationDecision) -> TravelAnswer:
    """Convert a detail-level checkpoint into the public response shape."""

    return TravelAnswer(
        answer=f"夏夏先确认一下回答深度：{decision.question}",
        highlights=["请选择想看的行程详细度。"],
        warnings=[decision.reason],
        citations=[],
        quick_replies=[
            QuickReplyOption(
                label="先看大方向",
                message="先看大方向",
                action_id="detail_concise",
            ),
            QuickReplyOption(
                label="标准可执行版",
                message="标准可执行版",
                action_id="detail_standard",
            ),
            QuickReplyOption(
                label="深度旅行社版",
                message="深度旅行社版",
                action_id="detail_deep",
            ),
        ],
        needs_reply=True,
    )


def build_intent_redirect_answer(decision: IntentDecision) -> TravelAnswer:
    """Convert an endpoint-fit intent decision into the public response shape."""

    endpoint = decision.recommended_endpoint or "/tourism/questions"
    return TravelAnswer(
        answer=(
            "夏夏判断这类问题更适合走另一个规划入口，"
            f"建议使用 `{endpoint}`，这样我可以按更合适的流程处理。"
        ),
        highlights=["已识别到更合适的服务入口。"],
        warnings=[decision.reason],
        citations=[],
    )


def build_feasibility_answer(report: FeasibilityReport) -> TravelAnswer:
    """Convert a blocking feasibility report into the public response shape."""

    issue_lines = [issue.description for issue in report.issues]
    adjustments = "；".join(report.recommended_adjustments)
    suffix = f"\n\n我建议：{adjustments}" if adjustments else ""
    return TravelAnswer(
        answer=f"夏夏先提醒一下，这条路线当前可执行性有明显风险：{report.question}{suffix}",
        highlights=["当前路线需要先确认可行性。"],
        warnings=issue_lines,
        citations=[],
        quick_replies=[
            QuickReplyOption(
                label="按建议调整",
                message="接受夏夏建议的调整方案",
                action_id="feasibility_accept_adjustment",
            ),
            QuickReplyOption(
                label="保持原需求",
                message="保持原需求，请给出风险提示和压缩版",
                action_id="feasibility_keep_original",
            ),
            QuickReplyOption(
                label="默认偏好",
                message="默认偏好",
                action_id="default_preferences",
            ),
        ],
        needs_reply=True,
    )


def clear_unbacked_reply_state(answer: TravelAnswer) -> TravelAnswer:
    """Prevent clients from seeing a pending-reply state without a session id."""

    if answer.needs_reply and not answer.session_id:
        answer.needs_reply = False
        answer.quick_replies = []
    return answer


def _preference_quick_replies(
    decision: ClarificationDecision,
) -> list[QuickReplyOption]:
    """Build deterministic quick replies for preference checkpoints."""

    return [
        QuickReplyOption(
            label="选择 A",
            message="A",
            action_id="preference_option_a",
        ),
        QuickReplyOption(
            label="选择 B",
            message="B",
            action_id="preference_option_b",
        ),
        QuickReplyOption(
            label="默认偏好",
            message="默认偏好",
            action_id="default_preferences",
        ),
    ]

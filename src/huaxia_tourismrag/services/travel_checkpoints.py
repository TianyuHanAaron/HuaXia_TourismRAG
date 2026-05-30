"""Deterministic helpers for travel planning checkpoints."""

from huaxia_tourismrag.schemas.evidence import (
    DetailLevel,
    QuickReplyOption,
    TravelAnswer,
    TravelFormRequest,
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
    form_request: TravelFormRequest | None = None,
) -> CheckpointContext:
    """Build the typed-only context available to deterministic checkpoint policy."""

    duration_days = None
    if question.start_date and question.end_date:
        duration_days = (question.end_date - question.start_date).days + 1

    context = CheckpointContext(
        request_mode=request_mode,
        detail_level=question.detail_level,
        has_destination=question.destination is not None,
        has_start_date=question.start_date is not None,
        has_end_date=question.end_date is not None,
        duration_days=duration_days,
        travelers=question.travelers,
        budget_level=question.budget_level,
        interest_count=len(question.interests),
        continuation_pending_kind=question.continuation_pending_kind,
        continuation_quick_reply_action_id=question.continuation_quick_reply_action_id,
    )
    if form_request is None:
        return context

    context.from_form_template = True
    context.has_origin_city = form_request.origin_city is not None
    context.has_return_city = form_request.return_city is not None
    context.required_stop_count = len(form_request.required_stops)
    context.has_traveler_composition = form_request.traveler_composition.total > 0
    context.has_transport_preference = form_request.travel_mode_preference is not None
    context.has_pace_preference = form_request.pace is not None
    context.has_route_strictness = form_request.route_strictness is not None
    context.has_food_preference = form_request.food_preference is not None
    context.has_accommodation_preference = (
        form_request.accommodation_preference is not None
    )
    context.form_travel_mode = _map_form_travel_mode(
        form_request.travel_mode_preference
    )
    context.form_pace = form_request.pace
    context.form_theme_strictness = _map_form_route_strictness(
        form_request.route_strictness
    )
    context.form_food_preference = _map_form_food_preference(
        form_request.food_preference
    )
    context.form_accommodation_preference = form_request.accommodation_preference
    return context


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

    if (
        context.continuation_pending_kind == "preference"
        and decision.run_preference_checkpoint
    ):
        decision.run_preference_checkpoint = False
        decision.synthesized_preference_profile = PreferenceProfile(
            pace="balanced",
            attraction_mix="balanced",
            food_preference="local",
            accommodation_preference="convenient",
            detail_level=context.detail_level or "standard",
            assumed_defaults=[
                "已根据上一轮用户选择继续规划，不再重复追问同一偏好。"
            ],
        )
        decision.reasons.append("answered_preference_checkpoint")

    if (
        context.continuation_pending_kind == "feasibility"
        and decision.run_feasibility_checkpoint
    ):
        decision.run_feasibility_checkpoint = False
        decision.synthesized_feasibility_report = synthesize_feasibility_report()
        decision.reasons.append("answered_feasibility_checkpoint")

    if (
        context.request_mode == "general"
        and context.detail_level is not None
        and decision.run_preference_checkpoint
    ):
        decision.run_preference_checkpoint = False
        decision.synthesized_preference_profile = PreferenceProfile(
            pace="balanced",
            attraction_mix="balanced",
            food_preference="local",
            accommodation_preference="convenient",
            detail_level=context.detail_level,
            assumed_defaults=["用户已选择回答深度，普通行程按平衡偏好直接生成。"],
        )
        decision.reasons.append("explicit_detail_general_preferences")

    complete_form_preferences = (
        context.from_form_template
        and context.has_traveler_composition
        and context.budget_level is not None
        and context.has_transport_preference
        and context.has_pace_preference
        and context.has_food_preference
        and context.has_accommodation_preference
    )
    if complete_form_preferences:
        decision.run_preference_checkpoint = False
        decision.synthesized_preference_profile = _form_preference_profile(context)
        decision.reasons.append("complete_form_preferences")

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


def _form_preference_profile(context: CheckpointContext) -> PreferenceProfile:
    """Build a conservative profile from typed form completeness facts."""

    return PreferenceProfile(
        travel_mode=context.form_travel_mode or "mixed",
        pace=context.form_pace or "balanced",
        attraction_mix="balanced",
        food_preference=context.form_food_preference or "balanced",
        accommodation_preference=(
            context.form_accommodation_preference or "convenient"
        ),
        detail_level=context.detail_level or "standard",
        theme_strictness=context.form_theme_strictness or "unknown",
        assumed_defaults=["已按快速表单中的结构化偏好生成方案。"],
    )


def _map_form_travel_mode(value: str) -> str:
    mapping = {
        "train_first": "train",
        "flight_first": "flight",
        "self_drive": "self_drive",
        "charter_when_needed": "mixed",
        "mixed": "mixed",
    }
    return mapping.get(value, "unknown")


def _map_form_route_strictness(value: str) -> str:
    mapping = {
        "theme_pure": "theme_pure",
        "must_cover_all": "balanced_city",
        "balanced_city": "balanced_city",
        "flexible": "unknown",
    }
    return mapping.get(value, "unknown")


def _map_form_food_preference(value: str) -> str:
    mapping = {
        "local_snacks": "local",
        "classic_restaurants": "balanced",
        "fine_dining": "fine_dining",
        "balanced": "balanced",
    }
    return mapping.get(value, "unknown")


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

    assumptions = "；".join(_preference_assumption_lines(decision))
    suffix = f"\n\n如果您不想补充，我可以按默认偏好继续：{assumptions}" if assumptions else ""
    return TravelAnswer(
        answer=f"夏夏先帮您把关键偏好确认一下：{decision.question}{suffix}",
        highlights=["需要补充一个会显著影响行程质量的偏好。"],
        warnings=[decision.reason],
        citations=[],
        quick_replies=_preference_quick_replies(decision),
        needs_reply=True,
    )


def _preference_assumption_lines(decision: ClarificationDecision) -> list[str]:
    """Return user-facing default assumptions from typed preference values."""

    profile = decision.profile
    labels: list[str] = []
    label_maps = (
        (
            profile.travel_mode,
            {
                "self_drive": "交通以自驾为主",
                "train": "交通以高铁/火车为主",
                "flight": "长距离优先飞机",
                "mixed": "交通按舒适和效率灵活组合",
            },
        ),
        (
            profile.pace,
            {
                "relaxed": "节奏偏轻松",
                "balanced": "节奏保持平衡",
                "intensive": "节奏偏高效多看",
            },
        ),
        (
            profile.attraction_mix,
            {
                "cultural": "景点以历史人文为主",
                "natural": "景点以自然风景为主",
                "balanced": "景点兼顾经典与体验",
                "theme_pure": "优先围绕主题安排景点",
            },
        ),
        (
            profile.food_preference,
            {
                "local": "餐饮优先本地特色",
                "fine_dining": "餐饮可安排更精致选择",
                "balanced": "餐饮兼顾特色与便利",
            },
        ),
        (
            profile.accommodation_preference,
            {
                "luxury": "住宿按豪华级别",
                "boutique": "住宿偏精品特色",
                "convenient": "住宿优先交通便利",
                "budget": "住宿优先控制预算",
            },
        ),
        (
            profile.theme_strictness,
            {
                "theme_pure": "路线优先保持主题纯粹",
                "balanced_city": "主题与城市经典体验平衡",
            },
        ),
    )
    for value, mapping in label_maps:
        label = mapping.get(value)
        if label:
            labels.append(label)

    if labels:
        return labels
    return [
        item
        for item in decision.assumed_defaults
        if _looks_user_facing_assumption(item)
    ]


def _looks_user_facing_assumption(value: str) -> bool:
    """Filter out internal enum/debug-looking assumption text."""

    text = value.strip()
    if not text:
        return False
    return ":" not in text and "_" not in text


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
    suffix = f"\n\n可选调整方向：{adjustments}" if adjustments else ""
    return TravelAnswer(
        answer=(
            "夏夏先把可执行性风险摊开讲清楚，选择权仍然在您这里："
            f"{report.question}{suffix}"
            "\n\n您可以点下面的按钮，也可以手动告诉我：哪些点必须保留、"
            "哪些地方可以调整、是否愿意延长天数。"
        ),
        highlights=["请先确认优先级；夏夏会按您的选择继续规划。"],
        warnings=issue_lines,
        citations=[],
        quick_replies=_feasibility_quick_replies(report),
        needs_reply=True,
    )


def clear_unbacked_reply_state(answer: TravelAnswer) -> TravelAnswer:
    """Prevent clients from seeing a pending-reply state without a session id."""

    if answer.generated_itinerary and answer.generated_itinerary.itinerary:
        answer.needs_reply = False
        answer.session_id = None
        answer.quick_replies = []
        return answer

    if not answer.needs_reply:
        answer.session_id = None
        answer.quick_replies = []
        return answer

    if answer.needs_reply and not answer.session_id:
        answer.needs_reply = False
        answer.quick_replies = []
    return answer


def _feasibility_quick_replies(report: FeasibilityReport) -> list[QuickReplyOption]:
    """Build user-specific feasibility options from typed checkpoint data."""

    if report.response_options:
        return [
            QuickReplyOption(label=option.label, message=option.message)
            for option in report.response_options[:3]
        ]

    if report.recommended_adjustments:
        labels = ("方案 A", "方案 B", "方案 C")
        return [
            QuickReplyOption(label=labels[index], message=adjustment)
            for index, adjustment in enumerate(report.recommended_adjustments[:3])
        ]

    return [
        QuickReplyOption(
            label="采用调整方案",
            message="采用可选调整方向继续规划",
            action_id="feasibility_accept_adjustment",
        ),
        QuickReplyOption(
            label="保留原需求",
            message="保留原需求，请给出风险提示和可执行压缩版",
            action_id="feasibility_keep_original",
        ),
        QuickReplyOption(
            label="默认偏好",
            message="默认偏好",
            action_id="default_preferences",
        ),
    ]


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

"""Deterministic helpers for travel planning checkpoints."""

from huaxia_tourismrag.schemas.evidence import DetailLevel, TravelAnswer, TravelQuestion
from huaxia_tourismrag.schemas.travel_checkpoints import (
    ClarificationDecision,
    FeasibilityReport,
    IntentDecision,
    PreferenceProfile,
    RequestMode,
)


SKIP_CLARIFICATION_TERMS = (
    "你来决定",
    "你帮我决定",
    "你帮我推荐",
    "帮我推荐",
    "无所谓",
    "都可以",
    "随便",
    "按你推荐",
)

CONCISE_DETAIL_TERMS = ("简洁", "简单", "大纲", "大方向", "轻量", "先看思路", "简单说")
STANDARD_DETAIL_TERMS = ("标准", "可执行", "正常详细度", "实用版")
DEEP_DETAIL_TERMS = ("详细", "深度", "严肃", "旅行社级别", "深度版", "深度旅行社")


def should_skip_clarification(question: TravelQuestion) -> bool:
    """Return true when the user explicitly delegates missing preferences."""

    return any(term in question.question for term in SKIP_CLARIFICATION_TERMS)


def infer_detail_level(question: TravelQuestion) -> DetailLevel | None:
    """Infer the requested answer depth from validated DTO or natural language."""

    if question.detail_level:
        return question.detail_level

    text = question.question
    if any(term in text for term in DEEP_DETAIL_TERMS):
        return "deep"
    if any(term in text for term in CONCISE_DETAIL_TERMS):
        return "concise"
    if any(term in text for term in STANDARD_DETAIL_TERMS):
        return "standard"

    return None


def resolve_detail_level_reply(message: str) -> DetailLevel | None:
    """Map a checkpoint reply to a validated detail level."""

    normalized = message.strip().lower()
    if normalized in {"1", "a", "concise"} or any(
        term in message for term in CONCISE_DETAIL_TERMS
    ):
        return "concise"
    if normalized in {"2", "b", "standard"} or any(
        term in message for term in STANDARD_DETAIL_TERMS
    ):
        return "standard"
    if normalized in {"3", "c", "deep"} or any(
        term in message for term in DEEP_DETAIL_TERMS
    ):
        return "deep"

    return None


def resolved_detail_level(question: TravelQuestion) -> DetailLevel:
    """Return a concrete detail level for final answer generation."""

    return infer_detail_level(question) or "standard"


def should_ask_detail_level(
    question: TravelQuestion,
    request_mode: RequestMode,
) -> ClarificationDecision:
    """Ask for response depth when a complex request would otherwise be too long."""

    inferred = infer_detail_level(question)
    if inferred:
        return ClarificationDecision(
            should_ask=False,
            question=None,
            reason="用户已指定回答详细度。",
            profile=PreferenceProfile(detail_level=inferred),
        )

    text = question.question
    complex_signals = (
        request_mode == "diy",
        any(marker in text for marker in ("10", "十日", "10天", "12", "十二", "多城")),
        any(marker in text for marker in ("必须覆盖", "巡礼", "深度游", "老人", "儿童", "豪华")),
        text.count("、") >= 4 or text.count("-") >= 3,
    )
    if sum(bool(signal) for signal in complex_signals) < 2:
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
        needs_reply=True,
    )


def build_detail_level_answer(decision: ClarificationDecision) -> TravelAnswer:
    """Convert a detail-level checkpoint into the public response shape."""

    return TravelAnswer(
        answer=f"夏夏先确认一下回答深度：{decision.question}",
        highlights=["请选择想看的行程详细度。"],
        warnings=[decision.reason],
        citations=[],
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
        needs_reply=True,
    )

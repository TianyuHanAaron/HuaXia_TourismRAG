"""Deterministic helpers for travel planning checkpoints."""

from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelQuestion
from huaxia_tourismrag.schemas.travel_checkpoints import (
    ClarificationDecision,
    FeasibilityReport,
    IntentDecision,
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


def should_skip_clarification(question: TravelQuestion) -> bool:
    """Return true when the user explicitly delegates missing preferences."""

    return any(term in question.question for term in SKIP_CLARIFICATION_TERMS)


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

"""DTO-driven structured itinerary safeguards."""

from datetime import datetime, time, timedelta

from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import (
    ActivityItem,
    DailyPlan,
    TravelAnswer,
    TravelItinerary,
    TravelQuestion,
)
from huaxia_tourismrag.schemas.research import ResearchEntity, TravelResearchPlan


def ensure_generated_itinerary(
    answer: TravelAnswer,
    *,
    question: TravelQuestion,
    research_plan: TravelResearchPlan | None = None,
    diy_plan: DIYItineraryPlan | None = None,
) -> TravelAnswer:
    """Ensure itinerary-planning DTOs return a structured itinerary payload."""

    if answer.generated_itinerary is not None:
        return answer

    generated = _itinerary_from_diy(question, diy_plan) if diy_plan else None
    if generated is None:
        generated = _itinerary_from_research(question, research_plan)
    if generated is None:
        return answer

    return answer.model_copy(update={"generated_itinerary": generated})


def _itinerary_from_research(
    question: TravelQuestion,
    research_plan: TravelResearchPlan | None,
) -> TravelItinerary | None:
    if research_plan is None:
        return None

    duration_days = _duration_days(question, research_plan.trip_days)
    if duration_days is None or not research_plan.destination:
        return None

    anchors = _research_anchors(research_plan)
    daily_plans = [
        DailyPlan(
            day=day,
            date=_day_datetime(question, day),
            city=research_plan.destination,
            activities=[
                ActivityItem(
                    name=_research_activity_name(research_plan, anchors, day),
                    category=_research_activity_category(research_plan),
                    description=_research_activity_description(research_plan, day),
                    location=research_plan.destination,
                )
            ],
            notes=_research_day_notes(research_plan),
        )
        for day in range(1, duration_days + 1)
    ]
    return TravelItinerary(
        destination=research_plan.destination,
        start_date=_day_datetime(question, 1),
        end_date=question.end_date,
        travelers=question.travelers,
        budget_level=question.budget_level or research_plan.budget_level,
        itinerary=daily_plans,
        travel_tips=[
            "夏夏已根据研究计划生成可编辑行程骨架；具体景点、酒店和票务仍以正文与引用为准。"
        ],
    )


def _itinerary_from_diy(
    question: TravelQuestion,
    diy_plan: DIYItineraryPlan | None,
) -> TravelItinerary | None:
    if diy_plan is None:
        return None

    duration_days = _duration_days(question, diy_plan.days) or len(
        diy_plan.proposed_route
    )
    if duration_days < 1:
        return None

    route = diy_plan.proposed_route or diy_plan.required_stops
    if not route:
        return None

    daily_plans = [
        DailyPlan(
            day=day,
            date=_day_datetime(question, day),
            city=_route_city(route, day),
            activities=[
                ActivityItem(
                    name=_diy_activity_name(diy_plan, _route_city(route, day)),
                    category="cultural_attraction",
                    description=_diy_activity_description(
                        diy_plan,
                        _route_city(route, day),
                    ),
                    location=_route_city(route, day),
                )
            ],
            notes=_diy_day_notes(diy_plan),
        )
        for day in range(1, duration_days + 1)
    ]
    return TravelItinerary(
        destination=diy_plan.theme,
        start_date=_day_datetime(question, 1),
        end_date=question.end_date,
        travelers=question.travelers,
        budget_level=question.budget_level,
        itinerary=daily_plans,
        travel_tips=[
            "夏夏已保留 DIY 计划中的必到停靠点，并生成可编辑行程骨架。"
        ],
    )


def _duration_days(question: TravelQuestion, planned_days: int | None) -> int | None:
    if planned_days is not None:
        return planned_days
    if question.start_date and question.end_date:
        return (question.end_date - question.start_date).days + 1
    return None


def _day_datetime(question: TravelQuestion, day: int) -> datetime | None:
    if question.start_date is None:
        return None
    return datetime.combine(question.start_date, time.min) + timedelta(days=day - 1)


def _research_anchors(research_plan: TravelResearchPlan) -> list[ResearchEntity]:
    return [
        entity
        for entity in research_plan.required_entities
        if entity.entity_type in {"city", "attraction", "activity"}
    ]


def _research_activity_name(
    research_plan: TravelResearchPlan,
    anchors: list[ResearchEntity],
    day: int,
) -> str:
    if anchors:
        return anchors[(day - 1) % len(anchors)].name
    return f"{research_plan.destination}第{day}天行程"


def _research_activity_category(research_plan: TravelResearchPlan) -> str | None:
    if any(task.evidence_use == "local_food" for task in research_plan.tasks):
        return "cultural_attraction"
    if any(task.task_type == "attraction" for task in research_plan.tasks):
        return "cultural_attraction"
    return None


def _research_activity_description(
    research_plan: TravelResearchPlan,
    day: int,
) -> str:
    task = research_plan.tasks[(day - 1) % len(research_plan.tasks)]
    return (
        f"围绕“{task.reason}”安排第{day}天内容；最终景点、交通和住宿细节以正文方案与引用来源为准。"
    )


def _research_day_notes(research_plan: TravelResearchPlan) -> str:
    notes: list[str] = []
    if research_plan.origin:
        notes.append(f"出发地：{research_plan.origin}")
    if research_plan.travelers_summary:
        notes.append(f"同行人：{research_plan.travelers_summary}")
    if research_plan.budget_level:
        notes.append(f"预算等级：{research_plan.budget_level}")
    return "；".join(notes) or "可根据正文方案进一步细化。"


def _route_city(route: list[str], day: int) -> str:
    return route[min(day - 1, len(route) - 1)]


def _diy_activity_name(diy_plan: DIYItineraryPlan, city: str) -> str:
    return f"{city}{diy_plan.theme}停靠"


def _diy_activity_description(diy_plan: DIYItineraryPlan, city: str) -> str:
    anchors = [anchor for anchor in diy_plan.theme_anchors if anchor.stop == city]
    if anchors:
        return anchors[0].reason
    return f"保留 DIY 计划中的“{city}”停靠点，并围绕“{diy_plan.theme}”组织当天内容。"


def _diy_day_notes(diy_plan: DIYItineraryPlan) -> str:
    if diy_plan.travel_mode != "unknown":
        return f"交通偏好：{diy_plan.travel_mode}"
    return "交通与停留时长可按正文方案继续细化。"

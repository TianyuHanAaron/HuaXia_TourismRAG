"""Quality normalization for structured timed itineraries."""

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel

from huaxia_tourismrag.schemas.evidence import TravelAnswer


class ItineraryScheduleIssue(BaseModel):
    """Non-fatal issue found in generated itinerary schedule structure."""

    issue_type: Literal[
        "invalid_time_range",
        "empty_alternative",
    ]

    message: str

    day: int | None = None

    activity_name: str | None = None


@dataclass(frozen=True)
class ItineraryScheduleQualityResult:
    """Normalized answer and schedule-quality issues."""

    answer: TravelAnswer
    issues: list[ItineraryScheduleIssue]


class ItineraryScheduleQualityGuard:
    """Normalize schedule fields without inventing itinerary content."""

    def validate(self, answer: TravelAnswer) -> ItineraryScheduleQualityResult:
        normalized = answer.model_copy(deep=True)
        issues: list[ItineraryScheduleIssue] = []
        itinerary = normalized.generated_itinerary
        if itinerary is None:
            return ItineraryScheduleQualityResult(answer=normalized, issues=issues)

        for day in itinerary.itinerary:
            for activity in day.activities:
                if (
                    activity.start_time is not None
                    and activity.end_time is not None
                    and activity.end_time <= activity.start_time
                ):
                    issues.append(
                        ItineraryScheduleIssue(
                            issue_type="invalid_time_range",
                            message=(
                                "activity.end_time must be after activity.start_time; "
                                "end_time was removed."
                            ),
                            day=day.day,
                            activity_name=activity.name,
                        )
                    )
                    activity.end_time = None

                kept_alternatives = []
                for alternative in activity.alternatives:
                    if not alternative.title.strip() or not alternative.description.strip():
                        issues.append(
                            ItineraryScheduleIssue(
                                issue_type="empty_alternative",
                                message=(
                                    "activity.alternatives entries must have title and "
                                    "description; empty alternative was removed."
                                ),
                                day=day.day,
                                activity_name=activity.name,
                            )
                        )
                        continue
                    kept_alternatives.append(alternative)
                activity.alternatives = kept_alternatives

            day.activities = sorted(
                day.activities,
                key=lambda item: (
                    item.start_time is None,
                    item.start_time.isoformat() if item.start_time else "",
                ),
            )

        return ItineraryScheduleQualityResult(answer=normalized, issues=issues)

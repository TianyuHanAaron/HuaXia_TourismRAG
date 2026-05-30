from huaxia_tourismrag.schemas.evidence import TravelAnswer
from huaxia_tourismrag.services.itinerary_schedule_quality import (
    ItineraryScheduleQualityGuard,
)


def _answer_with_activities(activities):
    return TravelAnswer.model_validate(
        {
            "answer": "夏夏整理好了。",
            "highlights": [],
            "warnings": [],
            "citations": [],
            "generated_itinerary": {
                "destination": "成都",
                "itinerary": [
                    {
                        "day": 1,
                        "city": "成都",
                        "activities": activities,
                    }
                ],
            },
        }
    )


def test_guard_sorts_timed_activities_inside_each_day():
    answer = _answer_with_activities(
        [
            {
                "start_time": "18:00",
                "name": "晚餐",
                "description": "18:00 晚餐。",
            },
            {
                "start_time": "08:30",
                "name": "上午游览",
                "description": "08:30 到达景区。",
            },
        ]
    )

    result = ItineraryScheduleQualityGuard().validate(answer)

    activities = result.answer.generated_itinerary.itinerary[0].activities
    assert [item.name for item in activities] == ["上午游览", "晚餐"]
    assert result.issues == []


def test_guard_removes_alternative_without_description():
    answer = _answer_with_activities(
        [
            {
                "start_time": "19:00",
                "name": "夜间选择",
                "description": "19:00 夜游。",
                "alternatives": [
                    {
                        "title": "锦里",
                        "description": "锦里适合美食街体验。[1]",
                        "citations": [1],
                    },
                    {
                        "title": "空选项",
                        "description": " ",
                    },
                ],
            }
        ]
    )

    result = ItineraryScheduleQualityGuard().validate(answer)

    alternatives = result.answer.generated_itinerary.itinerary[0].activities[0].alternatives
    assert len(alternatives) == 1
    assert alternatives[0].title == "锦里"
    assert result.issues


def test_guard_flags_end_time_before_start_time():
    answer = _answer_with_activities(
        [
            {
                "start_time": "20:00",
                "end_time": "18:00",
                "name": "错误时段",
                "description": "时间错误。",
            }
        ]
    )

    result = ItineraryScheduleQualityGuard().validate(answer)

    activity = result.answer.generated_itinerary.itinerary[0].activities[0]
    assert activity.end_time is None
    assert result.issues[0].issue_type == "invalid_time_range"

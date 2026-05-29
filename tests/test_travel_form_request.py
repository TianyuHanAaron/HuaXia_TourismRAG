import pytest

from huaxia_tourismrag.schemas.evidence import TravelFormRequest


def test_form_request_converts_to_travel_question_with_structured_context():
    form = TravelFormRequest(
        request_mode="diy",
        origin_city="北京",
        return_city="北京",
        required_stops=["涿州", "临漳", "许昌", "南阳", "成都", "汉中"],
        duration_days=12,
        traveler_composition={"adults": 3, "elders": 1, "children": 1},
        budget_level="luxury",
        travel_mode_preference="train_first",
        pace="balanced",
        route_strictness="must_cover_all",
        attraction_preferences=["history_culture", "theme_route", "heritage"],
        food_preference="local_snacks",
        accommodation_preference="convenient",
        detail_level="deep",
        language="zh-CN",
    )

    question = form.to_travel_question()

    assert question.destination is None
    assert question.travelers == 5
    assert question.budget_level == "luxury"
    assert question.detail_level == "deep"
    assert "必须覆盖: 涿州、临漳、许昌、南阳、成都、汉中" in question.question
    assert "交通偏好: train_first" in question.question
    assert "history_culture" in question.interests


def test_form_request_requires_at_least_one_traveler():
    form = TravelFormRequest(
        traveler_composition={"adults": 0, "elders": 0, "children": 0},
    )

    with pytest.raises(ValueError) as exc_info:
        form.to_travel_question()
    assert "at least one traveler" in str(exc_info.value)

import pytest

from huaxia_tourismrag.schemas.evidence import TravelFormRequest, TravelQuestion


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
    assert question.locale_context is not None
    assert question.locale_context.locale == "zh-CN"


def test_form_request_requires_at_least_one_traveler():
    form = TravelFormRequest(
        traveler_composition={"adults": 0, "elders": 0, "children": 0},
    )

    with pytest.raises(ValueError) as exc_info:
        form.to_travel_question()
    assert "at least one traveler" in str(exc_info.value)


def test_long_english_diy_brief_is_accepted_and_detected_as_english():
    prompt = (
        "Two of us from Shanghai, flying business class to London, plan 30 days "
        "for a cultured and tasteful reenactment of the 18th-century Grand Tour. "
        "The route follows London, Dover, Calais, Paris, Geneva, Lausanne, Turin, "
        "Florence, Venice, Rome, Naples, Innsbruck, Vienna, Dresden, Berlin, "
        "Amsterdam, then return to Shanghai. We prefer historic palace hotels, "
        "aristocratic country houses, truffle hunting, terroir-focused wine "
        "tastings, museum curator conversations, classical music recitals, "
        "a Renaissance villa garden, regional cooking classes, and a quiet "
        "Venetian sandolo ride. "
    ) * 4

    question = TravelQuestion(question=prompt[:3200], detail_level="deep")

    assert question.language == "en"
    assert question.locale_context is not None
    assert "GB" in question.locale_context.destination_country_codes
    assert "FR" in question.locale_context.destination_country_codes
    assert "IT" in question.locale_context.destination_country_codes


def test_australia_locale_defaults_derive_from_english_question():
    question = TravelQuestion(
        question="10 days South Australian wine tasting and whale watching tour",
        language="en",
    )

    assert question.language == "en"
    assert question.locale_context is not None
    assert question.locale_context.locale == "en-AU"
    assert question.locale_context.currency == "AUD"
    assert question.locale_context.distance_unit == "km"
    assert question.locale_context.time_format == "12h"
    assert question.locale_context.drive_side == "left"
    assert question.locale_context.search_country == "australia"


def test_english_form_preserves_australia_locale_context():
    form = TravelFormRequest(
        origin_city="Adelaide",
        destination="South Australia",
        duration_days=10,
        language="en",
        extra_notes="Wine tasting, whale watching and Kangaroo Island.",
    )

    question = form.to_travel_question()

    assert question.locale_context is not None
    assert question.locale_context.locale == "en-AU"
    assert question.locale_context.destination_country_codes == ["AU"]
    assert "currency: AUD" in question.to_retrieval_query()
    assert "Quick travel form request" in question.question
    assert "Origin: Adelaide" in question.question
    assert "Destination: South Australia" in question.question
    assert "目的地" not in question.question


@pytest.mark.parametrize(
    (
        "prompt",
        "expected_locale",
        "expected_country_codes",
        "expected_drive_side",
        "expected_search_country",
    ),
    [
        (
            "Two of us from Shanghai want to spend 10 days in Japan on a budget of 25,000 RMB.",
            "en-US",
            ["JP"],
            "left",
            None,
        ),
        (
            "Our family from Beijing would like a 15-day trip to Australia's east coast on a budget of 55,000 RMB.",
            "en-AU",
            ["AU"],
            "left",
            "australia",
        ),
        (
            "Four friends from Guangzhou want to spend 10 days in the UK on a budget of 32,000 RMB.",
            "en-GB",
            ["GB"],
            "left",
            None,
        ),
        (
            "Two of us from Hong Kong want a 15-day trip to Netherlands, France, Germany, Italy, Austria, Switzerland on a budget of 50,000 RMB.",
            "en-US",
            ["NL", "FR", "DE", "IT", "AT", "CH"],
            "right",
            None,
        ),
        (
            "Two retired travelers from Chengdu want to spend 15 days in Spain and Portugal on a budget of 40,000 RMB.",
            "en-US",
            ["ES", "PT"],
            "right",
            None,
        ),
    ],
)
def test_international_english_prompts_preserve_explicit_rmb_budget_and_country_context(
    prompt: str,
    expected_locale: str,
    expected_country_codes: list[str],
    expected_drive_side: str,
    expected_search_country: str | None,
):
    question = TravelQuestion(question=prompt, language="en")

    assert question.locale_context is not None
    assert question.locale_context.locale == expected_locale
    assert question.locale_context.destination_country_codes == expected_country_codes
    assert question.locale_context.currency == "CNY"
    assert question.locale_context.drive_side == expected_drive_side
    assert question.locale_context.search_country == expected_search_country


@pytest.mark.parametrize(
    ("prompt", "expected_country_codes"),
    [
        (
            "Two of us from Shanghai are planning 15 days in the Maldives with a budget of 60,000 RMB.",
            ["MV"],
        ),
        (
            "A family of three from Guangzhou is planning 15 days visiting Singapore, Malaysia and Thailand with a budget of 40,000 RMB.",
            ["SG", "MY", "TH"],
        ),
        (
            "Two of us from Beijing are planning 15 days in Greece and Turkey with a budget of 50,000 RMB.",
            ["GR", "TR"],
        ),
        (
            "Two of us from Beijing are planning 15 days in Greece and Turkey with Pamukkale and Cappadocia on a budget of 50,000 RMB.",
            ["GR", "TR"],
        ),
        (
            "Four friends from Shenzhen are planning 15 days in Egypt with a budget of 45,000 RMB.",
            ["EG"],
        ),
        (
            "Two of us from Chengdu are planning 20 days in Tanzania, Kenya and Ethiopia with a budget of 90,000 RMB.",
            ["TZ", "KE", "ET"],
        ),
    ],
)
def test_new_international_prompts_auto_detect_english_and_destination_countries(
    prompt: str,
    expected_country_codes: list[str],
):
    question = TravelQuestion(question=prompt)

    assert question.language == "en"
    assert question.locale_context is not None
    assert question.locale_context.answer_language == "en"
    assert question.locale_context.locale == "en-US"
    assert question.locale_context.destination_country_codes == expected_country_codes
    assert question.locale_context.currency == "CNY"
    assert question.locale_context.time_format == "12h"


def test_saint_paul_pilgrimage_detects_all_destination_countries():
    question = TravelQuestion(
        question=(
            "We are two Christians from Shanghai, planning about 30 days on a "
            "Saint Paul pilgrimage route. We want to visit key biblical sites: "
            "in Israel – Jerusalem, Nazareth, Bethlehem; in Turkey – Antakya, "
            "Tarsus, Selcuk; in Greece – Athens, Corinth, Thessaloniki; "
            "in Italy – Rome; plus Malta."
        )
    )

    assert question.language == "en"
    assert question.locale_context is not None
    assert question.locale_context.destination_country_codes == [
        "IL",
        "TR",
        "GR",
        "IT",
        "MT",
    ]
    assert question.locale_context.currency == "USD"


def test_generic_country_detection_uses_global_country_names_not_curated_markers():
    question = TravelQuestion(
        question=(
            "Two of us from Shanghai want 18 days in Bolivia and Namibia, "
            "with salt flats, desert landscapes, wildlife and quiet lodges."
        )
    )

    assert question.language == "en"
    assert question.locale_context is not None
    assert question.locale_context.destination_country_codes == ["BO", "NA"]


def test_generic_city_detection_infers_destination_countries_from_world_cities():
    question = TravelQuestion(
        question=(
            "Please plan a slow trip through Reykjavik, Ljubljana, Cusco and Kathmandu, "
            "with cultural walks, mountain scenery and simple guesthouses."
        )
    )

    assert question.language == "en"
    assert question.locale_context is not None
    assert question.locale_context.destination_country_codes == ["IS", "SI", "PE", "NP"]


def test_origin_city_does_not_become_destination_country_for_global_city_detection():
    question = TravelQuestion(
        question=(
            "Two of us from Shanghai want to visit Reykjavik and Ljubljana for "
            "12 days, with trains where possible and quiet local stays."
        )
    )

    assert question.language == "en"
    assert question.locale_context is not None
    assert question.locale_context.destination_country_codes == ["IS", "SI"]

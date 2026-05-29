import pytest
from pydantic import ValidationError

from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelTopicSection


def test_topic_section_accepts_legacy_recommendations():
    section = TravelTopicSection(
        category="food",
        title="美食",
        summary="成都小吃适合放在午餐。[1]",
        recommendations=["担担面和钟水饺适合作为轻量午餐。[1]"],
    )

    assert section.items == []
    assert section.recommendations == ["担担面和钟水饺适合作为轻量午餐。[1]"]


def test_topic_section_accepts_structured_items():
    answer = TravelAnswer(
        answer="夏夏给你整理好了。[1]",
        highlights=[],
        warnings=[],
        citations=["[1] 成都美食 - 文旅 - https://example.cn/food"],
        topic_sections=[
            {
                "category": "food",
                "title": "美食",
                "summary": "成都段以小吃和茶馆慢体验为主。[1]",
                "items": [
                    {
                        "title": "小吃午餐",
                        "description": "把担担面、钟水饺安排在武侯祠附近午餐。[1]",
                        "city": "成都",
                        "day": 3,
                        "kind": "signature_item",
                        "citations": [1],
                    }
                ],
            }
        ],
    )

    item = answer.topic_sections[0].items[0]
    assert item.title == "小吃午餐"
    assert item.city == "成都"
    assert item.citations == [1]


def test_topic_section_rejects_unknown_category():
    with pytest.raises(ValidationError):
        TravelTopicSection(category="nightlife", title="夜生活")


def test_topic_section_caps_structured_items():
    with pytest.raises(ValidationError):
        TravelTopicSection(
            category="shopping",
            title="购物",
            items=[
                {
                    "title": f"伴手礼 {index}",
                    "description": "购买前核验来源。[1]",
                }
                for index in range(11)
            ],
        )
